// Pricing displays in EUR per product decision (not a currency change to
// the underlying Stripe charge, which remains USD — see createStripeCheckoutSession
// callers; the numeric amount is the same either way, only the shown symbol differs).
export const PREMIUM_COUNSELING_PRICE_USD = 20;
export const PREMIUM_COUNSELING_CENTS = PREMIUM_COUNSELING_PRICE_USD * 100;
export const PREMIUM_COUNSELING_TITLE = "SOUP Scholar";

export const PREMIUM_PLUS_PRICE_USD = 500;
export const PREMIUM_PLUS_CENTS = PREMIUM_PLUS_PRICE_USD * 100;
export const PREMIUM_PLUS_TITLE = "SOUP Concierge";

// Not a public pricing tier — never shown on the homepage/plans page. This
// is a one-time add-on offered only in context, right where a student
// actually hits the free My Colleges cap (see MY_COLLEGES_CAP in
// src/lib/applications/lifecycle.ts), raising it from 3 to 10 tracked
// universities. See effectiveCollegesCap.
export const CAPACITY_UPGRADE_PRICE_USD = 50;
export const CAPACITY_UPGRADE_CENTS = CAPACITY_UPGRADE_PRICE_USD * 100;
export const CAPACITY_UPGRADE_TITLE = "My Colleges capacity upgrade";
export const CAPACITY_UPGRADE_CAP = 10;

export type PremiumPlan = "premium" | "premium_plus";
export function premiumPlanConfig(plan: PremiumPlan) {
  return plan === "premium_plus"
    ? { plan, title: PREMIUM_PLUS_TITLE, priceUsd: PREMIUM_PLUS_PRICE_USD, cents: PREMIUM_PLUS_CENTS, description: "High-touch end-to-end counseling with weekly video sessions, senior counselor support, private accommodation search and managed eligible partner applications. University application fees are separate." }
    : { plan, title: PREMIUM_COUNSELING_TITLE, priceUsd: PREMIUM_COUNSELING_PRICE_USD, cents: PREMIUM_COUNSELING_CENTS, description: "Real-time counselor support and managed eligible partner-university application support. University application fees are separate." };
}

export function paymentBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
}
