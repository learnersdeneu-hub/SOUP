"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, X, Menu } from "lucide-react";
import type { ChatSession, ChatWorkflow } from "@prisma/client";
import { RenameDialog } from "@/components/chat/RenameDialog";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";

const WORKFLOW_LABEL: Record<string, string> = {
  RESUME: "Resume Builder",
  REPORT: "Complete GCI Report",
  FINANCIAL: "Financial & Valuation Report",
  LEARN: "Learn & Improve",
};

export function ChatSidebar({
  sessions,
  activeSessionId,
  mobileOpen,
  onCloseMobile,
  onOpenMobile,
  onSelect,
  onNewChat,
  onLoadMore,
  hasMore,
  onRename,
  onDelete,
}: {
  sessions: ChatSession[];
  activeSessionId: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenMobile: () => void;
  onSelect: (id: string) => void;
  onNewChat: (workflow: ChatWorkflow) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);
  const [newWorkflow, setNewWorkflow] = useState<ChatWorkflow>("REPORT");

  const filtered = useMemo(() => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter((s) =>
      (s.title || WORKFLOW_LABEL[s.workflow] || "").toLowerCase().includes(q)
    );
  }, [sessions, query]);

  const body = (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-3 border-b border-hair space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={newWorkflow}
            onChange={(e) => setNewWorkflow(e.target.value as ChatWorkflow)}
            className="flex-1 rounded-lg border border-hair px-2 py-2 text-xs outline-none"
          >
            {Object.entries(WORKFLOW_LABEL).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={() => onNewChat(newWorkflow)}
            className="flex items-center gap-1 text-xs font-medium rounded-lg px-3 py-2 text-white bg-navy flex-shrink-0"
          >
            <Plus size={13} /> New
          </button>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-hair pl-7 pr-2 py-2 text-xs outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-mute px-2 py-4 text-center">No conversations found.</p>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              className={
                "group rounded-lg px-2.5 py-2 cursor-pointer flex items-center justify-between gap-1 " +
                (s.id === activeSessionId ? "bg-[#EAF0F5]" : "hover:bg-black/5")
              }
              onClick={() => {
                onSelect(s.id);
                onCloseMobile();
              }}
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-ink truncate">
                  {s.title || WORKFLOW_LABEL[s.workflow] || "Conversation"}
                </div>
                <div className="text-[10px] text-mute">
                  {WORKFLOW_LABEL[s.workflow]} &middot; {new Date(s.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameTarget(s);
                  }}
                  className="p-1 rounded hover:bg-black/10"
                  title="Rename"
                >
                  <Pencil size={12} className="text-mute" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(s);
                  }}
                  className="p-1 rounded hover:bg-black/10"
                  title="Delete"
                >
                  <Trash2 size={12} className="text-[#B3261E]" />
                </button>
              </div>
            </div>
          ))
        )}
        {hasMore && !query && (
          <button
            onClick={onLoadMore}
            className="w-full text-xs text-mute py-2 hover:text-ink"
          >
            Load more
          </button>
        )}
      </div>

      {renameTarget && (
        <RenameDialog
          initialTitle={renameTarget.title || WORKFLOW_LABEL[renameTarget.workflow] || ""}
          onCancel={() => setRenameTarget(null)}
          onSave={(title) => {
            onRename(renameTarget.id, title);
            setRenameTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete conversation?"
          description="This permanently deletes the conversation and all its messages. This can't be undone."
          confirmLabel="Delete"
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: persistent sidebar */}
      <div className="hidden md:flex md:flex-col w-72 flex-shrink-0 border-r border-hair bg-white h-full">
        {body}
      </div>

      {/* Mobile: drawer */}
      <button
        onClick={onOpenMobile}
        className="md:hidden fixed top-3 left-3 z-30 rounded-lg p-2 bg-white border border-hair"
      >
        <Menu size={16} className="text-ink" />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
          <div className="relative w-[85%] max-w-xs bg-white h-full flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-hair">
              <span className="text-sm font-semibold text-ink">Conversations</span>
              <button onClick={onCloseMobile} className="p-1 rounded hover:bg-black/5">
                <X size={16} className="text-mute" />
              </button>
            </div>
            <div className="flex-1 min-h-0">{body}</div>
          </div>
        </div>
      )}
    </>
  );
}
