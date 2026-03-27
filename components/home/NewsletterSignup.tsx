"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase";

export function NewsletterSignup({ source = "homepage" }: { source?: string }) {
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
        .insert({ email, source });

      if (error) {
        if (error.code === "23505") {
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
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          {/* Accent gradient top border */}
          <div
            style={{
              height: 3,
              background: "linear-gradient(90deg, var(--color-accent), #6366f1, #8b5cf6)",
            }}
          />
          <div className="px-6 py-10 md:py-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <h2 className="text-[20px] md:text-[24px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                You&apos;re in!
              </h2>
            </div>
            <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
              Check your inbox for a welcome email. Weekly biotech insights start next Monday.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "var(--color-bg-secondary)",
          border: "0.5px solid var(--color-border-subtle)",
        }}
      >
        {/* Accent gradient top border */}
        <div
          style={{
            height: 3,
            background: "linear-gradient(90deg, var(--color-accent), #6366f1, #8b5cf6)",
          }}
        />
        <div className="px-6 py-10 md:py-12 text-center max-w-[520px] mx-auto">
          <h2
            className="text-[20px] md:text-[24px] font-semibold mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            Stay Ahead in Biotech
          </h2>
          <p
            className="text-[14px] mb-6"
            style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
          >
            Weekly market insights, funding rounds, and FDA decisions — delivered free.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-[420px] mx-auto">
            <input
              type="email"
              required
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 min-w-0 px-4 py-2.5 rounded-lg text-[14px] outline-none transition-colors"
              style={{
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border-medium)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-opacity whitespace-nowrap cursor-pointer"
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
          <p className="text-[12px] mt-4" style={{ color: "var(--color-text-tertiary)" }}>
            Join 1,000+ biotech professionals
          </p>
        </div>
      </div>
    </section>
  );
}
