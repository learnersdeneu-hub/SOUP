// SOUP Companion desktop — browser chrome (tab strip + address bar) logic.
// Talks to main.js only through window.soupChrome (see preload-chrome.js).
// Pushed tab-list updates render the strip; nav state (back/forward/url) is
// pulled on demand rather than pushed, since it only matters right after an
// action this script itself just took.

const tabstrip = document.getElementById("tabstrip");
const addressForm = document.getElementById("address-form");
const addressInput = document.getElementById("address-input");

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderTabs(tabs) {
  tabstrip.innerHTML = "";
  tabs.forEach((tab) => {
    const el = document.createElement("div");
    el.className = `cc-tab${tab.active ? " active" : ""}`;
    el.setAttribute("role", "tab");
    el.innerHTML = `
      <span class="cc-tab-title">${escapeHtml(tab.title || "New tab")}</span>
      <button class="cc-tab-close" aria-label="Close tab" data-close="${tab.id}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    `;
    el.addEventListener("click", (event) => {
      if (event.target.closest("[data-close]")) return;
      window.soupChrome.switchTab(tab.id);
    });
    el.querySelector("[data-close]").addEventListener("click", (event) => {
      event.stopPropagation();
      window.soupChrome.closeTab(tab.id);
    });
    tabstrip.appendChild(el);
  });
  const newTabBtn = document.createElement("button");
  newTabBtn.className = "cc-tab-new";
  newTabBtn.setAttribute("aria-label", "New tab");
  newTabBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  newTabBtn.addEventListener("click", () => window.soupChrome.newTab());
  tabstrip.appendChild(newTabBtn);
}

async function refreshNavState() {
  const state = await window.soupChrome.navState();
  document.getElementById("btn-back").disabled = !state.canGoBack;
  document.getElementById("btn-forward").disabled = !state.canGoForward;
  // Never clobber an address the student is actively typing.
  if (document.activeElement !== addressInput) addressInput.value = state.url || "";
}

document.querySelectorAll("[data-action]").forEach((btn) => {
  btn.id = `btn-${btn.dataset.action}`;
  btn.addEventListener("click", async () => {
    const action = btn.dataset.action;
    if (action === "back") await window.soupChrome.back();
    else if (action === "forward") await window.soupChrome.forward();
    else if (action === "reload") await window.soupChrome.reload();
    else if (action === "home") await window.soupChrome.home();
    refreshNavState();
  });
});

addressForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = addressInput.value.trim();
  if (!value) return;
  window.soupChrome.navigate(value);
  addressInput.blur();
});

window.soupChrome.onTabsChanged((tabs) => {
  renderTabs(tabs);
  refreshNavState();
});

(async function init() {
  const tabs = await window.soupChrome.tabList();
  renderTabs(tabs);
  refreshNavState();
})();
