const { contextBridge, ipcRenderer } = require("electron");

// The desktop equivalent of the browser extension's chrome.* APIs, scoped to
// exactly what panel.js needs — mirrors sidepanel.js's function names
// closely on purpose, so porting that file over was a small, mechanical
// change rather than a rewrite.
contextBridge.exposeInMainWorld("soupDesktop", {
  scanPage: () => ipcRenderer.invoke("portal-scan"),
  fillFields: (assignments) => ipcRenderer.invoke("portal-fill", assignments),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  storageGet: (keys) => ipcRenderer.invoke("store-get", keys),
  storageSet: (values) => ipcRenderer.invoke("store-set", values),
  storageRemove: (keys) => ipcRenderer.invoke("store-remove", keys),
  onTabChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("tab-changed", listener);
    return () => ipcRenderer.removeListener("tab-changed", listener);
  },
});
