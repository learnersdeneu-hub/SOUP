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

const GROUP_LABELS = { personal: "Personal", contact: "Contact", education: "Education", documents: "Documents", other: "Other" };
const GROUP_ORDER = ["personal", "contact", "education", "documents", "other"];

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
  // Continuous narration (what's being scanned/filled/attached/asked),
  // modeled directly on how Claude Code itself communicates progress —
  // see renderActivity(). Reset at the start of every scan.
  activity: [],
  // One entry per detected file-upload field whose category was recognised
  // (see field-dictionary.js's soupClassifyDocumentField): { field, result,
  // selectedDocumentId, attached, dismissed }. result.outcome is
  // SINGLE_MATCH / AMBIGUOUS / NO_MATCH / ERROR from
  // GET /api/companion/documents/match.
  fileFields: [],
  // AI readiness review of the application just filled — "idle" until a
  // fill finishes, then "thinking" while /api/companion/review runs, then
  // "done"/"error". See runReview() and renderReviewResult().
  reviewStatus: "idle",
  review: null,
  // The "Start applications" picker (My Colleges list to choose a run
  // from) — separate from the run itself, which lives in state.run.
  applicationsPicker: { loading: false, applications: [], selected: new Set(), error: null },
  // A multi-application run in progress: null when none is active. See
  // startApplicationRun()/advanceRun()/maybeAdvanceRun() and
  // renderRunPanel(). queue/index/log persist across tab switches —
  // unlike state.activity, this is never reset by runScan().
  run: null,
};

const DOCUMENT_CATEGORY_LABELS = {
  PASSPORT: "a passport", ENGLISH_TEST: "English proficiency", SAT_ACT_SCORE_REPORT: "an SAT/ACT score report",
  GRADUATE_TEST_SCORE_REPORT: "a GRE/GMAT score report", BACHELORS_DEGREE_CERTIFICATE: "a Bachelor's degree certificate",
  BACHELORS_TRANSCRIPT: "a Bachelor's transcript", MASTERS_DEGREE_CERTIFICATE: "a Master's degree certificate",
  MASTERS_TRANSCRIPT: "a Master's transcript", HS_DIPLOMA: "a high school diploma", HS_TRANSCRIPT: "a high school transcript",
  RESUME_CV: "a resume/CV", BANK_STATEMENT: "a bank statement", MOTIVATION_LETTER: "a motivation letter", PERSONAL_STATEMENT: "a personal statement",
};
function categoryLabel(category) { return DOCUMENT_CATEGORY_LABELS[category] || String(category || "").replace(/_/g, " ").toLowerCase(); }

// ---------- transport (desktop bridge, see preload-panel.js) ----------
function storageGet(keys) { return window.soupDesktop.storageGet(keys); }
function storageSet(values) { return window.soupDesktop.storageSet(values); }
function storageRemove(keys) { return window.soupDesktop.storageRemove(keys); }
function scanPortal() { return window.soupDesktop.scanPage(); }
function fillPortal(assignments) { return window.soupDesktop.fillFields(assignments); }
function attachDocument(fieldId, documentUrl, fileName) { return window.soupDesktop.attachDocument(fieldId, documentUrl, fileName); }
function openExternal(url) { return window.soupDesktop.openExternal(url); }
function openTab(url) { return window.soupDesktop.openTab(url); }
function clickControl(fieldId) { return window.soupDesktop.clickControl(fieldId); }

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

