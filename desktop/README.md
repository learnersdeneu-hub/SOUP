# SOUP Companion (desktop app)

A standalone Windows app — no Google, no Chrome Web Store, no browser
extension. Three BrowserViews in one window: a tab strip + address bar
across the top ("chrome"), the active tab's embedded page below-left
("portal"), and the SOUP assistant panel below-right ("panel"). It behaves
like a real multi-tab browser — open any site, including soupassist.com
itself to sign in or subscribe — with the assistant staying attached
regardless of which tab is focused.

## Status: core single-tab loop confirmed on real hardware; the rest is new and unverified here

- **Confirmed working, from a real screenshot (earlier, single-tab build):**
  the app launches, the portal and panel render side by side, the panel
  connects to the SOUP backend, scans a real page, detects fields, shows
  the consistency check, and renders the progress stepper.
- **New in this pass, built but NOT yet run on real hardware** — this
  sandbox forces `ELECTRON_RUN_AS_NODE=1`, which makes Electron behave as
  plain Node with no GUI, so none of this could be visually confirmed here.
  Syntax-checked (`node --check`) on every file; a real Windows run is
  still needed before trusting it:
  - Multi-tab browsing: `main.js` now tracks a `Map` of tabs, each its own
    BrowserView, with a dedicated "chrome" BrowserView (`panel/chrome.html`
    / `chrome.js` / `chrome.css`, `preload-chrome.js`) owning the tab strip
    and address bar. Clicking "+" opens `panel/newtab.html` (quick tiles for
    SOUP/UCAS/Common App/search) — a plain static page with ordinary
    `<a href>`/`<form>` elements, so it needs no preload or IPC of its own.
  - Full SOUP brand rebrand: `panel/panel.css` tokens and font now match
    the live web app exactly (navy `#14213D`, teal `#0B6B50`, Plus Jakarta
    Sans) instead of the old pre-redesign palette.
  - Document auto-attach: `inject/field-dictionary.js` and
    `inject/portal-bridge.js` now also detect and classify `<input
    type="file">` fields (passport, English test, transcripts, etc. — the
    same `DocumentCategory` vocabulary as `src/lib/documents/categories.ts`
    on the web side). `main.js`'s `attachDocumentToField()` uses the Chrome
    DevTools Protocol (`webContents.debugger` + `DOM.setFileInputFiles`) —
    the only way, in any browser context, to programmatically set a file
    input's files — to attach a matching document without the student
    picking it by hand.
  - Continuous narration + ask-when-unsure: the panel now keeps a running
    "Activity" feed of what it's scanning/filling/attaching, and — when a
    document category matches more than one uploaded file (e.g. both an
    IELTS and a TOEFL report) — pauses with an explicit bounded-choice card
    ("which one should I use?") instead of guessing, the same way this
    assistant itself asks when blocked. See `panel/panel.js`'s
    `renderActivity()` / `renderAskCards()` / `resolveFileFieldsFlow()`.

## Why navigation lives in its own "chrome" BrowserView

An earlier single-tab version first tried a separate toolbar strip in the
main window's own content (not a BrowserView) and found it got covered by
the portal BrowserView's z-order on real hardware; it was then moved *into*
the panel BrowserView as a workaround. Going multi-tab needed a tab strip
regardless, so navigation now gets its own dedicated BrowserView — pinned
full-width across the top, same proven approach (a BrowserView renders
reliably; a bare window-content toolbar area did not) without permanently
borrowing panel space for it.

## Building it yourself

```powershell
cd desktop
npm install
npm start          # runs the app directly, for development
npm run dist        # builds dist/SOUP Companion Setup 1.0.0.exe
```

If `npm run dist` fails with `Cannot create symbolic link: A required
privilege is not held by the client`, that's electron-builder trying to
extract macOS code-signing tools it doesn't need for an unsigned Windows
build — either enable Windows Developer Mode (Settings → Privacy & Security
→ For developers) or run the command as Administrator once. This is a
one-time environment issue, not a bug in the app.

## Distribution reality check

The built `.exe` is **unsigned** — no code-signing certificate has been
purchased. Windows SmartScreen will show an "Unknown publisher" warning the
first time someone runs it (they click "More info → Run anyway" to
proceed). This is expected and not a bug. A real code-signing certificate
(roughly $100–500/year from a CA like Sectigo/DigiCert, requires business
identity verification) removes that warning — a decision for later, not
blocking a small test-student rollout.

It's currently hosted as a static file at
`public/downloads/soup-companion-setup.exe` in the main SOUP repo (linked
from `/companion/connect`), which is a real, working, verified-live link —
but committing a ~78MB binary into git isn't scalable for every future
release. Worth moving to dedicated release hosting (GitHub Releases on a
separate repo, or a storage bucket) before this ships frequent updates. The
binary there still reflects the earlier single-tab build — it needs a
fresh `npm run dist` and re-upload before the multi-tab/auto-attach work
above reaches real students.

## Scoping notes

- Detection is heuristic (keyword/regex, see `inject/field-dictionary.js`),
  not AI — this app's own source is inspectable by whoever installs it, so
  no AI provider key lives in it. "Ask Noodles" opens the real SOUP web app
  in the student's default browser instead.
- The progress stepper is page-local, not a persisted cross-page tracker.
- "Add answer" for a missing field fills the current page only; it doesn't
  write back to the student's SOUP profile yet.
- Document auto-attach only looks at the top-level frame of the active
  tab's page (same scope as the existing text-field scan) — a file input
  inside a cross-origin iframe won't be found.
- No auto-update mechanism is wired up yet — a new build needs to be
  manually re-distributed when the app changes.
- The backend is fully shared with the web app: same `/api/companion/*`
  routes, same pairing flow, same `/companion/connect` page. The new
  `GET /api/companion/documents/match` route is the one addition this pass
  made on the backend side, specifically to support auto-attach.
