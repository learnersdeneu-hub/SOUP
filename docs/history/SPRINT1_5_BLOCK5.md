# Sprint 1.5 — Block 5 checkpoint

## Resume generation from conversation

- Added authenticated generation directly from the conversational transcript; no form reconstruction is required.
- AI chooses the appropriate approved GCI resume template from the conversation and must leave unsupported facts blank rather than inventing them.
- Generated Resume + cover letter are stored in the real Resume workspace and versioned as v1 in one transaction.
- Result appears as a clean inline product result with Resume PDF, cover-letter download, Resume Intelligence, and My GCI links.
- Guest → account boundary remains immediately before generation, preserving the user's local conversation through authentication.
- Existing deterministic PDF renderer and versioning architecture are reused rather than duplicated.
