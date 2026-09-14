# Sprint 1.5 Audit Corrections

This checkpoint applies the nine corrections identified by the comprehensive Sprint 1.5 audit. Sprint 2 is intentionally untouched.

1. Full GCI snapshot export now renders a real three-page PDF.
2. New Conversation now completes the current server-side chat session and creates a fresh session for signed-in users.
3. Guest-to-account migration protects a new guest transcript from being replaced by an older in-progress server conversation.
4. Report/Financial sign-in and upload controls are only surfaced after the AI explicitly requests evidence using the internal EVIDENCE_REQUESTED control signal.
5. Full GCI finalization has a deterministic evidence-readiness gate.
6. Financial finalization has a deterministic evidence/property-readiness gate.
7. Financial-only vs integrated mode is an explicit customer choice, persisted to CustomerContext for signed-in users and stored in the resulting snapshot.
8. CustomerContext is hardened so document-derived content is serialized as untrusted reference data; free-form evidence summaries/source wording are not promoted wholesale into the system context.
9. SUPPORT document listing, signed previews, request-more-info, and rejection actions are scoped to customers assigned to that support user. ADMIN retains global access.

## New additive migration

`20260808170000_sprint15_audit_corrections`

Adds nullable `financialMode` to `customer_contexts`. This is additive and does not alter existing Core records.
