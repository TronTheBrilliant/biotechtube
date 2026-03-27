"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email, source: "blog" });

      if (error) {
        if (error.code === "23505") {
          // duplicate
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg("Something went wrong. Please try again.");
        }
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div
        className="my-10 p-6 rounded-xl border-l-4"
        style={{
          background: "var(--color-bg-secondary)",
          borderColor: "var(--color-accent)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            You&apos;re subscribed!
          </p>
        </div>
        <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
          You&apos;ll receive weekly biotech insights in your inbox.
        </p>
      </div>
    );
  }

  return (
    <div
      className="my-10 p-6 rounded-xl border-l-4"
      style={{
        background: "var(--color-bg-secondary)",
        borderColor: "var(--color-accent)",
      }}
    >
      <h3 className="text-[17px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Get Weekly Biotech Insights
      </h3>
      <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
        Join thousands of investors and researchers who stay ahead with our free weekly newsletter.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg text-[14px] outline-none transition-colors"
          style={{
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-medium)",
            color: "var(--color-text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap"
          style={{
            background: "var(--color-accent)",
            color: "#fff",
            opacity: status === "loading" ? 0.7 : 1,
          }}
        >
          {status === "loading" ? "Subscribing..." : "Subscribe"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-[12px] mt-2" style={{ color: "#e53e3e" }}>{errorMsg}</p>
      )}
    </div>
  );
}
