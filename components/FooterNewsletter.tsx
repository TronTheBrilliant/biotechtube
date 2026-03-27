"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase";

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email, source: "footer" });

      if (error) {
        if (error.code === "23505") {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <p className="text-12" style={{ color: "var(--color-accent)" }}>
          You&apos;re subscribed!
        </p>
      </div>
    );
  }

  return (
    <div>
      <p
        className="text-12 font-medium mb-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Get weekly biotech insights
      </p>
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 w-[160px] px-2.5 py-1.5 rounded-md text-[12px] outline-none transition-colors"
          style={{
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-medium)",
            color: "var(--color-text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-opacity whitespace-nowrap cursor-pointer"
          style={{
            background: "var(--color-accent)",
            color: "#fff",
            opacity: status === "loading" ? 0.7 : 1,
          }}
        >
          {status === "loading" ? "..." : "Subscribe"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-[11px] mt-1" style={{ color: "#e53e3e" }}>Try again</p>
      )}
    </div>
  );
}
