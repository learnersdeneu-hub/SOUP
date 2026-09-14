# SOUP Investor Beta v1.6 — Complete Application Recheck

This pass specifically rechecked the managed student application from first recommendation through student file completion and SOUP submission operations.

## Important corrections
- Core applicant facts are now explicitly tracked for managed applications: legal name, date of birth, nationality, country of residence, email and academic background.
- The Counselor can persist identity facts the student states through the existing trusted case-update mechanism.
- A student cannot approve a managed application while core application information is missing.
- University-specific requirements now distinguish `STUDENT` responsibilities from `SOUP` operational responsibilities.
- SOUP-side portal assembly/submission work no longer incorrectly blocks the student's approval step.
- Student-owned, non-document application actions can be marked complete from the application page; SOUP-owned operations cannot be self-completed by the student.
- Required documents continue to use secure contextual upload and document matching rather than manual completion buttons.
- The application page now shows a dedicated Core application information section and sends missing information back through the Counselor.
- `READY_TO_SUBMIT` is described correctly as student-approved and in final SOUP checks, not as waiting for student review.

## Managed application state boundary
Student completion -> student approval -> SOUP final checks -> SOUP staff submission -> university review/decision.

The student interface never claims that upload or AI review equals university acceptance, and only authorized SOUP staff can record a managed application as submitted.
