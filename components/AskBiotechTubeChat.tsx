"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, Sparkles, AlertCircle } from "lucide-react";
import { useUser, useSession } from "@/lib/auth";
import type {
  ChatMessage,
  ChatContext,
  ChatStreamEvent,
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
  const [error, setError] = useState<string | null>(null);
  const [anonCount, setAnonCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamedText]);

  async function send(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || streaming) return;

    setError(null);
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamedText("");

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
          } else if (evt.type === "error") {
            setError(evt.error);
            setMessages(messages); // roll back
            setStreaming(false);
            return;
          } else if (evt.type === "done") {
            setMessages([...newMessages, { role: "assistant", content: accumulated }]);
            setStreamedText("");
            setStreaming(false);
            if (!user) setAnonCount((c) => c + 1);
            return;
          }
        }
      }

      // Stream ended without explicit done event
      if (accumulated) {
        setMessages([...newMessages, { role: "assistant", content: accumulated }]);
      }
      setStreamedText("");
      setStreaming(false);
      if (!user) setAnonCount((c) => c + 1);
    } catch (err) {
      console.error("Chat fetch error:", err);
      setError(err instanceof Error ? err.message : "Network error");
      setMessages(messages);
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
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}

        {streaming && streamedText && (
          <MessageBubble role="assistant" content={streamedText} streaming />
        )}

        {streaming && !streamedText && (
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
}: {
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
}) {
  if (role === "system") return null;
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="text-13 px-3 py-2 rounded-md max-w-[88%] whitespace-pre-wrap break-words"
        style={{
          background: isUser ? "var(--color-accent)" : "var(--color-bg-secondary)",
          color: isUser ? "#fff" : "var(--color-text-primary)",
          border: isUser ? "none" : "1px solid var(--color-border-subtle)",
          lineHeight: 1.5,
        }}
      >
        {content}
        {streaming && <span className="inline-block w-1 h-3 ml-1 animate-pulse" style={{ background: "var(--color-text-tertiary)" }} />}
      </div>
    </div>
  );
}
