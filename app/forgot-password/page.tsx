"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createBrowserClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/callback` }
    );

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main
        className="flex flex-col items-center px-4 py-16"
        style={{ minHeight: "calc(100vh - 120px)" }}
      >
        <div
          className="w-full rounded-lg p-8"
          style={{
            maxWidth: 440,
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          {/* Logo */}
          <p
            className="text-13 font-medium mb-6 text-center"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            BiotechTube
          </p>

          <h1
            className="text-[32px] font-medium text-center mb-1 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Reset your password
          </h1>
          <p
            className="text-13 text-center mb-6"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Enter your email and we&apos;ll send you a reset link
          </p>

          {/* Success */}
          {success ? (
            <div
              className="text-13 px-4 py-3 rounded text-center"
              style={{
                background: "rgba(34,197,94,0.08)",
                color: "#16a34a",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <p className="font-medium mb-1">Reset link sent</p>
              <p style={{ color: "var(--color-text-secondary)" }}>
                Check your email at <strong>{email}</strong> for a password reset link.
              </p>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div
                  className="text-13 mb-4 px-3 py-2 rounded"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    color: "#dc2626",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label
                    className="text-11 font-medium mb-1 block"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-13 px-3 py-2 rounded border outline-none"
                    style={{
                      borderColor: "var(--color-border-medium)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                    placeholder="you@company.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-13 font-medium py-2.5 rounded text-white transition-opacity"
                  style={{
                    background: "var(--color-accent)",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>
            </>
          )}

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-13"
              style={{ color: "var(--color-accent)" }}
            >
              &larr; Back to login
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
