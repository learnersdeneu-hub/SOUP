# Sprint 1.5 — Block 10 checkpoint

## Property document intelligence

- Added a dedicated `PropertyEvidence` record linked to the existing private Document evidence rather than inventing a second file store.
- Financial evidence analysis now recognizes property/title/deed/registry/lease-type documents and preserves extracted factual property fields for later valuation/report logic.
- Captures address/location, jurisdiction/country, ownership names, document-stated value/consideration, currency and other extracted facts when actually present.
- Explicitly labels this stage `EVIDENCE_ONLY`: a price written in a document is not treated as an independent current market valuation.
- Prompt-injection boundary from Block 7 remains in force: text inside uploaded property files is evidence, never executable instructions.
- The model is ready for authoritative registry/market-data sources later without changing the customer conversation or underlying document ownership model.
