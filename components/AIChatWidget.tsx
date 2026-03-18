"use client";

import { Sparkles } from "lucide-react";

interface AIChatWidgetProps {
  companyName: string;
}

export function AIChatWidget({ companyName }: AIChatWidgetProps) {
  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{ borderColor: "var(--color-border-subtle)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b">
        <div className="live-dot-lg" />
        <div>
          <div
            className="text-12 font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            AI Investor Assistant
          </div>
          <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
            Ask anything about {companyName}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="px-3 py-2.5 flex flex-col gap-2">
        <div
          className="text-12 px-2.5 py-2 rounded-md border"
          style={{
            color: "var(--color-text-primary)",
            background: "var(--color-bg-primary)",
            borderColor: "var(--color-border-subtle)",
            lineHeight: 1.5,
          }}
        >
          <Sparkles
            size={12}
            className="inline mr-1"
            style={{ color: "var(--color-accent)" }}
          />
          What is {companyName}&apos;s lead drug candidate and current clinical stage?
        </div>
        <div
          className="text-12 text-right"
          style={{
            color: "var(--color-text-secondary)",
            fontStyle: "italic",
          }}
        >
          &quot;What are the key risks for investors?&quot;
        </div>
      </div>

      {/* Input */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-t">
        <input
          type="text"
          placeholder="Ask about this company..."
          className="flex-1 text-11 px-2 py-[5px] rounded-[5px] border bg-transparent outline-none"
          style={{ borderColor: "var(--color-border-medium)" }}
          disabled
        />
        <button
          className="text-10 px-2 py-[5px] rounded-[5px] text-white"
          style={{ background: "var(--color-accent)" }}
          disabled
        >
          Send
        </button>
      </div>
    </div>
  );
}
