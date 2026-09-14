# SOUP Investor Beta Release Candidate v1.4

This release is the targeted pre-deployment correction pass built from v1.3 after live local testing exposed workflow/UI issues.

## Fixed and added

- Homepage service cards now open dedicated Accommodation, Insurance and Student Finance modules instead of turning every service into a Counselor-history screen.
- University cards are clickable and open dedicated university detail pages with location, SOUP partner status, stored program data, fees/intakes/deadlines when available, official-site link and direct Counselor handoff.
- University and service cards now use partner branding/logo treatment, with official-site favicon fallback and monogram fallback.
- Beyond Admission is rebuilt as a fuller partner ecosystem. Confirmed partner roles include:
  - Hellenic Sun Insurance Brokers / insuremart — Insurance Partner
  - MCB Islamic Bank — Banking Partner
  - LearnersDen.eu — Counselling & Application Management
  - Active accommodation partners — loaded dynamically from the SOUP partner catalog
- MCB Islamic Bank and LearnersDen.eu are added to SOUP core seed/import logic so their roles are available to the live partner catalog.
- Counselor Application Journey is expanded into a command center showing:
  - current journey stage
  - what SOUP is doing
  - what the student must do next
  - document count
  - application count
  - active applications
  - SOUP-managed vs guided ownership
  - application-file readiness and next requirement
- Pending required application documents are now surfaced automatically from the server-owned checklist. The contextual upload action appears above the chat composer even if the AI did not repeat the upload token in the latest message.
- Uploaded documents bind to the exact checklist/application where possible and the journey refreshes immediately.
- Added student approval-for-submission flow for completed SOUP-managed application files. The student can approve once all required items are supplied; staff review remains required before marking the application submitted.
- Dashboard now includes a visible end-to-end journey tracker plus an Application Command Centre.
- Counselor prompt now explicitly models partner-university application management from document collection through submission and university follow-up.
- AI credit discipline remains database-first. Live research is reserved for missing catalog coverage or current facts.
- AI stream reliability improved:
  - provider errors are logged server-side for diagnosis
  - grounded-search failures before output retry once without web tools using saved SOUP context
  - response timeout increased to 55 seconds
  - user-facing errors remain provider-neutral and confirm the message was saved
- Counselor layout keeps the composer/action area visible with the larger journey panel.

## Validation completed in this build environment

- Repository consistency check: PASS
- Migration consistency check: PASS
- TypeScript/TSX syntax-transpile parse: PASS (192 files)
- SOUP deep invariants: PASS (107/107)
- Investor-beta targeted release checks: PASS (14/14)
- JavaScript syntax checks for modified seed/import scripts: PASS

## Final local machine gate before Vercel

The build environment used here has no outbound package-registry connectivity, so a fresh dependency install/full Next production build cannot be executed here. Run these against this exact v1.4 folder on the deployment machine (where v1.2 already proved the dependency set can install/build):

```cmd
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
npm.cmd run check:investor-beta
```

Then copy the existing working `.env.local` into the project root and run:

```cmd
npm.cmd run dev
```

Local SOUP port is permanently configured as `http://localhost:3001`.
