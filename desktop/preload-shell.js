const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("soupShell", {
  navigate: (url) => ipcRenderer.send("nav-go", url),
  back: () => ipcRenderer.send("nav-back"),
  forward: () => ipcRenderer.send("nav-forward"),
  reload: () => ipcRenderer.send("nav-reload"),
  home: () => ipcRenderer.send("nav-home"),
  currentUrl: () => ipcRenderer.invoke("nav-current-url"),
  onUrlChanged: (callback) => {
    const listener = (_event, url) => callback(url);
    ipcRenderer.on("portal-url-changed", listener);
    return () => ipcRenderer.removeListener("portal-url-changed", listener);
  },
  onFocusAddressBar: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("focus-address-bar", listener);
    return () => ipcRenderer.removeListener("focus-address-bar", listener);
  },
});
