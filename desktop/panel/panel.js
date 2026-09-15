// SOUP Companion desktop — panel UI.
// Ported from extension/sidepanel.js: identical state machine and rendering
// logic. The only real changes are the transport calls at the bottom of this
// file (window.soupDesktop.* via the preload bridge, instead of chrome.* —
// see preload-panel.js) and the header image path (../icons/ instead of
// icons/, since this file lives in panel/ alongside the portal, not at the
// extension root).

const API_BASE = "https://www.soupassist.com";
const STORAGE_KEY_TOKEN = "soup_companion_token";
const STORAGE_KEY_PROFILE = "soup_companion_profile";

const GROUP_LABELS = { personal: "Personal", contact: "Contact", education: "Education", documents: "Documents" };
const GROUP_ORDER = ["personal", "contact", "education", "documents"];

const state = {
  screen: "loading",
  loadingMessage: "Starting SOUP Companion…",
  token: null,
  profile: null,
  context: null,
  scan: null,
  resolved: [],
  fillResults: null,
  fillSummary: null,
  askDraft: "",
  reviewOpenField: null,
  error: null,
  documentsOpen: false,
  currentPortalUrl: "",
};

// ---------- transport (desktop bridge, see preload-panel.js) ----------
function storageGet(keys) { return window.soupDesktop.storageGet(keys); }
function storageSet(values) { return window.soupDesktop.storageSet(values); }
function storageRemove(keys) { return window.soupDesktop.storageRemove(keys); }
function scanPortal() { return window.soupDesktop.scanPage(); }
function fillPortal(assignments) { return window.soupDesktop.fillFields(assignments); }
function openExternal(url) { return window.soupDesktop.openExternal(url); }

// ---------- backend ----------
async function apiFetch(path, options = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, Object.assign({}, options, { headers }));
  } catch (networkError) {
    throw new ApiError("OFFLINE", "SOUP could not be reached. Check your connection and try again.");
  }
  let body = {};
  try { body = await response.json(); } catch (e) { body = {}; }
  if (response.status === 401) throw new ApiError("SIGNED_OUT", body.error || "Companion is no longer connected.");
  if (!response.ok) throw new ApiError("BACKEND_ERROR", body.error || "SOUP backend is temporarily unavailable.");
  return body;
}
class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// ---------- field resolution ----------
function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function findDocumentFact(matchedKey, documentFacts) {
  if (!documentFacts || !documentFacts.length) return null;
  const needle = matchedKey.toLowerCase();
  const keywordMap = {
    passportNumber: ["passport"],
    passportExpiry: ["passport", "expir"],
    dateOfBirth: ["birth", "dob"],
    nationality: ["nationalit"],
  };
  const keywords = keywordMap[matchedKey];
  if (!keywords) return null;
  return documentFacts.find((fact) => {
    const field = fact.field.toLowerCase();
    return keywords.every((k) => field.includes(k)) || field.includes(needle);
  }) || null;
}

function resolveFields(scan, context) {
  if (!scan || !context) return [];
  return scan.fields.map((field) => {
    if (!field.matchedKey) return { field, answer: null, status: "unrecognized" };
    const bankEntry = context.answerBank[field.matchedKey];
    const docFact = !bankEntry ? findDocumentFact(field.matchedKey, context.documentFacts) : null;
    const answer = bankEntry
      ? { value: bankEntry.value, source: bankEntry.source, confidence: bankEntry.confidence }
      : docFact
        ? { value: docFact.value, source: `Extracted from your ${docFact.sourceDocumentType.replace(/_/g, " ").toLowerCase()}`, confidence: docFact.verified ? "VERIFIED" : "STATED" }
        : null;

    if (!answer) return { field, answer: null, status: "needs" };

    const hasCurrentValue = field.currentValue && field.currentValue.trim().length > 0;
    if (hasCurrentValue && normalize(field.currentValue) !== normalize(answer.value)) {
      return { field, answer, status: "conflict" };
    }
    return { field, answer, status: "ready" };
  });
}

function classifiedOnly(resolved) { return resolved.filter((r) => r.field.matchedKey); }

// ---------- rendering ----------
const app = document.getElementById("app");

