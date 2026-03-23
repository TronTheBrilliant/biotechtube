"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createBrowserClient } from "@/lib/supabase";

const supabase = createBrowserClient();

const features = [
  "Full global company rankings",
  "All 14,000+ company profiles",
  "Watchlist and funding alerts",
  "Funding round database",
  "AI investor assistant (coming soon)",
  "Weekly biotech radar email (coming soon)",
];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main
        className="flex flex-col items-center px-4 py-16"
        style={{ minHeight: "calc(100vh - 120px)" }}
      >
        {/* Card */}
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
            Create your free account
          </h1>
          <p
            className="text-13 text-center mb-6"
            style={{ color: "var(--color-text-secondary)" }}
          >
            First month free, then $49/month
          </p>

          {/* Success message */}
          {success ? (
            <div
              className="text-13 px-4 py-3 rounded text-center"
              style={{
                background: "rgba(34,197,94,0.08)",
                color: "#16a34a",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <p className="font-medium mb-1">Check your email for confirmation</p>
              <p style={{ color: "var(--color-text-secondary)" }}>
                We sent a confirmation link to <strong>{email}</strong>
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
                <div className="mb-4">
                  <label
                    className="text-11 font-medium mb-1 block"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-13 px-3 py-2 rounded border outline-none"
                    style={{
                      borderColor: "var(--color-border-medium)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="mb-4">
                  <label
                    className="text-11 font-medium mb-1 block"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Work email
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

                <div className="mb-4">
                  <label
                    className="text-11 font-medium mb-1 block"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-13 px-3 py-2 rounded border outline-none"
                    style={{
                      borderColor: "var(--color-border-medium)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                    placeholder="Create a password"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label
                    className="text-11 font-medium mb-1 block"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-13 px-3 py-2 rounded border outline-none"
                    style={{
                      borderColor: "var(--color-border-medium)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                    placeholder="Confirm your password"
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
                  {loading ? "Creating account..." : "Create account \u2192"}
                </button>
              </form>
            </>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div
              className="flex-1"
              style={{
                height: "0.5px",
                background: "var(--color-border-subtle)",
              }}
            />
            <span
              className="text-11"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              or
            </span>
            <div
              className="flex-1"
              style={{
                height: "0.5px",
                background: "var(--color-border-subtle)",
              }}
            />
          </div>

          {/* Login link */}
          <p
            className="text-13 text-center"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              Log in
            </Link>
          </p>

          {/* Terms */}
          <p
            className="text-11 text-center mt-4"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            By creating an account you agree to our{" "}
            <Link href="/terms" style={{ color: "var(--color-accent)" }}>
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ color: "var(--color-accent)" }}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Feature checklist */}
        <div className="mt-8 w-full" style={{ maxWidth: 440 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-2">
                <span
                  className="text-13 mt-px"
                  style={{ color: "var(--color-accent)" }}
                >
                  &#10003;
                </span>
                <span
                  className="text-13"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
