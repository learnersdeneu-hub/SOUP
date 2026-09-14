"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, FileUp, LockKeyhole, Sparkles } from "lucide-react";
import { ConversationWorkspace } from "@/components/conversation/ConversationWorkspace";
import { NoodlesLoader } from "@/components/ui/NoodlesLoader";
import type { ConversationMessage } from "@/lib/conversation/types";
import type { GeneratedResume } from "@/lib/resume/types";

function normalizeIntent(value: string) { return value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim(); }
function isFinalizeIntent(value: string) {
  const text = normalizeIntent(value);
  const direct = new Set(["yes", "yes please", "do it", "go ahead", "make it", "generate it", "create it", "prepare it", "finish it", "finalize it", "finalise it", "pdf", "pdf please", "word", "word please", "download", "download it", "create my resume", "create my cv", "make my resume", "make my cv", "generate my resume", "generate my cv"]);
  return direct.has(text) || (/\b(generate|create|make|prepare|finish|finalize|finalise|download)\b/.test(text) && /\b(resume|cv|pdf|word|docx|draft)\b/.test(text));
}

export function ResumeConversation({ signedIn, autoGenerate = false }: { signedIn: boolean; autoGenerate?: boolean }) {
  const router = useRouter();
  const autoGenerateAttempted = useRef(false);
  const restoringResult = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedResume, setImportedResume] = useState<GeneratedResume | null>(null);
  const [result, setResult] = useState<{ resumeId: string; generated: GeneratedResume } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const readyToGenerate = messages.some((message) => message.role === "assistant" && message.content.includes("[[READY_TO_FINALIZE]]"));
  const handleMessages = useCallback((next: ConversationMessage[]) => {
    setMessages(next);
    const match = [...next].reverse().map((message) => message.content.match(/\[\[RESUME_RESULT:([^\]]+)\]\]/)).find(Boolean);
    const resumeId = match?.[1];
    if (!signedIn || !resumeId || result?.resumeId === resumeId || restoringResult.current === resumeId) return;
    restoringResult.current = resumeId;
    void fetch(`/api/export/resume?id=${encodeURIComponent(resumeId)}&format=json`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Saved resume could not be restored.");
        const body = await response.json();
        setResult({ resumeId, generated: { content: body.content, coverLetter: body.coverLetter || "", previewTips: Array.isArray(body.previewTips) ? body.previewTips : [] } });
      })
      .catch(() => undefined)
      .finally(() => { restoringResult.current = null; });
  }, [signedIn, result?.resumeId]);

  const generate = useCallback(async () => {
    if (!signedIn) { router.push(`/sign-up?next=${encodeURIComponent("/resume?generate=1")}`); return; }
    if (generating) return;
    setGenerating(true); setError(null);
    try {
      const response = await fetch("/api/resume/generate-conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: activeSessionId, importedResume }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not generate resume.");
      setResult(body);
      window.dispatchEvent(new CustomEvent("soup:conversation-append", { detail: { workflow: "RESUME", message: { id: crypto.randomUUID(), role: "assistant", content: `Your resume and cover letter files are ready. You can download them below or reopen this conversation later.\n[[RESUME_RESULT:${body.resumeId}]]`, createdAt: new Date().toISOString(), kind: "result", metadata: { resumeId: body.resumeId } } } }));
      localStorage.removeItem("soup_conversation_resume_v1");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not generate resume."); }
    finally { setGenerating(false); }
  }, [signedIn, router, generating, activeSessionId, importedResume]);

  function requestResumeUpload() {
    if (!signedIn) { router.push(`/sign-up?next=${encodeURIComponent("/resume?continue=1")}`); return; }
    fileRef.current?.click();
  }

  async function importResume(file: File) {
    setImporting(true); setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("template", "JOB_SEEKER");
      form.set("targetRole", "General professional resume improvement");
      const response = await fetch("/api/resume/import", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not read this resume.");
      const imported: GeneratedResume = { content: body.content, coverLetter: body.coverLetter, previewTips: body.previewTips || [] };
      setImportedResume(imported);
      const summary = [
        `I’ve read ${file.name} and added it to this resume conversation.`,
        imported.content.personal.headline ? `Current headline: ${imported.content.personal.headline}` : "",
        imported.content.experience?.length ? `${imported.content.experience.length} experience entr${imported.content.experience.length === 1 ? "y" : "ies"} detected.` : "",
        imported.content.education?.length ? `${imported.content.education.length} education entr${imported.content.education.length === 1 ? "y" : "ies"} detected.` : "",
        "Tell me what you want to change or what role you want this resume to target. I’ll use the uploaded resume as source material and won’t invent missing facts.",
      ].filter(Boolean).join("\n\n");
      window.dispatchEvent(new CustomEvent("soup:conversation-append", { detail: { workflow: "RESUME", message: { id: crypto.randomUUID(), role: "assistant", content: summary, createdAt: new Date().toISOString() } } }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not read this resume."); }
    finally { setImporting(false); }
  }

  const handleBeforeSend = useCallback(async (content: string) => {
    if (!readyToGenerate || !isFinalizeIntent(content)) return false;
    await generate();
    return true;
  }, [readyToGenerate, generate]);

  useEffect(() => {
    const listener = () => { void generate(); };
    window.addEventListener("soup:resume-generate", listener);
    return () => window.removeEventListener("soup:resume-generate", listener);
  }, [generate]);

  useEffect(() => {
    if (!signedIn || !autoGenerate || !readyToGenerate || generating || result || autoGenerateAttempted.current) return;
    autoGenerateAttempted.current = true;
    void generate();
  }, [signedIn, autoGenerate, readyToGenerate, generating, result, generate]);

  const resultAction = result ? (() => {
    const { generated, resumeId } = result;
    return <div className="rounded-2xl border border-[#D9E7E3] bg-[#F4FAF8] p-5">
      <div className="flex items-center gap-2 text-teal"><Sparkles size={15}/><span className="text-xs font-semibold uppercase tracking-[.16em]">Resume ready</span></div>
      <div className="mt-2 text-lg font-semibold text-ink">{generated.content.personal.fullName || "Your SOUP Resume"}</div><p className="mt-1 text-xs text-mute">{generated.content.personal.headline || generated.content.targetRole}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white p-4"><div className="text-xs font-semibold text-ink">Professional summary</div><p className="mt-2 line-clamp-5 text-xs leading-5 text-mute">{generated.content.personal.summary || "Your structured resume is ready."}</p></div><div className="rounded-xl bg-white p-4"><div className="text-xs font-semibold text-ink">Cover letter</div><p className="mt-2 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-mute">{generated.coverLetter}</p></div></div>
      <div className="mt-4 text-xs font-semibold text-ink">Download real files</div><div className="mt-2 flex flex-wrap gap-2"><a href={`/api/export/resume?id=${resumeId}&format=pdf`} className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white">Resume PDF</a><a href={`/api/export/resume?id=${resumeId}&format=docx`} className="rounded-full border border-navy bg-white px-4 py-2 text-xs font-semibold text-navy">Resume Word</a><a href={`/api/export/cover-letter?id=${resumeId}&format=pdf`} className="rounded-full border border-hair bg-white px-4 py-2 text-xs font-semibold text-ink">Cover Letter PDF</a><a href={`/api/export/cover-letter?id=${resumeId}&format=docx`} className="rounded-full border border-hair bg-white px-4 py-2 text-xs font-semibold text-ink">Cover Letter Word</a></div>
      <div className="mt-3 flex flex-wrap gap-2"><a href={`/resume/manage?id=${resumeId}`} className="text-xs font-semibold text-navy">Edit & versions →</a><a href={`/resume/intelligence?id=${resumeId}`} className="text-xs font-semibold text-navy">Resume Intelligence →</a></div>
    </div>;
  })() : null;

  const action = readyToGenerate ? <div className="rounded-2xl border border-[#DCE7E4] bg-[#F6FAF9] p-4"><div className="flex items-start gap-3"><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal text-white"><FileText size={14}/></div><div className="flex-1"><div className="text-sm font-semibold text-ink">Ready when you are</div><p className="mt-1 text-xs leading-5 text-mute">Say “make it”, “PDF”, “Word” or “download”, or use the button. SOUP will generate real files instead of writing the finished resume into chat.</p><button onClick={() => void generate()} disabled={generating} className="mt-3 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{generating ? <NoodlesLoader size={16} className="text-white"/> : signedIn ? <Sparkles size={13}/> : <LockKeyhole size={13}/>} {generating ? "Preparing your files..." : signedIn ? "Generate resume & cover letter" : "Create free account & generate"}</button>{error && <div className="mt-2 text-xs text-[#9D3127]">{error}</div>}</div></div></div> : null;

  return <><input ref={fileRef} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importResume(file); }}/><ConversationWorkspace workflow="RESUME" signedIn={signedIn} title="Resume Builder" subtitle={signedIn ? "Talk naturally or attach your existing resume directly here." : "Talk freely first. Sign up only when you want to upload a private resume or generate saved files."} onAttach={requestResumeUpload} attachLabel={signedIn ? "Attach existing resume" : "Sign up to attach a resume"} bottomAction={resultAction || action || (importing ? <div className="rounded-2xl border border-hair bg-white p-4 text-xs text-mute"><FileUp size={14} className="mr-2 inline"/>Reading your resume…</div> : error ? <div className="rounded-2xl border border-[#F0D5D1] bg-[#FFF8F7] p-4 text-xs text-[#9D3127]">{error}</div> : null)} onMessagesChange={handleMessages} onSessionChange={setActiveSessionId} onBeforeSend={handleBeforeSend} onReset={() => { setError(null); setResult(null); setImportedResume(null); autoGenerateAttempted.current = false; }}/></>;
}
