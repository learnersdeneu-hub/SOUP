"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";

export async function revokeCompanionDevice(deviceId: string) {
  const { profile } = await requireProfile();
  const device = await prisma.companionDevice.findFirst({ where: { id: deviceId, profileId: profile.id } });
  if (!device) throw new Error("Device not found.");
  if (!device.revokedAt) await prisma.companionDevice.update({ where: { id: deviceId }, data: { revokedAt: new Date() } });
  revalidatePath("/companion/connect");
}
