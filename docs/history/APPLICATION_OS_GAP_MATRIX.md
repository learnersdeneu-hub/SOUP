# SOUP Application OS — 50-Gap CTO/Student/Counselor Coverage Matrix

This matrix records how the 50-gap review is represented in the v1.7 codebase. “Guarded” means a server-side lifecycle/prompt/storage control exists. “Existing” means the capability was already present and was rechecked in this pass.

1. Eligibility gate before Apply — Guarded: shortlist eligibility + application requirements research + submission eligibility gate.
2. Program-level application — Guarded: application binds university + program.
3. Intake locking — Guarded: intake stored on the application and included in duplicate key.
4. Deadline urgency — Guarded: deadline persistence, urgency helper, dashboard display, start/submission deadline blocks.
5. Duplicate prevention — Guarded: unique applicationKey plus server duplicate lookup.
6. Application ownership — Guarded: ownership mode plus assignedStaffUserId for SOUP operations.
7. Responsibility on every task — Existing/Guarded: checklist responsibleParty + next-action owner.
8. Proper Next Action engine — Guarded: lifecycle nextApplicationAction().
9. Document quality review — Existing/Guarded: processing/review states; approval blocks unreviewed/rejected/expired files.
10. Document expiry — Existing/Guarded: validUntil and expiry-aware submission readiness/reminders.
11. Document versioning — Existing: replacementForId and review-event history.
12. Safe document reuse — Existing: reconciliation is type-scoped and conservative.
13. Sensitive-file permissions — Existing: authenticated storage paths, RLS/server authorization.
14. Delete/replace safety — Existing/Guarded: no unsafe direct student delete path; replacement is explicit/audited.
15. AI cannot falsely claim submission — Existing/Guarded: prompt + structured status/evidence requirements.
16. Facts vs assumptions — Existing/Guarded: source-backed requirements and current-fact rules.
17. AI stops re-interviewing — Existing/Guarded: saved context + anti-repeat/decisive prompt rules.
18. Student corrections — Existing: CASE_UPDATE overwrites saved structured case facts when explicitly corrected.
19. Conflicting information — Guarded: Counselor instructed to stop and clarify rather than silently overwrite.
20. Application preview — Existing/Expanded: application detail shows core information, requirements and operational state.
21. Explicit declaration — Guarded: approval requires declarationAccepted and stores declaration timestamp/event.
22. Application fee — Guarded: amount/currency/status stored; admissions review UI; unresolved fee blocks submission.
23. Offer conditions — Existing/Guarded: conditional-offer status, offer document, Counselor rules convert conditions into next actions.
24. Multiple applications — Existing/Expanded: each application has independent state, checklist, deadline and next action.
25. Withdraw application — Guarded: student pre-submission withdrawal endpoint; post-submission routed to staff.
26. Rejected flow — Guarded: next-action engine routes student back to Counselor/options.
27. Offer comparison — Existing: offers are application-specific and visible to Counselor context for comparison.
28. Human handoff — Existing: conversation-scoped human handoff.
29. Staff notes private — Existing: internal notes are excluded from student AI context/UI.
30. Counselor response style — Existing/Expanded: concise, one focused question, anti-repeat, decisive recommendation rules.
31. No irresponsible partner push — Guarded: suitability-first and explicit unsuitable-partner prohibition.
32. Search-result freshness — Guarded: application-requirement snapshot auto-refresh after 30 days; source timestamps retained.
33. University detail integrity/provenance — Existing: source URLs/checked timestamps and no-fabrication policy.
34. University detail → application continuity — Existing: program/university handoff context retained.
35. Login boundary — Existing: persistence/private document/final-file actions are authentication-gated.
36. Session recovery — Existing: server-owned persistent chat sessions and saved messages.
37. Upload failure recovery — Existing: upload APIs return errors without marking requirements complete.
38. AI failure recovery — Existing: retry/fallback path preserves user message and avoids duplicate trusted history.
39. Idempotency — Guarded: duplicate application key, unchanged status response, repeated approval short-circuit.
40. Notifications — Existing: application/document/offer/status notifications persisted.
41. Calm dashboard — Existing/Expanded: compact journey with next action and detail drill-down.
42. What SOUP is doing + timestamps — Existing/Expanded: event history timestamps, status/next-action separation.
43. Timeline/history — Existing: StudentApplicationEvent ledger shown to student/staff.
44. Date consistency — Guarded: persisted DateTime and source-backed date values; ambiguous strings are not promoted to deadlineAt.
45. Admin-side validation — Existing/Expanded: requirements review, status controls, offer upload, fact-review controls.
46. Application reference number — Guarded: required for SUBMITTED.
47. Submission evidence — Guarded: evidence note/URL snapshot required and persisted with actor/time.
48. Data export — Existing partially: application-plan export remains; application-state export is non-blocking for investor beta.
49. Deletion/data retention — Existing foundation: document retention fields and account lifecycle; full self-service erasure remains a public-launch governance item.
50. Real end-to-end scenario — Code-level gates added; still requires dependency-backed local functional run with Supabase/Gemini before deployment.

## Additional gaps identified in the second CTO pass

51. Requirement changes after approval — Guarded: invalidates approval and requires a new student approval.
52. Invalid/backward lifecycle jumps — Guarded: server transition map.
53. Submission with unknown fee state — Guarded: blocked.
54. Submission after deadline — Guarded: blocked.
55. Duplicate program/intake applications — Guarded: applicationKey.
56. Post-submission mutation of operating facts — Guarded: fact-review route locks after submission/decision.
57. No evidence behind “Submitted” — Guarded: reference + submission evidence required.
58. No staff ownership of an active case — Guarded: first admissions operation assigns the case internally.
59. Stale official requirements — Guarded: 30-day refresh policy.
60. Stale student approval after refreshed requirements — Guarded: approval invalidation event/timestamps.
61. AI inventing busywork while waiting — Guarded: explicit no-action/no-manufactured-task prompt rule.
62. AI pushing a partner despite hard mismatch — Guarded: unsuitable partner prohibition and NOT_ELIGIBLE gate.
63. Application start against inactive program — Guarded: active=true program lookup.
64. Silent student withdrawal after university submission — Guarded: requires staff-managed official withdrawal.
65. Eligibility/fee manual overrides without audit context — Guarded: admissions must enter a review/source note.

## Still to test operationally before production tonight

The remaining work is verification, not another architecture rewrite: install dependencies, apply migration 15 to the target Supabase database, run Prisma validation/typecheck/build, then execute the real student scenario through login, recommendation, application start, requirement research, document upload/review, approval, staff finalization, submission evidence, decision/offer and a separate non-partner search scenario.
