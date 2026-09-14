import { describe, expect, it } from "vitest";
import { selectAttachmentCandidate } from "../../src/lib/journey/attachmentMatching";

const candidate = (id: string, title: string, applicationId: string | null = "app-1", superseded = false) => ({ id, title, applicationId, superseded });

describe("journey document attachment matching", () => {
  it("marks a label match as ambiguous when multiple active requirements match", () => {
    const result = selectAttachmentCandidate({
      candidates: [candidate("a", "Passport copy"), candidate("b", "Passport copy certified")],
      requestedLabel: "Passport copy",
      applicationId: "app-1",
    });
    expect(result).toEqual({ kind: "ambiguous" });
  });

  it("uses the exact checklist item id when supplied", () => {
    const result = selectAttachmentCandidate({
      candidates: [candidate("a", "Passport"), candidate("b", "Transcript")],
      checklistItemId: "b",
      applicationId: "app-1",
    });
    expect(result).toEqual({ kind: "match", itemId: "b" });
  });

  it("never matches a superseded checklist item", () => {
    const result = selectAttachmentCandidate({
      candidates: [candidate("old", "Passport", "app-1", true)],
      checklistItemId: "old",
      applicationId: "app-1",
    });
    expect(result).toEqual({ kind: "none" });
  });

  it("scopes label matching to the requested application", () => {
    const result = selectAttachmentCandidate({
      candidates: [candidate("other", "Passport", "app-2"), candidate("right", "Passport", "app-1")],
      requestedLabel: "Passport",
      applicationId: "app-1",
    });
    expect(result).toEqual({ kind: "match", itemId: "right" });
  });
});
