export type SoupWorkflow = "RESUME" | "COUNSELOR" | "REPORT" | "FINANCIAL" | "LEARN";
// Backward-compatible alias while the fork still contains a few legacy GCI-only modules.
export type GCIWorkflow = SoupWorkflow;

export type ConversationRole = "user" | "assistant";

export type ConversationMessage = {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt: string;
  kind?: "text" | "system-card" | "evidence" | "result";
  metadata?: Record<string, unknown>;
};

export type ConversationDraft = {
  workflow: SoupWorkflow;
  messages: ConversationMessage[];
  updatedAt: string;
};
