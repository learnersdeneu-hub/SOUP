# GCI.ai — Consolidated Sprint 3

This repository is the consolidated continuation of the audited Sprint 1.5 foundation, Sprint 2 Gemini pilot runtime, and Sprint 3 product-experience work. It is not a patch-only folder: the complete application source is included.

## Block 3.0 — Sprint 1.5 foundation preserved
- Supabase authentication/profile repair, guest-to-account continuation, Prisma migrations and ownership controls.
- Resume models, saved versions, dashboard, documents, notifications, support/admin foundations.
- Complete GCI evidence flow and real report PDF.
- Financial mode/evidence flow and real financial PDFs.
- Resume management, Resume Intelligence and Opportunity/Career foundations.

## Block 3.1 — Sprint 2 / Gemini closure
- Gemini remains the pilot default provider.
- Provider-specific customer wording is neutralized.
- Resume readiness now hands final-generation intent to GCI application code instead of asking Gemini to print the final CV in chat.
- Existing OpenAI adapter remains parked for a later controlled provider switch.

## Block 3.2 — Conversation shell and history
- Persistent desktop conversation sidebar plus mobile drawer.
- New conversation action and workflow navigation.
- Signed-in history across Resume, Complete GCI, Financial and Learn.
- Reopen, rename and delete owned sessions.
- Session identity is carried into streaming so reopening an older conversation continues that exact thread.
- Guest conversations remain local until authentication.

## Block 3.3 — Chat-native documents and auth wall
- Composer attachment affordance is the workflow entry point for private documents.
- Complete GCI and Financial only enable evidence upload when AI emits the evidence-request control signal.
- Guests are sent through signup before private evidence upload and return to the workflow.
- Resume supports existing-CV attachment from the conversation; private file selection requires an account in both the UI and the server upload route.
- The legacy `/resume/improve` page now redirects into the unified Resume conversation instead of maintaining a second upload experience.

## Block 3.4 — Real generated artifacts
- Resume final-intent phrases such as “make it”, “PDF”, “Word”, “download” trigger application generation after AI readiness.
- Resume PDF export retained.
- Genuine OOXML `.docx` Word export added without introducing another runtime dependency.
- Cover-letter PDF export retained and `.docx` Word export added.
- Generated files remain visible inside the conversation result card and in My GCI Downloads.
- Resume/report/financial artifact markers and app-generated evidence messages are persisted in owned conversation history so reopening a thread restores its result actions.

## Block 3.5 — Admin visibility/access
- Existing `/admin` role protection remains server-side.
- Staff accounts get a visible Internal/Admin entry from My GCI.
- `GCI_ADMIN_EMAILS` provides a server-only owner bootstrap list for ADMIN accounts; it is never exposed in `NEXT_PUBLIC_*`.
- SUPPORT remains permission constrained by existing assignment checks.

## Block 3.6 — Resume Intelligence and Career layer
- Existing explainable Resume Intelligence is retained: health, completeness, impact, targeting, recommendations and checkpoints.
- Existing CareerGoal + Opportunity provider boundary is retained.
- Career Coach remains grounded in saved profile/resume/goal context and cannot fabricate live opportunities.

## Block 3.7 — Unified workspace
- Resume, Report, Financial and Learn use the same conversation/history shell.
- Final Resume artifacts remain in the conversation instead of replacing the whole workspace.
- Report/Financial result actions remain attached to their conversations.

## Block 3.8 — Verification gate
Run on the development machine with the real `.env.local`:

1. `npm.cmd install`
2. `npm.cmd run check:repo`
3. `npm.cmd run check:deep`
4. `npm.cmd run prisma:validate:local`
5. `npm.cmd run prisma:status:local`
6. `npm.cmd run typecheck`
7. `npm.cmd run build`
8. `npm.cmd run dev`
9. Live test Resume upload → conversation → generation → PDF + Word downloads.
10. Live test guest Complete GCI/Financial → AI evidence request → signup → upload → final PDF.
11. Put the owner email in `GCI_ADMIN_EMAILS` (server-only), sign out/in, and verify My GCI → Admin dashboard.
12. Reopen, rename, delete and continue conversations from history on desktop and mobile.

## Production gate still intentionally separate
Next.js remains on the previously tested 14.2.35 line in this consolidated code so Sprint 3 does not silently mix a major framework migration with the UX/product changes. A controlled supported-LTS upgrade plus regression pass remains required before production deployment.
