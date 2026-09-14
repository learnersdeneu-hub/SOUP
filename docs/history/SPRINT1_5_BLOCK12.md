# Sprint 1.5 — Block 12 checkpoint

## Persistent customer intelligence

- Added one shared `CustomerContext` per profile so Resume, Full GCI, Financial, and Learn & Improve do not behave like separate strangers.
- Context is assembled from the latest Resume, career goal, Core credentials, processed evidence, property evidence, and recent report snapshots.
- The conversational AI receives this context server-side and is instructed not to re-ask established facts unnecessarily.
- Context refreshes after Resume generation, evidence processing, Complete GCI finalization, and Financial finalization.
- Guest conversations still live locally before account creation; once authenticated, the same transcript is handed into the existing `ChatSession` / `ChatMessage` persistence layer.
- Signed-in conversational turns are now persisted server-side, allowing the account to retain the journey beyond the browser's local draft.
- Added authenticated conversation-history handoff endpoint using the existing ownership boundary rather than creating a parallel customer-message store.

This completes the 12 Sprint 1.5 coding blocks. Sprint 2 has not been started.
