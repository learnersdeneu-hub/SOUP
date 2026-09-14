# Sprint 1.5 — Block 3 checkpoint

## Correct guest → account boundaries

- Home no longer sends guests straight to Sign In for Complete GCI or Financial & Valuation.
- Complete GCI and Financial & Valuation now begin as public conversational workspaces.
- Guest conversation state remains in local storage while a user passes through sign-up/sign-in, allowing the same journey to resume afterward.
- My GCI and other private account data remain protected; this block changes product boundaries, not security.
- Learn & Improve remains account-oriented because it depends on a persistent personal profile.
- Resume keeps its existing guest start; Block 4/5 moves its final generation/save boundary into the conversational flow.

Target rule preserved: Complete GCI and Financial require authentication at first private evidence upload, not at the first question.
