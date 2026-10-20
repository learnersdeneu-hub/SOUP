import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RecommenderLetterForm } from "@/components/recommend/RecommenderLetterForm";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy"><ShieldCheck size={18}/>SOUP</div>
        {children}
      </div>
    </div>
  );
}

// Public, token-authenticated page — the recommender has no SOUP account
// and no session (see PUBLIC_PATHS in src/middleware.ts). Everything here
// is scoped by the token in the URL itself, never by auth state.
export default async function RecommendTokenPage({ params }: { params: { token: string } }) {
  const recommender = await prisma.recommender.findFirst({
    where: { inviteToken: params.token },
    include: {
      profile: { include: { user: { select: { fullName: true } } } },
      letter: true,
      assignments: { include: { application: { include: { university: { select: { name: true } } } } } },
    },
  });

  if (!recommender) {
    return (
      <Shell>
        <div className="mt-8 rounded-2xl border border-hair bg-white p-6">
          <h1 className="text-lg font-semibold text-ink">This link isn&apos;t valid</h1>
          <p className="mt-2 text-sm leading-6 text-mute">Double-check the link from your email, or ask the student to resend their invite.</p>
        </div>
      </Shell>
    );
  }

  const studentName = recommender.profile.user.fullName || "A SOUP student";
  const universities = recommender.assignments.map((a) => a.application.university?.name).filter((name): name is string => Boolean(name));
  const expired = Boolean(recommender.inviteTokenExpiresAt && recommender.inviteTokenExpiresAt.getTime() < Date.now());

  if (expired && recommender.status !== "SUBMITTED") {
    return (
      <Shell>
        <div className="mt-8 rounded-2xl border border-hair bg-white p-6">
          <h1 className="text-lg font-semibold text-ink">This invite has expired</h1>
          <p className="mt-2 text-sm leading-6 text-mute">Please let {studentName} know so they can resend your invite link.</p>
        </div>
      </Shell>
    );
  }

  if (recommender.status === "INVITED") {
    await prisma.recommender.update({ where: { id: recommender.id }, data: { status: "IN_PROGRESS" } }).catch(() => undefined);
  }

  return (
    <Shell>
      <div className="mt-6">
        <h1 className="text-xl font-semibold text-ink">Recommendation letter for {studentName}</h1>
        <p className="mt-2 text-sm leading-6 text-mute">
          {studentName} has asked you to write a college recommendation letter{universities.length ? ` for their application${universities.length > 1 ? "s" : ""} to ${universities.join(", ")}` : ""}. You can type your letter directly or upload a file — no account needed.
        </p>
      </div>

      {recommender.status === "SUBMITTED" ? (
        <div className="mt-6 rounded-2xl border border-hair bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal"><CheckCircle2 size={18}/>Letter submitted</div>
          <p className="mt-2 text-sm leading-6 text-mute">Thank you — your recommendation letter has been received and shared with {studentName}&apos;s application.</p>
          {recommender.letter?.submissionMethod === "TEXT" && recommender.letter.letterText && (
            <div className="mt-4 whitespace-pre-wrap rounded-xl bg-paper p-4 text-xs leading-6 text-ink">{recommender.letter.letterText}</div>
          )}
        </div>
      ) : (
        <RecommenderLetterForm token={params.token} studentName={studentName}/>
      )}
    </Shell>
  );
}
