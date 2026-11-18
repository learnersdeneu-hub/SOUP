import { PREMIUM_COUNSELING_PRICE_USD, PREMIUM_COUNSELING_TITLE } from "@/lib/payments/config";

// Manual bank-transfer invoicing, used until Stripe checkout is live.
//
// A student who wants to upload documents or submit anything pays the SOUP
// Scholar fee (the same $20 package shown on the landing page and /premium)
// by bank transfer to SOUP's MCB Islamic account, then submits the
// transaction reference and/or a copy of the paid invoice in /payments.
// Finance/admin staff confirm it in /admin/payments, which marks the payment
// PAID and unlocks the account (see lib/payments/access.ts).
//
// Fill in the values below with the real account details. Until every
// required field is set, the Payments page explains that invoicing is not
// open yet instead of issuing an invoice with blank bank details.

export const BANK_TRANSFER_PROVIDER = "BANK_TRANSFER";
export const INVOICE_CURRENCY = "PKR";

export const SCHOLAR_INVOICE = {
  title: PREMIUM_COUNSELING_TITLE,
  // PKR equivalent of the $20 SOUP Scholar fee. Set to the exact amount to
  // be transferred, e.g. 5600. null = not configured yet.
  amountPkr: null as number | null,
  usdEquivalent: PREMIUM_COUNSELING_PRICE_USD,
  description: "SOUP Scholar: document uploads, application submission, SOUP services and real-time counselor access. One-time fee.",
  dueInDays: 7,
};

export const BANK_DETAILS = {
  bankName: "MCB Islamic Bank Limited",
  accountTitle: "",
  accountNumber: "",
  iban: "",
  branchName: "",
  branchCode: "",
  swiftCode: "",
};

// Optional. Put the partner logo file (PNG or JPG, provided by the bank or
// your partnership agreement) at this path under /public and it is placed
// in the invoice header automatically. Without it the invoice shows the
// partnership as text.
export const PARTNER_LOGO_PUBLIC_PATH = "/invoice/mcb-islamic-logo.png";
export const PARTNERSHIP_LINE = "In partnership with MCB Islamic Bank";

export function bankTransferReady() {
  return Boolean(
    SCHOLAR_INVOICE.amountPkr && SCHOLAR_INVOICE.amountPkr > 0
    && BANK_DETAILS.accountTitle.trim()
    && (BANK_DETAILS.accountNumber.trim() || BANK_DETAILS.iban.trim()),
  );
}

// Human-readable, unique per payment: SOUP-INV-20261118-4F2A9C.
export function invoiceNumberFor(paymentId: string, issuedAt: Date) {
  const day = issuedAt.toISOString().slice(0, 10).replaceAll("-", "");
  return `SOUP-INV-${day}-${paymentId.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

export type BankPaymentMetadata = {
  plan?: string;
  method?: string;
  invoiceNumber?: string;
  dueAt?: string;
  transactionReference?: string;
  proofStorageRef?: string;
  proofFileName?: string;
  submittedAt?: string;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

export function bankMetadata(value: unknown): BankPaymentMetadata {
  return value && typeof value === "object" && !Array.isArray(value) ? value as BankPaymentMetadata : {};
}

export function formatPkr(amount: number | string) {
  return `PKR ${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
