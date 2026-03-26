"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { useAuth } from "@/lib/auth";
import { createBrowserClient } from "@/lib/supabase";
import {
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  Mail,
  Crown,
  Zap,
  Building2,
  Loader2,
} from "lucide-react";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "$299",
    period: "/month",
    features: [
      "Verified badge on profile",
      "Edit company description & tagline",
      "Add team members (up to 5)",
      "Basic profile analytics",
      "Post company news updates",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "$499",
    period: "/month",
    popular: true,
    features: [
      "Everything in Starter",
      "Unlimited team members",
      "Featured pipeline showcase",
      "Advanced analytics dashboard",
      "Priority search placement",
      "Investor engagement tracking",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$799",
    period: "/month",
    features: [
      "Everything in Professional",
      "Custom branding & banner",
      "API access to analytics",
      "Dedicated account manager",
      "Competitor benchmarking",
      "Multi-user team access",
    ],
  },
];

export default function ClaimFlowPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    website: string | null;
    description: string | null;
  } | null>(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  // Fetch company data
  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name, slug, logo_url, website, description")
        .eq("slug", params.slug)
        .single();
      if (data) setCompany(data);

      // Check if already claimed
      if (data) {
        const { data: claim } = await supabase
          .from("company_claims")
          .select("id, status, user_id")
          .eq("company_id", data.id)
          .single();
        if (claim) setAlreadyClaimed(true);
      }
    })();
  }, [params.slug]);

  const handleSubmitClaim = async () => {
    if (!user || !company) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          plan: selectedPlan,
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      // If Stripe is configured, redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Mock flow: auto-complete and go to confirmation
      setStep(3);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!company) {
    return (
      <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Nav />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Nav />
      <main className="flex-1 flex flex-col items-center px-5 py-10">
        <div className="w-full" style={{ maxWidth: 640 }}>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-13 font-semibold transition-all"
                  style={{
                    background: step >= s ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                    color: step >= s ? "#fff" : "var(--color-text-tertiary)",
                  }}
                >
                  {step > s ? <Check size={14} /> : s}
                </div>
                {s < 3 && (
                  <div
                    className="w-12 h-0.5 rounded-full"
                    style={{ background: step > s ? "var(--color-accent)" : "var(--color-border-medium)" }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Company header */}
          <div className="flex items-center gap-3 mb-8">
            <CompanyAvatar name={company.name} logoUrl={company.logo_url} website={company.website} size={48} />
            <div>
              <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {company.name}
              </h2>
              <p className="text-12" style={{ color: "var(--color-text-secondary)" }}>
                {company.description?.slice(0, 80)}{company.description && company.description.length > 80 ? "..." : ""}
              </p>
            </div>
          </div>

          {alreadyClaimed && step < 3 ? (
            <div className="rounded-xl border p-6 text-center" style={{ borderColor: "var(--color-border-medium)" }}>
              <ShieldCheck size={32} className="mx-auto mb-3" style={{ color: "var(--color-accent)" }} />
              <h2 className="text-[18px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                Already Claimed
              </h2>
              <p className="text-13 mb-4" style={{ color: "var(--color-text-secondary)" }}>
                This company profile has already been claimed.
              </p>
              <Link
                href={`/company/${params.slug}`}
                className="inline-flex items-center gap-1.5 text-13 font-medium px-5 py-2.5 rounded-lg text-white"
                style={{ background: "var(--color-accent)" }}
              >
                View Profile
              </Link>
            </div>
          ) : (
            <>
              {/* Step 1: Verify Ownership */}
              {step === 1 && (
                <div className="rounded-xl border p-6" style={{ borderColor: "var(--color-border-medium)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Mail size={18} style={{ color: "var(--color-accent)" }} />
                    <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      Verify Ownership
                    </h2>
                  </div>
                  <p className="text-13 mb-6" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
                    Enter your work email to verify you represent {company.name}. We accept emails from the company domain.
                  </p>

                  {!user && !authLoading && (
                    <div className="rounded-lg border p-4 mb-5" style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-secondary)" }}>
                      <p className="text-13 mb-3" style={{ color: "var(--color-text-secondary)" }}>
                        You need to sign in first to claim a company profile.
                      </p>
                      <Link
                        href={`/login?redirect=/claim/${params.slug}`}
                        className="inline-flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded-lg text-white"
                        style={{ background: "var(--color-accent)" }}
                      >
                        Sign in to continue
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  )}

                  {user && (
                    <>
                      <div className="mb-5">
                        <label className="text-12 font-medium mb-1.5 block" style={{ color: "var(--color-text-primary)" }}>
                          Work email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={`you@${company.website?.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || "company.com"}`}
                          className="w-full text-13 px-3 py-2.5 rounded-lg border outline-none transition-all focus:ring-2"
                          style={{
                            borderColor: "var(--color-border-medium)",
                            background: "var(--color-bg-primary)",
                            color: "var(--color-text-primary)",
                          }}
                        />
                        <p className="text-11 mt-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                          We will verify your domain matches the company.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (!email.includes("@")) {
                            setError("Please enter a valid email address.");
                            return;
                          }
                          setError(null);
                          setStep(2);
                        }}
                        className="w-full flex items-center justify-center gap-2 text-14 font-medium py-2.5 rounded-lg text-white transition-opacity hover:opacity-90"
                        style={{ background: "var(--color-accent)" }}
                      >
                        Continue
                        <ArrowRight size={15} />
                      </button>
                    </>
                  )}

                  {error && (
                    <p className="text-12 mt-3" style={{ color: "#dc2626" }}>{error}</p>
                  )}
                </div>
              )}

              {/* Step 2: Choose Plan */}
              {step === 2 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={18} style={{ color: "var(--color-accent)" }} />
                    <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      Choose Your Plan
                    </h2>
                  </div>
                  <p className="text-13 mb-6" style={{ color: "var(--color-text-secondary)" }}>
                    Select the plan that fits your needs. You can upgrade or downgrade anytime.
                  </p>

                  <div className="grid gap-4">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className="w-full text-left rounded-xl border p-5 transition-all relative"
                        style={{
                          borderColor: selectedPlan === plan.id ? "var(--color-accent)" : "var(--color-border-medium)",
                          borderWidth: selectedPlan === plan.id ? 2 : 1,
                          background: selectedPlan === plan.id ? "rgba(26,122,94,0.03)" : "var(--color-bg-primary)",
                        }}
                      >
                        {plan.popular && (
                          <span
                            className="absolute -top-2.5 right-4 text-10 font-semibold px-2.5 py-0.5 rounded-full text-white"
                            style={{ background: "var(--color-accent)" }}
                          >
                            Most Popular
                          </span>
                        )}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-15 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                              {plan.name}
                            </h3>
                            <div className="flex items-baseline gap-0.5 mt-0.5">
                              <span className="text-[22px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                                {plan.price}
                              </span>
                              <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                                {plan.period}
                              </span>
                            </div>
                          </div>
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                            style={{
                              borderColor: selectedPlan === plan.id ? "var(--color-accent)" : "var(--color-border-medium)",
                            }}
                          >
                            {selectedPlan === plan.id && (
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-accent)" }} />
                            )}
                          </div>
                        </div>
                        <ul className="flex flex-col gap-1.5">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-12" style={{ color: "var(--color-text-secondary)" }}>
                              <Check size={12} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mt-6">
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1.5 text-13 font-medium px-4 py-2.5 rounded-lg border transition-opacity hover:opacity-80"
                      style={{ borderColor: "var(--color-border-medium)", color: "var(--color-text-secondary)" }}
                    >
                      <ArrowLeft size={14} />
                      Back
                    </button>
                    <button
                      onClick={handleSubmitClaim}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 text-14 font-medium py-2.5 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: "var(--color-accent)" }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          Claim {company.name}
                          <Zap size={15} />
                        </>
                      )}
                    </button>
                  </div>

                  {error && (
                    <p className="text-12 mt-3" style={{ color: "#dc2626" }}>{error}</p>
                  )}
                </div>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--color-accent)", background: "rgba(26,122,94,0.03)" }}>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background: "var(--color-accent)" }}
                  >
                    <ShieldCheck size={28} color="#fff" />
                  </div>
                  <h2 className="text-[22px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                    Profile Claimed!
                  </h2>
                  <p className="text-14 mb-6 max-w-sm mx-auto" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
                    You now have full control of the {company.name} profile.
                    Access your admin dashboard to edit your profile, add team members, and track analytics.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href={`/company/${company.slug}/admin`}
                      className="inline-flex items-center gap-2 text-14 font-medium px-6 py-3 rounded-lg text-white"
                      style={{ background: "var(--color-accent)" }}
                    >
                      <Building2 size={16} />
                      Go to Admin Dashboard
                    </Link>
                    <Link
                      href={`/company/${company.slug}`}
                      className="inline-flex items-center gap-1.5 text-13 font-medium px-5 py-2.5 rounded-lg border"
                      style={{ borderColor: "var(--color-border-medium)", color: "var(--color-text-secondary)" }}
                    >
                      View Public Profile
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Back link */}
          {step < 3 && (
            <p className="text-center mt-6 text-13" style={{ color: "var(--color-text-tertiary)" }}>
              <Link href={`/company/${params.slug}`} style={{ color: "var(--color-accent)", textDecoration: "none" }}>
                Back to company profile
              </Link>
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
