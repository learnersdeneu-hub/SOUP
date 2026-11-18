"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireRole } from "@/lib/auth/currentUser";
import { PAYMENT_REVIEW_ROLES } from "@/lib/auth/roles";
import { hasSubmissionAccess } from "@/lib/payments/access";
import {
  BANK_TRANSFER_PROVIDER, INVOICE_CURRENCY, SCHOLAR_INVOICE, bankMetadata, bankTransferReady, invoiceNumberFor, pkrFor,
} from "@/lib/payments/bankTransfer";
import { getUsdToPkrRate } from "@/lib/payments/fx";

const PROOF_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const OPEN_STATUSES = ["PENDING", "REQUIRES_ACTION"] as const;

function back(params: Record<string, string>): never {
  redirect(`/payments?${new URLSearchParams(params).toString()}`);
}

async function notifyPaymentReviewers(title: string, body: string) {
  const reviewers = await prisma.profile.findMany({
    where: { user: { role: { in: PAYMENT_REVIEW_ROLES }, accountStatus: "ACTIVE" } },
    select: { id: true },
  });
  if (!reviewers.length) return;
  await prisma.notification.createMany({
    data: reviewers.map((reviewer) => ({ profileId: reviewer.id, type: "PAYMENT" as const, title, body, href: "/admin/payments" })),
  });
}

// Issues (or re-opens) the student's SOUP Scholar bank-transfer invoice.
// One open invoice per student: asking again returns the same one.
export async function requestScholarInvoice() {
  const { profile, user } = await requireProfile();
  if (await hasSubmissionAccess(profile.id, user.role)) back({ notice: "already-active" });
  if (!bankTransferReady()) back({ error: "Bank transfer invoicing isn't open yet. Please check back shortly or contact SOUP support." });

  const open = await prisma.payment.findFirst({
    where: { profileId: profile.id, type: "PREMIUM_COUNSELING", provider: BANK_TRANSFER_PROVIDER, status: { in: [...OPEN_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
  if (open) back({ invoice: open.id });

  const issuedAt = new Date();
  const dueAt = new Date(issuedAt.getTime() + SCHOLAR_INVOICE.dueInDays * 86_400_000);
  const id = randomUUID();
  const invoiceNumber = invoiceNumberFor(id, issuedAt);
  // Lock the day's PKR conversion onto this invoice (null if unavailable).
  const fx = await getUsdToPkrRate();
  const conversion = fx ? { pkrAmount: pkrFor(SCHOLAR_INVOICE.amountUsd, fx.rate), usdToPkrRate: fx.rate, rateDate: fx.date, rateSource: fx.source } : {};
  await prisma.payment.create({
    data: {
      id,
      profileId: profile.id,
      type: "PREMIUM_COUNSELING",
      status: "PENDING",
      amount: SCHOLAR_INVOICE.amountUsd,
      currency: INVOICE_CURRENCY,
      title: SCHOLAR_INVOICE.title,
      description: `Invoice ${invoiceNumber} · bank transfer`,
      provider: BANK_TRANSFER_PROVIDER,
      dueAt,
      metadata: { plan: "premium", method: BANK_TRANSFER_PROVIDER, invoiceNumber, dueAt: dueAt.toISOString(), ...conversion },
    },
  });
  await prisma.notification.create({
    data: { profileId: profile.id, type: "PAYMENT", title: "Your SOUP invoice is ready", body: `Invoice ${invoiceNumber}: pay by bank transfer, then submit your transaction reference in Payments.`, href: "/payments" },
  });
  revalidatePath("/payments");
  back({ invoice: id });
}

// Student submits the bank transaction reference and/or the paid invoice / receipt.
export async function submitPaymentProof(formData: FormData) {
  const { profile, user } = await requireProfile();
  const paymentId = String(formData.get("paymentId") || "");
  const reference = String(formData.get("transactionReference") || "").trim().slice(0, 120);
  const file = formData.get("proof");
  const hasFile = file instanceof File && file.size > 0;

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, profileId: profile.id, provider: BANK_TRANSFER_PROVIDER, status: { in: [...OPEN_STATUSES] } },
  });
  if (!payment) back({ error: "That invoice can't be updated. It may already be confirmed." });
  if (!reference && !hasFile) back({ invoice: paymentId, error: "Add your transaction reference, attach the paid invoice or receipt, or both." });

  const metadata = bankMetadata(payment.metadata);
  let proofStorageRef = metadata.proofStorageRef;
  let proofFileName = metadata.proofFileName;
  if (hasFile) {
    if (file.size > 10 * 1024 * 1024) back({ invoice: paymentId, error: "The receipt must be 10 MB or smaller." });
    if (file.type && !PROOF_TYPES.has(file.type)) back({ invoice: paymentId, error: "Upload the receipt as a PDF, PNG or JPG." });
    const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "pdf";
    const path = `${user.id}/payment-proofs/${payment.id}-${randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) back({ invoice: paymentId, error: `Upload failed: ${error.message}` });
    proofStorageRef = path;
    proofFileName = file.name.slice(0, 200);
  }

  const next: Prisma.JsonObject = {
    ...metadata,
    transactionReference: reference || metadata.transactionReference || "",
    proofStorageRef: proofStorageRef || "",
    proofFileName: proofFileName || "",
    submittedAt: new Date().toISOString(),
    reviewNote: "",
  };
  await prisma.payment.update({ where: { id: payment.id }, data: { status: "REQUIRES_ACTION", metadata: next } });
  await notifyPaymentReviewers("Bank transfer to verify", `${user.fullName || user.email} submitted payment for invoice ${metadata.invoiceNumber || payment.id}.`);
  revalidatePath("/payments");
  back({ invoice: paymentId, notice: "submitted" });
}

async function reviewablePayment(paymentId: string) {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, provider: BANK_TRANSFER_PROVIDER } });
  if (!payment) throw new Error("Payment not found.");
  return payment;
}

export async function confirmBankPayment(paymentId: string) {
  const current = await requireRole(PAYMENT_REVIEW_ROLES);
  const payment = await reviewablePayment(paymentId);
  if (payment.status === "PAID") return;
  const metadata = bankMetadata(payment.metadata);
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        providerPaymentId: metadata.transactionReference || null,
        metadata: { ...metadata, reviewedBy: current.user.email, reviewedAt: new Date().toISOString() },
      },
    });
    await tx.notification.create({
      data: { profileId: payment.profileId, type: "PAYMENT", title: "Payment confirmed", body: "Your SOUP Scholar payment is confirmed. Document uploads, submissions and SOUP services are now unlocked.", href: "/payments" },
    });
  });
  revalidatePath("/admin/payments");
}

export async function rejectBankPayment(paymentId: string, formData: FormData) {
  const current = await requireRole(PAYMENT_REVIEW_ROLES);
  const payment = await reviewablePayment(paymentId);
  if (payment.status === "PAID") throw new Error("This payment is already confirmed.");
  const note = String(formData.get("note") || "").trim().slice(0, 500) || "We couldn't match this transfer to our bank statement.";
  const metadata = bankMetadata(payment.metadata);
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "PENDING", metadata: { ...metadata, reviewNote: note, reviewedBy: current.user.email, reviewedAt: new Date().toISOString() } },
  });
  await prisma.notification.create({
    data: { profileId: payment.profileId, type: "PAYMENT", title: "Payment needs another look", body: `${note} Please check the details and submit again in Payments.`, href: "/payments" },
  });
  revalidatePath("/admin/payments");
}
