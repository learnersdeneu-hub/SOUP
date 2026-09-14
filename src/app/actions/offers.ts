"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/currentUser";
import { APPLICATION_OPERATIONS_ROLES } from "@/lib/auth/roles";

function clean(value: FormDataEntryValue | null, max = 800) { return String(value || "").trim().slice(0, max); }

export async function addOfferCondition(applicationId: string, formData: FormData) {
  const staff = await requireRole(APPLICATION_OPERATIONS_ROLES);
  const application = await prisma.studentApplication.findUniqueOrThrow({ where: { id: applicationId } });
  if (!["CONDITIONAL_OFFER","OFFER_RECEIVED"].includes(application.status)) throw new Error("Offer conditions can only be added after an offer is recorded.");
  const title = clean(formData.get("title"), 200);
  if (!title) throw new Error("Condition title is required.");
  const dueText = clean(formData.get("dueAt"), 80);
  const dueAt = dueText ? new Date(dueText) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new Error("Choose a valid condition due date.");
  const sourceUrl = clean(formData.get("sourceUrl"), 1500);
  if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) throw new Error("Source URL must use HTTPS.");
  const condition = await prisma.offerCondition.create({ data: { applicationId, title, description: clean(formData.get("description"), 1000) || null, dueAt, sourceUrl: sourceUrl || null, sourceCheckedAt: sourceUrl ? new Date() : null } });
  await prisma.studentApplicationEvent.create({ data: { applicationId, actorUserId: staff.user.id, eventType: "OFFER_CONDITION_ADDED", message: `Offer condition added: ${title}`, metadata: { conditionId: condition.id, dueAt: dueAt?.toISOString() || null } } });
  await prisma.notification.create({ data: { profileId: application.profileId, type: "SYSTEM", title: "Offer condition added", body: `${title}${dueAt ? ` · due ${dueAt.toLocaleDateString()}` : ""}`, href: "/offers" } });
  revalidatePath(`/admin/applications/${applicationId}`); revalidatePath("/offers"); revalidatePath(`/applications/${applicationId}`); revalidatePath("/dashboard");
}

export async function updateOfferConditionStatus(conditionId: string, status: "OPEN"|"IN_PROGRESS"|"COMPLETE"|"WAIVED") {
  const staff = await requireRole(APPLICATION_OPERATIONS_ROLES);
  const condition = await prisma.offerCondition.findUniqueOrThrow({ where: { id: conditionId }, include: { application: true } });
  await prisma.offerCondition.update({ where: { id: conditionId }, data: { status, completedAt: ["COMPLETE","WAIVED"].includes(status) ? new Date() : null } });
  await prisma.studentApplicationEvent.create({ data: { applicationId: condition.applicationId, actorUserId: staff.user.id, eventType: "OFFER_CONDITION_UPDATED", message: `${condition.title}: ${status.toLowerCase().replaceAll("_"," ")}` } });
  revalidatePath(`/admin/applications/${condition.applicationId}`); revalidatePath("/offers"); revalidatePath(`/applications/${condition.applicationId}`); revalidatePath("/dashboard");
}
