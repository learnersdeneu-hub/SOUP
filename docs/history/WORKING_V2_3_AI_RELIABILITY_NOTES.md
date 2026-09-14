# SOUP Working v2.3 — AI speed & reliability pass

This working build focuses on Noodles latency, research routing and failure handling. It also carries forward the commercial corrections requested after v2.2: SOUP Plus ($54) and SOUP Concierge ($500).

## AI changes
- Default Gemini model updated to `gemini-3.8-flash`.
- Normal chat uses low thinking for lower time-to-first-token; grounded research uses medium thinking.
- Conversation history is capped at 28 recent messages and ~42k characters before provider calls.
- Structured student context is capped at 36k characters and database result counts were reduced to the most relevant recent records.
- Counselor web-research routing now catches public/government-only requests, strict-budget university searches, time-sensitive facts and catalog shortages.
- Grounded search failure before output retries once without web tools and explicitly forbids pretending current facts were verified.
- Existing SSE streaming and transient provider-start retries remain in place.
- Added `npm.cmd run check:ai-readiness` static guard.

## Counseling priority correction
- Eligibility and hard constraints remain absolute.
- Suitable SOUP-network universities receive deliberate shortlist/ranking priority and should be included when they genuinely match.
- Partner status cannot make an unsuitable option suitable.
- Public/independent universities are still researched and included when needed for the student's proper market comparison.

## Plans carried forward
- Free: SOUP
- $54 one-time: SOUP Plus
- $500 one-time: SOUP Concierge

## Still required before calling this deployment-final
A dependency-backed TypeScript check, Next.js production build, Prisma validation/migration check and live Gemini/Supabase end-to-end test must be run in the real project environment with valid environment variables.
