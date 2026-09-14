# SOUP — Start Here

This repository is the engineering-hardened SOUP deployment baseline. Do not rebuild the app from an older package; future work should be applied as targeted patches to this codebase.

## Windows local verification

Run from the folder that contains `package.json`:

```powershell
npm.cmd install
npm.cmd run prisma:validate:local
npm.cmd run prisma:deploy:local
npm.cmd run verify:deploy
npm.cmd run dev
```

SOUP runs locally on `http://localhost:3001`.

## Required manual QA before deployment

1. Guest → Noodles → sign-in → saved conversation.
2. University directory → individual university detail → fee/intake/program/source display.
3. Shortlist → Keep/Remove → Final 3 → compare → refresh/re-login persistence.
4. Managed application → requirements → document upload → review → approval → staff submission → evidence/reference.
5. Offer/conditional offer → conditions → visa checklist.
6. Support ticket → staff reply → email where Resend is configured.
7. Forgot password → recovery email → new password → sign in.
8. Google OAuth.
9. Two separate student accounts: confirm one cannot read the other's rows/files.
10. Mobile widths: header, Noodles, university cards/details, applications, documents, offers, visa, support and pricing.

## Engineering docs

- `docs/architecture.md`
- `docs/security.md`
- `docs/testing.md`
- `docs/deployment.md`
- `DEPLOYMENT_AUTH_EMAIL_CHECKLIST.md`

Historical AI-build notes are archived under `docs/history/` and are not part of the active operating documentation.
