// Temporary diagnostic route — deployed to directly measure the actual
// enforced serverless function timeout on this Vercel project/team, rather
// than relying on plan-name assumptions. Safe to delete after use; does
// nothing but sleep and report how long it actually ran.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 15000));
  return Response.json({ ranForMs: Date.now() - startedAt, survivedPast10s: true, invokedAt: startedAt });
}
