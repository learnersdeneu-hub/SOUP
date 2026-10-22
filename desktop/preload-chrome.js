const { contextBridge, ipcRenderer } = require("electron");

// Scoped bridge for the browser-chrome BrowserView (tab strip + address
// bar) — separate from preload-panel.js's soupDesktop because this view
// has a different job (own the tabs) and should not also carry the SOUP
// assistant's scan/fill/storage surface.
contextBridge.exposeInMainWorld("soupChrome", {
  tabList: () => ipcRenderer.invoke("tab-list"),
  newTab: (url) => ipcRenderer.invoke("tab-new", url),
  closeTab: (id) => ipcRenderer.invoke("tab-close", id),
  switchTab: (id) => ipcRenderer.invoke("tab-switch", id),
  navigate: (url) => ipcRenderer.send("nav-go", url),
  back: () => ipcRenderer.send("nav-back"),
  forward: () => ipcRenderer.send("nav-forward"),
  reload: () => ipcRenderer.send("nav-reload"),
  home: () => ipcRenderer.send("nav-home"),
  navState: () => ipcRenderer.invoke("nav-state"),
  onTabsChanged: (callback) => {
    const listener = (_event, tabs) => callback(tabs);
    ipcRenderer.on("tabs-changed", listener);
    return () => ipcRenderer.removeListener("tabs-changed", listener);
  },
});
