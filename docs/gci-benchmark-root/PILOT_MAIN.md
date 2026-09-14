# GCI Pilot Main — Canonical Repository

This repository is the single source of truth for the first live student pilot.

## Runtime architecture
- Full Sprint 1.5 application foundation is retained.
- Pilot AI provider: Gemini via native REST streaming.
- Default pilot model: `gemini-3.6-flash` (override with `AI_MODEL`).
- OpenAI provider code is parked for a later provider switch; it is not required for the pilot.
- Anthropic runtime and the legacy Google Generative AI SDK are removed from the pilot repository to avoid dead-code dependency/build drift.

## Pilot priority journey
1. Student enters GCI.
2. Student can use the modern conversational Resume journey as a guest.
3. Existing Resume import remains available and extracts PDF/DOCX/image text locally/server-side before AI rewriting.
4. Gemini handles conversational understanding and content generation.
5. GCI's own renderer creates the Resume and Cover Letter PDFs; repeat downloads require no AI call.
6. Saved Resume editing/version history remains at `/resume/manage` after authentication.

## Current limitation to address next
The old Resume upload/import flow and the modern Resume conversation are still separate UI paths. The next focused pilot feature should make an existing-resume upload available directly in the modern conversational Resume journey, then feed the extracted content into the same conversation/context before generation.

## Required local configuration
Copy `.env.example` to `.env.local` values from the known working environment and set:

```
AI_PROVIDER="gemini"
AI_MODEL="gemini-3.6-flash"
GEMINI_API_KEY="<server-side key>"
```

Do not commit `.env.local` or any API/database secret.

## Dell validation gate
Run in order:
1. `npm.cmd install`
2. `npm.cmd run check:repo`
3. `npm.cmd run check:deep`
4. `npm.cmd run check:ai`
5. `npm.cmd run prisma:validate:local`
6. `npm.cmd run prisma:status:local`
7. Review/apply only pending additive migrations if any.
8. `npm.cmd run typecheck`
9. `npm.cmd run build`
10. Start on the chosen local port and perform the live Resume pilot journey.

Do not begin further Sprint 2 feature blocks until this canonical pilot repository passes these gates.