// The panel re-renders wholesale on most state changes (simple, correct,
// fast enough at this size — see the file header). That would normally
// steal focus/cursor position out of the address bar mid-type, so its
// value and selection are explicitly preserved across a render() call
// rather than trying to avoid full re-renders altogether.
function render() {
  const navInput = document.getElementById("nav-url");
  const hadFocus = document.activeElement === navInput;
  const draft = navInput ? navInput.value : state.currentPortalUrl;
  const selectionStart = navInput ? navInput.selectionStart : null;
  const selectionEnd = navInput ? navInput.selectionEnd : null;

  app.innerHTML = "";
  app.appendChild(renderNavBar(draft));
  app.appendChild(renderHeader());
  const body = document.createElement("div");
  body.className = "sc-body";
  body.appendChild(renderScreen());
  app.appendChild(body);
  bindEvents();

  if (hadFocus) {
    const restored = document.getElementById("nav-url");
    restored?.focus();
    if (selectionStart !== null) restored?.setSelectionRange(selectionStart, selectionEnd);
  }
}

function renderNavBar(draftUrl) {
  return el(`
    <div class="sc-navbar">
      <button class="sc-nav-btn" data-action="nav-back" title="Back" aria-label="Back">&#8592;</button>
      <button class="sc-nav-btn" data-action="nav-forward" title="Forward" aria-label="Forward">&#8594;</button>
      <button class="sc-nav-btn" data-action="nav-reload" title="Reload" aria-label="Reload">&#8635;</button>
      <button class="sc-nav-btn" data-action="nav-home" title="SOUP home" aria-label="SOUP home">&#8962;</button>
      <form class="sc-navbar-form" data-role="nav-form">
        <input id="nav-url" class="sc-nav-input" placeholder="Go to a university, visa or accommodation site..." value="${escapeHtml(draftUrl || "")}" autocomplete="off" />
      </form>
    </div>
  `);
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function statusDotClass() {
  if (!state.token) return "off";
  if (state.error) return "warn";
  return "ok";
}

function renderHeader() {
  const portal = state.scan ? state.scan.portalHost : (state.token ? "Detecting page…" : "Not connected");
  return el(`
    <header class="sc-header">
      <img src="../icons/icon48.png" alt="" />
      <div class="sc-header-titles">
        <div class="sc-header-brand">SOUP Companion</div>
        <div class="sc-header-portal">${escapeHtml(portal)}</div>
      </div>
      <span class="sc-status-dot ${statusDotClass()}" title="${state.token ? "Connected" : "Not connected"}"></span>
      ${state.token ? '<button class="sc-icon-btn" data-action="rescan" title="Rescan this page" aria-label="Rescan this page">⟳</button>' : ""}
    </header>
  `);
}

function renderScreen() {
  switch (state.screen) {
    case "loading": return renderLoading();
    case "connect": return renderConnect();
    case "unsupported": return renderUnsupported();
    case "ready": return renderReady();
    case "review": return renderReview();
    case "filling": return renderFilling();
    case "success": return renderSuccess();
    case "ask": return renderAsk();
    case "error": return renderErrorScreen();
    default: return el('<div class="sc-card">Something went wrong.</div>');
  }
}

function renderLoading() {
  return el(`
    <div class="sc-center">
      <div class="sc-spinner"></div>
      <div class="sc-note">${escapeHtml(state.loadingMessage)}</div>
    </div>
  `);
}

function renderConnect() {
  return el(`
    <div class="sc-card">
      <div class="sc-eyebrow">Connect</div>
      <div class="sc-title">Connect your SOUP account</div>
      <p class="sc-note">Sign in at soupassist.com, open <strong>My SOUP → SOUP Companion</strong>, and generate a one-time code.</p>
      <div class="sc-field" style="margin-top:12px;">
        <label for="pairing-code">Pairing code</label>
        <input id="pairing-code" class="sc-input sc-code-input" maxlength="8" placeholder="XXXXXXXX" autocomplete="off" />
      </div>
      <button class="sc-btn sc-btn-primary" data-action="pair" style="margin-top:10px;">Connect</button>
      ${state.error ? `<div class="sc-error-text">${escapeHtml(state.error)}</div>` : ""}
      <div class="sc-divider" style="margin-top:14px;"></div>
      <a class="sc-link" style="font-size:11.5px;" href="#" data-action="open-connect-page">Open My SOUP → SOUP Companion</a>
    </div>
  `);
}

function renderUnsupported() {
  return el(`
    <div class="sc-center">
      <div class="sc-title">No familiar fields detected</div>
      <p class="sc-note">This page doesn't look like an application form SOUP recognises yet, or the form hasn't loaded. Companion still works here for general questions.</p>
      <div class="sc-btn-row" style="width:100%; margin-top:8px;">
        <button class="sc-btn sc-btn-secondary" data-action="rescan">Rescan page</button>
        <button class="sc-btn sc-btn-primary" data-action="open-ask">Ask Noodles</button>
      </div>
    </div>
  `);
}

function fieldCounts() {
  const classified = classifiedOnly(state.resolved);
  const ready = classified.filter((r) => r.status === "ready");
  const conflicts = classified.filter((r) => r.status === "conflict");
  const needs = classified.filter((r) => r.status === "needs");
  return { detected: classified.length, ready: ready.length, conflicts: conflicts.length, needs: needs.length, actionable: ready.length + conflicts.length + needs.length };
}

function stepperGroups() {
  const classified = classifiedOnly(state.resolved);
  return GROUP_ORDER.filter((group) => classified.some((r) => r.field.matchedGroup === group)).map((group) => {
    const items = classified.filter((r) => r.field.matchedGroup === group);
    const allReady = items.every((r) => r.status === "ready");
    const anyNeeds = items.some((r) => r.status === "needs" || r.status === "conflict");
    return { group, label: GROUP_LABELS[group], state: allReady ? "done" : anyNeeds ? "active" : "pending" };
  });
}

function renderReady() {
  const counts = fieldCounts();
  const app0 = state.context && state.context.applications && state.context.applications[0];
  const needsList = classifiedOnly(state.resolved).filter((r) => r.status === "needs").slice(0, 6);
  const conflictList = classifiedOnly(state.resolved).filter((r) => r.status === "conflict");
  const steps = stepperGroups();
  const documents = (state.context && state.context.documents) || [];

  return el(`
    <div class="sc-stack" style="display:flex; flex-direction:column; gap:12px;">
      ${app0 ? `
      <div class="sc-card">
        <div class="sc-eyebrow">Application context</div>
        <div class="sc-title">${escapeHtml(app0.university || "University application")}</div>
        <div class="sc-note">${escapeHtml([app0.program, app0.intake].filter(Boolean).join(" · ") || "Program and intake not yet confirmed")}</div>
      </div>` : ""}

      <div class="sc-card">
        <div class="sc-status-row">
          <div>
            <div class="sc-status-big">${counts.detected} field${counts.detected === 1 ? "" : "s"} detected</div>
            <div class="sc-status-sub">SOUP can complete ${counts.ready} of ${counts.detected}</div>
          </div>
        </div>
        <div class="sc-progress-track"><div class="sc-progress-fill" style="width:${counts.detected ? Math.round((counts.ready / counts.detected) * 100) : 0}%"></div></div>
        <button class="sc-btn sc-btn-primary" data-action="fill-page" style="margin-top:14px;" ${counts.ready === 0 ? "disabled" : ""}>Fill this page</button>
        <p class="sc-note" style="margin-top:8px;">Review before filling. SOUP will not submit anything without your confirmation.</p>
        <div class="sc-btn-row" style="margin-top:10px;">
          <button class="sc-btn sc-btn-secondary" data-action="open-review">Review answers</button>
          <button class="sc-btn sc-btn-secondary" data-action="open-ask">Ask Noodles</button>
        </div>
      </div>

      ${conflictList.length ? `
      <div class="sc-conflict">
        <div class="sc-conflict-title">⚠ Consistency check</div>
        <p class="sc-note" style="margin-top:6px;">${conflictList.length} answer${conflictList.length === 1 ? "" : "s"} on this page differ from your SOUP profile.</p>
        <button class="sc-btn sc-btn-secondary" data-action="open-review" style="margin-top:8px;">Review conflicts</button>
      </div>` : ""}

      ${needsList.length ? `
      <div class="sc-card">
        <div class="sc-eyebrow">Need from you</div>
        <ul class="sc-list" style="list-style:none; margin:8px 0 0; padding:0;">
          ${needsList.map((r) => `<li class="sc-list-row"><span class="sc-list-label">${escapeHtml(r.field.matchedLabel || r.field.label)}</span><span class="sc-pill sc-pill-needs">NEEDS INPUT</span></li>`).join("")}
        </ul>
      </div>` : ""}

      ${steps.length ? `
      <div class="sc-card">
        <div class="sc-eyebrow">This page's progress</div>
        <div class="sc-stepper" style="margin-top:10px;">
          ${steps.map((s) => `<span class="sc-step ${s.state === "done" ? "done" : s.state === "active" ? "active" : ""}">${s.state === "done" ? "✓" : s.state === "active" ? "→" : "○"} ${escapeHtml(s.label)}</span>`).join("")}
        </div>
      </div>` : ""}

      <div class="sc-card">
        <button class="sc-collapsible-toggle" data-action="toggle-documents">
          <span class="sc-eyebrow">Documents (${documents.length})</span>
          <span class="sc-btn-ghost" style="padding:0;">${state.documentsOpen ? "Hide" : "Show"}</span>
        </button>
        ${state.documentsOpen ? renderDocumentsList(documents) : ""}
      </div>
    </div>
  `);
}

function renderDocumentsList(documents) {
  if (!documents.length) return `<p class="sc-note" style="margin-top:8px;">No documents in your SOUP vault yet. <a class="sc-link" href="#" data-action="open-documents-page">Upload one</a>.</p>`;
  return `<ul class="sc-list" style="list-style:none; margin:8px 0 0; padding:0;">
    ${documents.slice(0, 6).map((doc) => `
      <li class="sc-list-row">
        <div>
          <div class="sc-list-label">${escapeHtml((doc.documentType || "Document").replace(/_/g, " "))}</div>
          <div class="sc-list-sub">${escapeHtml(doc.originalFileName || "")} · ${doc.reviewStatus === "APPROVED" ? "Verified" : doc.reviewStatus.replace(/_/g, " ").toLowerCase()}</div>
        </div>
        <button class="sc-btn sc-btn-ghost" data-action="open-document" data-document-id="${doc.id}">Use document</button>
      </li>`).join("")}
  </ul>`;
}

function renderReview() {
  const classified = classifiedOnly(state.resolved);
  const groups = GROUP_ORDER.map((group) => ({ group, label: GROUP_LABELS[group], items: classified.filter((r) => r.field.matchedGroup === group) })).filter((g) => g.items.length);
  return el(`
    <div>
      <div class="sc-back-row"><button class="sc-btn-ghost" data-action="back-to-ready">← Back</button></div>
      <div class="sc-title" style="margin-bottom:8px;">Review answers</div>
      ${groups.map((g) => `
        <div class="sc-card" style="margin-bottom:10px;">
          <div class="sc-eyebrow">${escapeHtml(g.label)}</div>
          <ul class="sc-list" style="list-style:none; margin:8px 0 0; padding:0;">
            ${g.items.map((r) => renderReviewRow(r)).join("")}
          </ul>
        </div>
      `).join("") || '<p class="sc-note">No recognised fields on this page yet.</p>'}
    </div>
  `);
}

function renderReviewRow(r) {
  const label = r.field.matchedLabel || r.field.label;
  if (r.status === "ready") {
    return `<li class="sc-list-row">
      <div><div class="sc-list-label">${escapeHtml(label)}</div><div class="sc-list-value">${escapeHtml(r.answer.value)}</div></div>
      <span class="sc-pill sc-pill-ready">✓ ${escapeHtml(r.answer.source)}</span>
    </li>`;
  }
  if (r.status === "conflict") {
    return `<li class="sc-list-row" style="flex-direction:column; align-items:stretch;">
      <div style="display:flex; justify-content:space-between; gap:8px;"><span class="sc-list-label">${escapeHtml(label)}</span><span class="sc-pill sc-pill-conflict">CONFLICT</span></div>
      <div class="sc-note" style="margin-top:4px;">Page says <strong>${escapeHtml(r.field.currentValue)}</strong>. SOUP says <strong>${escapeHtml(r.answer.value)}</strong> (${escapeHtml(r.answer.source)}).</div>
      <div class="sc-btn-row" style="margin-top:8px;">
        <button class="sc-btn sc-btn-secondary" data-action="use-soup-value" data-field-id="${r.field.id}">Use SOUP information</button>
        <button class="sc-btn sc-btn-secondary" data-action="keep-current-value" data-field-id="${r.field.id}">Keep current answer</button>
      </div>
    </li>`;
  }
  const isOpen = state.reviewOpenField === r.field.id;
  return `<li class="sc-list-row" style="flex-direction:column; align-items:stretch;">
    <div style="display:flex; justify-content:space-between; gap:8px;"><span class="sc-list-label">${escapeHtml(label)}</span><span class="sc-pill sc-pill-missing">NEEDS ANSWER</span></div>
    ${isOpen ? `
      <div class="sc-field" style="margin-top:8px;">
        <input class="sc-input" id="answer-input-${r.field.id}" placeholder="Type your answer" />
      </div>
      <div class="sc-btn-row" style="margin-top:8px;">
        <button class="sc-btn sc-btn-primary" data-action="save-answer" data-field-id="${r.field.id}">Save & continue</button>
      </div>
      <p class="sc-note" style="margin-top:6px;">This fills the field on this page. Tell Noodles if you'd like it saved to your SOUP profile too.</p>
    ` : `<button class="sc-btn sc-btn-secondary" data-action="add-answer" data-field-id="${r.field.id}" style="margin-top:8px; width:auto;">Add answer</button>`}
  </li>`;
}

function renderFilling() {
  const items = state.fillPlan || [];
  return el(`
    <div class="sc-card">
      <div class="sc-title">Filling application…</div>
      <div class="sc-checklist" style="margin-top:12px;">
        ${items.map((item, index) => `
          <div class="sc-checklist-item ${index < state.fillRevealCount ? "done" : index === state.fillRevealCount ? "active" : ""}">
            <span class="sc-check-icon">${index < state.fillRevealCount ? "✓" : "•"}</span>
            <span>${escapeHtml(item.label)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `);
}

function renderSuccess() {
  const s = state.fillSummary || { filled: 0, needInput: 0, conflicts: 0 };
  return el(`
    <div class="sc-card">
      <div class="sc-eyebrow">Page complete</div>
      <div class="sc-title">${s.filled} field${s.filled === 1 ? "" : "s"} filled</div>
      <ul class="sc-list" style="list-style:none; margin:10px 0 0; padding:0;">
        <li class="sc-list-row"><span>Fields filled</span><strong>${s.filled}</strong></li>
        <li class="sc-list-row"><span>Still need your input</span><strong>${s.needInput}</strong></li>
        <li class="sc-list-row"><span>Conflicts detected</span><strong>${s.conflicts}</strong></li>
      </ul>
      <button class="sc-btn sc-btn-primary" data-action="continue-after-success" style="margin-top:12px;">Continue</button>
    </div>
  `);
}

function renderAsk() {
  const pageNote = state.scan ? `${state.scan.pageTitle} (${state.scan.portalHost})` : "this page";
  return el(`
    <div>
      <div class="sc-back-row"><button class="sc-btn-ghost" data-action="back-to-ready">← Back</button></div>
      <div class="sc-card">
        <div class="sc-eyebrow">Ask Noodles</div>
        <p class="sc-note">Noodles already knows you're on ${escapeHtml(pageNote)}. Opens in your default browser so you keep your progress here.</p>
        <textarea class="sc-input" id="ask-noodles-text" rows="3" placeholder="e.g. Why do you want to study this programme?" style="margin-top:10px; resize:vertical;">${escapeHtml(state.askDraft)}</textarea>
        <button class="sc-btn sc-btn-primary" data-action="submit-ask" style="margin-top:10px;">Ask Noodles</button>
      </div>
    </div>
  `);
}

function renderErrorScreen() {
  const messages = {
    OFFLINE: "SOUP Companion is offline. Check your connection and try again.",
    SIGNED_OUT: "Companion is no longer connected to your SOUP account.",
    BACKEND_ERROR: "SOUP is temporarily unavailable. Your page and progress here are untouched.",
  };
  return el(`
    <div class="sc-center">
      <div class="sc-title">${escapeHtml(messages[state.error && state.error.code] || "Something went wrong")}</div>
      <p class="sc-note">${escapeHtml((state.error && state.error.message) || "")}</p>
      <div class="sc-btn-row" style="width:100%;">
        ${state.error && state.error.code === "SIGNED_OUT"
          ? '<button class="sc-btn sc-btn-primary" data-action="reconnect">Reconnect</button>'
          : '<button class="sc-btn sc-btn-primary" data-action="rescan">Try again</button>'}
      </div>
    </div>
  `);
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- actions ----------
function bindEvents() {
  app.querySelectorAll("[data-action]").forEach((node) => {
    node.addEventListener("click", (event) => {
      const action = node.dataset.action;
      handleAction(action, node, event);
    });
  });
  const navForm = app.querySelector('[data-role="nav-form"]');
  navForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("nav-url");
    if (input && input.value.trim()) window.soupDesktop.navigate(input.value.trim());
  });
}

async function handleAction(action, node) {
  switch (action) {
    case "pair": return doPair();
    case "reconnect": return doReconnect();
    case "rescan": return runScan();
    case "nav-back": return window.soupDesktop.navBack();
    case "nav-forward": return window.soupDesktop.navForward();
    case "nav-reload": return window.soupDesktop.navReload();
    case "nav-home": return window.soupDesktop.navHome();
    case "toggle-documents": state.documentsOpen = !state.documentsOpen; return render();
    case "open-document": return openDocument(node.dataset.documentId);
    case "open-review": state.screen = "review"; return render();
    case "back-to-ready": state.screen = "ready"; return render();
    case "open-ask": state.screen = "ask"; return render();
    case "submit-ask": return submitAsk();
    case "fill-page": return startFill();
    case "continue-after-success": state.screen = "ready"; return runScanQuiet();
    case "add-answer": state.reviewOpenField = node.dataset.fieldId; return render();
    case "save-answer": return saveAnswer(node.dataset.fieldId);
    case "use-soup-value": return applySoupValue(node.dataset.fieldId);
    case "keep-current-value": return keepCurrentValue(node.dataset.fieldId);
    case "open-connect-page": return openExternal(`${API_BASE}/companion/connect`);
    case "open-documents-page": return openExternal(`${API_BASE}/documents`);
    default: return null;
  }
}

async function doPair() {
  const input = document.getElementById("pairing-code");
  const code = input ? input.value.trim() : "";
  if (!code) { state.error = "Enter the code shown on soupassist.com."; return render(); }
  state.screen = "loading"; state.loadingMessage = "Connecting…"; render();
  try {
    const body = await apiFetch("/api/companion/pair", { method: "POST", body: JSON.stringify({ code, deviceLabel: "SOUP Companion (Desktop)" }) });
    state.token = body.token;
    state.profile = body.profile;
    await storageSet({ [STORAGE_KEY_TOKEN]: body.token, [STORAGE_KEY_PROFILE]: body.profile });
    state.error = null;
    await runScan();
  } catch (error) {
    state.screen = "connect";
    state.error = error.message || "Could not connect.";
    render();
  }
}

async function doReconnect() {
  await storageRemove([STORAGE_KEY_TOKEN, STORAGE_KEY_PROFILE]);
  state.token = null; state.profile = null; state.error = null;
  state.screen = "connect";
  render();
}

async function loadContext() {
  state.context = await apiFetch("/api/companion/context");
}

async function runScan(quiet) {
  if (!quiet) { state.screen = "loading"; state.loadingMessage = "Scanning this page…"; render(); }
  try {
    if (!state.context) { state.loadingMessage = "Loading your SOUP profile…"; if (!quiet) render(); await loadContext(); }
    const scan = await scanPortal();
    if (!scan) { state.scan = null; state.resolved = []; state.screen = "unsupported"; return render(); }
    state.scan = scan;
    state.resolved = resolveFields(scan, state.context);
    const counts = fieldCounts();
    state.screen = counts.detected === 0 ? "unsupported" : "ready";
    render();
  } catch (error) {
    state.error = { code: error.code || "BACKEND_ERROR", message: error.message };
    state.screen = "error";
    render();
  }
}
function runScanQuiet() { return runScan(true); }

async function startFill() {
  const targets = classifiedOnly(state.resolved).filter((r) => r.status === "ready" && normalize(r.field.currentValue) !== normalize(r.answer.value));
  const plan = targets.map((r) => ({ fieldId: r.field.id, value: r.answer.value, label: r.field.matchedLabel || r.field.label }));
  if (!plan.length) {
    state.fillSummary = { filled: 0, needInput: fieldCounts().needs, conflicts: fieldCounts().conflicts };
    state.screen = "success";
    return render();
  }
  state.screen = "filling";
  state.fillPlan = plan;
  state.fillRevealCount = 0;
  render();

  const results = (await fillPortal(plan.map((p) => ({ fieldId: p.fieldId, value: p.value })))) || [];
  const succeeded = results.filter((r) => r.ok).length;

  for (let i = 0; i < plan.length; i++) {
    state.fillRevealCount = i + 1;
    render();
    await new Promise((resolve) => setTimeout(resolve, 140));
  }

  const counts = fieldCounts();
  state.fillSummary = { filled: succeeded, needInput: counts.needs, conflicts: counts.conflicts };
  apiFetch("/api/companion/fill-event", {
    method: "POST",
    body: JSON.stringify({
      portalHost: state.scan.portalHost,
      pageUrl: state.scan.pageUrl,
      fieldsDetected: counts.detected,
      fieldsFilled: succeeded,
      fieldsNeedInput: counts.needs,
      outcome: succeeded === plan.length ? "COMPLETED" : succeeded > 0 ? "PARTIAL" : "ERROR",
    }),
  }).catch(() => {});
  state.screen = "success";
  render();
}

async function saveAnswer(fieldId) {
  const input = document.getElementById(`answer-input-${fieldId}`);
  const value = input ? input.value.trim() : "";
  if (!value) return;
  await fillPortal([{ fieldId, value }]);
  state.reviewOpenField = null;
  const entry = state.resolved.find((r) => r.field.id === fieldId);
  if (entry) { entry.status = "ready"; entry.answer = { value, source: "You answered this", confidence: "STATED" }; entry.field.currentValue = value; }
  render();
}

async function applySoupValue(fieldId) {
  const entry = state.resolved.find((r) => r.field.id === fieldId);
  if (!entry) return;
  await fillPortal([{ fieldId, value: entry.answer.value }]);
  entry.status = "ready";
  entry.field.currentValue = entry.answer.value;
  render();
}
function keepCurrentValue(fieldId) {
  const entry = state.resolved.find((r) => r.field.id === fieldId);
  if (!entry) return;
  entry.status = "ready";
  entry.answer = { value: entry.field.currentValue, source: "Kept your current answer", confidence: "STATED" };
  render();
}

async function openDocument(documentId) {
  try {
    const body = await apiFetch(`/api/companion/documents/${encodeURIComponent(documentId)}/link`, { method: "POST" });
    openExternal(body.url);
  } catch (error) {
    state.error = { code: error.code || "BACKEND_ERROR", message: error.message };
    state.screen = "error";
    render();
  }
}

function submitAsk() {
  const textarea = document.getElementById("ask-noodles-text");
  const question = textarea ? textarea.value.trim() : "";
  const pageContext = state.scan ? ` I'm currently on ${state.scan.pageTitle} at ${state.scan.portalHost}.` : "";
  const prompt = `${question || "Can you help me with this application page?"}${pageContext}`;
  openExternal(`${API_BASE}/counselor?intent=universities&prompt=${encodeURIComponent(prompt)}`);
}

// ---------- init ----------
async function init() {
  render(); // paint the nav bar immediately, before the token lookup resolves
  const stored = await storageGet([STORAGE_KEY_TOKEN, STORAGE_KEY_PROFILE]);
  state.token = stored[STORAGE_KEY_TOKEN] || null;
  state.profile = stored[STORAGE_KEY_PROFILE] || null;
  const currentUrl = await window.soupDesktop.currentUrl();
  if (currentUrl) state.currentPortalUrl = currentUrl;
  if (!state.token) { state.screen = "connect"; return render(); }
  await runScan();
}

window.soupDesktop.onTabChanged(() => { if (state.token) runScanQuiet(); });
window.soupDesktop.onPortalUrlChanged((url) => {
  state.currentPortalUrl = url;
  const input = document.getElementById("nav-url");
  // Don't clobber the URL the student is actively typing/editing.
  if (input && document.activeElement !== input) input.value = url;
});

init();
