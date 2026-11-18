import { Header } from "@/components/Header";
import { ResumeConversation } from "@/components/resume/ResumeConversation";
import { createClient } from "@/lib/supabase/server";

export default async function ResumePage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ generate?: string }> }) {
  const searchParams = await searchParamsPromise;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="h-[100dvh] overflow-hidden bg-paper">
      <Header signedIn={!!user} />
      {/* Keyed by user id/"guest" for the same reason as CounselorConversation
          in /counselor: forces a full remount, discarding stale client
          state, whenever the authenticated identity changes across a
          navigation back to this page. */}
      <ResumeConversation key={user?.id || "guest"} signedIn={!!user} autoGenerate={searchParams.generate === "1"} />
    </div>
  );
}
