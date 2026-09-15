# SOUP Companion (desktop app)

A standalone Windows app — no Google, no Chrome Web Store. One window with
a built-in browser on the left (navigate it to the actual university/visa/
accommodation site) and the SOUP assistant panel on the right, always
visible alongside whatever form is open.

## What's real vs. what needs verifying on a real machine

This was built and packaged successfully in an automated, sandboxed
environment that deliberately blocks launching real GUI windows (it sets
`ELECTRON_RUN_AS_NODE=1` specifically to stop that) — the same category of
guardrail that blocked other risky actions earlier in this project. That
means:

- **Verified for real:** every file's JavaScript syntax (`node --check`),
  and the actual Windows installer build (`npm run dist` succeeded and
  produced `dist/SOUP Companion Setup 1.0.0.exe`, ~78 MB, a normal size for
  a bundled Chromium+Node app).
- **Not yet verified:** actually opening the window, navigating to a real
  portal, and clicking through the panel. The code uses standard,
  well-documented Electron APIs (`BrowserWindow`, `BrowserView`, `ipcMain`/
  `contextBridge`, `executeJavaScript`) the same way the browser-extension
  build's logic already works, but this needs a real run on a real machine
  to confirm before trusting it with actual students. Run `npm start` from
  this folder, or install the built `.exe`, and try it against a real
  application form.

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
(a few hundred dollars/year from a CA, requires business identity
verification) removes that warning — a decision for later, not blocking a
small test-student rollout.

## What's shared with the browser-extension build

- `inject/field-dictionary.js` — identical field-classification dictionary.
- `inject/portal-bridge.js` — the same real scanning/filling logic as
  `extension/content-script.js`, adapted only in *how* it's invoked
  (`webContents.executeJavaScript` here, `chrome.runtime` messaging there).
- `panel/panel.css` — identical design tokens/layout to
  `extension/sidepanel.css`.
- `panel/panel.js` — the same state machine and screens as
  `extension/sidepanel.js`, with `chrome.*` calls swapped for
  `window.soupDesktop.*` (see `preload-panel.js`).
- The backend is 100% shared: same `/api/companion/*` routes, same pairing
  flow, same `/companion/connect` page.

## Scoping notes (same honesty as extension/README.md)

- Detection is heuristic (keyword/regex), not AI — same reasoning as the
  extension: this build's own source is inspectable by whoever installs it
  (even more so, since it's your own distribution, not vetted by anyone),
  so no AI provider key lives in it. "Ask Noodles" opens the real SOUP web
  app in the student's default browser.
- The progress stepper is page-local, not a persisted cross-page tracker.
- "Add answer" for a missing field fills the current page only; it doesn't
  write back to the student's SOUP profile yet.
- No auto-update mechanism is wired up yet — a new build needs to be
  manually re-distributed when the app changes.
