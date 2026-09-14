import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { paymentBaseUrl, premiumPlanConfig, type PremiumPlan } from "@/lib/payments/config";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";
import { premiumCheckoutFormSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const parsedForm = premiumCheckoutFormSchema.safeParse(form ? Object.fromEntries(form.entries()) : {});
  const plan: PremiumPlan = parsedForm.success ? parsedForm.data.plan : "premium";
  const selected = premiumPlanConfig(plan);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${paymentBaseUrl()}/sign-in?next=${encodeURIComponent("/premium")}`, 303);
  const profile = await prisma.profile.findUnique({ where: { userId: user.id }, include: { user: true } });
  if (!profile) return NextResponse.redirect(`${paymentBaseUrl()}/sign-in?error=${encodeURIComponent("Please sign in again before checkout.")}`, 303);

  const paid = await prisma.payment.findMany({ where: { profileId: profile.id, type: "PREMIUM_COUNSELING", status: "PAID" }, select: { metadata: true } });
  const hasPlus = paid.some(({ metadata }) => metadata !== null && typeof metadata === "object" && !Array.isArray(metadata) && metadata.plan === "premium_plus");
  const hasPremium = paid.length > 0;
  if (hasPlus || (plan === "premium" && hasPremium)) return NextResponse.redirect(`${paymentBaseUrl()}/payments?premium=active`, 303);

  const payment = await prisma.payment.create({ data: { profileId: profile.id, type: "PREMIUM_COUNSELING", status: "PENDING", amount: selected.priceUsd, currency: "USD", title: selected.title, description: selected.description, provider: "STRIPE", metadata: { plan } } });
  try {
    const base = paymentBaseUrl();
    const session = await createStripeCheckoutSession({ paymentId: payment.id, customerEmail: profile.user.email, title: selected.title, description: selected.description, amountCents: selected.cents, currency: "USD", successUrl: `${base}/api/payments/premium/verify?session_id={CHECKOUT_SESSION_ID}`, cancelUrl: `${base}/payments?cancelled=1` });
    await prisma.payment.update({ where: { id: payment.id }, data: { providerSessionId: session.id, status: "REQUIRES_ACTION" } });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", metadata: { plan, reason: error instanceof Error ? error.message : "Checkout failed" } } }).catch(() => undefined);
    return NextResponse.redirect(`${paymentBaseUrl()}/payments?error=${encodeURIComponent(error instanceof Error ? error.message : "Checkout is temporarily unavailable.")}`, 303);
  }
}
