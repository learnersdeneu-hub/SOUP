import { describe, expect, it } from "vitest";
import { resolveAttachAction } from "../../src/components/counselor/CounselorConversation";

describe("resolveAttachAction (Noodles chat attachment affordance)", () => {
  it("gives a signed-in student the real file picker generally, not only when a document was explicitly requested", () => {
    expect(resolveAttachAction({ signedIn: true, documentLabel: null })).toEqual({ type: "open-picker" });
    expect(resolveAttachAction({ signedIn: true, documentLabel: "Passport" })).toEqual({ type: "open-picker" });
  });

  it("never opens the file picker for a guest, even when a document was explicitly requested", () => {
    const action = resolveAttachAction({ signedIn: false, documentLabel: "Passport" });
    expect(action.type).toBe("redirect");
  });

  it("sends a guest to sign-up with a clear, specific reason instead of a silent no-op", () => {
    const action = resolveAttachAction({ signedIn: false, documentLabel: null });
    if (action.type !== "redirect") throw new Error("expected redirect");
    expect(action.url).toContain("/sign-up");
    expect(action.url).toContain("reason=attach-document");
  });

  it("preserves in-progress request/checklist/application context through the sign-up redirect", () => {
    const action = resolveAttachAction({
      signedIn: false,
      intent: "accommodation",
      effectiveChecklistItemId: "item-1",
      documentLabel: "Proof of funds",
      effectiveApplicationId: "app-1",
    });
    if (action.type !== "redirect") throw new Error("expected redirect");
    const next = new URL(action.url, "http://localhost").searchParams.get("next") || "";
    expect(next).toContain("intent=accommodation");
    expect(next).toContain("requestItem=item-1");
    expect(next).toContain("requestLabel=Proof");
    expect(next).toContain("applicationId=app-1");
  });

  it("only ever redirects back into the app's own /counselor route (no open redirect)", () => {
    const action = resolveAttachAction({ signedIn: false, documentLabel: null });
    if (action.type !== "redirect") throw new Error("expected redirect");
    const next = new URL(action.url, "http://localhost").searchParams.get("next") || "";
    expect(next.startsWith("/counselor")).toBe(true);
  });
});
