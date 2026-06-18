"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, Sparkles, AlertCircle, Search, Link2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useUser, useSession } from "@/lib/auth";
import type {
  ChatMessage,
  ChatContext,
  ChatStreamEvent,
  ToolEvent,
} from "@/lib/chat/types";
import { ANON_DAILY_LIMIT, ANON_WARN_AT } from "@/lib/chat/rate-limit";

export interface AskBiotechTubeChatProps {
  /** Optional entity context — pre-loads info on this entity into the system prompt. */
  context?: ChatContext;
  /** Optional starter prompts shown above the input on empty conversations. */
  seedPrompts?: string[];
  /** Optional initial messages (used when loading an existing conversation). */
  initialMessages?: ChatMessage[];
  /** Optional initial conversation ID when resuming a conversation. */
  initialConversationId?: string | null;
  /** Compact mode hides headers, suitable for the embeddable widget. */
  compact?: boolean;
  /** Called when a new conversation is created server-side (so parents can update URL/state). */
  onConversationCreated?: (id: string) => void;
}

export default function AskBiotechTubeChat({
  context,
  seedPrompts = [],
  initialMessages = [],
  initialConversationId = null,
  compact = false,
  onConversationCreated,
}: AskBiotechTubeChatProps) {
  const { user } = useUser();
  const session = useSession();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [streamedToolEvents, setStreamedToolEvents] = useState<ToolEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [anonCount, setAnonCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamedText, streamedToolEvents]);

  async function send(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || streaming) return;

    setError(null);
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamedText("");
    setStreamedToolEvents([]);
    const turnToolEvents: ToolEvent[] = [];

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: newMessages,
          context,
          conversationId,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setError(errBody.error || `Request failed (${res.status})`);
        // Roll back the optimistic user message on error so they can retry.
        setMessages(messages);
        setStreaming(false);
        return;
      }

      if (!res.body) {
        setError("No response body");
        setStreaming(false);
        return;
      }

      // Parse SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice("data:".length).trim();
          if (!json) continue;

          let evt: ChatStreamEvent;
          try {
            evt = JSON.parse(json);
          } catch {
            continue;
          }

          if (evt.type === "meta") {
            if (evt.conversationId && evt.conversationId !== conversationId) {
              setConversationId(evt.conversationId);
              onConversationCreated?.(evt.conversationId);
            }
          } else if (evt.type === "content") {
            accumulated += evt.content;
            setStreamedText(accumulated);
          } else if (evt.type === "tool_call") {
            turnToolEvents.push({ kind: "searching", query: evt.query });
            setStreamedToolEvents([...turnToolEvents]);
          } else if (evt.type === "tool_result") {
            // Replace the most recent "searching" entry with a completed "searched" one.
            const idx = lastIndexWhere(turnToolEvents, (e) => e.kind === "searching");
            if (idx >= 0) {
              const prev = turnToolEvents[idx] as { kind: "searching"; query: string };
              turnToolEvents[idx] = { kind: "searched", query: prev.query, sources: evt.sources };
            } else {
              turnToolEvents.push({ kind: "searched", query: "", sources: evt.sources });
            }
            setStreamedToolEvents([...turnToolEvents]);
          } else if (evt.type === "tool_error") {
            const idx = lastIndexWhere(turnToolEvents, (e) => e.kind === "searching");
            if (idx >= 0) {
              const prev = turnToolEvents[idx] as { kind: "searching"; query: string };
              turnToolEvents[idx] = { kind: "search_error", query: prev.query, error: evt.error };
            } else {
              turnToolEvents.push({ kind: "search_error", query: "", error: evt.error });
            }
            setStreamedToolEvents([...turnToolEvents]);
          } else if (evt.type === "error") {
            setError(evt.error);
            setMessages(messages); // roll back
            setStreaming(false);
            setStreamedToolEvents([]);
            return;
          } else if (evt.type === "done") {
            setMessages([
              ...newMessages,
              {
                role: "assistant",
                content: accumulated,
                toolEvents: turnToolEvents.length ? [...turnToolEvents] : undefined,
              },
            ]);
            setStreamedText("");
            setStreamedToolEvents([]);
            setStreaming(false);
            if (!user) setAnonCount((c) => c + 1);
            return;
          }
        }
      }

      // Stream ended without explicit done event
      if (accumulated) {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: accumulated,
            toolEvents: turnToolEvents.length ? [...turnToolEvents] : undefined,
          },
        ]);
      }
      setStreamedText("");
      setStreamedToolEvents([]);
      setStreaming(false);
      if (!user) setAnonCount((c) => c + 1);
    } catch (err) {
      console.error("Chat fetch error:", err);
      setError(err instanceof Error ? err.message : "Network error");
      setMessages(messages);
      setStreamedToolEvents([]);
      setStreaming(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  const showSignInBanner = !user && anonCount >= ANON_WARN_AT;

  return (
    <div className="flex flex-col h-full">
      {!compact && (
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
          <Sparkles size={16} style={{ color: "var(--color-accent)" }} />
          <div>
            <div className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>
              Ask BiotechTube
            </div>
            <div className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
              Powered by DeepSeek V4 · Grounded in BiotechTube data
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && !streaming && seedPrompts.length > 0 && (
          <div className="space-y-2">
            <div className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
              Try asking:
            </div>
            {seedPrompts.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="block w-full text-left text-12 px-3 py-2 rounded-md border transition hover:opacity-80"
                style={{
                  borderColor: "var(--color-border-subtle)",
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            role={m.role}
            content={m.content}
            toolEvents={m.toolEvents}
          />
        ))}

        {streaming && (streamedText || streamedToolEvents.length > 0) && (
          <MessageBubble
            role="assistant"
            content={streamedText}
            toolEvents={streamedToolEvents}
            streaming
          />
        )}

        {streaming && !streamedText && streamedToolEvents.length === 0 && (
          <div className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
            Thinking…
          </div>
        )}

        {error && (
          <div
            className="flex items-start gap-2 text-12 px-3 py-2 rounded-md border"
            style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#991b1b" }}
          >
            <AlertCircle size={14} className="mt-[2px] flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}
      </div>

      {/* Sign-in nudge */}
      {showSignInBanner && (
        <div
          className="px-4 py-2 text-11 border-t"
          style={{
            borderColor: "var(--color-border-subtle)",
            background: "var(--color-bg-secondary)",
            color: "var(--color-text-secondary)",
          }}
        >
          You have {Math.max(0, ANON_DAILY_LIMIT - anonCount)} free messages left today.{" "}
          <a href="/signup" className="underline" style={{ color: "var(--color-accent)" }}>
            Sign in for unlimited
          </a>
          .
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 px-3 py-2 border-t"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={context ? `Ask about ${context.slug}…` : "Ask about a company, drug, or sector…"}
          disabled={streaming}
          className="flex-1 text-13 px-3 py-2 rounded-md border bg-transparent outline-none disabled:opacity-50"
          style={{ borderColor: "var(--color-border-medium)", color: "var(--color-text-primary)" }}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="text-12 px-3 py-2 rounded-md text-white flex items-center gap-1 disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          <Send size={12} />
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
  toolEvents,
}: {
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
  toolEvents?: ToolEvent[];
}) {
  if (role === "system") return null;
  const isUser = role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1`}>
      {!isUser && toolEvents && toolEvents.length > 0 && (
        <ToolEventStrip events={toolEvents} />
      )}
      {(content || isUser || streaming) && (
      <div
        className={`text-13 px-3 py-2 rounded-md max-w-[88%] break-words ${isUser ? "whitespace-pre-wrap" : "ask-bt-markdown"}`}
        style={{
          background: isUser ? "var(--color-accent)" : "var(--color-bg-secondary)",
          color: isUser ? "#fff" : "var(--color-text-primary)",
          border: isUser ? "none" : "1px solid var(--color-border-subtle)",
          lineHeight: 1.55,
        }}
      >
        {isUser ? (
          content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Tighten default markdown spacing for chat bubbles
              p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="my-1.5 pl-4 list-disc space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="my-1.5 pl-5 list-decimal space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="leading-snug">{children}</li>,
              h1: ({ children }) => <h2 className="text-[15px] font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>,
              h2: ({ children }) => <h2 className="text-[14px] font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="text-[13px] font-semibold mt-2 mb-1 first:mt-0">{children}</h3>,
              h4: ({ children }) => <h4 className="text-[13px] font-semibold mt-2 mb-1 first:mt-0">{children}</h4>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="underline underline-offset-2"
                  style={{ color: "var(--color-accent)" }}
                  target={href?.startsWith("http") ? "_blank" : undefined}
                  rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {children}
                </a>
              ),
              code: ({ children, ...props }) => {
                const inline = !(props as { className?: string }).className?.includes("language-");
                return inline ? (
                  <code className="px-1 py-0.5 rounded text-[12px]" style={{ background: "var(--color-bg-tertiary)", fontFamily: "var(--font-geist-mono, monospace)" }}>{children}</code>
                ) : (
                  <pre className="my-1.5 p-2 rounded text-[12px] overflow-x-auto" style={{ background: "var(--color-bg-tertiary)", fontFamily: "var(--font-geist-mono, monospace)" }}>
                    <code>{children}</code>
                  </pre>
                );
              },
              blockquote: ({ children }) => (
                <blockquote
                  className="border-l-2 pl-3 my-1.5 italic"
                  style={{ borderColor: "var(--color-accent)", color: "var(--color-text-secondary)" }}
                >
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-2 border-0 h-px" style={{ background: "var(--color-border-subtle)" }} />,
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto">
                  <table className="text-[12px] border-collapse" style={{ borderColor: "var(--color-border-subtle)" }}>
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => <th className="px-2 py-1 font-semibold text-left" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>{children}</th>,
              td: ({ children }) => <td className="px-2 py-1" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>{children}</td>,
            }}
          >
            {content}
          </ReactMarkdown>
        )}
        {streaming && <span className="inline-block w-1 h-3 ml-1 animate-pulse" style={{ background: "var(--color-text-tertiary)" }} />}
      </div>
      )}
    </div>
  );
}

function ToolEventStrip({ events }: { events: ToolEvent[] }) {
  return (
    <div className="flex flex-col gap-1 max-w-[88%]">
      {events.map((e, i) => (
        <ToolEventLine key={i} event={e} />
      ))}
    </div>
  );
}

function ToolEventLine({ event }: { event: ToolEvent }) {
  const baseStyle = {
    fontSize: 11,
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid var(--color-border-subtle)",
    background: "var(--color-bg-tertiary, var(--color-bg-secondary))",
    color: "var(--color-text-secondary)",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    lineHeight: 1.3,
  } as const;

  if (event.kind === "searching") {
    return (
      <div style={baseStyle}>
        <Search size={11} className="animate-pulse" />
        <span>
          Searching the web for: <span style={{ fontStyle: "italic" }}>«{truncate(event.query, 80)}»</span>…
        </span>
      </div>
    );
  }
  if (event.kind === "searched") {
    return (
      <details style={{ ...baseStyle, display: "block" }}>
        <summary style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <Link2 size={11} />
          <span>Used {event.sources.length} web {event.sources.length === 1 ? "source" : "sources"}</span>
          {event.query && (
            <span style={{ color: "var(--color-text-tertiary)", marginLeft: 4 }}>· «{truncate(event.query, 60)}»</span>
          )}
        </summary>
        <ul style={{ margin: "6px 0 2px 0", paddingLeft: 16, listStyle: "disc" }}>
          {event.sources.map((s, i) => (
            <li key={i} style={{ marginBottom: 2 }}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-accent)", textDecoration: "underline" }}
              >
                {s.title || s.url}
              </a>
            </li>
          ))}
        </ul>
      </details>
    );
  }
  // search_error
  return (
    <div style={{ ...baseStyle, borderColor: "#fca5a5", color: "#991b1b", background: "#fef2f2" }}>
      <AlertCircle size={11} />
      <span>Web search unavailable: {truncate(event.error, 100)}</span>
    </div>
  );
}

function lastIndexWhere<T>(arr: T[], pred: (e: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return i;
  }
  return -1;
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
