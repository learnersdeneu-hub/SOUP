# Sprint 1 Debug Pass

## What was tested in this environment

- Final Sprint 1 ZIP extracted successfully.
- Project structure and all local `@/` imports scanned: no missing local imports found.
- Internal route references scanned: no known references to missing pages found.
- TypeScript parser/transpile pass across all `.ts` / `.tsx` source files: no syntax errors found.
- Environment-variable references compared with `.env.example`: required variables are documented.
- Prisma schema and four additive Sprint 1 migration files inspected for structural consistency.
- Attempted dependency install. This environment's internal npm registry returned 404 for `@anthropic-ai/sdk`, and also for `@prisma/client` when retrying without the AI SDKs. Therefore a real dependency-backed `prisma validate`, `tsc`, and `next build` cannot be completed here.

## Bugs fixed during this debug pass

1. Invalid support status query values could be cast directly into Prisma at runtime. The support queue now validates status against the real `SupportTicketStatus` enum before querying.
2. SUPPORT users could see tickets assigned to other support users. They now see only their own assigned tickets plus unassigned tickets available for pickup; ADMIN still sees all tickets.
3. SUPPORT users could reply to any ticket by calling the server action directly. Server-side authorization now limits support access to tickets assigned to them or currently unassigned.
4. SUPPORT users could assign tickets to other staff or unassign tickets. They can now only claim an unassigned ticket for themselves; ADMIN retains full assignment control.
5. SUPPORT users could change any ticket status directly. They must now own the assignment first.
6. SUPPORT users could add internal ticket notes to tickets not assigned to them. This is now blocked server-side.
7. SUPPORT users could inspect arbitrary customer detail pages and add internal user notes by direct action calls. Customer detail and internal notes are now restricted to customers with a ticket assigned to that support user; ADMIN remains unrestricted.
8. The document review UI displayed an Approve button to SUPPORT even though the action correctly rejected it. SUPPORT now sees an "Admin approval required" state; only ADMIN sees the approval control.

## Still requires laptop QA

Run the commands in `SPRINT1_QA.md` using the normal public npm registry and the real Supabase environment. Do not begin Sprint 2 until `npm install`, Prisma validation, TypeScript checking, production build, migrations, and the manual acceptance tests all pass.
