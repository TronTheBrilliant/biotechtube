import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Reset password — BiotechTube",
  description: "Reset your BiotechTube account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
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
            className="text-xl font-medium text-center mb-1"
            style={{ color: "var(--color-text-primary)" }}
          >
            Reset your password
          </h1>
          <p
            className="text-13 text-center mb-6"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Enter your email and we&apos;ll send you a reset link
          </p>

          {/* Form */}
          <div>
            <div className="mb-6">
              <label
                className="text-11 font-medium mb-1 block"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Email
              </label>
              <input
                type="email"
                className="w-full text-13 px-3 py-2 rounded border outline-none"
                style={{
                  borderColor: "var(--color-border-medium)",
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="you@company.com"
              />
            </div>

            <button
              className="w-full text-13 font-medium py-2.5 rounded text-white"
              style={{ background: "var(--color-accent)" }}
            >
              Send reset link
            </button>
          </div>

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
