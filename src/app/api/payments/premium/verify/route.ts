import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentBaseUrl } from "@/lib/payments/config";
import { getStripeCheckoutSession } from "@/lib/payments/stripe";
import { sendTransactionalEmail, escapeHtml } from "@/lib/notifications/email";
import { shouldSendStudentEmail } from "@/lib/notifications/preferences";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { paymentVerifyQuerySchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return NextResponse.redirect(`${paymentBaseUrl()}/sign-in?next=${encodeURIComponent("/payments")}`);
  const parsedQuery = paymentVerifyQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsedQuery.success) return NextResponse.redirect(`${paymentBaseUrl()}/payments?error=${encodeURIComponent("Missing payment confirmation.")}`);
  const sessionId = parsedQuery.data.session_id;
  try {
    const session = await getStripeCheckoutSession(sessionId);
    const paymentId = session.metadata?.paymentId || session.client_reference_id;
    if (!paymentId) throw new Error("Payment reference is missing.");
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { profile: { include: { user: true } } } });
    if (!payment || payment.providerSessionId !== sessionId || payment.profileId !== current.profile.id) throw new Error("Payment could not be matched to your SOUP account.");
    if (session.payment_status === "paid" && payment.status !== "PAID") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: new Date(), providerPaymentId: session.payment_intent || null } });
        await tx.notification.create({ data: { profileId: payment.profileId, type: "PAYMENT", title: `${payment.title} activated`, body: `${payment.title} is active. Open My SOUP to continue with your counselor and application support.`, href: "/payments" } });
      });
      if (shouldSendStudentEmail(payment.profile, true)) await sendTransactionalEmail({
        to: payment.profile.user.email,
        subject: `${payment.title} is active`,
        html: `<p>Hi ${escapeHtml(payment.profile.user.fullName || "there")},</p><p>Your <strong>${escapeHtml(payment.title)}</strong> package is active.</p><p>You can now use real-time counselor support and managed application support from My SOUP.</p><p>University application fees are separate and will appear in your SOUP payments dashboard when applicable.</p>`,
        idempotencyKey: `premium-paid-${payment.id}`,
      }).catch(() => undefined);
    }
    return NextResponse.redirect(`${paymentBaseUrl()}/payments?success=1`);
  } catch (error) {
    return NextResponse.redirect(`${paymentBaseUrl()}/payments?error=${encodeURIComponent(error instanceof Error ? error.message : "Payment verification failed.")}`);
  }
}
