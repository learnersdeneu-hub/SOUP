# Sprint 1.5 — Block 11 checkpoint

## Two Financial & Valuation pathways

- Added finalization logic that automatically selects the correct product path from the customer's real GCI state.
- If the customer has no Resume and no Full GCI snapshot, Financial finalization produces a focused **2-page standalone** Financial & Valuation report.
- If Resume and/or Full GCI context exists, finalization produces the broader **5-page integrated** Financial & Valuation report.
- Both paths snapshot the exact source document IDs used and keep property document-stated values distinct from independent market valuation.
- Added actual A4 PDF rendering with exactly 2 or 5 pages according to the selected pathway.
- Final page includes the verification/valuation boundary so AI analysis is not misrepresented as legal title verification or a regulated independent valuation.
- Report generation remains grounded in processed evidence, property evidence, current financial score state, and available Resume/GCI context.
