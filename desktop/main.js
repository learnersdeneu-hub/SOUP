// SOUP Companion desktop — main process.
//
// Architecture: one window with two BrowserViews side by side — a "portal"
// view (a real, minimal built-in browser the student navigates to the
// actual university/visa/accommodation site) and a "panel" view (the SOUP
// assistant UI, ported from the browser-extension side panel). The main
// process injects inject/field-dictionary.js + inject/portal-bridge.js into
// the portal view on every page load, then calls the functions those
// scripts define via executeJavaScript when the panel asks it to scan or
// fill — this is the desktop equivalent of a browser extension's content
// script, using Electron's own first-party page access instead of the
// extension APIs a Chrome extension would need.
const { app, BrowserWindow, BrowserView, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const PANEL_WIDTH = 380;
const TOOLBAR_HEIGHT = 46;
const START_URL = "https://www.soupassist.com/universities";

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
let portalView = null;
let panelView = null;

function layout() {
  if (!mainWindow || !portalView || !panelView) return;
  const bounds = mainWindow.getContentBounds();
  const portalWidth = Math.max(320, bounds.width - PANEL_WIDTH);
  portalView.setBounds({ x: 0, y: TOOLBAR_HEIGHT, width: portalWidth, height: Math.max(0, bounds.height - TOOLBAR_HEIGHT) });
  panelView.setBounds({ x: portalWidth, y: TOOLBAR_HEIGHT, width: bounds.width - portalWidth, height: Math.max(0, bounds.height - TOOLBAR_HEIGHT) });
}

function injectBridge() {
  if (!portalView) return;
  const dict = fs.readFileSync(path.join(__dirname, "inject", "field-dictionary.js"), "utf8");
  const bridge = fs.readFileSync(path.join(__dirname, "inject", "portal-bridge.js"), "utf8");
  portalView.webContents.executeJavaScript(`${dict}\n${bridge}`).catch(() => {});
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: "SOUP Companion",
    icon: path.join(__dirname, "icons", "icon.png"),
    webPreferences: { contextIsolation: true, preload: path.join(__dirname, "preload-shell.js") },
  });
  mainWindow.loadFile(path.join(__dirname, "shell.html"));
  mainWindow.setMenuBarVisibility(false);

  portalView = new BrowserView({ webPreferences: { contextIsolation: true, sandbox: true } });
  mainWindow.addBrowserView(portalView);
  portalView.webContents.on("dom-ready", injectBridge);
  portalView.webContents.on("did-navigate", (_e, url) => {
    mainWindow?.webContents.send("portal-url-changed", url);
    panelView?.webContents.send("tab-changed");
  });
  portalView.webContents.on("did-navigate-in-page", (_e, url) => {
    mainWindow?.webContents.send("portal-url-changed", url);
  });
  portalView.webContents.loadURL(START_URL);

  panelView = new BrowserView({ webPreferences: { contextIsolation: true, preload: path.join(__dirname, "preload-panel.js") } });
  mainWindow.addBrowserView(panelView);
  panelView.webContents.loadFile(path.join(__dirname, "panel", "index.html"));

  mainWindow.on("resize", layout);
  mainWindow.once("ready-to-show", layout);
  layout();
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ---------- Toolbar (portal navigation) ----------
ipcMain.on("nav-go", (_e, rawUrl) => {
  let target = String(rawUrl || "").trim();
  if (!target) return;
  if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
  portalView?.webContents.loadURL(target).catch(() => {});
});
ipcMain.on("nav-back", () => { if (portalView?.webContents.canGoBack()) portalView.webContents.goBack(); });
ipcMain.on("nav-forward", () => { if (portalView?.webContents.canGoForward()) portalView.webContents.goForward(); });
ipcMain.on("nav-reload", () => portalView?.webContents.reload());
ipcMain.on("nav-home", () => portalView?.webContents.loadURL(START_URL));
ipcMain.handle("nav-current-url", () => portalView?.webContents.getURL() || "");

// ---------- Panel <-> portal bridge ----------
ipcMain.handle("portal-scan", async () => {
  if (!portalView) return null;
  try { return await portalView.webContents.executeJavaScript("(window.__soupScanPage ? window.__soupScanPage() : null)"); }
  catch { return null; }
});
ipcMain.handle("portal-fill", async (_e, assignments) => {
  if (!portalView) return [];
  try { return await portalView.webContents.executeJavaScript(`(window.__soupFillFields(${JSON.stringify(assignments || [])}))`); }
  catch { return []; }
});
ipcMain.handle("open-external", (_e, url) => shell.openExternal(url));

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
