"use client";

import { useState, useTransition } from "react";
import type { ChatSession, ChatMessage, ChatWorkflow } from "@prisma/client";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import {
  getSessionWithMessages,
  startNewSession,
  renameSession,
  deleteSession,
  listMoreSessions,
} from "@/app/actions/chat";
import { Header } from "@/components/Header";

type SessionWithMessages = ChatSession & { messages: ChatMessage[] };

export function ChatApp({ initialSessions }: { initialSessions: ChatSession[] }) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [active, setActive] = useState<SessionWithMessages | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasMore, setHasMore] = useState(initialSessions.length === 20);
  const [, startTransition] = useTransition();

  async function selectSession(id: string) {
    const full = await getSessionWithMessages(id);
    setActive(full);
  }

  async function newChat(workflow: ChatWorkflow) {
    const created = await startNewSession(workflow);
    setSessions((s) => [created, ...s]);
    setActive(created as SessionWithMessages);
  }

  async function handleRename(id: string, title: string) {
    const updated = await renameSession(id, title);
    setSessions((s) => s.map((x) => (x.id === id ? updated : x)));
    setActive((a) => (a && a.id === id ? { ...a, title: updated.title } : a));
  }

  async function handleDelete(id: string) {
    await deleteSession(id);
    setSessions((s) => s.filter((x) => x.id !== id));
    setActive((a) => (a && a.id === id ? null : a));
  }

  async function loadMore() {
    const more = await listMoreSessions(sessions.length);
    setSessions((s) => [...s, ...more]);
    setHasMore(more.length === 20);
  }

  // Refresh the sidebar's copy of the active session's title once the
  // auto-generated title lands (fired from ChatWindow after the first
  // user message is saved).
  function refreshActiveTitle() {
    if (!active) return;
    startTransition(async () => {
      const full = await getSessionWithMessages(active.id);
      setSessions((s) => s.map((x) => (x.id === full.id ? full : x)));
    });
  }

  return (
    <div className="h-screen w-full flex flex-col bg-paper">
      <Header signedIn />
      <div className="flex-1 flex min-h-0">
        <ChatSidebar
          sessions={sessions}
          activeSessionId={active?.id ?? null}
          mobileOpen={mobileOpen}
          onOpenMobile={() => setMobileOpen(true)}
          onCloseMobile={() => setMobileOpen(false)}
          onSelect={selectSession}
          onNewChat={newChat}
          onLoadMore={loadMore}
          hasMore={hasMore}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        {active ? (
          <ChatWindow
            key={active.id}
            sessionId={active.id}
            initialMessages={active.messages}
            isNewSession={active.messages.length === 0}
            onFirstMessageSaved={refreshActiveTitle}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center px-6">
            <p className="text-sm text-mute text-center">
              Select a conversation from the sidebar, or start a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
