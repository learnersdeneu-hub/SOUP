# SOUP v1.3 — Counselor Handoff/UI Fix

This build fixes two issues found during local investor-beta testing:

1. Counselor composer/input could be pushed below the visible viewport because the Application Journey panel and ConversationWorkspace both consumed viewport height. The counselor page now uses a single flex-column viewport layout and the conversation workspace consumes only the remaining height.
2. Homepage Ask SOUP handoff now stages the initial prompt after conversation restoration and sends it once the workspace has fully loaded, avoiding a race with saved-session/history restoration.
3. Local `npm run dev` now starts SOUP on port 3001 by default.

No database migration was added. `.env.local` is intentionally not included.
