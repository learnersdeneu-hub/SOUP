# Working v2.0 catalog update

This working build extends v1.9 with the user's previously uploaded university masterlist plus current public AHZ/GUS/InUni/ApplyBoard evidence.

Changes:
- New deduplicated 296-institution master catalog.
- New 299-row program master catalog with strict current-vs-historical freshness status.
- ApplyBoard added as an application-network route without falsely claiming direct SOUP contracts.
- Historical 2023-era program data is kept inactive until refreshed.
- Current publicly verified ApplyBoard program examples are active.
- Noodles gets a separate list of network universities that need program-level research, so commercial network coverage never becomes a false academic match.
- New `import:university-master` and `check:university-catalog` scripts.

This is still a working build while product requirements are being added; it is not yet the deployment-final package.
