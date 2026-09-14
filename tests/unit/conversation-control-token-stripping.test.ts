import { describe, expect, it } from "vitest";
import { stripConversationControlTokens } from "../../src/lib/conversation/trust";

describe("stripConversationControlTokens", () => {
  it("strips a complete control token", () => {
    expect(stripConversationControlTokens("Please upload it.\n\n[[DOCUMENT_REQUEST:Passport]]")).toBe("Please upload it.");
  });

  it("never leaks a dangling/incomplete control token left by a truncated reply (regression: a real tester saw '[[CASE_UPDATE|budgetMax=' leak into the chat)", () => {
    const truncated = "Which intake are you aiming for (for example, Spring 2027 or Fall 2027)?\n\n[[CASE_UPDATE|budgetMax=";
    const visible = stripConversationControlTokens(truncated);
    expect(visible).not.toContain("[[");
    expect(visible).not.toContain("CASE_UPDATE");
    expect(visible).toContain("Which intake are you aiming for");
  });

  it("strips a dangling fragment cut off partway through the payload", () => {
    expect(stripConversationControlTokens("Let's do this one item at a time. First: **Passport**.\n\n[[DOCUMENT_REQUEST:Pass")).not.toContain("[[");
  });

  it("strips a dangling fragment even when the cut lands mid-keyword, not only after it", () => {
    expect(stripConversationControlTokens("Great, let's build your plan.\n\n[[APPLICATION_PLAN")).not.toContain("[[");
    expect(stripConversationControlTokens("One moment.\n\n[[CASE_UPD")).not.toContain("[[");
  });

  it("leaves ordinary double-bracket text alone when it does not match a known control token prefix", () => {
    expect(stripConversationControlTokens("Use [[this]] as a placeholder in your notes.")).toContain("[[this]]");
  });
});
