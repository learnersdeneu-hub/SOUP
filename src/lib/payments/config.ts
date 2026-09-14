export const PREMIUM_COUNSELING_PRICE_USD = 54;
export const PREMIUM_COUNSELING_CENTS = PREMIUM_COUNSELING_PRICE_USD * 100;
export const PREMIUM_COUNSELING_TITLE = "SOUP Plus";

export const PREMIUM_PLUS_PRICE_USD = 500;
export const PREMIUM_PLUS_CENTS = PREMIUM_PLUS_PRICE_USD * 100;
export const PREMIUM_PLUS_TITLE = "SOUP Concierge";

export type PremiumPlan = "premium" | "premium_plus";
export function premiumPlanConfig(plan: PremiumPlan) {
  return plan === "premium_plus"
    ? { plan, title: PREMIUM_PLUS_TITLE, priceUsd: PREMIUM_PLUS_PRICE_USD, cents: PREMIUM_PLUS_CENTS, description: "High-touch end-to-end counseling with weekly video sessions, senior counselor support, private accommodation search and managed eligible partner applications. University application fees are separate." }
    : { plan, title: PREMIUM_COUNSELING_TITLE, priceUsd: PREMIUM_COUNSELING_PRICE_USD, cents: PREMIUM_COUNSELING_CENTS, description: "Real-time counselor support and managed eligible partner-university application support. University application fees are separate." };
}

export function paymentBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
}
