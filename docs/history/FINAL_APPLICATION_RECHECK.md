# SOUP v1.6 — Complete Student Application Recheck

The managed partner-university application flow was rechecked end-to-end from recommendation through SOUP submission controls.

## Student-side sequence
1. Counselor gathers degree, subject, academics, budget, intake and geography.
2. Suitable SOUP partner options are surfaced first; the student explicitly chooses whether to apply.
3. Starting a partner application creates a SOUP-managed application and source-backed university requirements checklist.
4. Core applicant information is tracked: legal name, email, date of birth, nationality, current country of residence and academic background.
5. The Counselor collects one missing core fact or requirement at a time.
6. Required documents appear contextually as secure upload actions and are reused from the vault when safe.
7. Non-document student actions can be marked complete; SOUP operational actions cannot be self-completed by the student.
8. The student application page shows core information, checklist progress, documents/actions, and what SOUP is handling.
9. Student approval is blocked until core applicant information and student-blocking requirements are complete.
10. Student approval records an auditable STUDENT_APPROVED_FOR_SUBMISSION event and moves the application to READY_TO_SUBMIT.
11. SOUP admissions performs final document/action checks. Staff review cannot fabricate student approval.
12. SUBMITTED is blocked until student approval exists and the current required admissions checklist is complete.
13. SOUP staff records submission/reference; the dashboard then tracks university review, requests and decisions.
14. Offer upload moves the journey into offer/visa/pre-departure workflows.

## Safety / trust boundaries
- Uploaded does not mean university approved.
- AI document analysis does not equal university acceptance.
- Independent/non-partner applications remain guided/self-managed.
- Only authorized SOUP admissions/admin staff can record a managed application as submitted.
- SOUP-owned portal/submission tasks are distinguished from student-owned actions.

## Verification
- 27/27 investor-beta application/product checks passed.
- 107/107 deep SOUP invariants passed.
- 193 application TS/TSX source files transpile-parse successfully; declaration files excluded from transpile output generation.
- A dependency-backed `npm.cmd run typecheck` and `npm.cmd run build` must still be run on the deployment machine before production deployment.
