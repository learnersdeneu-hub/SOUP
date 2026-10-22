const { contextBridge, ipcRenderer } = require("electron");

// The desktop equivalent of the browser extension's chrome.* APIs, scoped to
// exactly what panel.js needs — mirrors sidepanel.js's function names
// closely on purpose, so porting that file over was a small, mechanical
// change rather than a rewrite. Navigation (address bar, tabs, back/
// forward/reload) is a separate concern owned by the chrome BrowserView —
// see preload-chrome.js/chrome.js and main.js's createChromeView() — so
// this bridge only carries the SOUP assistant's own scan/fill/attach/
// storage surface, plus the two events it reacts to (switching tabs, or
// the active tab navigating) to know when to re-scan.
contextBridge.exposeInMainWorld("soupDesktop", {
  scanPage: () => ipcRenderer.invoke("portal-scan"),
  fillFields: (assignments) => ipcRenderer.invoke("portal-fill", assignments),
  attachDocument: (fieldId, documentUrl, fileName) => ipcRenderer.invoke("portal-attach-document", { fieldId, documentUrl, fileName }),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  storageGet: (keys) => ipcRenderer.invoke("store-get", keys),
  storageSet: (values) => ipcRenderer.invoke("store-set", values),
  storageRemove: (keys) => ipcRenderer.invoke("store-remove", keys),
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
