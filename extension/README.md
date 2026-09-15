# SOUP Companion (browser extension)

A Manifest V3 Chrome extension that sits beside external university, visa and
accommodation application portals as a side panel, using information already
saved in a student's SOUP account to help complete forms.

## Loading it (unpacked, for testing)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Click the SOUP icon in the toolbar to open the side panel (it opens
   directly on click — no popup step).

## Connecting an account

The extension never receives your SOUP session cookie or a long-lived secret
directly.

1. While signed in to soupassist.com, go to **My SOUP → SOUP Companion**
   (`/companion/connect`) and click **Generate pairing code**.
2. Enter that 8-character code in the side panel's **Connect** screen.
3. The extension exchanges it once for a device-scoped bearer token, stored
   only in `chrome.storage.local` (never in page-accessible storage). Only a
   hash of that token is ever stored server-side.

## What's real vs. simplified in this build

- **Detection and autofill are real**, not mocked: `content-script.js` scans
  the actual DOM of whatever page is open, classifies fields against
  `lib/field-dictionary.js` (keyword/regex based), and fills matched fields
  using the native input setter + dispatched `input`/`change` events, which
  is what makes it work on framework-controlled forms (React/Vue/etc.), not
  just plain HTML.
- **Field detection is heuristic, not AI-based.** An extension's JS is fully
  inspectable by anyone who installs it, so no AI provider key can safely
  live here. "Ask Noodles" always deep-links to the authenticated SOUP web
  app in a new tab instead, where the AI key lives server-side — the panel
  never loses your fill progress on the current page when you do this.
- **Only real SOUP data is ever offered as an answer.** The answer bank
  (`/api/companion/context`) only includes fields that genuinely exist in
  SOUP's data model (name, DOB, nationality, country of residence, saved
  study preferences) plus facts actually extracted from a processed document.
  Nothing is invented — an unanswerable field always surfaces as "needs
  input," never a guess.
- **The progress stepper is page-local**, not a persisted multi-page
  application tracker — it reflects what's detected on the current page only.
  A true cross-page "where am I in this application" tracker would need a
  portal-specific page-sequence model, which is a larger follow-up, not part
  of this build.
- **"Add answer" for a missing field fills the current page only.** It does
  not yet write back into the student's saved SOUP profile — the panel says
  this explicitly rather than implying otherwise.
- Loading/error states covered for real: connecting, scanning, backend
  offline, signed-out/token-revoked, and "no recognised fields on this page."
  Less common states from the original spec (live translation UX, portal-
  changed detection, extension-permission-request flow) are not built in
  this pass.

## Files

- `manifest.json` — Manifest V3 config (side panel, content script, icons).
- `background.js` — opens the side panel on toolbar click; forwards tab-change
  events to an open panel so it knows to re-scan.
- `content-script.js` + `lib/field-dictionary.js` — the real detection/fill
  engine, runs on every page except soupassist.com itself.
- `sidepanel.html` / `sidepanel.css` / `sidepanel.js` — the Companion UI,
  matching SOUP's web app design tokens (navy/teal/paper/ink/hair, card and
  pill treatments).
