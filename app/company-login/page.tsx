"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createBrowserClient } from "@/lib/supabase";
import { Building2, ShieldCheck, BarChart3, Users, Briefcase } from "lucide-react";

export default function CompanyLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else {
        router.push("/manage");
        return;
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/manage`,
      },
    });
    if (authError) {
      setError(authError.message);
    }
  }

  const features = [
    { icon: <ShieldCheck size={14} />, text: "Manage your verified company profile" },
    { icon: <BarChart3 size={14} />, text: "Track profile views and analytics" },
    { icon: <Users size={14} />, text: "Add team members and post updates" },
    { icon: <Briefcase size={14} />, text: "Post job openings and manage inquiries" },
  ];

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
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className="flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--color-accent-subtle)",
                color: "var(--color-accent)",
              }}
            >
              <Building2 size={20} />
            </div>
          </div>

          <h1
            className="text-[22px] font-medium text-center mb-2"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.3px" }}
          >
            Company Dashboard
          </h1>

          <p
            className="text-12 text-center mb-6"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Log in to manage your company profile on BiotechTube
          </p>

          {/* Error */}
          {error && (
            <div
              className="text-12 mb-4 px-3 py-2 rounded"
              style={{
                background: "rgba(192,57,43,0.06)",
                color: "#c0392b",
                border: "0.5px solid rgba(192,57,43,0.15)",
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
                Work email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-13 px-3 py-2 rounded outline-none"
                style={{
                  border: "0.5px solid var(--color-border-medium)",
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="you@company.com"
                required
              />
            </div>

            <div className="mb-2">
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
                className="w-full text-13 px-3 py-2 rounded outline-none"
                style={{
                  border: "0.5px solid var(--color-border-medium)",
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="flex justify-end mb-6">
              <Link
                href="/forgot-password"
                className="text-11"
                style={{ color: "var(--color-accent)" }}
              >
                Forgot password?
              </Link>
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
              {loading ? "Logging in..." : "Log in to Dashboard →"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />
            <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>or</span>
            <div className="flex-1" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 text-13 font-medium py-2.5 rounded transition-colors"
            style={{
              border: "0.5px solid var(--color-border-medium)",
              background: "var(--color-bg-primary)",
              color: "var(--color-text-primary)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Links */}
          <p
            className="text-12 text-center mt-6"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Don&apos;t have an account?{" "}
            <Link href="/claim" style={{ color: "var(--color-accent)" }}>
              Claim your profile
            </Link>
          </p>
        </div>

        {/* Features below the form */}
        <div className="mt-8" style={{ maxWidth: 440, width: "100%" }}>
          <div className="flex flex-col gap-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                <span style={{ color: "var(--color-accent)", flexShrink: 0 }}>{f.icon}</span>
                <span className="text-12">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
