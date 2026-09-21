import { Header } from "@/components/Header";
import { CounselorConversation } from "@/components/counselor/CounselorConversation";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_INTENTS = new Set(["universities", "accommodation", "insurance", "scholarships", "finance"]);

export default async function CounselorPage({ searchParams }: { searchParams?: { intent?: string; requestItem?: string; requestLabel?: string; applicationId?: string; prompt?: string; universityId?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const rawIntent = String(searchParams?.intent || "").toLowerCase();
  const intent = ALLOWED_INTENTS.has(rawIntent) ? rawIntent : undefined;
  const requestedItemId = String(searchParams?.requestItem || "").trim() || undefined;
  const requestedLabel = String(searchParams?.requestLabel || "").trim().slice(0, 300) || undefined;
  const applicationId = String(searchParams?.applicationId || "").trim() || undefined;
  // Only ever forwarded as an id string — the stream route re-fetches the
  // actual university record itself server-side, so a tampered client value
  // can at most reference a different real (or nonexistent) catalogue entry,
  // never inject fabricated "verified" data into the prompt.
  const entryUniversityId = String(searchParams?.universityId || "").trim().slice(0, 191) || undefined;
  const initialPrompt = String(searchParams?.prompt || "").trim().slice(0, 2000) || (entryUniversityId ? "I'd like to apply to this university." : undefined);
  // Keyed by the signed-in user's own id (or "guest"): ConversationWorkspace
  // keeps its chat history and session id in long-lived client React state,
  // which nothing otherwise resets if the browser's authenticated identity
  // changes without a full page reload — e.g. a shared browser where someone
  // signs into a different account in another tab, since Supabase's session
  // cookie is shared across tabs in the same browser. Changing this key on
  // any real navigation back to this page forces React to fully discard the
  // old instance (and its state) rather than silently keep appending new,
  // correctly-scoped server responses onto a thread that still shows a
  // previous account's messages.
  return <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-paper"><Header signedIn={!!user}/><CounselorConversation key={user?.id || "guest"} signedIn={!!user} intent={intent} requestedItemId={requestedItemId} requestedLabel={requestedLabel} applicationId={applicationId} initialPrompt={initialPrompt} entryUniversityId={entryUniversityId}/></div>;
}
