import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { paymentBaseUrl, CAPACITY_UPGRADE_PRICE_USD, CAPACITY_UPGRADE_CENTS, CAPACITY_UPGRADE_TITLE, CAPACITY_UPGRADE_CAP } from "@/lib/payments/config";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";

// Hidden, contextual add-on — never a public pricing card. Only reachable
// from the "unlock up to {CAPACITY_UPGRADE_CAP}" button that appears on
// /colleges once a student actually hits the free MY_COLLEGES_CAP. Reuses
// the existing generic /api/payments/premium/verify handler (it only
// matches by paymentId/profile, nothing premium-plan-specific) rather than
// duplicating that confirmation logic.
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${paymentBaseUrl()}/sign-in?next=${encodeURIComponent("/colleges")}`, 303);
  const profile = await prisma.profile.findUnique({ where: { userId: user.id }, include: { user: true } });
  if (!profile) return NextResponse.redirect(`${paymentBaseUrl()}/sign-in?error=${encodeURIComponent("Please sign in again before checkout.")}`, 303);

  const already = await prisma.payment.findFirst({ where: { profileId: profile.id, type: "CAPACITY_UPGRADE", status: "PAID" }, select: { id: true } });
  if (already) return NextResponse.redirect(`${paymentBaseUrl()}/colleges`, 303);

  const description = `Raises how many universities you can track in My Colleges from the free limit to ${CAPACITY_UPGRADE_CAP} at a time.`;
  const payment = await prisma.payment.create({ data: { profileId: profile.id, type: "CAPACITY_UPGRADE", status: "PENDING", amount: CAPACITY_UPGRADE_PRICE_USD, currency: "USD", title: CAPACITY_UPGRADE_TITLE, description, provider: "STRIPE" } });
  try {
    const base = paymentBaseUrl();
    const session = await createStripeCheckoutSession({ paymentId: payment.id, customerEmail: profile.user.email, title: CAPACITY_UPGRADE_TITLE, description, amountCents: CAPACITY_UPGRADE_CENTS, currency: "USD", successUrl: `${base}/api/payments/premium/verify?session_id={CHECKOUT_SESSION_ID}`, cancelUrl: `${base}/colleges?cancelled=1` });
    await prisma.payment.update({ where: { id: payment.id }, data: { providerSessionId: session.id, status: "REQUIRES_ACTION" } });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", metadata: { reason: error instanceof Error ? error.message : "Checkout failed" } } }).catch(() => undefined);
    return NextResponse.redirect(`${paymentBaseUrl()}/colleges?error=${encodeURIComponent(error instanceof Error ? error.message : "Checkout is temporarily unavailable.")}`, 303);
  }
}
