import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Log in — BiotechTube",
  description:
    "Log in to your BiotechTube account to access biotech company rankings, funding data, and investor tools.",
};

export default function LoginPage() {
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
            className="text-xl font-medium text-center mb-6"
            style={{ color: "var(--color-text-primary)" }}
          >
            Welcome back
          </h1>

          {/* Form */}
          <div>
            <div className="mb-4">
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

            <div className="mb-2">
              <label
                className="text-11 font-medium mb-1 block"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Password
              </label>
              <input
                type="password"
                className="w-full text-13 px-3 py-2 rounded border outline-none"
                style={{
                  borderColor: "var(--color-border-medium)",
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="Enter your password"
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
              className="w-full text-13 font-medium py-2.5 rounded text-white"
              style={{ background: "var(--color-accent)" }}
            >
              Log in &rarr;
            </button>
          </div>

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

          {/* Signup link */}
          <p
            className="text-13 text-center"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
