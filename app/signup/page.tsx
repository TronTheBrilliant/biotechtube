import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Sign up — BiotechTube",
  description:
    "Create your free BiotechTube account to access global biotech company rankings, funding data, and AI-powered investor tools.",
};

const features = [
  "Full global company rankings",
  "All 14,000+ company profiles",
  "Watchlist and funding alerts",
  "Funding round database",
  "AI investor assistant (coming soon)",
  "Weekly biotech radar email (coming soon)",
];

export default function SignupPage() {
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

          {/* Form */}
          <div>
            <div className="mb-4">
              <label
                className="text-11 font-medium mb-1 block"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Work email
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

            <div className="mb-4">
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
                placeholder="Create a password"
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
                className="w-full text-13 px-3 py-2 rounded border outline-none"
                style={{
                  borderColor: "var(--color-border-medium)",
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="Confirm your password"
              />
            </div>

            <button
              className="w-full text-13 font-medium py-2.5 rounded text-white"
              style={{ background: "var(--color-accent)" }}
            >
              Create account &rarr;
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
