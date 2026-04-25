"use client";

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import AskBiotechTubeChat from "./AskBiotechTubeChat";
import type { ChatContext } from "@/lib/chat/types";

const SEED_PROMPTS_BY_TYPE: Record<ChatContext["type"], string[]> = {
  company: [
    "Summarize this company's pipeline.",
    "What are the upcoming catalysts in the next 6 months?",
    "Who are the main competitors?",
  ],
  drug: [
    "What is the trial design and primary endpoint?",
    "How does this drug compare to competing therapies?",
    "What are the key risks for this program?",
  ],
  sector: [
    "Which companies in this sector have the strongest pipelines?",
    "What are the recent M&A and funding trends?",
    "What are the major scientific breakthroughs in this sector?",
  ],
};

export interface AskBiotechTubeProps {
  context: ChatContext;
  /** Override the seed prompts. Defaults to type-specific suggestions. */
  seedPrompts?: string[];
  /** When true, the widget renders inline expanded; when false (default), starts collapsed. */
  defaultOpen?: boolean;
}

/**
 * Embeddable per-entity chat widget. Collapses to a floating button when closed.
 * The chat UI inside is the full-featured AskBiotechTubeChat component, just
 * wrapped in compact mode + collapse chrome.
 */
export function AskBiotechTube({ context, seedPrompts, defaultOpen = false }: AskBiotechTubeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const prompts = seedPrompts ?? SEED_PROMPTS_BY_TYPE[context.type];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-13 px-4 py-2 rounded-full text-white shadow-md hover:opacity-90 transition"
        style={{ background: "var(--color-accent)" }}
        aria-label="Open Ask BiotechTube AI assistant"
      >
        <MessageSquare size={14} />
        Ask AI about this {context.type}
      </button>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden border flex flex-col"
      style={{
        borderColor: "var(--color-border-subtle)",
        background: "var(--color-bg-primary)",
        height: 480,
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={14} style={{ color: "var(--color-accent)" }} />
          <span className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>
            Ask BiotechTube about this {context.type}
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="opacity-60 hover:opacity-100"
          aria-label="Close chat"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <AskBiotechTubeChat context={context} seedPrompts={prompts} compact />
      </div>
    </div>
  );
}
