// SOUP Companion — background service worker.
// Kept deliberately thin: it only (1) makes the toolbar icon open the side
// panel directly, and (2) tells an already-open side panel when the active
// tab changes, so the panel knows to re-scan the new page. All real work
// (DOM scanning, filling, talking to the SOUP backend) happens in the
// content script and side panel themselves.

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

function notifyTabChanged(tabId) {
  chrome.runtime.sendMessage({ type: "SOUP_TAB_CHANGED", tabId }).catch(() => {
    // No open side panel to receive it — that's fine, it will scan on open.
  });
}

chrome.tabs.onActivated.addListener(({ tabId }) => notifyTabChanged(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) notifyTabChanged(tabId);
});
