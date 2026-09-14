"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ChatMessage } from "@prisma/client";
import { appendMessage, renameSession } from "@/app/actions/chat";
import { AutosaveIndicator, type SaveStatus } from "@/components/chat/AutosaveIndicator";

// The assistant reply now comes from a real streaming AI backend
// (POST /api/chat/stream) — see callAssistant() below.

type PendingMessage = {
  tempId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  status: SaveStatus;
};

export function ChatWindow({
  sessionId,
  initialMessages,
  isNewSession,
  onFirstMessageSaved,
}: {
  sessionId: string;
  initialMessages: ChatMessage[];
  isNewSession: boolean;
  onFirstMessageSaved: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastUserText, setLastUserText] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Loading a different session replaces local state entirely — no stale
  // cross-session bleed.
  useEffect(() => {
    setMessages(initialMessages);
    setPending([]);
    setStreamingText(null);
  }, [sessionId, initialMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, streamingText]);

  async function persist(tempId: string, role: "USER" | "ASSISTANT", content: string) {
    setPending((p) => p.map((m) => (m.tempId === tempId ? { ...m, status: "saving" } : m)));
    try {
      const saved = await appendMessage(sessionId, role, content);
      setPending((p) => p.filter((m) => m.tempId !== tempId));
      setMessages((m) => [...m, saved]);
      if (role === "USER" && isNewSession) {
        // Auto-title from the first user message, per spec.
        renameSession(sessionId).catch(() => {});
        onFirstMessageSaved();
      }
    } catch {
      // Never lose the typed message — keep it visible with a retry control.
      setPending((p) => p.map((m) => (m.tempId === tempId ? { ...m, status: "error" } : m)));
    }
  }

  function retry(tempId: string) {
    const msg = pending.find((m) => m.tempId === tempId);
    if (msg) persist(tempId, msg.role, msg.content);
  }

  // Calls the real streaming AI route. The user's message is already
  // persisted by persist() before this runs, and the route relies on that
  // (see route.ts) rather than persisting it again — so this function only
  // ever reads/streams, it never duplicates the user-message write. The
  // assistant reply is persisted server-side inside the route; the "done"
  // event returns the actual saved ChatMessage row, which is appended
  // directly to `messages` here (no extra client-side persistence call).
  async function callAssistant(text: string) {
    setStreamError(null);
    setStreamingText("");

    let response: Response;
    try {
      response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
    } catch {
      setStreamingText(null);
      setStreamError("Couldn't reach the AI service. Check your connection and retry.");
      return;
    }

    if (!response.ok || !response.body) {
      let errorMessage = `Request failed (${response.status}).`;
      try {
        const errJson = await response.json();
        if (errJson?.error) errorMessage = errJson.error;
      } catch {
        // response wasn't JSON — keep the generic status-based message
      }
      setStreamingText(null);
      setStreamError(errorMessage);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // last (possibly incomplete) line stays in the buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "delta") {
            setStreamingText((prev) => (prev ?? "") + event.text);
          } else if (event.type === "done") {
            setStreamingText(null);
            setMessages((m) => [...m, event.message as ChatMessage]);
          } else if (event.type === "error") {
            setStreamingText(null);
            setStreamError(event.message || "The AI request failed.");
          }
        }
      }
    } catch {
      setStreamingText(null);
      setStreamError("The response stream was interrupted. Retry to continue.");
    }
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setLastUserText(text);

    const tempId = crypto.randomUUID();
    setPending((p) => [...p, { tempId, role: "USER", content: text, status: "saving" }]);
    await persist(tempId, "USER", text);

    await callAssistant(text);
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-xl mx-auto">
          {messages.length === 0 && pending.length === 0 && !streamingText && (
            <p className="text-sm text-mute text-center mt-10">
              Start typing below to begin this conversation.
            </p>
          )}

          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} content={m.content} />
          ))}

          {pending.map((m) => (
            <div key={m.tempId}>
              <Bubble role={m.role} content={m.content} />
              <div className={m.role === "USER" ? "flex justify-end mb-2 -mt-2" : "flex justify-start mb-2 -mt-2 ml-9"}>
                <AutosaveIndicator status={m.status} onRetry={() => retry(m.tempId)} />
              </div>
            </div>
          ))}

          {streamingText !== null && <Bubble role="ASSISTANT" content={streamingText} />}

          {streamError && (
            <div className="flex items-center gap-2 ml-9 -mt-1 mb-2">
              <span className="text-xs text-[#B3261E]">{streamError}</span>
              <button
                onClick={() => callAssistant(lastUserText)}
                className="text-xs font-medium underline text-[#B3261E]"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-4 sm:px-6 pb-6 pt-2">
        <div className="max-w-xl mx-auto flex items-center gap-2 rounded-full border border-hair bg-white px-2 py-2 shadow-sm">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message GCI..."
            className="flex-1 bg-transparent text-sm px-3 outline-none text-ink"
          />
          <button
            onClick={send}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: input.trim() ? "#1E3A5F" : "#E5E5E5" }}
          >
            <Send size={13} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  if (role === "USER") {
    return (
      <div className="flex justify-end mb-1">
        <div className="rounded-2xl rounded-br-md px-4 py-2.5 max-w-[75%] bg-navy text-white">
          <span className="text-sm">{content}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 mb-1">
      <span className="w-6 h-6 rounded-full bg-teal flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed text-ink">{content}</p>
      </div>
    </div>
  );
}
