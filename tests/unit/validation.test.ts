import { describe, expect, it } from "vitest";
import {
  adminOfferUploadSchema,
  conversationHistoryQuerySchema,
  conversationStreamSchema,
  evidenceProcessFormSchema,
  journeyItemStatusSchema,
  premiumCheckoutFormSchema,
  resumeExportQuerySchema,
  startApplicationSchema,
  stripeWebhookEventSchema,
} from "../../src/lib/validation/schemas";

describe("request schemas", () => {
  it("accepts a valid application start payload", () => {
    const result = startApplicationSchema.safeParse({ shortlistItemId: "s1", universityId: "u1", programId: null, intake: "September 2027" });
    expect(result.success).toBe(true);
  });

  it("rejects unknown application fields", () => {
    const result = startApplicationSchema.safeParse({ shortlistItemId: "s1", universityId: "u1", admin: true });
    expect(result.success).toBe(false);
  });

  it("caps conversation history and validates roles", () => {
    const messages = Array.from({ length: 81 }, () => ({ role: "user" as const, content: "hello" }));
    expect(conversationStreamSchema.safeParse({ messages }).success).toBe(false);
    expect(conversationStreamSchema.safeParse({ messages: [{ role: "system", content: "x" }] }).success).toBe(false);
  });

  it("rejects invalid journey state", () => {
    expect(journeyItemStatusSchema.safeParse({ itemId: "x", status: "HACKED" }).success).toBe(false);
  });

  it("validates query and form request contracts centrally", () => {
    expect(conversationHistoryQuerySchema.safeParse({ workflow: "COUNSELOR" }).success).toBe(true);
    expect(conversationHistoryQuerySchema.safeParse({ workflow: "ADMIN" }).success).toBe(false);
    expect(premiumCheckoutFormSchema.safeParse({ plan: "premium_plus" }).success).toBe(true);
    expect(premiumCheckoutFormSchema.safeParse({ plan: "enterprise" }).success).toBe(false);
    expect(resumeExportQuerySchema.safeParse({ format: "json" }).success).toBe(true);
    expect(resumeExportQuerySchema.safeParse({ format: "exe" }).success).toBe(true);
  });

  it("validates upload metadata and webhook envelopes", () => {
    expect(adminOfferUploadSchema.safeParse({ file: {}, conditional: "true" }).success).toBe(true);
    expect(evidenceProcessFormSchema.safeParse({ file: {}, workflow: "COUNSELOR" }).success).toBe(true);
    expect(evidenceProcessFormSchema.safeParse({ file: {}, workflow: "ROOT" }).success).toBe(false);
    expect(stripeWebhookEventSchema.safeParse({ type: "checkout.session.completed", data: { object: {} } }).success).toBe(true);
    expect(stripeWebhookEventSchema.safeParse({ data: { object: {} } }).success).toBe(false);
  });
});
