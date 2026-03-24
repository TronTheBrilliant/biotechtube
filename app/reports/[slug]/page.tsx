import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock, ArrowRight, Building2, Pill, TrendingUp, DollarSign } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

export const revalidate = 3600;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const THERAPEUTIC_AREAS: Record<string, { name: string; emoji: string; keywords: string[] }> = {
  oncology: { name: "Oncology", emoji: "🎯", keywords: ["cancer", "tumor", "oncol", "carcinoma", "lymphoma", "leukemia", "melanoma", "sarcoma"] },
  neurology: { name: "Neurology", emoji: "🧠", keywords: ["neuro", "alzheimer", "parkinson", "brain", "cns", "epilep", "multiple sclerosis", "migraine"] },
  immunotherapy: { name: "Immunotherapy", emoji: "🛡️", keywords: ["immun", "autoimmun", "checkpoint", "car-t", "bispecific", "antibody"] },
  "gene-therapy": { name: "Gene Therapy", emoji: "🧬", keywords: ["gene therap", "gene edit", "crispr", "aav", "viral vector", "genome"] },
  "rare-diseases": { name: "Rare Diseases", emoji: "💎", keywords: ["rare", "orphan", "ultra-rare", "genetic disorder"] },
  cardiovascular: { name: "Cardiovascular", emoji: "❤️", keywords: ["cardio", "heart", "vascular", "hypertension", "atheroscl", "thromb"] },
  "infectious-disease": { name: "Infectious Disease", emoji: "🦠", keywords: ["infect", "antiviral", "antibiot", "antimicrob", "hiv", "hepatitis", "vaccine"] },
  metabolic: { name: "Metabolic & Endocrine", emoji: "⚡", keywords: ["metabol", "diabet", "obesity", "endocr", "thyroid", "insulin", "glp-1"] },
  respiratory: { name: "Respiratory", emoji: "🫁", keywords: ["pulmon", "respirat", "asthma", "copd", "lung", "cystic fibrosis"] },
  ophthalmology: { name: "Ophthalmology", emoji: "👁️", keywords: ["ophthalm", "retina", "macula", "eye", "glaucoma", "vision"] },
  dermatology: { name: "Dermatology", emoji: "🧴", keywords: ["dermat", "skin", "psoriasis", "eczema", "atopic", "alopecia"] },
  hematology: { name: "Hematology", emoji: "🩸", keywords: ["hematol", "blood", "anemia", "hemophilia", "sickle cell", "thalassemia"] },
};

interface ReportData {
  name: string;
  emoji: string;
  products: { product_name: string; company_name: string; stage: string | null; indication: string | null; hype_score?: number }[];
  companyLeaders: { name: string; count: number; slug: string | null }[];
  phaseDistribution: Record<string, number>;
  recentFunding: { company_name: string; amount: number | null; round_type: string | null; date: string | null }[];
  totalProducts: number;
  totalCompanies: number;
}

