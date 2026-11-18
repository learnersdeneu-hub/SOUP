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
// Invoices are in USD like every other SOUP price. When an invoice is
// generated, the day's USD→PKR rate is looked up once (lib/payments/fx.ts)
// and locked onto that invoice, so the student sees exactly how many rupees
// to transfer and staff can check the transfer against the same figure.

export const BANK_TRANSFER_PROVIDER = "BANK_TRANSFER";
export const INVOICE_CURRENCY = "USD";

export const SCHOLAR_INVOICE = {
  title: PREMIUM_COUNSELING_TITLE,
  amountUsd: PREMIUM_COUNSELING_PRICE_USD,
  description: "SOUP Scholar: document uploads, application submission, SOUP services and real-time counselor access. One-time fee.",
  dueInDays: 7,
};

export const BANK_DETAILS = {
  bankName: "MCB Islamic Bank Limited",
  accountTitle: "Learners Den",
  accountNumber: "0081003731000001",
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
    BANK_DETAILS.accountTitle.trim()
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
  // PKR conversion locked when the invoice was generated. Absent if the rate
  // service was unavailable; the invoice then says to send the PKR
  // equivalent at the bank's rate on the day.
  pkrAmount?: number;
  usdToPkrRate?: number;
  rateDate?: string;
  rateSource?: string;
};

export function bankMetadata(value: unknown): BankPaymentMetadata {
  return value && typeof value === "object" && !Array.isArray(value) ? value as BankPaymentMetadata : {};
}

export function formatPkr(amount: number | string) {
  return `PKR ${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatUsd(amount: number | string) {
  return `USD ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Whole rupees, rounded up so a transfer of the shown amount always covers
// the USD price.
export function pkrFor(usd: number, rate: number) {
  return Math.ceil(usd * rate);
}
