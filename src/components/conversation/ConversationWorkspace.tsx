"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Menu, Paperclip, RotateCcw } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ConversationSidebar, type ConversationSessionSummary } from "@/components/conversation/ConversationSidebar";
import { NoodlesLoader } from "@/components/ui/NoodlesLoader";
import type { ConversationDraft, ConversationMessage, SoupWorkflow } from "@/lib/conversation/types";
import { stripConversationControlTokens, stripUniversityMatchPercentages } from "@/lib/conversation/trust";

// Assistant messages arrive as Markdown (bold field labels, lists, links) but must
// never execute raw HTML from the model or the web. react-markdown without
// rehype-raw already ignores embedded HTML tags (renders them as literal text)
// rather than parsing them into DOM nodes, so this stays safe by construction —
// these overrides only add SOUP's own spacing/hierarchy and a link/image
// allowlist restricted to http(s) URLs.
function isSafeHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => <blockquote className="mb-3 border-l-2 border-hair pl-3 text-mute last:mb-0">{children}</blockquote>,
  h1: ({ children }) => <p className="mb-2 mt-1 text-sm font-semibold text-ink first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mb-2 mt-1 text-sm font-semibold text-ink first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mb-2 mt-1 text-sm font-semibold text-ink first:mt-0">{children}</p>,
  code: ({ children }) => <code className="rounded bg-paper px-1 py-0.5 text-[13px]">{children}</code>,
  pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-lg bg-paper p-3 text-[13px] last:mb-0">{children}</pre>,
  a: ({ href, children }) => {
    if (!isSafeHttpUrl(href)) return <>{children}</>;
    return <a href={href} target="_blank" rel="noreferrer noopener" className="font-medium text-navy underline underline-offset-2 hover:text-teal">{children}</a>;
  },
  img: ({ src, alt }) => (isSafeHttpUrl(src) ? <a href={src} target="_blank" rel="noreferrer noopener" className="font-medium text-navy underline underline-offset-2 hover:text-teal">{alt || "Linked image"}</a> : null),
};

export function AssistantMarkdown({ content, className }: { content: string; className: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
    </div>
  );
}

const DEFAULT_INTRO: Record<SoupWorkflow, string> = {
  COUNSELOR: "Tell me what you need help with. I can stay with you from university search through applications, documents, visa preparation and pre-departure.",
  RESUME: "Let’s build your resume together. What are you hoping this resume helps you achieve?",
  REPORT: "Tell me what you need help with and I’ll move this into the SOUP student journey.",
  FINANCIAL: "Tell me what kind of student finance support you are looking for.",
  LEARN: "Tell me what you need help with and I’ll guide the next step.",
};

const DEFAULT_STARTERS: Partial<Record<SoupWorkflow, string[]>> = {
  COUNSELOR: ["Help me find universities", "I already have an offer and need next steps", "Help me prepare for my visa"],
  RESUME: ["I’m a student looking for internships", "I’m applying for jobs", "I want to improve an existing resume"],
};

function visibleContent(content: string) {
  return stripUniversityMatchPercentages(stripConversationControlTokens(content)).trim();
}
function makeMessage(role: "user" | "assistant", content: string, metadata?: Record<string, unknown>): ConversationMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString(), ...(metadata ? { metadata } : {}) };
}

function assistantAttribution(message: ConversationMessage) {
  const source = String(message.metadata?.source || "");
  if (source === "HUMAN_STAFF") return `SOUP team${message.metadata?.staffName ? ` · ${String(message.metadata.staffName)}` : ""}`;
  if (source === "HUMAN_HANDOFF_HOLD") return "SOUP team handoff";
  if (source === "SYSTEM_EVENT") return "SOUP action";
  return "";
}

