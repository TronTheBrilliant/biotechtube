import { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  ShieldCheck,
  FlaskConical,
  TrendingUp,
  BarChart3,
  Users,
  Briefcase,
  ChevronDown,
} from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Claim Your Company — BiotechTube",
  description:
    "Manage your company profile on BiotechTube. Get a verified badge, showcase your pipeline, reach investors, and attract top biotech talent.",
  alternates: {
    canonical: "https://biotechtube.io/claim",
  },
};

/* ---------- data ---------- */

const features = [
  {
    icon: ShieldCheck,
    title: "Verified Profile",
    description:
      "Get a verified badge and full control over your company\u2019s public profile, description, and branding.",
  },
  {
    icon: FlaskConical,
    title: "Pipeline Showcase",
    description:
      "Highlight your drug pipeline, clinical trials, and technology platform to attract investors and partners.",
  },
  {
    icon: TrendingUp,
    title: "Investor Visibility",
    description:
      "Appear in premium placements across BiotechTube\u2019s rankings, search results, and sector pages.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Track profile views, search appearances, and investor engagement with detailed analytics.",
  },
  {
    icon: Users,
    title: "Team Profiles",
    description:
      "Add key team members with bios and credentials to build credibility.",
  },
  {
    icon: Briefcase,
    title: "Job Postings",
    description:
      "Post open positions directly on your company profile to attract top biotech talent.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$299",
    period: "/mo",
    description: "Essential tools for emerging biotechs",
    features: [
      "Verified badge",
      "Profile management",
      "Basic analytics",
      "Company description & branding",
      "Search result listing",
    ],
    cta: "Get Started",
    ctaHref: "/signup",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$799",
    period: "/mo",
    description: "For companies ready to scale visibility",
    features: [
      "Everything in Starter",
      "Premium placements",
      "Pipeline showcase",
      "Team profiles",
      "Advanced analytics",
      "Job postings (up to 5)",
      "Priority support",
    ],
    cta: "Get Started",
    ctaHref: "/signup",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large-cap biotechs and pharma",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "API access",
      "Custom integrations",
      "Unlimited job postings",
      "White-glove onboarding",
      "Custom reporting",
    ],
    cta: "Contact Sales",
    ctaHref: "mailto:hello@biotechtube.io",
    highlighted: false,
  },
];

const faqs = [
  {
    q: "How do I verify my company?",
    a: "After signing up, you\u2019ll receive a verification email sent to your company\u2019s domain. Once confirmed, your profile receives a verified badge within 24 hours. For companies without a corporate email domain, we offer alternative verification through LinkedIn or legal documentation.",
  },
  {
    q: "Can I update my profile anytime?",
    a: "Yes. Once claimed, you have full control over your company profile. Update your description, pipeline data, team members, and branding assets at any time through your dashboard.",
  },
  {
    q: "What analytics are included?",
    a: "The Starter plan includes profile views and search appearances. The Professional plan adds investor engagement metrics, geographic breakdowns, referral sources, and weekly email reports with trend data.",
  },
  {
    q: "How does the pricing work?",
    a: "All plans are billed monthly with no long-term commitment. Enterprise plans are custom-quoted based on your organization\u2019s needs. Annual billing is available at a 20% discount.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. There are no cancellation fees or lock-in periods. You can downgrade or cancel your plan at any time from your account settings. Your profile will revert to the free listing.",
  },
];

const trustLogos = [
  { name: "Eli Lilly", url: "https://img.logo.dev/lilly.com?token=pk_CB2KUWBaRDOyJNMh9kgT1A&size=80&format=png" },
  { name: "Moderna", url: "https://img.logo.dev/modernatx.com?token=pk_CB2KUWBaRDOyJNMh9kgT1A&size=80&format=png" },
  { name: "Pfizer", url: "https://img.logo.dev/pfizer.com?token=pk_CB2KUWBaRDOyJNMh9kgT1A&size=80&format=png" },
  { name: "Novartis", url: "https://img.logo.dev/novartis.com?token=pk_CB2KUWBaRDOyJNMh9kgT1A&size=80&format=png" },
];

/* ---------- FAQ client component (inline) ---------- */