// Same normalization the server uses (src/lib/companion/learnedAnswers.ts)
// to recognize "is this the same question I already learned the answer
// to" across different pages/sites, independent of exact label wording
// down to case/whitespace.
function normalizeQuestionKey(label) {
  return String(label || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

function resolveFields(scan, context) {
  if (!scan || !context) return [];
  return scan.fields.map((field) => {
    if (!field.matchedKey) {
      // The student may have already answered this exact field — either
      // typing it directly on the real page, or through the run panel's
      // inline "Save" input (saveAnswer() writes the value onto the real
      // field too) — in an earlier pass. Without this, a rescan would
      // rebuild state.resolved from the live DOM and immediately flag
      // the very field they just answered as unrecognized again, forever.
      const typed = field.currentValue && field.currentValue.trim();
      if (typed) return { field, answer: { value: typed, source: "You answered this", confidence: "STATED" }, status: "ready" };
      // Or Companion may have learned this exact question on a DIFFERENT
      // application already (see saveAnswer() -> POST /api/companion/
      // answers) — a field matching nothing in the fixed dictionary still
      // doesn't need re-asking once it's been answered once.
      const learned = context.learnedAnswers && context.learnedAnswers[normalizeQuestionKey(field.label)];
      if (learned) return { field, answer: { value: learned.value, source: learned.source || "Learned from an earlier answer", confidence: "STATED" }, status: "ready" };
      return { field, answer: null, status: "unrecognized" };
    }
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
// fast enough at this size — see the file header). Navigation (address
// bar, tabs) now lives entirely in the separate chrome BrowserView — see
// panel/chrome.js — so this panel has no input whose focus needs
// preserving across a render() call anymore.
function render() {
  app.innerHTML = "";
  app.appendChild(renderHeader());
  const body = document.createElement("div");
  body.className = "sc-body";
  // The run panel persists across tab switches and screen changes — it
  // renders above whatever screen is currently showing rather than being
  // owned by any one screen (unlike renderActivity(), which is scoped to
  // the current page's own scan/fill).
  if (state.run && state.screen !== "applications-picker") body.appendChild(el(`<div style="margin-bottom:12px;">${renderRunPanel()}</div>`));
  body.appendChild(renderScreen());
  app.appendChild(body);
  bindEvents();
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
      <button class="sc-icon-btn" style="font-size:9px;font-weight:700;letter-spacing:.02em;" data-action="open-pdf-page" title="Fill a PDF application form" aria-label="Fill a PDF application form">PDF</button>
      ${state.token && !state.run ? '<button class="sc-icon-btn" style="width:auto;padding:0 8px;font-size:9px;font-weight:700;letter-spacing:.02em;" data-action="open-applications-picker" title="Start applications for your My Colleges list" aria-label="Start applications">APPS</button>' : ""}
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
    case "applications-picker": return renderApplicationsPicker();
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

// ---------- Activity feed (continuous narration) ----------
function activityDotGlyph(status) {
  if (status === "done") return "&#10003;";
  if (status === "error") return "!";
  if (status === "active") return "&#8943;";
  return "";
}
// Styled the same way Claude Code itself shows its own work inside VS
// Code: window-chrome dots, a dark monospace feed, a blinking cursor
// while still actively doing something — used for every "thinking" state
// (scanning, filling, attaching, reviewing), not just a plain spinner.
function renderActivity() {
  // During a run, every bit of this narration already goes into
  // state.run.log (see logPush/logSet) and renders in the run's own
  // terminal (renderRunPanel()) instead — showing this box too would be
  // the exact "two terminals stacked" problem this was built to avoid.
  if (state.run) return "";
  if (!state.activity.length) return "";
  const stillWorking = state.activity.some((item) => item.status === "active") || state.reviewStatus === "thinking";
  return `
    <div class="sc-card sc-terminal">
      <div class="sc-terminal-header">
        <span class="sc-terminal-dot red"></span><span class="sc-terminal-dot yellow"></span><span class="sc-terminal-dot green"></span>
        <span class="sc-terminal-label">SOUP Companion — ${stillWorking ? "working…" : "done"}</span>
      </div>
      <div class="sc-activity sc-terminal-body">
        ${state.activity.map((item) => `
          <div class="sc-activity-item ${item.status}">
            <span class="sc-activity-dot">${activityDotGlyph(item.status)}</span>
            <span class="sc-activity-text">${escapeHtml(item.text)}</span>
          </div>
        `).join("")}
        ${stillWorking ? '<span class="sc-terminal-cursor"></span>' : ""}
      </div>
    </div>
  `;
}

// ---------- Ask-when-unsure (bounded-choice question, never a silent guess) ----------
function renderAskCards() {
  const pending = state.fileFields.filter((entry) => entry.result.outcome === "AMBIGUOUS" && !entry.attached && !entry.dismissed);
  if (!pending.length) return "";
  return pending.map((entry) => `
    <div class="sc-ask-card">
      <div class="sc-ask-card-question">
        <span class="sc-ask-card-icon">?</span>
        <span>You have ${entry.result.documents.length} documents that could work for ${escapeHtml(categoryLabel(entry.field.matchedCategory))} — which one should I use?</span>
      </div>
      ${entry.result.documents.map((doc) => `
        <button type="button" class="sc-doc-option ${entry.selectedDocumentId === doc.id ? "selected" : ""}" data-action="select-doc-option" data-field-id="${entry.field.id}" data-document-id="${doc.id}">
          <span class="sc-doc-option-icon">&#128196;</span>
          <span style="flex:1; min-width:0; text-align:left;">
            <span class="sc-doc-option-title">${escapeHtml(doc.originalFileName || "Document")}</span>
            <span class="sc-doc-option-sub">Uploaded ${new Date(doc.uploadedAt).toLocaleDateString()} &middot; ${doc.reviewStatus === "APPROVED" ? "approved" : String(doc.reviewStatus).replace(/_/g, " ").toLowerCase()}</span>
          </span>
          <span class="sc-doc-option-radio"></span>
        </button>
      `).join("")}
      <div class="sc-btn-row">
        <button class="sc-btn sc-btn-primary" data-action="use-doc-choice" data-field-id="${entry.field.id}" ${entry.selectedDocumentId ? "" : "disabled"}>Use this one</button>
        <button class="sc-btn sc-btn-secondary" data-action="dismiss-doc-ask" data-field-id="${entry.field.id}">Not now</button>
      </div>
    </div>
  `).join("");
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
      ${renderActivity()}
      ${renderAskCards()}
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

// Readiness verdict a review returned — matches companion/review.ts's
// overallReadiness. Mirrors the same badge/copy used on the PDF filler's
// web review screen so the two surfaces feel like one product.
const REVIEW_READINESS_COPY = {
  STRONG: { label: "Ready to submit", cls: "strong" },
  NEEDS_WORK: { label: "Needs work first", cls: "needs-work" },
  NOT_READY: { label: "Not ready yet", cls: "not-ready" },
};

function renderReviewResult() {
  if (state.reviewStatus !== "done" || !state.review) return "";
  const review = state.review;
  const readiness = REVIEW_READINESS_COPY[review.overallReadiness] || REVIEW_READINESS_COPY.NEEDS_WORK;
  return `
    <div class="sc-card" style="margin-top:10px;">
      <div class="sc-eyebrow">SOUP's review</div>
      <div style="margin-top:6px;"><span class="sc-review-badge ${readiness.cls}">${escapeHtml(readiness.label)}</span></div>
      <p class="sc-note" style="margin-top:8px;">${escapeHtml(review.summary)}</p>
      ${review.strengths && review.strengths.length ? `
        <div class="sc-review-section-title" style="color:var(--teal);">Strengths</div>
        <ul class="sc-review-list">${review.strengths.map((s) => `<li>• ${escapeHtml(s)}</li>`).join("")}</ul>
      ` : ""}
      ${review.gaps && review.gaps.length ? `
        <div class="sc-review-section-title" style="color:var(--amber-text);">What to add or fix</div>
        <ul class="sc-review-list">${review.gaps.map((g) => `<li><strong>${escapeHtml(g.field)}:</strong> ${escapeHtml(g.issue)}${g.suggestion ? ` — <span class="sc-note" style="display:inline;margin:0;">${escapeHtml(g.suggestion)}</span>` : ""}</li>`).join("")}</ul>
      ` : ""}
      ${review.credibilityNotes && review.credibilityNotes.length ? `
        <div class="sc-review-section-title" style="color:var(--danger-text);">Credibility notes</div>
        <ul class="sc-review-list">${review.credibilityNotes.map((c) => `<li><strong>${escapeHtml(c.field)}</strong> <span class="sc-note" style="display:inline;margin:0;text-transform:uppercase;font-weight:700;">(${escapeHtml(c.severity)})</span> — ${escapeHtml(c.concern)}</li>`).join("")}</ul>
      ` : ""}
    </div>
  `;
}

function renderSuccess() {
  const s = state.fillSummary || { filled: 0, needInput: 0, conflicts: 0, failures: [] };
  const failures = s.failures || [];
  return el(`
    <div class="sc-stack" style="display:flex; flex-direction:column; gap:12px;">
      <div class="sc-card">
        <div class="sc-eyebrow">Page complete</div>
        <div class="sc-title">${s.filled} field${s.filled === 1 ? "" : "s"} filled</div>
        <ul class="sc-list" style="list-style:none; margin:10px 0 0; padding:0;">
          <li class="sc-list-row"><span>Fields filled</span><strong>${s.filled}</strong></li>
          <li class="sc-list-row"><span>Still need your input</span><strong>${s.needInput}</strong></li>
          <li class="sc-list-row"><span>Conflicts detected</span><strong>${s.conflicts}</strong></li>
          ${failures.length ? `<li class="sc-list-row"><span>Attempted but didn't go through</span><strong>${failures.length}</strong></li>` : ""}
        </ul>
        ${failures.length ? `
          <div class="sc-warning" style="margin-top:10px;">
            <div class="sc-warning-title">⚠ Needs a manual look</div>
            <ul class="sc-list" style="list-style:none; margin:8px 0 0; padding:0;">
              ${failures.map((f) => `<li class="sc-list-row"><span class="sc-list-label">${escapeHtml(f.label)}</span><span class="sc-note" style="margin:0; text-align:right;">${escapeHtml(f.reason)}</span></li>`).join("")}
            </ul>
          </div>
        ` : ""}
        <button class="sc-btn sc-btn-primary" data-action="continue-after-success" style="margin-top:12px;">Continue</button>
      </div>
      ${renderActivity()}
      ${renderReviewResult()}
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

// ---------- Start applications (multi-application run) ----------
async function loadApplicationsPicker() {
  state.applicationsPicker = { loading: true, applications: [], selected: new Set(), error: null };
  render();
  try {
    const body = await apiFetch("/api/companion/applications/runnable");
    state.applicationsPicker = { loading: false, applications: body.applications || [], selected: new Set(), error: null };
  } catch (error) {
    state.applicationsPicker = { loading: false, applications: [], selected: new Set(), error: error.message || "Could not load My Colleges." };
  }
  render();
}

function renderApplicationsPicker() {
  const picker = state.applicationsPicker;
  if (picker.loading) {
    return el(`<div class="sc-center"><div class="sc-title">Loading My Colleges…</div></div>`);
  }
  if (picker.error) {
    return el(`
      <div>
        <div class="sc-back-row"><button class="sc-btn-ghost" data-action="close-applications-picker">← Back</button></div>
        <div class="sc-card"><p class="sc-note">${escapeHtml(picker.error)}</p></div>
      </div>
    `);
  }
  return el(`
    <div>
      <div class="sc-back-row"><button class="sc-btn-ghost" data-action="close-applications-picker">← Back</button></div>
      <div class="sc-card">
        <div class="sc-eyebrow">Start applications</div>
        <div class="sc-title">Pick which ones to work on</div>
        <p class="sc-note">SOUP will create accounts where needed, fill in your information and documents, and move to the next one automatically. It will stop and ask you here whenever it genuinely needs you — a verification step, something missing from SOUP, or your final approval to submit.</p>
        ${picker.applications.length === 0 ? '<p class="sc-note" style="margin-top:10px;">Nothing in My Colleges is ready for a run yet.</p>' : `
          <div class="sc-stack" style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
            ${picker.applications.map((app) => `
              <label class="sc-field" style="flex-direction:row; align-items:center; gap:10px; cursor:pointer;">
                <input type="checkbox" data-action="toggle-app-selection" data-application-id="${app.id}" ${picker.selected.has(app.id) ? "checked" : ""} style="width:16px; height:16px; flex-shrink:0;" />
                <span style="flex:1; min-width:0;">
                  <span style="display:block; font-size:12.5px; font-weight:600; color:var(--ink);">${escapeHtml(app.universityName)}</span>
                  <span style="display:block; font-size:11px; color:var(--mute); margin-top:1px;">${escapeHtml(app.programTitle || "Programme TBC")}</span>
                </span>
              </label>
            `).join("")}
          </div>
          <button class="sc-btn sc-btn-primary" data-action="start-applications-run" style="margin-top:14px;" ${picker.selected.size === 0 ? "disabled" : ""}>Start ${picker.selected.size || ""} application${picker.selected.size === 1 ? "" : "s"}</button>
        `}
      </div>
    </div>
  `);
}

// Narrated once, at the very start of a run, in Companion's own voice —
// the opening statement the run follows for the rest of its course.
function runOpeningLine(items) {
  const names = items.map((i) => i.universityName).join(", ");
  return `Starting applications for ${names}. I'll create accounts and add your information and documents, and move to the next one automatically. Stay close — I'll need you for verification steps, and I won't ask when I don't need to. I will not submit anything without your final approval.`;
}

async function startApplicationRun(applicationIds) {
  if (!applicationIds.length) return;
  state.screen = "loading";
  state.loadingMessage = "Preparing your applications…";
  render();
  let queue;
  try {
    const body = await apiFetch("/api/companion/applications/queue", { method: "POST", body: JSON.stringify({ applicationIds }) });
    queue = body.queue || [];
  } catch (error) {
    state.screen = "error";
    state.error = { code: "BACKEND_ERROR", message: error.message || "Could not prepare the application run." };
    return render();
  }
  if (!queue.length) {
    state.screen = "applications-picker";
    return render();
  }
  state.run = { queue, index: 0, status: "running", log: [{ text: runOpeningLine(queue), status: "done" }], verdicts: {} };
  render();
  await openCurrentRunItem();
}

function currentRunItem() {
  if (!state.run) return null;
  return state.run.queue[state.run.index] || null;
}

function runLog(text, status) {
  if (!state.run) return;
  state.run.log.push({ text, status: status || "done" });
}

// Every narration call in this file (scanning, filling, attaching,
// reviewing) goes through these two instead of touching state.activity
// directly, so that during a run every bit of it lands in the run's own
// terminal (state.run.log) — "the terminal is where most of the activity
// should be," not a second box stacked underneath it. Outside a run,
// narration still goes to the ordinary per-page activity feed exactly as
// before.
function activityLog() { return state.run ? state.run.log : state.activity; }
function logPush(entry) { activityLog().push(entry); return activityLog().length - 1; }
function logSet(index, entry) { activityLog()[index] = entry; }

// Staff-facing visibility (src/app/admin/companion/page.tsx) into
// exactly the three things a run does that a plain fill-event can't
// show: a review verdict, an approval, or why it paused. Fire-and-forget
// — losing one of these to a flaky connection should never block or
// confuse the run itself.
function reportRunEvent(kind, universityName, detail, applicationId) {
  apiFetch("/api/companion/run-events", {
    method: "POST",
    body: JSON.stringify({ kind, universityName, detail: String(detail).slice(0, 2000), applicationId: applicationId || undefined }),
  }).catch(() => {});
}

async function openCurrentRunItem() {
  const item = currentRunItem();
  if (!item) return;
  if (!item.targetUrl) {
    state.run.status = "paused";
    const pauseText = `I don't have a reliable application link for ${item.universityName} yet — please open it yourself, then tell me to continue.`;
    runLog(pauseText, "error");
    reportRunEvent("PAUSED", item.universityName, pauseText, item.applicationId);
    return render();
  }
  if (item.targetUrlConfidence === "LOW") {
    runLog(`I'm not fully certain this is ${item.universityName}'s official application page — opening it now, please double-check.`, "active");
  } else {
    runLog(`Opening ${item.universityName}${item.programTitle ? ` (${item.programTitle})` : ""}…`, "active");
  }
  render();
  await openTab(item.targetUrl);
  // The tab-changed event this triggers (see main.js's switchTab()) fires
  // the panel's normal onTabChanged -> runScanQuiet() -> renderReady()/
  // startFill() chain below, exactly like a student switching tabs by
  // hand — the run just does it automatically.
}

// Called once a page's scan settles (see the end of runScan()) when a
// run is active: decides whether to autofill this page, pause for the
// student, or treat the page as not an application form at all.
// "Auth command" copy per kind (Phase D) — Companion never attempts to
// solve, bypass or work around any of these; it only ever detects one and
// waits for the student.
const AUTH_BLOCK_COPY = {
  CAPTCHA: "This page has a CAPTCHA. I won't try to solve it — please complete it yourself, then tell me to continue.",
  OTP: "This page wants a verification code. Check your phone or email, enter it, then tell me to continue.",
  PASSWORD: "This looks like an account sign-up. Type and confirm your own password — I never create or store one for you — then tell me to continue.",
};

function runHandleScanResult() {
  if (!state.run || state.run.status !== "running") return;
  const item = currentRunItem();
  if (!item) return;
  // CAPTCHA/OTP pages are typically standalone verification steps with
  // nothing else useful to fill — pause immediately rather than trying.
  // A sign-up page's password field is different: there is usually a
  // name/email to fill first, so that check happens after filling (see
  // runAfterFillSettles()), not here.
  if (state.scan && state.scan.authBlock && state.scan.authBlock.kind !== "PASSWORD") {
    state.run.status = "paused";
    const pauseText = `${item.universityName}: ${AUTH_BLOCK_COPY[state.scan.authBlock.kind] || "This page needs you before I can continue."}`;
    runLog(pauseText, "error");
    reportRunEvent("PAUSED", item.universityName, pauseText, item.applicationId);
    return render();
  }
  if (state.screen === "unsupported") {
    state.run.status = "paused";
    const pauseText = `This doesn't look like an application form yet on ${item.universityName}. Take a look, then tell me to continue.`;
    runLog(pauseText, "error");
    reportRunEvent("PAUSED", item.universityName, pauseText, item.applicationId);
    return render();
  }
  const counts = fieldCounts();
  if (counts.ready > 0) {
    runLog(`Filling in what I know for ${item.universityName}…`, "active");
    render();
    return startFill();
  }
  // A field matching nothing SOUP's dictionary recognizes at all is a
  // different thing from a recognized field with no value yet — the
  // student types it in right here in the terminal, not a silent gap.
  const unrecognized = unrecognizedRequiredFields();
  if (unrecognized.length) {
    state.run.status = "paused";
    const pauseText = `${item.universityName}: I found something SOUP doesn't have an answer for — ${unrecognized.map((r) => r.field.label || "a field").slice(0, 3).join(", ")}. Type it in below, then tell me to continue.`;
    runLog(pauseText, "error");
    reportRunEvent("PAUSED", item.universityName, pauseText, item.applicationId);
    return render();
  }
  if (counts.needs > 0 || counts.conflicts > 0) {
    state.run.status = "paused";
    const pauseText = `I need some information for ${item.universityName} that isn't in SOUP yet — see "Need from you" below, then tell me to continue.`;
    runLog(pauseText, "error");
    reportRunEvent("PAUSED", item.universityName, pauseText, item.applicationId);
    return render();
  }
  if (state.scan && state.scan.authBlock && state.scan.authBlock.kind === "PASSWORD") {
    state.run.status = "paused";
    const pauseText = `${item.universityName}: ${AUTH_BLOCK_COPY.PASSWORD}`;
    runLog(pauseText, "error");
    reportRunEvent("PAUSED", item.universityName, pauseText, item.applicationId);
    return render();
  }
  // Password resolved (or never present) and nothing left to fill — if
  // this was a sign-up page, finish creating the account now. This is
  // not "submitting the application," so it does not need the same
  // approval gate as a real submission.
  if (state.scan && state.scan.signupControl) {
    runLog(`Creating your account on ${item.universityName}…`, "active");
    render();
    clickControl(state.scan.signupControl.id);
    return;
  }
  // Nothing to fill and nothing missing — likely a page before the real
  // form (a landing/login page). Pause rather than guess what to click.
  state.run.status = "paused";
  const pauseText = `I don't see a form to fill on this page yet for ${item.universityName}. Navigate to the application itself, then tell me to continue.`;
  runLog(pauseText, "error");
  reportRunEvent("PAUSED", item.universityName, pauseText, item.applicationId);
  render();
}

// Fields matching nothing in SOUP's field dictionary at all (as opposed
// to a recognized field with no value yet) — resolveFields() tags these
// "unrecognized". Only required ones are surfaced; an optional field SOUP
// doesn't recognize (a newsletter opt-in, "how did you hear about us")
// is not worth pausing a whole run over.
function unrecognizedRequiredFields() {
  return state.resolved.filter((r) => r.status === "unrecognized" && r.field.required);
}

// Every required field on the CURRENT page (not the whole application —
// a later page's requirements aren't knowable yet) must already resolve
// to "ready" before SOUP will click its own way past it.
function pageRequiredFieldsSatisfied() {
  if (!state.scan) return true;
  const requiredIds = (state.scan.fields || []).filter((f) => f.required).map((f) => f.id);
  if (!requiredIds.length) return true;
  return requiredIds.every((id) => {
    const entry = state.resolved.find((r) => r.field.id === id);
    return entry && entry.status === "ready";
  });
}

async function advancePageWithinApplication() {
  const item = currentRunItem();
  runLog(`Moving to the next step of ${item.universityName}'s form…`, "active");
  render();
  await clickControl(state.scan.nextControl.id);
  // The page change this causes re-triggers the normal scan pipeline
  // (same MutationObserver/navigation listeners as any real page change)
  // — runHandleScanResult() picks up from there on the new page.
}

// Called wherever startFill() would otherwise go straight to the AI
// review (Phase C): when a run is active and the current page is a
// wizard step (has its own Next/Continue control distinct from the
// form's real submit), finishing this page does not mean the
// application is finished — it means "click Next and keep going" as
// long as nothing required on THIS page is still missing. The real
// per-application review only runs once there is no further Next
// control to click (the last/only page).
function runAfterFillSettles() {
  if (!state.run || state.run.status !== "running") return runReview();
  const item = currentRunItem();
  if (!item) return runReview();
  if (state.scan && state.scan.authBlock && state.scan.authBlock.kind === "PASSWORD") {
    state.run.status = "paused";
    runLog(`${item.universityName}: ${AUTH_BLOCK_COPY.PASSWORD}`, "error");
    return render();
  }
  if (state.scan && state.scan.nextControl) {
    if (pageRequiredFieldsSatisfied()) return advancePageWithinApplication();
    state.run.status = "paused";
    const pauseText = `Stuck partway through ${item.universityName}'s form — it needs more before I can move to the next page. See "Need from you" below, then tell me to continue.`;
    runLog(pauseText, "error");
    reportRunEvent("PAUSED", item.universityName, pauseText, item.applicationId);
    return render();
  }
  return runReview();
}

// Called at the end of runReview() once a fill+review pass settles: logs
// the verdict, then either pauses (something still needs the student) or
// moves on to the next application automatically.
function maybeAdvanceRun() {
  if (!state.run) return;
  const item = currentRunItem();
  if (!item) return;

  if (state.run.status === "paused") {
    // The student asked to continue after resolving something themselves
    // (typing a password, answering an unrecognized field, solving a
    // CAPTCHA, navigating). A fresh rescan is required here, not just
    // re-checking the stale scan from before they acted — typing into a
    // field doesn't itself trigger the DOM-mutation rescan, so without
    // this the password/unrecognized-field checks would see the exact
    // same "still blocked" state forever.
    state.run.status = "running";
    return runScanQuiet();
  }

  const counts = fieldCounts();
  if (counts.needs > 0 || counts.conflicts > 0) {
    state.run.status = "paused";
    const pauseText = `Still need some information from you for ${item.universityName} before I can finish this one.`;
    runLog(pauseText, "error");
    reportRunEvent("PAUSED", item.universityName, pauseText, item.applicationId);
    return render();
  }

  if (state.review) {
    // "I'll back it" requires both the AI's own STRONG opinion AND zero
    // incomplete required items on SOUP's own checklist for this
    // application — an AI opinion alone is not enough to tell a student
    // their file is ready.
    const incomplete = (item.checklist && item.checklist.incompleteRequiredCount) || 0;
    const trulyStrong = state.review.overallReadiness === "STRONG" && incomplete === 0;
    if (trulyStrong) {
      const verdictText = `I'm backing ${item.universityName} — it looks ready. Approve it below when you agree; I still won't submit anything on the real site without you.`;
      runLog(verdictText, "done");
      state.run.verdicts[item.applicationId] = { universityName: item.universityName, approved: false, approving: false };
      reportRunEvent("REVIEW", item.universityName, `${verdictText} Summary: ${state.review.summary}`, item.applicationId);
    } else if (incomplete > 0 && state.review.overallReadiness === "STRONG") {
      const verdictText = `${item.universityName}: SOUP's own checklist still has ${incomplete} required item${incomplete === 1 ? "" : "s"} outstanding, even though the fields I could see looked fine. Check My Colleges before treating this as ready.`;
      runLog(verdictText, "error");
      reportRunEvent("REVIEW", item.universityName, verdictText, item.applicationId);
    } else {
      const verdictText = {
        NEEDS_WORK: `${item.universityName} isn't quite sufficient yet: ${state.review.summary}`,
        NOT_READY: `${item.universityName} is not ready for submission: ${state.review.summary}`,
      }[state.review.overallReadiness] || `Reviewed ${item.universityName}.`;
      runLog(verdictText, "error");
      reportRunEvent("REVIEW", item.universityName, verdictText, item.applicationId);
    }
  } else {
    runLog(`Finished what I could for ${item.universityName}.`, "done");
  }

  const nextIndex = state.run.index + 1;
  if (nextIndex >= state.run.queue.length) {
    state.run.status = "done";
    runLog(`That's every application in this run. Review each verdict above when you're ready.`, "done");
    return render();
  }
  state.run.index = nextIndex;
  render();
  return openCurrentRunItem();
}

// The only moment this run ever changes a StudentApplication's status —
// explicitly triggered by the student clicking "Approve for submission"
// in the run panel, never automatic. Reuses the exact same deterministic
// check as the student-facing web approval (src/lib/applications/
// approve.ts) via the bearer-authenticated companion route — this still
// only moves SOUP's own record to READY_TO_SUBMIT, never clicks anything
// on the university's own site.
async function approveApplication(applicationId) {
  const verdict = state.run && state.run.verdicts[applicationId];
  if (!verdict) return;
  verdict.approving = true;
  render();
  try {
    await apiFetch(`/api/companion/applications/${encodeURIComponent(applicationId)}/approve`, { method: "POST" });
    verdict.approved = true;
    verdict.approving = false;
    runLog(`${verdict.universityName}: approved in SOUP. You still need to actually submit it on the university's own site.`, "done");
    reportRunEvent("APPROVED", verdict.universityName, "Student approved this application for submission in SOUP.", applicationId);
  } catch (error) {
    verdict.approving = false;
    runLog(`${verdict.universityName}: couldn't approve it — ${error.message || "something went wrong"}.`, "error");
  }
  render();
}

function renderRunPanel() {
  if (!state.run) return "";
  const total = state.run.queue.length;
  const position = Math.min(state.run.index + 1, total);
  const stillWorking = state.run.status === "running";
  return `
    <div class="sc-card sc-terminal">
      <div class="sc-terminal-header">
        <span class="sc-terminal-dot red"></span><span class="sc-terminal-dot yellow"></span><span class="sc-terminal-dot green"></span>
        <span class="sc-terminal-label">SOUP Companion — application ${position} of ${total}${state.run.status === "done" ? " · done" : state.run.status === "paused" ? " · paused" : ""}</span>
      </div>
      <div class="sc-activity sc-terminal-body">
        ${state.run.log.map((item) => `
          <div class="sc-activity-item ${item.status}">
            <span class="sc-activity-dot">${activityDotGlyph(item.status)}</span>
            <span class="sc-activity-text">${escapeHtml(item.text)}</span>
          </div>
        `).join("")}
        ${stillWorking ? '<span class="sc-terminal-cursor"></span>' : ""}
      </div>
      ${state.run.status === "paused" && unrecognizedRequiredFields().length ? `
        <div style="padding:0 12px 12px; display:flex; flex-direction:column; gap:8px;">
          ${unrecognizedRequiredFields().map((r) => `
            <div class="sc-field">
              <label>${escapeHtml(r.field.label || "Unrecognized field")}</label>
              <div style="display:flex; gap:6px;">
                <input class="sc-input" id="answer-input-${r.field.id}" placeholder="Type the answer" style="flex:1;" />
                <button class="sc-btn sc-btn-secondary" data-action="save-answer" data-field-id="${r.field.id}">Save</button>
              </div>
            </div>
          `).join("")}
        </div>
      ` : ""}
      ${Object.keys(state.run.verdicts).length ? `
        <div style="padding:0 12px 12px; display:flex; flex-direction:column; gap:6px;">
          ${Object.entries(state.run.verdicts).map(([applicationId, verdict]) => verdict.approved ? "" : `
            <button class="sc-btn sc-btn-primary" data-action="approve-application" data-application-id="${applicationId}" style="width:100%;" ${verdict.approving ? "disabled" : ""}>
              ${verdict.approving ? "Approving…" : `Approve ${escapeHtml(verdict.universityName)} for submission`}
            </button>
          `).join("")}
        </div>
      ` : ""}
      <div style="padding:0 12px 12px;">
        ${state.run.status === "paused" ? '<button class="sc-btn sc-btn-primary" data-action="continue-run" style="width:100%;">Continue</button>' : ""}
        ${state.run.status !== "done" ? '<button class="sc-btn sc-btn-secondary" data-action="cancel-run" style="width:100%;margin-top:6px;">Stop this run</button>' : '<button class="sc-btn sc-btn-secondary" data-action="cancel-run" style="width:100%;">Done — close</button>'}
      </div>
    </div>
  `;
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
}

async function handleAction(action, node) {
  switch (action) {
    case "pair": return doPair();
    case "reconnect": return doReconnect();
    case "rescan": return runScan();
    case "toggle-documents": state.documentsOpen = !state.documentsOpen; return render();
    case "select-doc-option": {
      const entry = state.fileFields.find((e) => e.field.id === node.dataset.fieldId);
      if (entry) entry.selectedDocumentId = node.dataset.documentId;
      return render();
    }
    case "use-doc-choice": {
      const entry = state.fileFields.find((e) => e.field.id === node.dataset.fieldId);
      if (!entry || !entry.selectedDocumentId) return null;
      const attachIndex = logPush({ text: `Attaching ${categoryLabel(entry.field.matchedCategory)}…`, status: "active" });
      render();
      return attachDocumentForEntry(entry, entry.selectedDocumentId, attachIndex);
    }
    case "dismiss-doc-ask": {
      const entry = state.fileFields.find((e) => e.field.id === node.dataset.fieldId);
      if (entry) entry.dismissed = true;
      return render();
    }
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
    case "open-pdf-page": return openExternal(`${API_BASE}/companion/pdf`);
    case "open-applications-picker": state.screen = "applications-picker"; render(); return loadApplicationsPicker();
    case "close-applications-picker": state.screen = "ready"; return render();
    case "toggle-app-selection": {
      const id = node.dataset.applicationId;
      if (state.applicationsPicker.selected.has(id)) state.applicationsPicker.selected.delete(id);
      else state.applicationsPicker.selected.add(id);
      return render();
    }
    case "start-applications-run": return startApplicationRun(Array.from(state.applicationsPicker.selected));
    case "cancel-run": state.run = null; state.screen = "ready"; return runScanQuiet();
    case "continue-run": return maybeAdvanceRun();
    case "approve-application": return approveApplication(node.dataset.applicationId);
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
    state.activity = [];
    state.fileFields = [];
    if (!scan) { state.scan = null; state.resolved = []; state.screen = "unsupported"; render(); return runHandleScanResult(); }
    state.scan = scan;
    state.resolved = resolveFields(scan, state.context);
    const counts = fieldCounts();
    const fileFieldsDetected = (scan.fileFields || []).filter((f) => f.matchedCategory);

    logPush({
      text: `Scanned this page — found ${counts.detected} field${counts.detected === 1 ? "" : "s"}${fileFieldsDetected.length ? `, including ${fileFieldsDetected.length} document upload${fileFieldsDetected.length === 1 ? "" : "s"}` : ""}`,
      status: "done",
    });
    if (counts.ready > 0) logPush({ text: `${counts.ready} field${counts.ready === 1 ? "" : "s"} ready to fill from your SOUP profile`, status: "done" });

    state.screen = (counts.detected === 0 && fileFieldsDetected.length === 0) ? "unsupported" : "ready";
    render();

    // Document attachment settles first when a run is driving this page
    // automatically — fieldCounts()/startFill() further down and
    // resolveFileFieldsFlow() both append to the same activity feed, and
    // running them concurrently would interleave their narration.
    if (fileFieldsDetected.length) await resolveFileFieldsFlow(fileFieldsDetected);
    runHandleScanResult();
  } catch (error) {
    state.error = { code: error.code || "BACKEND_ERROR", message: error.message };
    state.screen = "error";
    render();
  }
}
function runScanQuiet() { return runScan(true); }

// Checks the student's own SOUP document vault for each detected file-
// upload field, one at a time, narrating as it goes — a single match
// attaches automatically (via CDP, see main.js), several matches pause
// with a bounded-choice question instead of guessing (renderAskCards), and
// no match is flagged as needing the student's own input.
async function resolveFileFieldsFlow(fileFieldsDetected) {
  for (const field of fileFieldsDetected) {
    const activityIndex = logPush({ text: `Checking your vault for ${categoryLabel(field.matchedCategory)}…`, status: "active" });
    render();

    let result;
    try { result = await apiFetch(`/api/companion/documents/match?category=${encodeURIComponent(field.matchedCategory)}`); }
    catch { result = { outcome: "ERROR" }; }

    const entry = { field, result, selectedDocumentId: result.outcome === "SINGLE_MATCH" ? result.document.id : null, attached: false, dismissed: false };
    state.fileFields.push(entry);

    if (result.outcome === "SINGLE_MATCH") {
      logSet(activityIndex, { text: `Found a match for ${categoryLabel(field.matchedCategory)} — attaching…`, status: "active" });
      render();
      await attachDocumentForEntry(entry, result.document.id, activityIndex);
    } else if (result.outcome === "AMBIGUOUS") {
      logSet(activityIndex, { text: `You have ${result.documents.length} documents that could work for ${categoryLabel(field.matchedCategory)} — which one should I use?`, status: "active" });
      render();
    } else if (result.outcome === "NO_MATCH") {
      logSet(activityIndex, { text: `${categoryLabel(field.matchedCategory)} — nothing in your vault yet. You'll need to attach this one yourself.`, status: "pending" });
      render();
    } else {
      logSet(activityIndex, { text: `Couldn't check your documents for ${categoryLabel(field.matchedCategory)} right now.`, status: "error" });
      render();
    }
  }
}

async function attachDocumentForEntry(entry, documentId, activityIndex) {
  try {
    const link = await apiFetch(`/api/companion/documents/${encodeURIComponent(documentId)}/link`, { method: "POST" });
    const doc = entry.result.outcome === "SINGLE_MATCH" ? entry.result.document : (entry.result.documents || []).find((d) => d.id === documentId);
    const fileName = (doc && doc.originalFileName) || entry.field.label || "document";
    const attachResult = await attachDocument(entry.field.id, link.url, fileName);
    entry.attached = Boolean(attachResult && attachResult.ok);
    entry.selectedDocumentId = documentId;
    const resultEntry = entry.attached
      ? { text: `Attached ${fileName} automatically`, status: "done" }
      : { text: `Couldn't attach ${fileName} automatically — please attach it yourself`, status: "error" };
    if (typeof activityIndex === "number") logSet(activityIndex, resultEntry); else logPush(resultEntry);
  } catch {
    const failure = { text: `Couldn't attach that document automatically — please attach it yourself`, status: "error" };
    if (typeof activityIndex === "number") logSet(activityIndex, failure); else logPush(failure);
  }
  render();
}

// Honest, specific reasons a field didn't take — surfaced to the student
// instead of a bare "failed," matching the Claude-Code-style narration this
// panel already does for everything else: say what happened and why.
const FILL_FAIL_COPY = {
  NOT_FOUND: "the field disappeared from the page before I could fill it",
  NO_MATCHING_OPTION: "none of this dropdown's options matched the saved value",
  DID_NOT_STICK: "the page reset the value right after I set it",
  ERROR: "something on the page blocked it",
};

// Once SOUP has detected everything it can for this page and filled what
// it could, it reviews the whole application the same way a counselor
// would in the final minutes before submission — not a generic profile
// check, but a review of exactly what is about to be submitted here:
// every detected field (filled or not) and every document that did or
// didn't get attached. Runs automatically, narrated into the same
// terminal-styled activity feed as everything else Companion does.
async function runReview() {
  state.reviewStatus = "thinking";
  state.review = null;
  const stageIndex = logPush({ text: "Reviewing this application…", status: "active" });
  render();

  // A "conflict" (the page already has a value that disagrees with
  // SOUP's own record) used to be sent as if it were simply unfilled --
  // the review never even saw that a real discrepancy existed. Surfacing
  // it explicitly is what lets the review actually compare the page
  // against SOUP's own records, not just check filled-vs-empty.
  const fieldsPayload = classifiedOnly(state.resolved).map((r) => {
    if (r.status === "conflict") {
      return {
        label: r.field.matchedLabel || r.field.label,
        value: `page currently has "${r.field.currentValue}", but SOUP's own record for this student says "${r.answer.value}"`,
        filled: true,
        source: "Conflict with SOUP record",
      };
    }
    return {
      label: r.field.matchedLabel || r.field.label,
      value: r.status === "ready" ? String(r.answer.value || "") : "",
      filled: r.status === "ready",
      source: r.status === "ready" ? r.answer.source : null,
    };
  });
  const documentsPayload = state.fileFields.map((entry) => ({
    label: categoryLabel(entry.field.matchedCategory),
    attached: Boolean(entry.attached),
    fileName: (entry.result && entry.result.outcome === "SINGLE_MATCH" && entry.result.document && entry.result.document.originalFileName) || null,
  }));

  // Inside a run, ground the review in SOUP's own real requirements
  // tracking for this application too — not just whatever happened to be
  // on the page just scanned. This is the same checklist data
  // maybeAdvanceRun() checks deterministically.
  const runItem = state.run ? currentRunItem() : null;
  if (runItem && runItem.checklist) {
    runItem.checklist.items.forEach((checklistItem) => {
      fieldsPayload.push({
        label: checklistItem.title,
        value: checklistItem.status,
        filled: ["COMPLETE", "DOCUMENT_UPLOADED", "NOT_APPLICABLE"].includes(checklistItem.status),
        source: "SOUP checklist",
      });
    });
  }

  try {
    const data = await apiFetch("/api/companion/review", {
      method: "POST",
      body: JSON.stringify({
        fields: fieldsPayload,
        documents: documentsPayload,
        context: runItem ? `${runItem.universityName}${runItem.programTitle ? ` — ${runItem.programTitle}` : ""}` : (state.scan ? state.scan.pageTitle : null),
      }),
    });
    state.review = data.review;
    state.reviewStatus = "done";
    logSet(stageIndex, { text: "Review complete — see SOUP's assessment below", status: "done" });
  } catch {
    state.reviewStatus = "error";
    logSet(stageIndex, { text: "Couldn't generate a review right now", status: "error" });
  }
  render();
  maybeAdvanceRun();
}

async function startFill() {
  // Not classifiedOnly() here on purpose: a field with no dictionary
  // match at all still gets status "ready" once a learned answer exists
  // for it (see resolveFields()) or the student typed one directly, and
  // those need to actually reach the page too, not just be marked ready
  // internally while classifiedOnly() quietly excludes them from ever
  // being filled.
  const targets = state.resolved.filter((r) => r.status === "ready" && normalize(r.field.currentValue) !== normalize(r.answer.value));
  const plan = targets.map((r) => ({ fieldId: r.field.id, value: r.answer.value, label: r.field.matchedLabel || r.field.label }));
  if (!plan.length) {
    state.fillSummary = { filled: 0, needInput: fieldCounts().needs, conflicts: fieldCounts().conflicts, failures: [] };
    state.screen = "success";
    render();
    return runAfterFillSettles();
  }
  state.screen = "filling";
  state.fillPlan = plan;
  state.fillRevealCount = 0;
  render();

  const results = (await fillPortal(plan.map((p) => ({ fieldId: p.fieldId, value: p.value })))) || [];
  const succeeded = results.filter((r) => r.ok).length;
  const failures = results
    .map((r, i) => ({ result: r, label: plan[i] ? plan[i].label : "A field" }))
    .filter(({ result }) => !result.ok)
    .map(({ result, label }) => ({ label, reason: FILL_FAIL_COPY[result.reason] || "it didn't go through for an unclear reason" }));

  for (let i = 0; i < plan.length; i++) {
    state.fillRevealCount = i + 1;
    const result = results[i];
    const label = plan[i].label;
    logPush(
      result && result.ok
        ? { text: `Filled "${label}"`, status: "done" }
        : { text: `Couldn't fill "${label}" — ${FILL_FAIL_COPY[(result && result.reason) || "ERROR"] || "it didn't go through"}`, status: "error" },
    );
    render();
    await new Promise((resolve) => setTimeout(resolve, 140));
  }

  const counts = fieldCounts();
  state.fillSummary = { filled: succeeded, needInput: counts.needs, conflicts: counts.conflicts, failures };
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
  runAfterFillSettles();
}

async function saveAnswer(fieldId) {
  const input = document.getElementById(`answer-input-${fieldId}`);
  const value = input ? input.value.trim() : "";
  if (!value) return;
  await fillPortal([{ fieldId, value }]);
  state.reviewOpenField = null;
  const entry = state.resolved.find((r) => r.field.id === fieldId);
  if (entry) {
    entry.status = "ready";
    entry.answer = { value, source: "You answered this", confidence: "STATED" };
    entry.field.currentValue = value;
    // Only for a field matching nothing in the fixed dictionary — a
    // classified field's answer belongs in SOUP's proper structured data
    // (profile/case fields), a separate and much larger write-back this
    // does not attempt; this is specifically the "SOUP had no concept of
    // this question at all" case, so the only place to remember it is
    // this free-form store.
    if (!entry.field.matchedKey) {
      apiFetch("/api/companion/answers", { method: "POST", body: JSON.stringify({ label: entry.field.label, value }) }).catch(() => {});
    }
  }
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
  render();
  const stored = await storageGet([STORAGE_KEY_TOKEN, STORAGE_KEY_PROFILE]);
  state.token = stored[STORAGE_KEY_TOKEN] || null;
  state.profile = stored[STORAGE_KEY_PROFILE] || null;
  if (!state.token) { state.screen = "connect"; return render(); }
  await runScan();
}

// Re-scans whenever the active tab changes (switching tabs, or this tab
// navigating to a new page) — "tab-changed"/"portal-url-changed" are sent
// by main.js's switchTab()/createTab() nav listeners respectively.
window.soupDesktop.onTabChanged(() => { if (state.token) runScanQuiet(); });
window.soupDesktop.onPortalUrlChanged(() => { if (state.token) runScanQuiet(); });
// A real OAuth/SSO popup just opened (main.js's setWindowOpenHandler) —
// only meaningful mid-run; outside a run there's nothing for this to
// pause.
window.soupDesktop.onAuthPopup(() => {
  if (!state.run || state.run.status !== "running") return;
  const item = currentRunItem();
  state.run.status = "paused";
  const pauseText = `${item ? item.universityName + ": " : ""}I opened a sign-in window for you. Complete it there, then tell me to continue.`;
  runLog(pauseText, "error");
  if (item) reportRunEvent("PAUSED", item.universityName, pauseText, item.applicationId);
  render();
});

init();
