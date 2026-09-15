# SOUP Companion (desktop app)

A standalone Windows app — no Google, no Chrome Web Store, no browser
extension. One window: a built-in mini-browser (left) that the student
navigates to the actual university/visa/accommodation site, and the SOUP
assistant panel (right), which also owns the navigation controls (address
bar, back/forward/reload/home) at its own top — see "Why navigation lives
in the panel" below.

## Status: confirmed running on real hardware

Earlier claims here were "should work, built with standard Electron APIs,
not personally verified" — that's since been superseded by actually running
it and fixing what broke:

- **Confirmed working, from a real screenshot:** the app launches, the
  portal and panel render correctly side by side, the panel connects to the
  SOUP backend, scans a real page, detects fields, shows the consistency
  check, and renders the progress stepper — the whole core loop functions.
- **Found and fixed by that same real run:** the original design put
  navigation controls (address bar, back/forward/reload) in a separate
  strip of the main window's own content, above the two BrowserViews. On
  the tester's actual machine, that strip never rendered — the portal
  BrowserView covered it regardless of two rounds of timing-based fixes
  attempted blind (multiple `layout()` retrigger points, then a
  `backgroundColor` fallback). Rather than guess a third time, navigation
  was moved into the panel itself instead, which was already confirmed
  rendering correctly — removing the failure mode rather than continuing to
  patch around it. `shell.html`/`shell.js`/`preload-shell.js` are gone;
  `main.js` now gives both BrowserViews the full window (no reserved gap),
  and the panel's own `sc-navbar` (see `panel/panel.js` /
  `renderNavBar()`) drives navigation via `window.soupDesktop.navigate()`
  and friends (`preload-panel.js`).
- **Still needs a fresh confirm from a real run:** this exact change (nav
  bar now inside the panel) hasn't been visually verified yet — it was
  built and packaged in the same sandboxed environment that still can't
  launch a real GUI window (`ELECTRON_RUN_AS_NODE=1`). Install the rebuilt
  `.exe` and check the navy nav bar appears at the very top of the panel,
  above "SOUP Companion" / the portal hostname.

## Why navigation lives in the panel, not a separate toolbar

The panel BrowserView was the one piece proven to render reliably on real
hardware from the start. Rather than keep debugging a second, separately
positioned UI surface blind (no way to see a screenshot until the tester
runs a new build each time), folding the nav bar into the already-working
panel removes an entire class of BrowserView-layering timing bugs, at the
cost of the address bar being on the right instead of spanning the top like
a conventional browser — an acceptable trade for reliability.

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
separate repo, or a storage bucket) before this ships frequent updates.

## Scoping notes

- Detection is heuristic (keyword/regex, see `inject/field-dictionary.js`),
  not AI — this app's own source is inspectable by whoever installs it, so
  no AI provider key lives in it. "Ask Noodles" opens the real SOUP web app
  in the student's default browser instead.
- The progress stepper is page-local, not a persisted cross-page tracker.
- "Add answer" for a missing field fills the current page only; it doesn't
  write back to the student's SOUP profile yet.
- No auto-update mechanism is wired up yet — a new build needs to be
  manually re-distributed when the app changes.
- The backend is fully shared with the (now-removed) browser-extension
  prototype this was ported from: same `/api/companion/*` routes, same
  pairing flow, same `/companion/connect` page — no backend changes needed
  for this app to work.
