# SOUP Final Pre-Deployment / Investor Beta Patch

Baseline: `SOUP_GCI_Benchmark_Fork_DeepQA_Patched_Source_v3.zip`

## Final product changes
- Replaced the old homepage top-card experience with a large **Ask SOUP** AI entry box.
- The homepage prompt is passed into the existing Counselor and sent as the first Counselor message, preserving one conversation layer.
- Removed the standalone Scholarships homepage card while keeping scholarship capability inside Counselor/service routes.
- Added a restrained homepage continuation with live university-partner and service-partner catalog sections.
- Added a persistent **Your application journey** panel to Counselor showing stage, next action, checklist progress, document count and known case facts.
- Counselor journey state refreshes after chat/document/plan/checklist changes.
- Strengthened document-aware Counselor behavior: relevant academic, identity, offer, finance, visa, accommodation and insurance documents are requested contextually, one at a time.
- Added a database-first university research policy to reduce unnecessary AI/web search usage.
- Added bounded university/program catalog context to Counselor so existing SOUP data is reused before web research.
- Live Google Search grounding is now enabled for time-sensitive/current facts, explicit research requests, or thin catalog coverage rather than every Counselor turn.
- Preserved suitability-first ranking: active SOUP partners are prioritized only among genuinely suitable choices.
- Accommodation partner directory can now render structured partner inventory from `Partner.publicMetadata.inventory` when a provider feed/sync populates it.

## Validation completed in this environment
- `npm run check:syntax` — PASS (187 TS/TSX files parsed at time of test)
- `npm run check:deep` — PASS (107/107 invariants)
- `npm run check:repo` — PASS (188 source files, 45 routes, 14 migrations)

## Important deployment note
This source archive intentionally excludes `node_modules`. Dependency installation did not complete inside the time-limited build container, so run the normal install + full production verification on the deployment machine before investor access:

```bash
npm install
npm run typecheck
npm run build
```

Then run the existing launch/preflight checks with production environment variables configured.

## Accommodation feed note
The code is ready to display synced/live partner inventory, but the two accommodation providers still need their actual API/feed/approved sync configuration and credentials/URLs entered into the deployment environment or partner data. No provider was invented or scraped without an approved integration.