async function getReportData(slug: string): Promise<ReportData | null> {
  const ta = THERAPEUTIC_AREAS[slug];
  if (!ta) return null;

  const supabase = getSupabase();

  // Fetch pipeline products matching this therapeutic area
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, product_name, indication, company_id, company_name, stage")
    .limit(5000);

  if (!pipelines) return null;

  const matching = pipelines.filter((p) => {
    const text = `${p.product_name || ""} ${p.indication || ""}`.toLowerCase();
    return ta.keywords.some((kw) => text.includes(kw));
  });

  // Compute company leaders
  const companyCounts = new Map<string, { count: number; id: string }>();
  for (const p of matching) {
    if (p.company_name && p.company_id) {
      const existing = companyCounts.get(p.company_name) || { count: 0, id: p.company_id };
      companyCounts.set(p.company_name, { count: existing.count + 1, id: p.company_id });
    }
  }

  const topCompanyEntries = Array.from(companyCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  // Get company slugs
  const companyIds = topCompanyEntries.map(([, v]) => v.id);
  const companySlugMap = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: companies } = await supabase.from("companies").select("id, slug").in("id", companyIds);
    if (companies) companies.forEach((c: { id: string; slug: string }) => companySlugMap.set(c.id, c.slug));
  }

  const companyLeaders = topCompanyEntries.map(([name, val]) => ({
    name,
    count: val.count,
    slug: companySlugMap.get(val.id) || null,
  }));

  // Phase distribution
  const phaseDistribution: Record<string, number> = {};
  for (const p of matching) {
    const stage = p.stage || "Unknown";
    phaseDistribution[stage] = (phaseDistribution[stage] || 0) + 1;
  }

  // Get product scores for hype
  const { data: scores } = await supabase
    .from("product_scores")
    .select("pipeline_id, hype_score")
    .in(
      "pipeline_id",
      matching.slice(0, 200).map((p) => p.id)
    );

  const scoreMap = new Map<string, number>();
  if (scores) scores.forEach((s: { pipeline_id: string; hype_score: number }) => scoreMap.set(s.pipeline_id, s.hype_score));

  const products = matching
    .map((p) => ({
      product_name: p.product_name,
      company_name: p.company_name,
      stage: p.stage,
      indication: p.indication,
      hype_score: scoreMap.get(p.id) || 0,
    }))
    .sort((a, b) => (b.hype_score || 0) - (a.hype_score || 0))
    .slice(0, 20);

  // Recent funding for companies in this area
  const topCompanyIds = companyIds.slice(0, 20);
  const { data: funding } = await supabase
    .from("funding_rounds")
    .select("company_name, amount, round_type, date")
    .in("company_id", topCompanyIds.length > 0 ? topCompanyIds : ["none"])
    .order("date", { ascending: false })
    .limit(10);

  return {
    name: ta.name,
    emoji: ta.emoji,
    products,
    companyLeaders,
    phaseDistribution,
    recentFunding: (funding || []).map((f: Record<string, unknown>) => ({
      company_name: f.company_name as string,
      amount: f.amount as number | null,
      round_type: f.round_type as string | null,
      date: f.date as string | null,
    })),
    totalProducts: matching.length,
    totalCompanies: companyCounts.size,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ta = THERAPEUTIC_AREAS[slug];
  if (!ta) return { title: "Report Not Found — BiotechTube" };
  return {
    title: `${ta.name} Intelligence Report — BiotechTube`,
    description: `Competitive landscape analysis for ${ta.name}. Top products, companies, phase distribution, and funding data.`,
  };
}

function PhaseBar({ phase, count, max }: { phase: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const colorMap: Record<string, string> = {
    "Pre-clinical": "#9ca3af",
    "Phase 1": "#3b82f6",
    "Phase 1/2": "#6366f1",
    "Phase 2": "#8b5cf6",
    "Phase 2/3": "#a855f7",
    "Phase 3": "#22c55e",
    Approved: "#059669",
  };
  const color = colorMap[phase] || "#6b7280";

  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-medium w-24 text-right" style={{ color: "var(--color-text-secondary)" }}>
        {phase}
      </span>
      <div className="flex-1 h-6 rounded" style={{ background: "var(--color-bg-tertiary)" }}>
        <div
          className="h-full rounded transition-all duration-500 flex items-center justify-end pr-2"
          style={{ width: `${Math.max(pct, 3)}%`, background: color }}
        >
          {pct > 10 && (
            <span className="text-[10px] font-bold text-white">{count}</span>
          )}
        </div>
      </div>
      {pct <= 10 && (
        <span className="text-[11px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>{count}</span>
      )}
    </div>
  );
}

