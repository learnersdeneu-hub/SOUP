import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { requireApiUser } from "@/lib/auth/apiUser";
import { PAYMENT_REVIEW_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { SOUP_SUPPORT_EMAIL } from "@/lib/support/config";
import {
  BANK_DETAILS, BANK_TRANSFER_PROVIDER, PARTNERSHIP_LINE, PARTNER_LOGO_PUBLIC_PATH, bankMetadata, formatPkr, formatUsd, invoiceNumberFor,
} from "@/lib/payments/bankTransfer";

export const dynamic = "force-dynamic";

const INK = rgb(0.078, 0.129, 0.239);
const MUTE = rgb(0.4, 0.44, 0.5);
const TEAL = rgb(0.043, 0.42, 0.314);
const HAIR = rgb(0.88, 0.9, 0.92);

function text(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size = 10, color = INK) {
  page.drawText(value, { x, y, font, size, color });
}

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function loadLogo() {
  try {
    const file = path.join(process.cwd(), "public", PARTNER_LOGO_PUBLIC_PATH);
    return fs.existsSync(file) ? fs.readFileSync(file) : null;
  } catch {
    return null;
  }
}

// Downloadable PDF invoice for a manual bank-transfer payment. Students can
// download their own; finance/admin staff can download any.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const current = await requireApiUser();
  if (!current.ok) return current.response;
  const payment = await prisma.payment.findFirst({
    where: { id: params.id, provider: BANK_TRANSFER_PROVIDER },
    include: { profile: { include: { user: true } } },
  });
  const isReviewer = PAYMENT_REVIEW_ROLES.includes(current.user.role);
  if (!payment || (!isReviewer && payment.profileId !== current.profile?.id)) {
    return Response.json({ error: "Invoice not found." }, { status: 404 });
  }

  const metadata = bankMetadata(payment.metadata);
  const invoiceNumber = metadata.invoiceNumber || invoiceNumberFor(payment.id, payment.createdAt);
  const student = payment.profile.user;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`SOUP invoice ${invoiceNumber}`);
  pdf.setAuthor("SOUP — Students Online University Portal");
  const page = pdf.addPage([595.28, 841.89]); // A4
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const left = 48;
  const right = width - 48;

  // Header band
  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: INK });
  text(page, "SOUP", left, height - 62, bold, 28, rgb(1, 1, 1));
  text(page, "Students Online University Portal", left, height - 82, regular, 10, rgb(0.85, 0.88, 0.92));
  const logoBytes = loadLogo();
  let partnerDrawn = false;
  if (logoBytes) {
    try {
      const isPng = logoBytes[0] === 0x89 && logoBytes[1] === 0x50;
      const logo = isPng ? await pdf.embedPng(logoBytes) : await pdf.embedJpg(logoBytes);
      const scaled = logo.scaleToFit(150, 44);
      page.drawRectangle({ x: right - scaled.width - 16, y: height - 92, width: scaled.width + 16, height: scaled.height + 16, color: rgb(1, 1, 1) });
      page.drawImage(logo, { x: right - scaled.width - 8, y: height - 84, width: scaled.width, height: scaled.height });
      partnerDrawn = true;
    } catch {
      partnerDrawn = false;
    }
  }
  if (!partnerDrawn) {
    const w = bold.widthOfTextAtSize(PARTNERSHIP_LINE, 10);
    text(page, PARTNERSHIP_LINE, right - w, height - 66, bold, 10, rgb(1, 0.886, 0.478));
  } else {
    const w = regular.widthOfTextAtSize(PARTNERSHIP_LINE, 8);
    text(page, PARTNERSHIP_LINE, right - w, height - 108, regular, 8, rgb(0.85, 0.88, 0.92));
  }

  // Title + meta
  let y = height - 168;
  text(page, "INVOICE", left, y, bold, 22);
  const statusLabel = payment.status === "PAID" ? "PAID" : payment.status === "REQUIRES_ACTION" ? "PAYMENT SUBMITTED — VERIFYING" : "AWAITING PAYMENT";
  const statusW = bold.widthOfTextAtSize(statusLabel, 10);
  text(page, statusLabel, right - statusW, y + 6, bold, 10, payment.status === "PAID" ? TEAL : rgb(0.7, 0.24, 0.04));

  y -= 34;
  const meta: Array<[string, string]> = [
    ["Invoice number", invoiceNumber],
    ["Issue date", fmtDate(payment.createdAt)],
    ["Due date", fmtDate(payment.dueAt || metadata.dueAt)],
    ...(payment.paidAt ? [["Paid on", fmtDate(payment.paidAt)] as [string, string]] : []),
  ];
  meta.forEach(([label, value], index) => {
    text(page, label, left, y - index * 16, regular, 9, MUTE);
    text(page, value, left + 100, y - index * 16, bold, 10);
  });
  text(page, "Billed to", 330, y, regular, 9, MUTE);
  text(page, student.fullName || "Student", 330, y - 16, bold, 11);
  text(page, student.email, 330, y - 32, regular, 9.5);
  text(page, `SOUP profile ${payment.profileId.slice(0, 8).toUpperCase()}`, 330, y - 48, regular, 9, MUTE);

  // Line items
  y -= 94;
  page.drawRectangle({ x: left, y: y - 6, width: right - left, height: 24, color: rgb(0.965, 0.97, 0.975) });
  text(page, "Description", left + 10, y + 2, bold, 9, MUTE);
  const amountHead = "Amount";
  text(page, amountHead, right - 10 - bold.widthOfTextAtSize(amountHead, 9), y + 2, bold, 9, MUTE);
  y -= 30;
  text(page, payment.title, left + 10, y, bold, 11);
  text(page, "One-time package", left + 10, y - 15, regular, 9, MUTE);
  text(page, "Document uploads, application submission, SOUP services and real-time counselor access.", left + 10, y - 28, regular, 9, MUTE);
  const amount = payment.currency === "USD" ? formatUsd(String(payment.amount)) : payment.currency === "PKR" ? formatPkr(String(payment.amount)) : `${payment.currency} ${payment.amount}`;
  const pkr = metadata.pkrAmount && metadata.usdToPkrRate ? formatPkr(metadata.pkrAmount) : null;
  text(page, amount, right - 10 - bold.widthOfTextAtSize(amount, 11), y, bold, 11);
  y -= 46;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: HAIR });
  y -= 22;
  text(page, "Total due", right - 200, y, bold, 11);
  text(page, amount, right - 10 - bold.widthOfTextAtSize(amount, 14), y, bold, 14, TEAL);
  // PKR conversion, locked when this invoice was generated.
  y -= 22;
  page.drawRectangle({ x: right - 300, y: y - 30, width: 300, height: 44, color: rgb(1, 0.973, 0.945) });
  if (pkr) {
    text(page, "Amount to transfer in PKR", right - 290, y, bold, 10);
    text(page, pkr, right - 10 - bold.widthOfTextAtSize(pkr, 14), y - 2, bold, 14, rgb(0.7, 0.24, 0.04));
    text(page, `1 USD = ${metadata.usdToPkrRate} PKR · rate of ${fmtDate(metadata.rateDate)} · ExchangeRate-API`, right - 290, y - 20, regular, 7.5, MUTE);
  } else {
    text(page, "Transfer the PKR equivalent of the total above", right - 290, y, bold, 9.5);
    text(page, "at your bank's USD to PKR rate on the day you pay.", right - 290, y - 16, regular, 9, MUTE);
  }
  y -= 20;

  // Bank details
  y -= 46;
  const bankRows: Array<[string, string]> = ([
    ["Bank", BANK_DETAILS.bankName],
    ["Account title", BANK_DETAILS.accountTitle],
    ["Account number", BANK_DETAILS.accountNumber],
    ["IBAN", BANK_DETAILS.iban],
    ["Branch", [BANK_DETAILS.branchName, BANK_DETAILS.branchCode && `(code ${BANK_DETAILS.branchCode})`].filter(Boolean).join(" ")],
    ["SWIFT / BIC", BANK_DETAILS.swiftCode],
  ] as Array<[string, string]>).filter(([, value]) => value.trim());
  // Box sized to however many bank fields are filled in.
  const referenceY = y - 26 - bankRows.length * 16 - 10;
  const boxBottom = referenceY - 14;
  page.drawRectangle({ x: left, y: boxBottom, width: right - left, height: y + 18 - boxBottom, borderColor: HAIR, borderWidth: 1, color: rgb(0.973, 0.984, 0.98) });
  text(page, "Pay by bank transfer", left + 16, y - 4, bold, 12, TEAL);
  bankRows.forEach(([label, value], index) => {
    text(page, label, left + 16, y - 26 - index * 16, regular, 9.5, MUTE);
    text(page, value, left + 130, y - 26 - index * 16, bold, 10);
  });
  text(page, `Payment reference: ${invoiceNumber}${pkr ? `   ·   Amount: ${pkr}` : ""}`, left + 16, referenceY, bold, 10);

  // Instructions
  y = boxBottom - 34;
  text(page, "After you pay", left, y, bold, 12);
  const steps = [
    `1. Use ${invoiceNumber} as the reference / remarks on your transfer.`,
    "2. Sign in to SOUP and open Payments in the sidebar.",
    "3. Enter your bank transaction reference, or upload this invoice or your bank receipt marked paid.",
    "4. SOUP verifies the transfer, usually within 1–2 working days, and your account unlocks automatically.",
  ];
  steps.forEach((step, index) => text(page, step, left, y - 18 - index * 15, regular, 9.5));

  // Footer
  page.drawLine({ start: { x: left, y: 70 }, end: { x: right, y: 70 }, thickness: 1, color: HAIR });
  text(page, "University application fees, tuition, visa, insurance and accommodation costs are not included and are paid to those providers.", left, 54, regular, 8, MUTE);
  text(page, `Questions about this invoice: ${SOUP_SUPPORT_EMAIL}`, left, 40, regular, 8, MUTE);

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
