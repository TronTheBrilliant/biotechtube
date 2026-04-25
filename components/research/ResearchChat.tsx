// biotechtube/components/research/ResearchChat.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string; }

export function ResearchChat({ purchaseId, companyName }: { purchaseId: string; companyName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    let assistantText = "";
    setMessages([...next, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/research/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchase_id: purchaseId, messages: next }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          if (!ev.startsWith("data: ")) continue;
          const data = ev.slice(6);
          if (data === "[DONE]") continue;
          try {
            const j = JSON.parse(data);
            if (j.delta) {
              assistantText += j.delta;
              setMessages([...next, { role: "assistant", content: assistantText }]);
            }
          } catch {}
        }
      }
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `Error: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border flex flex-col" style={{ borderColor: "var(--color-border-subtle)", height: "560px" }}>
      <div className="px-3 py-2 border-b text-[12px] font-semibold" style={{ borderColor: "var(--color-border-subtle)" }}>
        Ask anything about {companyName}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
            Try: "What&apos;s the biggest risk to the bull case?" or "Walk me through the catalyst calendar."
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className="text-[13px]">
            <div className="text-[10px] uppercase font-medium mb-1" style={{ color: m.role === "user" ? "var(--color-accent)" : "var(--color-text-tertiary)" }}>
              {m.role}
            </div>
            <div className="whitespace-pre-wrap leading-[1.55]">{m.content || (busy && i === messages.length - 1 ? "…" : "")}</div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t flex gap-2" style={{ borderColor: "var(--color-border-subtle)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          disabled={busy}
          placeholder="Ask about the memo…"
          className="flex-1 text-[13px] px-2 py-1.5 rounded border bg-transparent outline-none"
          style={{ borderColor: "var(--color-border-subtle)" }}
        />
        <button onClick={send} disabled={busy || !input.trim()} className="px-3 py-1.5 rounded text-white" style={{ background: "var(--color-accent)", opacity: busy ? 0.6 : 1 }}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}
