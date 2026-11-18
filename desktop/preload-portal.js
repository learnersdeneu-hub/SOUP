const { contextBridge, ipcRenderer } = require("electron");

// The portal view (the real application site) previously had no preload at
// all -- main.js only ever talked TO it (executeJavaScript for scan/fill),
// never heard FROM it. That one-way wiring meant a multi-step/wizard form
// changing its own fields after the initial page load (no full navigation,
// so none of main.js's did-navigate/dom-ready listeners fire again) left
// the panel scanning a page that no longer matched what the student sees.
// This is the one, narrow thing the portal view can now tell main.js:
// "my form just changed, you may want to rescan" -- nothing else is
// exposed, matching the sandboxed/contextIsolated posture this view
// already had.
contextBridge.exposeInMainWorld("soupPortal", {
  notifyDomChanged: () => ipcRenderer.send("portal-dom-changed"),
});
