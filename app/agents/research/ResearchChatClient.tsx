"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, MessageSquare, Trash2, History } from "lucide-react";
import AskBiotechTubeChat from "@/components/AskBiotechTubeChat";
import { useUser, useSession } from "@/lib/auth";
import type {
  ConversationSummary,
  ChatMessage,
  ChatContextType,
} from "@/lib/chat/types";

interface LoadedConversation {
  id: string;
  title: string;
  context_type: ChatContextType | null;
  context_slug: string | null;
  messages: ChatMessage[];
}

export function ResearchChatClient() {
  const { user, loading } = useUser();
  const session = useSession();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [active, setActive] = useState<LoadedConversation | null>(null);
  const [historyKey, setHistoryKey] = useState(0); // bumps to force chat reset on new convo

  const refreshConversations = useCallback(async () => {
    if (!session?.access_token) return;
    const res = await fetch("/api/chat/conversations", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setConversations(json.conversations as ConversationSummary[]);
    }
  }, [session?.access_token]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  async function openConversation(id: string) {
    if (!session?.access_token) return;
    const res = await fetch(`/api/chat/conversations/${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    setActive({
      id: json.conversation.id,
      title: json.conversation.title,
      context_type: json.conversation.context_type,
      context_slug: json.conversation.context_slug,
      messages: json.messages as ChatMessage[],
    });
    setHistoryKey((k) => k + 1);
  }

  async function deleteConversation(id: string) {
    if (!session?.access_token) return;
    if (!confirm("Delete this conversation?")) return;
    const res = await fetch(`/api/chat/conversations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      if (active?.id === id) startNew();
      refreshConversations();
    }
  }

  function startNew() {
    setActive(null);
    setHistoryKey((k) => k + 1);
  }

  return (
    <div
      className="max-w-7xl mx-auto px-4 py-6"
      style={{ minHeight: "calc(100vh - 200px)" }}
    >
      <header className="mb-6">
        <h1 className="text-28 font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
          Ask BiotechTube
        </h1>
        <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>
          AI research assistant for biotech. Ask about any company, drug, or sector.
          {!user && !loading && (
            <>
              {" "}
              <Link href="/signup" className="underline" style={{ color: "var(--color-accent)" }}>
                Sign in
              </Link>{" "}
              for unlimited use and saved history.
            </>
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4" style={{ minHeight: 600 }}>
        {/* Sidebar (history) — only for signed-in users */}
        {user ? (
          <aside
            className="rounded-lg border p-3 flex flex-col"
            style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)" }}
          >
            <button
              onClick={startNew}
              className="flex items-center gap-2 text-13 px-3 py-2 rounded-md text-white mb-3"
              style={{ background: "var(--color-accent)" }}
            >
              <Plus size={14} />
              New conversation
            </button>

            <div className="flex items-center gap-1 mb-2">
              <History size={12} style={{ color: "var(--color-text-tertiary)" }} />
              <span className="text-11 uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                History
              </span>
            </div>

            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
              {conversations.length === 0 && (
                <div className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                  No conversations yet.
                </div>
              )}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-start gap-1 px-2 py-2 rounded-md hover:bg-opacity-50 cursor-pointer ${
                    active?.id === c.id ? "bg-opacity-100" : ""
                  }`}
                  style={{
                    background: active?.id === c.id ? "var(--color-bg-secondary)" : "transparent",
                  }}
                  onClick={() => openConversation(c.id)}
                >
                  <MessageSquare size={12} className="mt-1 flex-shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-12 truncate" style={{ color: "var(--color-text-primary)" }}>
                      {c.title}
                    </div>
                    {c.context_type && c.context_slug && (
                      <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                        {c.context_type}/{c.context_slug}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition"
                    aria-label="Delete conversation"
                  >
                    <Trash2 size={12} style={{ color: "var(--color-text-tertiary)" }} />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        ) : null}

        {/* Main chat area */}
        <div
          className="rounded-lg border flex flex-col"
          style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)" }}
        >
          <AskBiotechTubeChat
            key={`chat-${historyKey}`}
            context={
              active?.context_type && active?.context_slug
                ? { type: active.context_type, slug: active.context_slug }
                : undefined
            }
            initialMessages={active?.messages ?? []}
            initialConversationId={active?.id ?? null}
            seedPrompts={[
              "What are the most-funded biotech sectors in the last 90 days?",
              "Summarize Moderna's pipeline.",
              "Which drugs are entering Phase 3 this quarter?",
            ]}
            onConversationCreated={() => refreshConversations()}
          />
        </div>
      </div>
    </div>
  );
}
