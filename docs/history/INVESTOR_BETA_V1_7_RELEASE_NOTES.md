# SOUP Investor Beta v1.7 — Application Operating System Pass

This release turns the managed university-application flow into a stricter operational state machine rather than a chat-led checklist alone.

## Added in v1.7

- Program + intake-specific application identity and duplicate prevention.
- Source-backed eligibility, intake, deadline and application-fee facts stored on the application.
- Known expired deadlines block application start/submission.
- Application requirement research refreshes when the source snapshot is older than 30 days.
- Refreshing requirements after student approval invalidates that approval and requires a fresh review.
- Student approval now includes an explicit accuracy declaration.
- Uploaded documents are not treated as submission-ready until processing is complete, SOUP review is approved, and the document is not expired.
- One explicit next-action engine assigns the next action to Student / SOUP / University / Third party.
- Student application dashboard shows next action, owner, intake, deadline urgency, eligibility, fee state and university reference.
- Admissions dashboard exposes eligibility/fee operational review controls with an audit reason.
- Internal application ownership is captured when admissions operates a case.
- Staff status changes now follow a lifecycle transition map rather than allowing arbitrary jumps.
- Submission requires current student approval, resolved eligibility, resolved application fee, non-expired deadline, complete admissions checklist, university reference number and recorded submission evidence.
- Student can withdraw a pre-submission application with a reason; post-submission withdrawals are routed to SOUP staff because an official university withdrawal may be required.
- Student approval and staff status operations are idempotent where appropriate.
- Counselor instructions now explicitly cover hard eligibility, deadline urgency, document quality, conflicts/corrections, multiple applications, unsuitable partner avoidance, stale facts, no-action states and human handoff for exceptions.

## Additional CTO gaps identified and guarded beyond the original 50

The v1.7 pass also addresses several higher-order failure modes: stale approval after requirement changes, backward/invalid status transitions, fee-state ambiguity at submission, expired-deadline submission, duplicate program/intake cases, post-submission operational locking, source/review audit notes, evidence-backed submission status, and explicit internal case ownership.

## Verification on this exact source

- 107/107 deep SOUP invariants passed.
- 27/27 investor-beta checks passed.
- 31/31 application-operating-system checks passed.
- Repository consistency passed: 199 source files, 47 routes, 15 migrations.
- Migration consistency passed: 15 migrations.
- Syntax/transpile parse passed for 198 TypeScript/TSX files.

A dependency-backed `prisma validate`, `tsc --noEmit`, and `next build` still needs to be run on the deployment machine with project dependencies installed before Vercel production deployment.
