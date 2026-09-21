"use client";

// Every browser-local draft SOUP writes (soup_conversation_<workflow>_v1,
// soup_pending_resume_v1, gci_financial_report_mode_v1 — see
// ConversationWorkspace/ResumeBuilder/ResumeImport/FinancialConversation) is
// keyed by workflow only, never by account. On a shared device (a school or
// library computer, a family laptop) that means one student's draft chat or
// resume-in-progress is still sitting in localStorage after they sign out,
// and the next student to sign in on the same browser can have it silently
// read back — this is exactly how a previous student's own typed messages,
// including their name, were confirmed to leak into a different student's
// Noodles conversation. Call this on sign-out so the next person on this
// browser starts from nothing, regardless of which account it is.
export function clearLocalStudentDrafts() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith("soup_") || key.startsWith("gci_"))) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Private browsing / storage blocked — nothing to clear either way.
  }
}
