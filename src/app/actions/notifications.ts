"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";

export async function markNotificationRead(notificationId: string) {
  const { profile } = await requireProfile();
  const notification = await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });
  if (notification.profileId !== profile.id) throw new Error("You do not have access to this notification.");

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: notification.readAt ?? new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const { profile } = await requireProfile();
  await prisma.notification.updateMany({
    where: { profileId: profile.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
