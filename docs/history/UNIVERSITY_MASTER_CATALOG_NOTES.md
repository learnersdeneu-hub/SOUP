# SOUP University Master Catalog — 12 Sep 2026

## What is included

- 296 deduplicated institutions in `data/soup-university-master-catalog.csv`.
- Network routes are preserved instead of flattening everything into a direct SOUP contract: DIRECT_SOUP, AHZ, GUS, GUS_INUNI, IEO, ABN_GLOBAL, CONNECTEDHE, EEUA and APPLYBOARD.
- 299 program rows in `data/soup-program-master-catalog.csv`.
- 11 program rows are current public-verified examples from ApplyBoard destination pages and are active.
- 288 historical program rows from the existing SOUP/LearnersDen program spreadsheet are retained as `HISTORICAL_REFRESH_REQUIRED` and inactive. They are reference material only until refreshed from a current official/partner source.
- `scripts/import-university-master-catalog.mjs` imports the institution catalog and program catalog safely.
- `scripts/university-catalog-check.mjs` checks deduplication, network coverage and the freshness guard.

## Why ApplyBoard is not represented as a fabricated 1,500-name dump

ApplyBoard publicly states that its platform covers 1,500+ institutions and 150,000+ programs, but its public website does not expose one complete machine-readable list of all institutions/programs. The catalog therefore imports every institution individually evidenced on the public pages used in this build and marks APPLYBOARD as a route where verified. A later ApplyBoard portal export/API should be imported to expand this to the full account-specific roster.

## Program safety rule

An institution being in a SOUP network does not prove that it currently offers the student's requested program/intake. Noodles receives `networkUniversitiesNeedingResearch` separately and is instructed to verify the exact current program, degree level and intake before calling such a university suitable.

## Import

```cmd
npm.cmd run import:university-master
npm.cmd run check:university-catalog
```

The importer never activates the stale historical program rows. Current program rows require `data_status=CURRENT_PUBLIC_VERIFIED` and `active=true`.
