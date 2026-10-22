// SOUP Companion desktop — main process.
//
// Architecture: one window with three BrowserViews —
//   1. "chrome": a tab strip + address bar, pinned full-width across the
//      top (see createChromeView()/layout()). Its own small HTML/JS/CSS
//      (panel/chrome.html) rather than a native window toolbar, for the
//      same reason the original single-tab version folded nav controls
//      into the panel: a separate non-BrowserView toolbar area was
//      unreliably covered by BrowserView z-order on real hardware. Giving
//      the tab strip its own dedicated BrowserView avoids that failure
//      mode by construction.
//   2. the active tab's "portal" view: a real, minimal built-in browser —
//      every open tab gets its own BrowserView, tracked in `tabs`, with
//      only the active one actually attached to the window at a time.
//   3. "panel": the SOUP assistant UI (unchanged in spirit, now re-scans
//      whenever the active tab changes rather than being scoped to one
//      hardcoded page).
//
// The main process injects inject/field-dictionary.js + inject/portal-
// bridge.js into every portal tab on dom-ready, then calls the functions
// those scripts define via executeJavaScript when the panel asks it to
// scan or fill — the desktop equivalent of a browser extension's content
// script, using Electron's own first-party page access.
//
// Document auto-attach (attachDocumentToField below) uses the Chrome
// DevTools Protocol's DOM.setFileInputFiles — the only way, in any browser
// context, to programmatically set an <input type="file">'s files. This is
// a capability unique to privileged native automation (what webContents.
// debugger exposes here), never achievable by a plain webpage or even a
// content script — which is also exactly why the web-based (no-install)
// Companion can only ever be a reference/copy-paste tool, never this.
const { app, BrowserWindow, BrowserView, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const PANEL_WIDTH = 380;
const CHROME_HEIGHT = 80;
const START_URL = "https://www.soupassist.com/universities";
// pathToFileURL (not string concatenation) because a plain "file://" + path
// produces an invalid URL on Windows — backslashes and the drive-letter
// absolute path both need proper escaping that only the URL module does
// correctly.
const NEW_TAB_URL = pathToFileURL(path.join(__dirname, "panel", "newtab.html")).toString();

function storePath() {
  return path.join(app.getPath("userData"), "soup-companion-store.json");
}
function readStore() {
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")); } catch { return {}; }
}
function writeStore(data) {
  fs.writeFileSync(storePath(), JSON.stringify(data), "utf8");
}

let mainWindow = null;
let chromeView = null;
let panelView = null;
/** @type {Map<string, { view: BrowserView, title: string, url: string }>} */
const tabs = new Map();
let activeTabId = null;
let nextTabId = 1;

function activeView() {
  const tab = activeTabId ? tabs.get(activeTabId) : null;
  return tab ? tab.view : null;
}

function listTabs() {
  return Array.from(tabs.entries()).map(([id, tab]) => ({ id, title: tab.title, url: tab.url, active: id === activeTabId }));
}

function notifyChrome() {
  chromeView?.webContents.send("tabs-changed", listTabs());
}

function layout() {
  if (!mainWindow || !chromeView || !panelView) return;
  const bounds = mainWindow.getContentBounds();
  chromeView.setBounds({ x: 0, y: 0, width: bounds.width, height: CHROME_HEIGHT });
  const contentY = CHROME_HEIGHT;
  const contentHeight = Math.max(0, bounds.height - CHROME_HEIGHT);
  const portalWidth = Math.max(320, bounds.width - PANEL_WIDTH);
  const portal = activeView();
  if (portal) portal.setBounds({ x: 0, y: contentY, width: portalWidth, height: contentHeight });
  panelView.setBounds({ x: portalWidth, y: contentY, width: bounds.width - portalWidth, height: contentHeight });
}

function injectBridge(view) {
  const dict = fs.readFileSync(path.join(__dirname, "inject", "field-dictionary.js"), "utf8");
  const bridge = fs.readFileSync(path.join(__dirname, "inject", "portal-bridge.js"), "utf8");
  view.webContents.executeJavaScript(`${dict}\n${bridge}`).catch(() => {});
}

// ---------- tab management ----------
function createTab(rawUrl) {
  const id = String(nextTabId++);
  let target = String(rawUrl || "").trim();
  if (!target) target = NEW_TAB_URL;
  else if (!/^https?:\/\/|^file:\/\//i.test(target)) target = `https://${target}`;

  const view = new BrowserView({ webPreferences: { contextIsolation: true, sandbox: true } });
  const tab = { view, title: "New tab", url: target };
  tabs.set(id, tab);

  view.webContents.on("dom-ready", () => injectBridge(view));
  view.webContents.on("page-title-updated", (_e, title) => { tab.title = title; notifyChrome(); });
  const onNav = (_e, url) => {
    tab.url = url;
    notifyChrome();
    if (id === activeTabId) panelView?.webContents.send("portal-url-changed", url);
  };
  view.webContents.on("did-navigate", onNav);
  view.webContents.on("did-navigate-in-page", onNav);
  view.webContents.loadURL(target).catch(() => {});

  switchTab(id);
  return id;
}

function switchTab(id) {
  if (!mainWindow || !tabs.has(id)) return;
  if (activeTabId && activeTabId !== id) {
    const previous = tabs.get(activeTabId);
    if (previous) mainWindow.removeBrowserView(previous.view);
  }
  activeTabId = id;
  mainWindow.addBrowserView(tabs.get(id).view);
  layout();
  notifyChrome();
  // The panel re-scans against whichever tab is now active rather than
  // staying scoped to whatever page it last saw — see preload-panel.js's
  // onTabChanged (kept as the existing "tab-changed" event name).
  panelView?.webContents.send("tab-changed");
}

function closeTab(id) {
  if (!tabs.has(id)) return;
  const wasActive = activeTabId === id;
  const tab = tabs.get(id);
  tabs.delete(id);
  // BrowserView has no public destroy() before Electron's WebContentsView
  // migration; removing it from the window and dropping the reference is
  // the documented cleanup path — Electron GCs the underlying WebContents.
  mainWindow?.removeBrowserView(tab.view);
  if (wasActive) {
    activeTabId = null;
    const remaining = Array.from(tabs.keys());
    if (remaining.length) switchTab(remaining[remaining.length - 1]);
    else createTab(START_URL);
  } else {
    notifyChrome();
  }
}

function createChromeView() {
  chromeView = new BrowserView({ webPreferences: { contextIsolation: true, preload: path.join(__dirname, "preload-chrome.js") } });
  mainWindow.addBrowserView(chromeView);
  chromeView.webContents.loadFile(path.join(__dirname, "panel", "chrome.html"));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: "SOUP Companion",
    icon: path.join(__dirname, "icons", "icon.png"),
    backgroundColor: "#F6F7F4",
  });
  mainWindow.setMenuBarVisibility(false);

  createChromeView();

  panelView = new BrowserView({ webPreferences: { contextIsolation: true, preload: path.join(__dirname, "preload-panel.js") } });
  mainWindow.addBrowserView(panelView);
  panelView.webContents.loadFile(path.join(__dirname, "panel", "index.html"));

  createTab(START_URL);

  mainWindow.on("resize", layout);
  mainWindow.once("ready-to-show", layout);
  layout();
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ---------- Tabs (chrome <-> main) ----------
ipcMain.handle("tab-list", () => listTabs());
ipcMain.handle("tab-new", (_e, url) => createTab(url));
ipcMain.handle("tab-close", (_e, id) => closeTab(id));
ipcMain.handle("tab-switch", (_e, id) => switchTab(id));
ipcMain.handle("nav-state", () => {
  const view = activeView();
  if (!view) return { url: "", canGoBack: false, canGoForward: false };
  return { url: view.webContents.getURL(), canGoBack: view.webContents.canGoBack(), canGoForward: view.webContents.canGoForward() };
});

// ---------- Active-tab navigation (triggered from the chrome bar) ----------
ipcMain.on("nav-go", (_e, rawUrl) => {
  let target = String(rawUrl || "").trim();
  if (!target) return;
  if (!/^https?:\/\//i.test(target)) {
    // A bare word/phrase is a search, same convention as every real browser
    // address bar — a real URL (has a dot, or is already http(s)) navigates
    // directly instead.
    target = /^[\w-]+(\.[\w-]+)+/.test(target) ? `https://${target}` : `https://www.google.com/search?q=${encodeURIComponent(target)}`;
  }
  activeView()?.webContents.loadURL(target).catch(() => {});
});
ipcMain.on("nav-back", () => { const v = activeView(); if (v?.webContents.canGoBack()) v.webContents.goBack(); });
ipcMain.on("nav-forward", () => { const v = activeView(); if (v?.webContents.canGoForward()) v.webContents.goForward(); });
ipcMain.on("nav-reload", () => activeView()?.webContents.reload());
ipcMain.on("nav-home", () => activeView()?.webContents.loadURL(START_URL));
ipcMain.handle("nav-current-url", () => activeView()?.webContents.getURL() || "");

// ---------- Panel <-> active portal tab bridge ----------
ipcMain.handle("portal-scan", async () => {
  const view = activeView();
  if (!view) return null;
  try { return await view.webContents.executeJavaScript("(window.__soupScanPage ? window.__soupScanPage() : null)"); }
  catch { return null; }
});
ipcMain.handle("portal-fill", async (_e, assignments) => {
  const view = activeView();
  if (!view) return [];
  try { return await view.webContents.executeJavaScript(`(window.__soupFillFields(${JSON.stringify(assignments || [])}))`); }
  catch { return []; }
});
ipcMain.handle("open-external", (_e, url) => shell.openExternal(url));

// ---------- Document auto-attach (Chrome DevTools Protocol) ----------
async function attachDocumentToField(fieldId, documentUrl, fileName) {
  const view = activeView();
  if (!view) return { ok: false, reason: "NO_ACTIVE_TAB" };

  // DOM.setFileInputFiles needs a real path on disk, the same as if the
  // student had picked the file themselves — it cannot point at a remote
  // URL, so the signed document URL is downloaded to a local temp file
  // first.
  let localPath;
  try {
    const response = await fetch(documentUrl);
    if (!response.ok) return { ok: false, reason: "DOWNLOAD_FAILED" };
    const buffer = Buffer.from(await response.arrayBuffer());
    const dir = path.join(app.getPath("temp"), "soup-companion");
    fs.mkdirSync(dir, { recursive: true });
    const safeName = String(fileName || "document").replace(/[^a-zA-Z0-9.\-_]/g, "_");
    localPath = path.join(dir, `${Date.now()}-${safeName}`);
    fs.writeFileSync(localPath, buffer);
  } catch {
    return { ok: false, reason: "DOWNLOAD_FAILED" };
  }

  const wc = view.webContents;
  const debug = wc.debugger;
  try {
    debug.attach("1.3");
  } catch (error) {
    if (!String(error && error.message).includes("already attached")) return { ok: false, reason: "DEBUGGER_ATTACH_FAILED" };
  }
  try {
    await debug.sendCommand("DOM.enable");
    const selector = `[data-soup-field-id="${fieldId}"]`;
    const evalResult = await debug.sendCommand("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(selector)})` });
    const objectId = evalResult && evalResult.result && evalResult.result.objectId;
    if (!objectId) return { ok: false, reason: "FIELD_NOT_FOUND" };
    const node = await debug.sendCommand("DOM.requestNode", { objectId });
    if (!node || !node.nodeId) return { ok: false, reason: "FIELD_NOT_FOUND" };
    await debug.sendCommand("DOM.setFileInputFiles", { files: [localPath], nodeId: node.nodeId });
    return { ok: true };
  } catch {
    return { ok: false, reason: "CDP_ERROR" };
  } finally {
    try { debug.detach(); } catch { /* already detached */ }
  }
}
ipcMain.handle("portal-attach-document", (_e, { fieldId, documentUrl, fileName }) => attachDocumentToField(fieldId, documentUrl, fileName));

// ---------- Local persistence (Electron's equivalent of chrome.storage.local) ----------
ipcMain.handle("store-get", (_e, keys) => {
  const store = readStore();
  if (!Array.isArray(keys)) return store;
  const out = {};
  keys.forEach((key) => { if (key in store) out[key] = store[key]; });
  return out;
});
ipcMain.handle("store-set", (_e, values) => {
  const store = readStore();
  Object.assign(store, values || {});
  writeStore(store);
});
ipcMain.handle("store-remove", (_e, keys) => {
  const store = readStore();
  (Array.isArray(keys) ? keys : [keys]).forEach((key) => delete store[key]);
  writeStore(store);
});
