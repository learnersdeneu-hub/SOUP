import { requireCompanionAuth } from "@/lib/companion/auth";
import { buildAnswerBank } from "@/lib/companion/answerBank";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const current = await requireCompanionAuth(request);
  if (!current.ok) return current.response;
  const { profile } = current;

  const result = await buildAnswerBank(profile.id, {
    fullName: profile.user.fullName,
    email: profile.user.email,
    dateOfBirth: profile.user.dateOfBirth,
    nationality: profile.user.nationality,
    currentCountry: profile.user.currentCountry,
  });

  return Response.json(result);
}