function FAQSection() {
  // Using <details> / <summary> for collapsible FAQ without client JS
  return (
    <div className="flex flex-col gap-3">
      {faqs.map((faq, i) => (
        <details
          key={i}
          className="group rounded-xl"
          style={{
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <summary
            className="flex items-center justify-between cursor-pointer px-5 py-4 text-[14px] font-medium list-none [&::-webkit-details-marker]:hidden"
            style={{ color: "var(--color-text-primary)" }}
          >
            {faq.q}
            <ChevronDown
              size={16}
              className="shrink-0 ml-3 transition-transform duration-200 group-open:rotate-180"
              style={{ color: "var(--color-text-tertiary)" }}
            />
          </summary>
          <div
            className="px-5 pb-4 text-[13px]"
            style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}
          >
            {faq.a}
          </div>
        </details>
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export default function ClaimPage() {
  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />

      <main>
        {/* ── Hero ── */}
        <section
          className="relative overflow-hidden"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          {/* Subtle gradient accent at top */}
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, var(--color-accent), var(--color-accent-light))" }}
          />
          <div className="max-w-3xl mx-auto px-4 py-20 text-center">
            <span
              className="inline-block text-[11px] font-medium uppercase tracking-wider mb-4 px-3 py-1 rounded-full"
              style={{
                color: "var(--color-accent)",
                background: "var(--color-accent-subtle)",
              }}
            >
              For Companies
            </span>
            <h1
              className="text-[40px] sm:text-[48px] font-semibold tracking-tight leading-[1.1] mb-4"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.8px",
              }}
            >
              Claim Your Company on BiotechTube
            </h1>
            <p
              className="text-[16px] sm:text-[17px] max-w-2xl mx-auto mb-8"
              style={{
                color: "var(--color-text-secondary)",
                lineHeight: 1.65,
              }}
            >
              Manage your profile, showcase your pipeline, and reach investors
              &amp; professionals across the biotech ecosystem.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-[14px] font-medium text-white transition-opacity duration-150 hover:opacity-90"
              style={{ background: "var(--color-accent)" }}
            >
              Get Started
              <ArrowRight size={16} />
            </Link>
            <p className="text-[13px] mt-3" style={{ color: "var(--color-text-tertiary)" }}>
              Plans from $299/mo. Free basic listing included for all companies.
            </p>
          </div>
        </section>

        {/* ── How it works ── */}
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h2 className="text-[18px] font-semibold mb-8" style={{ color: "var(--color-text-primary)" }}>
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Sign up", desc: "Create your account with a company email" },
              { step: "2", title: "Verify ownership", desc: "Confirm you represent the company" },
              { step: "3", title: "Manage your profile", desc: "Update info, add pipeline data, track analytics" },
            ].map((s) => (
              <div key={s.step}>
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-3 flex items-center justify-center text-[13px] font-semibold"
                  style={{
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-text-secondary)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  {s.step}
                </div>
                <div className="text-[14px] font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                  {s.title}
                </div>
                <div className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── What You Get ── */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2
              className="text-[28px] sm:text-[32px] font-medium tracking-tight"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.4px",
              }}
            >
              Everything you need to stand out
            </h2>
            <p
              className="text-[15px] mt-2 max-w-xl mx-auto"
              style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
            >
              Powerful tools to manage your presence and connect with the biotech
              investment community.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl p-6"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: "var(--color-accent-subtle)" }}
                >
                  <f.icon size={20} style={{ color: "var(--color-accent)" }} />
                </div>
                <h3
                  className="text-[15px] font-medium mb-1.5"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-[13px]"
                  style={{
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section
          className="py-16"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2
                className="text-[28px] sm:text-[32px] font-medium tracking-tight"
                style={{
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.4px",
                }}
              >
                Simple, transparent pricing
              </h2>
              <p
                className="text-[15px] mt-2 max-w-xl mx-auto"
                style={{
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Choose the plan that fits your company. No hidden fees. Cancel
                anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className="rounded-xl p-6 flex flex-col"
                  style={{
                    background: "var(--color-bg-primary)",
                    border: plan.highlighted
                      ? "2px solid var(--color-accent)"
                      : "1px solid var(--color-border-subtle)",
                    position: "relative",
                  }}
                >
                  {plan.highlighted && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-medium text-white px-3 py-0.5 rounded-full"
                      style={{ background: "var(--color-accent)" }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div className="mb-5">
                    <h3
                      className="text-[14px] font-medium mb-1"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span
                        className="text-[36px] font-semibold tracking-tight"
                        style={{
                          color: "var(--color-text-primary)",
                          letterSpacing: "-1px",
                        }}
                      >
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span
                          className="text-[14px]"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          {plan.period}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[13px] mt-1"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {plan.description}
                    </p>
                  </div>

                  <ul className="flex-1 flex flex-col gap-2.5 mb-6">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-[13px]"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        <Check
                          size={15}
                          className="shrink-0 mt-0.5"
                          style={{ color: "var(--color-accent)" }}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.ctaHref}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[13px] font-medium transition-opacity duration-150 hover:opacity-90"
                    style={{
                      background: plan.highlighted
                        ? "var(--color-accent)"
                        : "var(--color-bg-secondary)",
                      color: plan.highlighted
                        ? "#fff"
                        : "var(--color-text-primary)",
                      border: plan.highlighted
                        ? "none"
                        : "1px solid var(--color-border-subtle)",
                    }}
                  >
                    {plan.cta}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust ── */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center">
            <p
              className="text-[13px] font-medium uppercase tracking-wider mb-8"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Trusted by 10,600+ biotech companies worldwide
            </p>
            <div className="flex items-center justify-center gap-10 sm:gap-14 flex-wrap">
              {trustLogos.map((logo) => (
                <img
                  key={logo.name}
                  src={logo.url}
                  alt={logo.name}
                  className="h-8 sm:h-10 object-contain opacity-60 hover:opacity-100 transition-opacity duration-200"
                  style={{ filter: "grayscale(100%)" }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section
          className="py-16"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <div className="max-w-2xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2
                className="text-[28px] sm:text-[32px] font-medium tracking-tight"
                style={{
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.4px",
                }}
              >
                Frequently asked questions
              </h2>
            </div>
            <FAQSection />
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h2
            className="text-[28px] sm:text-[32px] font-medium tracking-tight mb-3"
            style={{
              color: "var(--color-text-primary)",
              letterSpacing: "-0.4px",
            }}
          >
            Ready to grow your company&apos;s visibility?
          </h2>
          <p
            className="text-[15px] max-w-xl mx-auto mb-8"
            style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
          >
            Join thousands of biotech companies already using BiotechTube to
            connect with investors, partners, and talent.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-[14px] font-medium text-white transition-opacity duration-150 hover:opacity-90"
              style={{ background: "var(--color-accent)" }}
            >
              Get Started
              <ArrowRight size={16} />
            </Link>
            <Link
              href="mailto:hello@biotechtube.io"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-[14px] font-medium transition-opacity duration-150 hover:opacity-90"
              style={{
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-medium)",
              }}
            >
              Contact Sales
            </Link>
          </div>

          {/* Sponsor link */}
          <p
            className="text-[13px] mt-6"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Want to promote a specific product?{" "}
            <Link
              href="/sponsor-product"
              className="font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              Sponsor a product listing
            </Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
