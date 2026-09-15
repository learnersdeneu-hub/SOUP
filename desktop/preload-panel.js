const { contextBridge, ipcRenderer } = require("electron");

// The desktop equivalent of the browser extension's chrome.* APIs, scoped to
// exactly what panel.js needs — mirrors sidepanel.js's function names
// closely on purpose, so porting that file over was a small, mechanical
// change rather than a rewrite. Also carries the portal's navigation
// controls (address bar, back/forward/reload) — the panel renders and owns
// these now, see main.js for why.
contextBridge.exposeInMainWorld("soupDesktop", {
  scanPage: () => ipcRenderer.invoke("portal-scan"),
  fillFields: (assignments) => ipcRenderer.invoke("portal-fill", assignments),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  storageGet: (keys) => ipcRenderer.invoke("store-get", keys),
  storageSet: (values) => ipcRenderer.invoke("store-set", values),
  storageRemove: (keys) => ipcRenderer.invoke("store-remove", keys),
  navigate: (url) => ipcRenderer.send("nav-go", url),
  navBack: () => ipcRenderer.send("nav-back"),
  navForward: () => ipcRenderer.send("nav-forward"),
  navReload: () => ipcRenderer.send("nav-reload"),
  navHome: () => ipcRenderer.send("nav-home"),
  currentUrl: () => ipcRenderer.invoke("nav-current-url"),
  onTabChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("tab-changed", listener);
    return () => ipcRenderer.removeListener("tab-changed", listener);
  },
  onPortalUrlChanged: (callback) => {
    const listener = (_event, url) => callback(url);
    ipcRenderer.on("portal-url-changed", listener);
    return () => ipcRenderer.removeListener("portal-url-changed", listener);
  },
});
