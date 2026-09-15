import { prisma } from "@/lib/prisma";
import { requireCompanionAuth } from "@/lib/companion/auth";

export const runtime = "nodejs";

// Mints a short-lived signed URL for a document the authenticated Companion
// device's own student already owns. Authorization is checked here in
// application code (profileId must match) before ever touching storage, so
// this uses the admin storage client the same way the staff document-review
// signed-URL route does — never a raw storage path handed back to the client.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const current = await requireCompanionAuth(request);
  if (!current.ok) return current.response;
  const document = await prisma.document.findFirst({ where: { id: params.id, profileId: current.profile.id } });
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(document.storageRef, 60 * 5);
  if (error) return Response.json({ error: `Could not open this document: ${error.message}` }, { status: 502 });
  return Response.json({ url: data.signedUrl });
}
