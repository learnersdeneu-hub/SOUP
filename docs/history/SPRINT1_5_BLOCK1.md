# Sprint 1.5 — Block 1 checkpoint

## OpenAI-first AI configuration

- OpenAI is now the default provider; Anthropic and Gemini remain available via `AI_PROVIDER`.
- Default model is configurable through `AI_MODEL`; example uses `gpt-4o`.
- OpenAI streaming requests request usage totals.
- Customer-facing API failures no longer expose provider-specific missing-key messages.
- Added `npm run check:ai` to validate that the selected provider key is present.

## Local configuration

Set these server-side values in `.env.local`:

```env
AI_PROVIDER="openai"
AI_MODEL="gpt-4o"
OPENAI_API_KEY="..."
```

Never put the OpenAI key in a `NEXT_PUBLIC_` variable.
