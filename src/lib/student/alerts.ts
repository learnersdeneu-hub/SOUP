import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(date: Date, now: Date) {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

export async function syncStudentAlerts(profileId: string) {
  const now = new Date();
  const ninetyDays = new Date(now.getTime() + 90 * DAY_MS);
  const fourteenDays = new Date(now.getTime() + 14 * DAY_MS);
  const recentCutoff = new Date(now.getTime() - 7 * DAY_MS);

  const [documents, dueItems, recent] = await Promise.all([
    prisma.document.findMany({
      where: { profileId, validUntil: { lte: ninetyDays } },
      select: { id: true, documentType: true, originalFileName: true, validUntil: true },
      orderBy: { validUntil: "asc" },
      take: 20,
    }),
    prisma.journeyChecklistItem.findMany({
      where: {
        checklist: { profileId },
        dueAt: { lte: fourteenDays },
        status: { notIn: ["COMPLETE", "NOT_APPLICABLE"] },
      },
      include: { checklist: { select: { title: true, sourceSnapshot: true } } },
      orderBy: { dueAt: "asc" },
      take: 60,
    }),
    prisma.notification.findMany({
      where: { profileId, createdAt: { gte: recentCutoff } },
      select: { title: true, href: true },
      take: 100,
    }),
  ]);

  const recentKeys = new Set(recent.map((item) => `${item.title}|${item.href || ""}`));
  const create: Array<{ profileId: string; type: "DOCUMENT" | "SYSTEM"; title: string; body: string; href: string }> = [];

  for (const document of documents) {
    if (!document.validUntil) continue;
    const remaining = daysUntil(document.validUntil, now);
    const label = document.originalFileName || document.documentType.replaceAll("_", " ");
    const title = remaining < 0 ? `Document validity date passed: ${label}` : `Document validity reminder: ${label}`;
    const href = "/documents";
    if (recentKeys.has(`${title}|${href}`)) continue;
    create.push({
      profileId,
      type: "DOCUMENT",
      title,
      body: remaining < 0
        ? `The validity date recorded on this document passed ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? "" : "s"} ago. Check the current university, embassy or provider requirement before relying on it.`
        : `The recorded validity date is in ${remaining} day${remaining === 1 ? "" : "s"}. Check whether a newer document will be required for your current application or visa stage.`,
      href,
    });
  }

  for (const item of dueItems.filter((candidate) => !isSupersededChecklist(candidate.checklist.sourceSnapshot)).slice(0, 30)) {
    if (!item.dueAt) continue;
    const remaining = daysUntil(item.dueAt, now);
    const title = remaining < 0 ? `Journey item overdue: ${item.title}` : `Journey deadline approaching: ${item.title}`;
    const href = "/journey";
    if (recentKeys.has(`${title}|${href}`)) continue;
    create.push({
      profileId,
      type: "SYSTEM",
      title,
      body: remaining < 0
        ? `${item.checklist.title}: this tracked item is ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? "" : "s"} past its saved due date. Re-check the official source if the deadline may have changed.`
        : `${item.checklist.title}: this tracked item is due in ${remaining} day${remaining === 1 ? "" : "s"}.`,
      href,
    });
  }

  if (create.length) await prisma.notification.createMany({ data: create.slice(0, 30) });
  return { created: create.length };
}
