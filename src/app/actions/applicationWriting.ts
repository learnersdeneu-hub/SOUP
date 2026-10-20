"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";
import { normalizeWritingDetails, type WritingDetails } from "@/lib/applications/coreProfile";
import { countWords } from "@/lib/applications/writingRequirement";

const BOX_KEYS = { MOTIVATION_LETTER: "motivationLetter", PERSONAL_STATEMENT: "personalStatement" } as const;
type BoxType = keyof typeof BOX_KEYS;

function clean(value: FormDataEntryValue | null, max = 20000) {
  return String(value || "").trim().slice(0, max);
}
function isBoxType(value: string): value is BoxType {
  return value === "MOTIVATION_LETTER" || value === "PERSONAL_STATEMENT";
}

// Base draft, stored once on the student's profile (StudentCase.writingDetails)
// and reused across every university — see src/lib/applications/writingRequirement.ts
// for which box is required, and saveApplicationWritingOverride below for the
// per-university copy that pre-fills from this draft without ever mutating it.
export async function saveWritingDraft(formData: FormData): Promise<{ ok: true; wordCount: number; lastSavedAt: string } | { ok: false; error: string }> {
  const { profile } = await requireProfile();
  const boxType = clean(formData.get("boxType"), 30);
  if (!isBoxType(boxType)) return { ok: false, error: "Unknown writing box." };
  const text = clean(formData.get("text"), 20000);

  const studentCase = await prisma.studentCase.findUnique({ where: { profileId: profile.id }, select: { writingDetails: true } });
  const current = normalizeWritingDetails(studentCase?.writingDetails);
  const lastSavedAt = new Date().toISOString();
  const wordCount = countWords(text);
  const key = BOX_KEYS[boxType];
  const next: WritingDetails = { ...current, [key]: { text, wordCount, lastSavedAt, documentId: null } };

  await prisma.studentCase.upsert({
    where: { profileId: profile.id },
    update: { writingDetails: next },
    create: { profileId: profile.id, writingDetails: next },
  });
  revalidatePath("/dashboard");
  revalidatePath("/profile/extracurricular");
  return { ok: true, wordCount, lastSavedAt };
}

// Per-university editable copy — created lazily on first edit, pre-filled
// from the base draft by the caller (My Colleges), never by this action, so
// the base draft is never read or mutated here.
export async function saveApplicationWritingOverride(formData: FormData): Promise<{ ok: true; wordCount: number; lastSavedAt: string } | { ok: false; error: string }> {
  const { profile } = await requireProfile();
  const applicationId = clean(formData.get("applicationId"), 60);
  const boxType = clean(formData.get("boxType"), 30);
  if (!isBoxType(boxType)) return { ok: false, error: "Unknown writing box." };
  const application = await prisma.studentApplication.findFirst({ where: { id: applicationId, profileId: profile.id } });
  if (!application) return { ok: false, error: "Application not found." };

  const text = clean(formData.get("text"), 20000);
  const lastSavedAt = new Date();
  await prisma.applicationWritingOverride.upsert({
    where: { applicationId_boxType: { applicationId, boxType } },
    create: { applicationId, boxType, text, lastSavedAt },
    update: { text, documentId: null, lastSavedAt },
  });
  revalidatePath("/colleges");
  return { ok: true, wordCount: countWords(text), lastSavedAt: lastSavedAt.toISOString() };
}