function getStageBadgeStyle(stage: string | null): React.CSSProperties {
  switch (stage) {
    case "Pre-clinical": return { background: "#f3f4f6", color: "#4b5563" };
    case "Phase 1": return { background: "#eff6ff", color: "#1d4ed8" };
    case "Phase 1/2": return { background: "#eff6ff", color: "#2563eb" };
    case "Phase 2": return { background: "#faf5ff", color: "#7c3aed" };
    case "Phase 2/3": return { background: "#faf5ff", color: "#7c3aed" };
    case "Phase 3": return { background: "#f0fdf4", color: "#15803d" };
    case "Approved": return { background: "#d1fae5", color: "#065f46" };
    default: return { background: "#f3f4f6", color: "#6b7280" };
  }
}

export default async function ReportDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = await getReportData(slug);
  if (!report) notFound();

  const maxPhaseCount = Math.max(...Object.values(report.phaseDistribution), 1);
  const orderedPhases = ["Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 2/3", "Phase 3", "Approved"];

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-[1000px] mx-auto px-4 md:px-6 py-10">
        {/* Back link */}
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-6"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <ArrowLeft size={14} /> All Reports
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[32px]">{report.emoji}</span>
            <h1
              className="text-[32px] md:text-[40px] font-bold tracking-tight"
              style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
            >
              {report.name}
            </h1>
          </div>
          <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
            Competitive landscape report &middot; {report.totalProducts.toLocaleString()} products &middot; {report.totalCompanies.toLocaleString()} companies
          </p>
        </div>

        {/* Executive Summary */}
        <section className="mb-10">
          <h2 className="text-[20px] font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Executive Summary
          </h2>
          <div
            className="rounded-xl p-5"
            style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
          >
            <p className="text-[14px] mb-3" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              The {report.name.toLowerCase()} landscape features {report.totalProducts.toLocaleString()} products
              in active development across {report.totalCompanies.toLocaleString()} companies. The space remains
              highly competitive with significant activity across all clinical stages.
            </p>
            <p className="text-[14px] mb-3" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              {report.phaseDistribution["Phase 3"] ? `${report.phaseDistribution["Phase 3"]} products are currently in Phase 3 trials, ` : ""}
              {report.phaseDistribution["Phase 2"] ? `${report.phaseDistribution["Phase 2"]} in Phase 2, ` : ""}
              {report.phaseDistribution["Phase 1"] ? `and ${report.phaseDistribution["Phase 1"]} in Phase 1. ` : ""}
              Leading companies by pipeline count include {report.companyLeaders.slice(0, 3).map(c => c.name).join(", ")}.
            </p>
            <p className="text-[14px]" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              {report.phaseDistribution["Approved"] ? `${report.phaseDistribution["Approved"]} products have received regulatory approval. ` : ""}
              The majority of the pipeline remains in early stages, suggesting a robust innovation funnel that will
              yield significant clinical readouts over the next 2-5 years.
            </p>
          </div>
        </section>

        {/* Top Products */}
        <section className="mb-10">
          <h2 className="text-[20px] font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Top Products by Hype Score
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--color-border-subtle)" }}
          >
            <div
              className="hidden md:grid items-center px-4 py-2.5"
              style={{ gridTemplateColumns: "40px 1fr 180px 100px 80px", background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border-subtle)" }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>#</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Product</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Company</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Stage</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Score</span>
            </div>
            {report.products.slice(0, 10).map((p, i) => (
              <div
                key={`${p.product_name}-${i}`}
                className="grid items-center px-4 py-3"
                style={{ gridTemplateColumns: "40px 1fr 180px 100px 80px", borderBottom: i < 9 ? "0.5px solid var(--color-border-subtle)" : undefined }}
              >
                <span className="text-[12px] font-bold" style={{ color: "var(--color-text-tertiary)" }}>{i + 1}</span>
                <div className="min-w-0">
                  <span className="text-[13px] font-semibold truncate block" style={{ color: "var(--color-text-primary)" }}>
                    {p.product_name}
                  </span>
                  {p.indication && (
                    <span className="text-[11px] truncate block" style={{ color: "var(--color-text-tertiary)" }}>
                      {p.indication}
                    </span>
                  )}
                </div>
                <span className="text-[12px] truncate" style={{ color: "var(--color-text-secondary)" }}>{p.company_name}</span>
                <div>
                  {p.stage && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={getStageBadgeStyle(p.stage)}>
                      {p.stage}
                    </span>
                  )}
                </div>
                <span className="text-[13px] font-bold" style={{ color: (p.hype_score || 0) >= 60 ? "#16a34a" : "var(--color-text-tertiary)" }}>
                  {p.hype_score || "--"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Company Leaders */}
        <section className="mb-10">
          <h2 className="text-[20px] font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Top Companies by Pipeline Count
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.companyLeaders.slice(0, 10).map((c, i) => (
              <Link
                key={c.name}
                href={c.slug ? `/company/${c.slug}` : "#"}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors"
                style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
              >
                <span className="text-[14px] font-bold w-6 text-center" style={{ color: "var(--color-text-tertiary)" }}>
                  {i + 1}
                </span>
                <Building2 size={16} style={{ color: "var(--color-text-tertiary)" }} />
                <span className="text-[13px] font-medium flex-1" style={{ color: "var(--color-text-primary)" }}>
                  {c.name}
                </span>
                <span className="text-[12px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }}>
                  {c.count} products
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Phase Distribution */}
        <section className="mb-10">
          <h2 className="text-[20px] font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Phase Distribution
          </h2>
          <div
            className="rounded-xl p-5"
            style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
          >
            <div className="flex flex-col gap-2.5">
              {orderedPhases
                .filter((p) => report.phaseDistribution[p])
                .map((phase) => (
                  <PhaseBar key={phase} phase={phase} count={report.phaseDistribution[phase]} max={maxPhaseCount} />
                ))}
            </div>
          </div>
        </section>

        {/* Recent Funding */}
        {report.recentFunding.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
              Recent Funding
            </h2>
            <div className="flex flex-col gap-2">
              {report.recentFunding.slice(0, 8).map((f, i) => (
                <div
                  key={`${f.company_name}-${i}`}
                  className="flex items-center gap-3 rounded-lg p-3"
                  style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
                >
                  <DollarSign size={16} style={{ color: "#16a34a" }} />
                  <span className="text-[13px] font-medium flex-1" style={{ color: "var(--color-text-primary)" }}>
                    {f.company_name}
                  </span>
                  {f.round_type && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }}>
                      {f.round_type}
                    </span>
                  )}
                  {f.amount && (
                    <span className="text-[13px] font-bold" style={{ color: "#16a34a" }}>
                      ${(f.amount / 1_000_000).toFixed(1)}M
                    </span>
                  )}
                  {f.date && (
                    <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                      {new Date(f.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Key Trends (Pro locked) */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[20px] font-bold" style={{ color: "var(--color-text-primary)" }}>
              Key Trends & Analysis
            </h2>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
            >
              <Lock size={10} /> Pro
            </span>
          </div>
          <div
            className="rounded-xl p-6 text-center relative overflow-hidden"
            style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
          >
            <div style={{ filter: "blur(4px)", pointerEvents: "none" }}>
              <p className="text-[14px] mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Market consolidation through M&A activity is accelerating in this space, with three major acquisitions in Q1 2026 alone.
              </p>
              <p className="text-[14px] mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Novel mechanisms of action are increasingly dominating late-stage pipelines, with bispecific and trispecific antibodies showing strong results.
              </p>
              <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                Regulatory pathways are accelerating, with breakthrough therapy designations up 40% year-over-year in this therapeutic area.
              </p>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Lock size={24} style={{ color: "#6366f1" }} className="mb-2" />
              <p className="text-[14px] font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
                Upgrade to Pro for full analysis
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white"
                style={{ background: "#6366f1" }}
              >
                View plans <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* Back to reports */}
        <div className="text-center">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <ArrowLeft size={14} /> Back to all reports
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