function messageSources(message: ConversationMessage) {
  const raw = Array.isArray(message.metadata?.sources) ? message.metadata.sources : [];
  return raw
    .map((source) => {
      const record = source !== null && typeof source === "object" && !Array.isArray(source) ? source as Record<string, unknown> : {};
      return { title: String(record.title || "Source").slice(0, 240), url: String(record.url || "") };
    })
    .filter((source) => /^https?:\/\//i.test(source.url))
    .slice(0, 12);
}

export function ConversationWorkspace({ workflow, signedIn, title, subtitle, intro, starters, entryIntent, entryUniversityId, onAttach, attachLabel = "Attach document", bottomAction, onMessagesChange, onSessionChange, onReset, onBeforeSend, initialPrompt }: {
  workflow: SoupWorkflow;
  signedIn: boolean;
  title: string;
  subtitle?: string;
  intro?: string;
  starters?: string[];
  entryIntent?: string;
  entryUniversityId?: string;
  onAttach?: () => void;
  attachLabel?: string;
  bottomAction?: React.ReactNode;
  onMessagesChange?: (messages: ConversationMessage[]) => void;
  onSessionChange?: (sessionId: string | null) => void;
  onReset?: () => void;
  onBeforeSend?: (content: string, messages: ConversationMessage[]) => boolean | Promise<boolean>;
  initialPrompt?: string;
}) {
  const initialIntro = intro || DEFAULT_INTRO[workflow];
  const initialStarters = starters || DEFAULT_STARTERS[workflow] || [];
  const storageKey = `soup_conversation_${workflow.toLowerCase()}_v1`;
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ConversationSessionSummary[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);
  const initialPromptSent = useRef(false);
  const sendingRef = useRef(false);
  const [pendingInitialPrompt, setPendingInitialPrompt] = useState<string | null>(null);

  const refreshSessions = useCallback(async () => {
    if (!signedIn) return;
    try {
      const response = await fetch("/api/conversation/sessions", { cache: "no-store" });
      const body = await response.json();
      if (response.ok) setSessions(body.sessions || []);
    } catch {}
  }, [signedIn]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let localMessages: ConversationMessage[] = [];
      try {
        const raw = localStorage.getItem(storageKey);
        const draft = raw ? JSON.parse(raw) as ConversationDraft : null;
        localMessages = draft?.messages?.length ? draft.messages : [];
      } catch {}
      if (signedIn) {
        const requestedSession = new URLSearchParams(window.location.search).get("session");
        let restoredRequested = false;
        if (requestedSession) {
          try {
            const response = await fetch(`/api/conversation/sessions?id=${encodeURIComponent(requestedSession)}`, { cache: "no-store" });
            const body = await response.json();
            if (response.ok && body.session?.workflow === workflow) {
              setSessionId(body.session.id);
              localMessages = body.messages || [];
              restoredRequested = true;
            }
          } catch {}
        }
        if (!restoredRequested) {
          try {
            // The locally-cached opening greeting is UI chrome, not conversation
            // content: it is never persisted through the normal turn-saving path,
            // so it must never be sent to server-side reconciliation either —
            // doing so previously made every post-first-turn reload look like a
            // divergence and re-persisted the greeting as if it were real history.
            const reconcilable = localMessages.filter((message, index) => !(index === 0 && message.role === "assistant" && message.content === initialIntro));
            const response = await fetch("/api/conversation/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflow, messages: reconcilable.map(({ role, content, metadata }) => ({ role, content, metadata })) }) });
            const body = await response.json();
            if (response.ok) {
              setSessionId(body.sessionId || null);
              if (body.messages?.length) localMessages = body.messages;
            }
          } catch {}
        }
        await refreshSessions();
      }
      if (!cancelled) {
        setMessages(localMessages.length ? localMessages : [makeMessage("assistant", initialIntro)]);
        loaded.current = true;
        if (initialPrompt?.trim()) setPendingInitialPrompt(initialPrompt.trim());
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [storageKey, workflow, signedIn, refreshSessions, initialIntro, initialPrompt]);

  useEffect(() => {
    if (!loaded.current || !messages.length) return;
    const draft: ConversationDraft = { workflow, messages, updatedAt: new Date().toISOString() };
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [messages, storageKey, workflow]);

  useEffect(() => { if (loaded.current && messages.length) onMessagesChange?.(messages); }, [messages, onMessagesChange]);

  useEffect(() => {
    if (!loaded.current || initialPromptSent.current || !pendingInitialPrompt || streaming) return;
    const alreadyPresent = messages.some((message) => message.role === "user" && message.content.trim() === pendingInitialPrompt);
    initialPromptSent.current = true;
    setPendingInitialPrompt(null);
    if (!alreadyPresent) void send(pendingInitialPrompt);
  }, [pendingInitialPrompt, messages, streaming]);
  useEffect(() => { onSessionChange?.(sessionId); }, [sessionId, onSessionChange]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, streamText]);

  useEffect(() => {
    const listener = (event: Event) => {
      const custom = event as CustomEvent<{ workflow?: SoupWorkflow; message?: ConversationMessage }>;
      if (custom.detail?.workflow !== workflow || !custom.detail.message) return;
      const message = custom.detail.message;
      setMessages((current) => [...current, message]);
      const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata : undefined;
      const persistableSystemEvent = Boolean(metadata && (metadata.shortlistId || metadata.checklistId || metadata.documentId || metadata.resumeId));
      if (signedIn && sessionId && message.role === "assistant" && persistableSystemEvent) {
        // The server reconstructs the persisted assistant event from the owned entity ID.
        // The browser-supplied prose is deliberately not accepted as trusted history.
        void fetch("/api/conversation/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, metadata }),
        }).then(() => refreshSessions()).catch(() => undefined);
      }
    };
    window.addEventListener("soup:conversation-append", listener);
    // Temporary compatibility while the inherited resume module is being fully renamed.
    window.addEventListener("gci:conversation-append", listener);
    return () => {
      window.removeEventListener("soup:conversation-append", listener);
      window.removeEventListener("gci:conversation-append", listener);
    };
  }, [workflow, signedIn, sessionId, refreshSessions]);

  const userTurns = useMemo(() => messages.filter((message) => message.role === "user").length, [messages]);

  async function send(prefill?: string) {
    const content = (prefill ?? input).trim();
    // `streaming` is React state and updates asynchronously, so two triggers
    // firing in the same tick (e.g. a mobile keyboard's "Go"/"Send" action and
    // a near-simultaneous tap on the send button) can both pass this check
    // before either re-render lands, producing two independent calls to the
    // stream endpoint for one input — the visible symptom is a duplicated
    // assistant reply with only one user turn. sendingRef is set synchronously
    // and closes that race regardless of what double-triggers it.
    if (!content || streaming || sendingRef.current) return;
    sendingRef.current = true;
    setError(null);
    setInput("");
    const userMessage = makeMessage("user", content);
    const nextMessages = [...messages, userMessage];
    // The user's own message is appended and a busy state shown *before*
    // onBeforeSend runs (not just before the normal AI stream) so an
    // intercepted send — e.g. "make it" triggering resume/cover-letter
    // generation instead of a normal reply — still shows the user's turn and
    // a visible loading state while it works, rather than the input silently
    // clearing with nothing on screen until the result (or a failure) lands.
    setMessages(nextMessages);
    setStreaming(true);
    setStreamText("");
    if (onBeforeSend) {
      try {
        const handled = await onBeforeSend(content, nextMessages);
        if (handled) { setStreaming(false); setStreamText(""); sendingRef.current = false; return; }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "SOUP could not complete that action.");
        setStreaming(false);
        setStreamText("");
        sendingRef.current = false;
        return;
      }
    }

    try {
      const response = await fetch("/api/conversation/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow, sessionId, entryIntent, entryUniversityId, messages: nextMessages.map(({ role, content }) => ({ role, content })) }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Noodles could not respond.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let complete = "";
      let returnedSessionId = sessionId;
      let returnedSources: Array<{ title: string; url: string }> = [];
      let returnedMetadata: Record<string, unknown> | undefined;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "delta") { complete += event.text; setStreamText(complete); }
          else if (event.type === "done") {
            complete = event.text || complete;
            returnedSessionId = event.sessionId || returnedSessionId;
            returnedSources = Array.isArray(event.sources) ? event.sources : [];
            returnedMetadata = event.metadata && typeof event.metadata === "object" ? event.metadata : undefined;
          }
          else if (event.type === "error") throw new Error(event.message || "Noodles was interrupted.");
        }
      }
      if (returnedSessionId && returnedSessionId !== sessionId) setSessionId(returnedSessionId);
      if (complete.trim()) {
        const metadata = { ...(returnedMetadata || {}), ...(returnedSources.length ? { sources: returnedSources } : {}) };
        setMessages((current) => [...current, makeMessage("assistant", complete.trim(), Object.keys(metadata).length ? metadata : undefined)]);
      }
      await refreshSessions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Noodles was interrupted. Please try again.");
    } finally {
      setStreaming(false);
      setStreamText("");
      sendingRef.current = false;
    }
  }

  async function startNewConversation() {
    if (signedIn) {
      try {
        const response = await fetch("/api/conversation/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflow }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not start a new conversation.");
        setSessionId(body.session.id);
        await refreshSessions();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not start a new conversation.");
        return;
      }
    } else {
      setSessionId(null);
    }
    setMessages([makeMessage("assistant", initialIntro)]);
    localStorage.removeItem(storageKey);
    setError(null);
    onReset?.();
  }

  async function selectSession(session: ConversationSessionSummary) {
    if (session.workflow !== workflow) {
      const href = session.workflow === "RESUME" ? "/resume" : "/counselor";
      window.location.href = `${href}?session=${encodeURIComponent(session.id)}`;
      return;
    }
    try {
      const response = await fetch(`/api/conversation/sessions?id=${encodeURIComponent(session.id)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not open conversation.");
      setSessionId(session.id);
      setMessages(body.messages?.length ? body.messages : [makeMessage("assistant", initialIntro)]);
      setError(null);
      onReset?.();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not open conversation."); }
  }

  async function renameConversation(session: ConversationSessionSummary) {
    const title = window.prompt("Rename conversation", session.title || "");
    if (title === null) return;
    await fetch("/api/conversation/sessions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: session.id, title }) });
    await refreshSessions();
  }

  async function deleteConversation(session: ConversationSessionSummary) {
    if (!window.confirm("Delete this conversation permanently?")) return;
    const response = await fetch("/api/conversation/sessions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: session.id }) });
    if (response.ok) {
      if (session.id === sessionId) await startNewConversation();
      else await refreshSessions();
    }
  }

  return (
    <div className="flex min-h-0 w-full flex-1">
      <ConversationSidebar signedIn={signedIn} workflow={workflow} sessions={sessions} activeSessionId={sessionId} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} onNew={startNewConversation} onSelect={selectSession} onRename={renameConversation} onDelete={deleteConversation}/>
      <section className="mx-auto flex min-h-0 min-w-0 flex-1 flex-col px-3 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-2 border-b border-hair px-1 py-3 sm:flex-row sm:items-start sm:gap-4 sm:py-4">
          <div><div className="flex items-center gap-2">
            {/* Lives in the header flow (not a viewport-fixed floating button) so it
                can never collide with the composer below, whose height varies with
                textarea line-count and the disclaimer text wrapping. */}
            <button onClick={() => setMobileOpen(true)} className="-ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-mute hover:bg-paper md:hidden" aria-label="Open conversation history"><Menu size={16}/></button>
            <NoodlesLoader size={16} className="text-teal" active={false}/><h1 className="text-base font-semibold text-ink">{title}</h1></div>{subtitle && <p className="mt-1 text-xs text-mute">{subtitle}</p>}</div>
          <button onClick={startNewConversation} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-mute hover:bg-white"><RotateCcw size={12}/> New conversation</button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-7 sm:px-8">
          <div className="mx-auto max-w-2xl space-y-6">
            {messages.map((message) => message.role === "user" ? (
              <div key={message.id} className="flex justify-end"><div className="max-w-[88%] break-words rounded-3xl rounded-br-lg bg-[#EEF1F4] px-4 py-3 text-sm leading-6 text-ink sm:max-w-[82%]">{visibleContent(message.content)}</div></div>
            ) : (
              <div key={message.id} className="flex gap-3">
                <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-navy text-white"><NoodlesLoader size={15} active={false}/></div>
                <div className="max-w-[88%] min-w-0">
                  {assistantAttribution(message) && <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal">{assistantAttribution(message)}</div>}
                  <AssistantMarkdown content={visibleContent(message.content)} className="break-words text-sm leading-6 text-ink"/>
                  {messageSources(message).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {messageSources(message).map((source, index) => (
                        <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-full border border-hair bg-white px-3 py-1.5 text-[10px] font-medium text-navy hover:border-navy" title={source.url}>
                          Source · {source.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {streaming && <div className="flex gap-3"><div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-navy text-white"><NoodlesLoader size={15} active={!visibleContent(streamText)}/></div>{visibleContent(streamText) && <AssistantMarkdown content={visibleContent(streamText)} className="max-w-[88%] break-words text-sm leading-6 text-ink"/>}</div>}
            {messages.length === 1 && initialStarters.length ? <div className="ml-10 flex flex-wrap gap-2">{initialStarters.map((starter) => <button key={starter} onClick={() => send(starter)} className="rounded-full border border-hair bg-white px-3 py-2 text-xs text-ink hover:border-navy">{starter}</button>)}</div> : null}
            {error && <div className="ml-10 rounded-xl border border-[#F0D5D1] bg-[#FFF8F7] px-4 py-3 text-xs text-[#9D3127]">{error}</div>}
          </div>
        </div>
        {bottomAction ? <div className="px-1 pt-2 sm:px-8"><div className="mx-auto max-w-2xl">{bottomAction}</div></div> : null}
        <div className="px-1 pb-4 pt-2 sm:px-8 sm:pb-6">
          <div className="mx-auto max-w-2xl rounded-[28px] border border-hair bg-white p-2.5 shadow-[0_8px_30px_rgba(20,32,48,0.07)]">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} rows={1} placeholder="Message SOUP..." className="max-h-36 min-h-[44px] w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-ink outline-none"/>
            <div className="flex items-center justify-between gap-2 px-1 pb-0.5 pt-1.5">
              <div className="flex min-w-0 items-center gap-2">
                {onAttach && <button onClick={onAttach} aria-label={attachLabel} title={attachLabel} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-hair text-mute hover:border-navy hover:text-navy"><Paperclip size={15}/></button>}
                <span className="truncate text-[10px] text-mute">{signedIn ? "Saved SOUP account" : "Guest conversation — kept on this device"}</span>
              </div>
              <button onClick={() => void send()} disabled={!input.trim() || streaming} aria-label="Send" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-navy text-white transition-colors hover:bg-[#16314F] disabled:bg-[#D8DDE2]"><ArrowUp size={17}/></button>
            </div>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] text-mute">SOUP can make mistakes. Check important admissions, visa, financial and service information against the cited official source before acting.</p>
        </div>
      </section>
    </div>
  );
}
