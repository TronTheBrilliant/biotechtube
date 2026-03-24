import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Code, Key, Zap, Shield } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ApiDocsClient } from "./ApiDocsClient";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "API Documentation — BiotechTube",
  description:
    "Programmatic access to biotech market data. Companies, pipelines, products, funding, and market snapshots via REST API.",
};

const tiers = [
  {
    name: "Free",
    price: "Free",
    period: "",
    description: "Get started with basic data access",
    requests: "100 requests/day",
    features: [
      "Company search & basic profiles",
      "Basic pipeline data",
      "100 requests per day",
      "JSON responses",
      "Community support",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/mo",
    description: "Full data access for teams & tools",
    requests: "10,000 requests/day",
    features: [
      "Everything in Free",
      "Full pipeline data with scores",
      "Product hype scores & trends",
      "Funding round data",
      "Market snapshot data",
      "10,000 requests per day",
      "Email support",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$499",
    period: "/mo",
    description: "Unlimited access with premium features",
    requests: "Unlimited",
    features: [
      "Everything in Pro",
      "Unlimited requests",
      "Bulk data export (CSV/JSON)",
      "Webhook notifications",
      "Custom data feeds",
      "Dedicated support",
      "SLA guarantee",
    ],
    highlighted: false,
  },
];

export default function ApiDocsPage() {
  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-[1000px] mx-auto px-4 md:px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium mb-4"
            style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
          >
            <Code size={14} />
            Developer API
          </div>
          <h1
            className="text-[36px] md:text-[48px] font-bold tracking-tight mb-3"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-1px" }}
          >
            BiotechTube API
          </h1>
          <p
            className="text-[16px] max-w-2xl mx-auto mb-6"
            style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}
          >
            Programmatic access to biotech market data. Build dashboards, power analytics,
            and integrate biotech intelligence into your workflow.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium text-white"
              style={{ background: "#6366f1" }}
            >
              <Key size={14} /> Get API Key
            </Link>
            <a
              href="#endpoints"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium"
              style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-subtle)" }}
            >
              View endpoints
            </a>
          </div>
        </div>

        {/* Features strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {[
            { icon: Zap, label: "Fast", desc: "< 100ms avg response" },
            { icon: Shield, label: "Reliable", desc: "99.9% uptime SLA" },
            { icon: Code, label: "RESTful", desc: "JSON responses" },
            { icon: Key, label: "Secure", desc: "API key auth" },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="text-center p-4 rounded-lg" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}>
                <Icon size={20} className="mx-auto mb-2" style={{ color: "#6366f1" }} />
                <div className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>{f.label}</div>
                <div className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{f.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Base URL */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
            Base URL
          </h2>
          <div
            className="rounded-lg px-4 py-3 font-mono text-[14px]"
            style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }}
          >
            https://api.biotechtube.com/v1
          </div>
        </div>

        {/* Authentication */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
            Authentication
          </h2>
          <div
            className="rounded-lg p-4"
            style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
          >
            <p className="text-[13px] mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Include your API key in the request header:
            </p>
            <div
              className="rounded px-3 py-2 font-mono text-[12px]"
              style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-primary)" }}
            >
              Authorization: Bearer YOUR_API_KEY
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div id="endpoints" className="mb-14">
          <ApiDocsClient />
        </div>

        {/* Pricing */}
        <div className="mb-14">
          <h2
            className="text-[24px] font-bold tracking-tight text-center mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            API Pricing
          </h2>
          <p className="text-[14px] text-center mb-8" style={{ color: "var(--color-text-secondary)" }}>
            Scale your usage as you grow
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-xl p-6 flex flex-col"
                style={{
                  background: "var(--color-bg-primary)",
                  border: tier.highlighted ? "2px solid #6366f1" : "1px solid var(--color-border-subtle)",
                  position: "relative",
                }}
              >
                {tier.highlighted && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-medium text-white px-3 py-0.5 rounded-full"
                    style={{ background: "#6366f1" }}
                  >
                    Most popular
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-[14px] font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>{tier.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[32px] font-semibold tracking-tight" style={{ color: "var(--color-text-primary)", letterSpacing: "-1px" }}>
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-[14px]" style={{ color: "var(--color-text-tertiary)" }}>{tier.period}</span>
                    )}
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                    {tier.requests}
                  </p>
                </div>
                <ul className="flex-1 flex flex-col gap-2 mb-5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                      <Check size={14} className="shrink-0 mt-0.5" style={{ color: "#6366f1" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[13px] font-medium transition-opacity"
                  style={{
                    background: tier.highlighted ? "#6366f1" : "var(--color-bg-secondary)",
                    color: tier.highlighted ? "#fff" : "var(--color-text-primary)",
                    border: tier.highlighted ? "none" : "1px solid var(--color-border-subtle)",
                  }}
                >
                  Get API Key <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Rate limiting */}
        <div
          className="rounded-xl p-5 mb-8"
          style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
        >
          <h3 className="text-[14px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            Rate Limiting
          </h3>
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Rate limits are enforced per API key. When you exceed your limit, the API returns
            a <code className="px-1 py-0.5 rounded text-[12px]" style={{ background: "var(--color-bg-tertiary)" }}>429 Too Many Requests</code> status.
            The response includes <code className="px-1 py-0.5 rounded text-[12px]" style={{ background: "var(--color-bg-tertiary)" }}>X-RateLimit-Remaining</code> and
            <code className="px-1 py-0.5 rounded text-[12px]" style={{ background: "var(--color-bg-tertiary)" }}> X-RateLimit-Reset</code> headers.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
