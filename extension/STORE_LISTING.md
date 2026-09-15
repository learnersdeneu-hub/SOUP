# Chrome Web Store submission — copy-paste reference

Use this when filling out the Developer Dashboard at
https://chrome.google.com/webstore/devconsole. Nothing here is submitted
automatically — it's reference text for the manual submission form.

## Before you start

1. Create a Chrome Web Store developer account (one-time $5 USD registration
   fee, requires your own Google account + payment method — I can't do this
   step, it needs your identity/payment).
2. Zip the `extension/` folder's **contents** (not the folder itself — the
   `manifest.json` must be at the root of the zip). See "Packaging" below.
3. Have 1–3 screenshots ready (1280×800 or 640×400 px). Open the side panel
   on a real form page and capture it — I can't generate real browser
   screenshots from here.

## Visibility

Set **Visibility → Private**, and add your test students' Google account
emails (or a Google Group containing them) under "Trusted testers." Only
those accounts will be able to install it. This is the setting matching
what you chose for the test-student phase.

## Listing fields

**Name** (max 45 chars)
```
SOUP Companion
```

**Summary** (max 132 chars)
```
Fill university, visa and accommodation application forms using information already saved in your SOUP account.
```

**Category**
```
Education
```

**Description** (detailed)
```
SOUP Companion sits beside university, visa and accommodation application
portals and helps you complete the parts that repeat across every form —
using information already saved in your SOUP student account.

What it does:
• Scans the form on the page you're viewing and tells you what it recognises
• Fills matched fields only after you click "Fill this page" — never
  automatically, and never without you seeing what changed
• Flags anything that conflicts with your saved SOUP profile before filling
  it, so you decide which answer is correct
• Shows exactly what's still missing, so you're never guessing what a portal
  still needs from you
• Lets you open a document already stored in your SOUP vault, or jump into
  Noodles (SOUP's AI counselor) for a specific question, without losing your
  place on the page

SOUP Companion never submits an application on your behalf, never fills a
field without you triggering it, and never sends your SOUP account password
or session to the extension — connecting your account uses a short-lived,
one-time code instead.

Requires a SOUP account (soupassist.com). See the full privacy notice at
https://www.soupassist.com/companion/privacy — you can revoke a connected
device's access at any time from My SOUP → SOUP Companion.
```

**Single purpose** (Chrome requires this — one sentence)
```
Reads form fields on the current page and fills them with the user's own
SOUP account information, after explicit confirmation.
```

**Privacy policy URL**
```
https://www.soupassist.com/companion/privacy
```

## Permission justifications

Chrome's review asks you to justify every requested permission. Use these:

- **sidePanel** — "The entire UI is a side panel, per Chrome's side panel
  API, opened from the toolbar icon."
- **storage** — "Stores the device's SOUP access token locally
  (chrome.storage.local) after the user connects their account, so they
  don't have to re-pair every session."
- **activeTab** / **scripting** — "Used to read the current tab's form
  fields and to fill them after the user clicks Fill this page; never used
  without an explicit user action in the side panel."
- **host_permissions: `<all_urls>`** — "Students apply through hundreds of
  different university, visa and accommodation portals on their own
  domains, decided by the student, not the extension. A fixed allowlist
  would make the extension only work on a handful of pre-approved sites.
  The content script only reads form-field labels/values and fills fields
  after an explicit user action — it does not run on soupassist.com itself
  (excluded in the manifest) and sends nothing anywhere on its own."

## Data usage disclosure checkboxes

Chrome's dashboard asks which data types the extension handles. Check:

- **Personally identifiable information** — yes (name, date of birth,
  nationality, country of residence, pulled from the user's own SOUP
  account to display/fill on their behalf).
- **Website content** — yes (reads form field labels/values on the active
  tab to detect and fill them).
- **Authentication information** — yes (the device pairing token, stored
  locally, used to authenticate the extension to the SOUP backend).

Declare "Not sold to third parties" and "Not used for purposes unrelated to
the extension's core functionality" — both true for this build.

## Packaging

From the repo root:
```powershell
Compress-Archive -Path "extension\*" -DestinationPath "soup-companion.zip" -Force
```
Upload `soup-companion.zip` to the dashboard. If Chrome's Windows zip step
ever double-nests the folder, re-check the zip's top level contains
`manifest.json` directly, not an `extension/manifest.json` subfolder.
