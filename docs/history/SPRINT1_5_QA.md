# Sprint 1.5 local QA gate

The code checkpoint was statically inspected in the build sandbox. The sandbox cannot install `@anthropic-ai/sdk` from its restricted npm mirror, so the real TypeScript/Next production build must be run on the Dell where npm already works.

## Before running

Keep the working `.env.local` outside ZIPs/source control. Add server-only AI settings:

```env
AI_PROVIDER="openai"
AI_MODEL="gpt-4o"
OPENAI_API_KEY="YOUR_OPENAI_PROJECT_KEY"
```

Do not put the OpenAI key in any `NEXT_PUBLIC_` variable.

## Database

The live database already has the Sprint 1 migrations. This checkpoint adds four new additive migrations:

- 20260808010000_conversational_evidence
- 20260808013000_report_snapshots
- 20260808020000_property_evidence
- 20260808023000_customer_context

Run:

```powershell
npm.cmd install
npm.cmd run prisma:status:local
npm.cmd run prisma:deploy:local
npx.cmd prisma generate
npm.cmd run check:repo
npm.cmd run check:ai
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev -- -p 3001
```

Do not run `prisma migrate dev` against the live Supabase database.

## Manual acceptance journeys

### Resume
Guest → conversational interview → account at generation boundary → resume + 100–300 word cover letter → saved Resume v1 → PDF/download → My GCI.

### Complete GCI
Guest → conversational assessment → account only at first upload → document 1 → AI evidence analysis → next question/document → repeat → final command → immutable Complete GCI package snapshot.

### Financial standalone
Guest → financial/property conversation → account at first upload → property/financial evidence → final command with no Resume/GCI context → exactly 2-page PDF.

### Financial integrated
Existing Resume and/or Full GCI context → Financial evidence journey → final command → exactly 5-page PDF.

### Shared intelligence
After generating a Resume or processing evidence, start another GCI workflow and confirm the AI recognizes existing saved context instead of blindly re-asking it.

### Security
Confirm guest cannot upload private evidence, one customer cannot access another customer's documents/snapshots/history, SUPPORT boundaries remain scoped, and OpenAI keys never appear in browser source/network payloads.
