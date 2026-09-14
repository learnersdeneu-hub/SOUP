"use client";

import Link from "next/link";
import { FileText, GraduationCap, MessageSquarePlus, Pencil, Search, Trash2, X } from "lucide-react";
import type { SoupWorkflow } from "@/lib/conversation/types";

export type ConversationSessionSummary = {
  id: string;
  workflow: SoupWorkflow;
  title: string | null;
  status: string;
  updatedAt: string;
};

const WORKFLOWS: Array<{ code: SoupWorkflow; href: string; label: string; icon: typeof FileText }> = [
  { code: "COUNSELOR", href: "/counselor", label: "Noodles", icon: GraduationCap },
  { code: "RESUME", href: "/resume", label: "Resume & Cover Letter", icon: FileText },
];

const LABEL: Partial<Record<SoupWorkflow, string>> = {
  COUNSELOR: "Noodles",
  RESUME: "Resume & Cover Letter",
  REPORT: "Legacy conversation",
  FINANCIAL: "Legacy conversation",
  LEARN: "Legacy conversation",
};

export function ConversationSidebar({ signedIn, workflow, sessions, activeSessionId, mobileOpen, onMobileClose, onNew, onSelect, onRename, onDelete }: {
  signedIn: boolean;
  workflow: SoupWorkflow;
  sessions: ConversationSessionSummary[];
  activeSessionId: string | null;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onNew: () => void;
  onSelect: (session: ConversationSessionSummary) => void;
  onRename: (session: ConversationSessionSummary) => void;
  onDelete: (session: ConversationSessionSummary) => void;
}) {
  const visibleSessions = sessions.filter((session) => session.workflow === "COUNSELOR" || session.workflow === "RESUME");
  const body = (
    <div className="flex h-full flex-col">
      <div className="border-b border-hair p-3">
        <button onClick={onNew} className="flex w-full items-center gap-2 rounded-xl border border-hair bg-white px-3 py-2.5 text-sm font-semibold text-ink hover:bg-paper">
          <MessageSquarePlus size={15} /> New conversation
        </button>
        <div className="mt-3 space-y-1">
          {WORKFLOWS.map(({ code, href, label, icon: Icon }) => (
            <Link key={code} href={href} onClick={onMobileClose} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${workflow === code ? "bg-[#EAF0F5] text-navy" : "text-ink hover:bg-paper"}`}>
              <Icon size={14} /> {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="flex items-center gap-2 px-2 py-2 text-[10px] font-semibold uppercase tracking-[.14em] text-mute"><Search size={11}/> History</div>
        {!signedIn ? (
          <div className="mx-2 mt-2 rounded-xl border border-hair bg-paper p-3 text-xs leading-5 text-mute">Sign in to keep conversation history across devices. Your guest conversation stays on this device.</div>
        ) : visibleSessions.length === 0 ? (
          <div className="px-3 py-4 text-xs text-mute">No saved conversations yet.</div>
        ) : visibleSessions.map((session) => (
          <div key={session.id} className={`group mb-1 flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-2 ${session.id === activeSessionId ? "bg-[#EAF0F5]" : "hover:bg-paper"}`} onClick={() => { onSelect(session); onMobileClose(); }}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-ink">{session.title || LABEL[session.workflow] || "Conversation"}</div>
              <div className="mt-0.5 text-[10px] text-mute">{LABEL[session.workflow] || "Conversation"} · {new Date(session.updatedAt).toLocaleDateString()}</div>
            </div>
            <div className="hidden items-center group-hover:flex">
              <button onClick={(event) => { event.stopPropagation(); onRename(session); }} className="rounded p-1 hover:bg-white" aria-label="Rename conversation"><Pencil size={11} className="text-mute"/></button>
              <button onClick={(event) => { event.stopPropagation(); onDelete(session); }} className="rounded p-1 hover:bg-white" aria-label="Delete conversation"><Trash2 size={11} className="text-[#9D3127]"/></button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-hair p-3"><Link href={signedIn ? "/dashboard" : "/sign-in"} className="block rounded-lg px-3 py-2 text-xs font-semibold text-navy hover:bg-paper">{signedIn ? "My SOUP" : "Sign in"}</Link></div>
    </div>
  );

  return <>
    <aside className="hidden h-full w-72 flex-shrink-0 border-r border-hair bg-white md:block">{body}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 flex md:hidden"><button aria-label="Close sidebar" className="absolute inset-0 bg-black/30" onClick={onMobileClose}/><aside className="relative h-full w-[86%] max-w-xs bg-white"><div className="flex items-center justify-between border-b border-hair px-4 py-3"><span className="text-sm font-semibold">SOUP workspace</span><button onClick={onMobileClose}><X size={17}/></button></div><div className="h-[calc(100%-50px)]">{body}</div></aside></div>}
  </>;
}
