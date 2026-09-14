"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireOwnedProfile(profileId?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } });
  if (profileId && profile.id !== profileId) throw new Error("You do not have access to this profile.");
  return { user, profile };
}

export async function uploadDocument(profileId: string, file: File, documentType: string) {
  const { user, profile } = await requireOwnedProfile(profileId);
  if (!file || file.size === 0) throw new Error("Please choose a document to upload.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Documents must be 15 MB or smaller.");

  const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
  if (file.type && !allowed.has(file.type)) throw new Error("Unsupported document type.");

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${user.id}/${randomUUID()}.${ext}`;
  const supabase = createClient();

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  try {
    const doc = await prisma.document.create({
      data: {
        profileId: profile.id,
        storageRef: path,
        documentType: documentType.trim() || "OTHER",
        originalFileName: file.name,
        uploadedBy: user.id,
        reviewStatus: "PENDING_REVIEW",
      },
    });
    await prisma.documentReviewEvent.create({
      data: { documentId: doc.id, profileId: profile.id, actorUserId: user.id, action: "SUBMITTED" },
    });
    await prisma.notification.create({
      data: { profileId: profile.id, type: "DOCUMENT", title: "Document received", body: `${documentType.trim() || "Document"} is now waiting for review.`, href: "/documents" },
    });
    const staffProfiles = await prisma.profile.findMany({
      where: { user: { role: { in: ["ADMIN", "SUPPORT"] }, accountStatus: "ACTIVE" } },
      select: { id: true },
    });
    if (staffProfiles.length) {
      await prisma.notification.createMany({
        data: staffProfiles.map((staffProfile) => ({
          profileId: staffProfile.id, type: "DOCUMENT" as const, title: "Document awaiting review",
          body: `${user.email} uploaded ${file.name}.`, href: "/admin/documents",
        })),
      });
    }
    return doc.id;
  } catch (error) {
    await supabase.storage.from("documents").remove([path]);
    throw error;
  }
}

export async function getDocumentSignedUrl(documentId: string) {
  const { profile } = await requireOwnedProfile();
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  if (document.profileId !== profile.id) throw new Error("You do not have access to this document.");

  const supabase = createClient();
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(document.storageRef, 60 * 5);
  if (error) throw new Error(`Could not create signed URL: ${error.message}`);
  return data.signedUrl;
}
