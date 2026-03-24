import { Metadata } from "next";
import Link from "next/link";
import { FileText, Lock, ArrowRight, Building2, Pill, TrendingUp } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "Biotech Intelligence Reports — BiotechTube",
  description:
    "AI-generated competitive landscape reports for major therapeutic areas. Explore oncology, neurology, immunotherapy, gene therapy, and more.",
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface TherapeuticAreaReport {
  slug: string;
  name: string;
  emoji: string;
  productCount: number;
  companyCount: number;
  topCompanies: string[];
  description: string;
}

const THERAPEUTIC_AREAS: { slug: string; name: string; emoji: string; keywords: string[]; description: string }[] = [
  { slug: "oncology", name: "Oncology", emoji: "🎯", keywords: ["cancer", "tumor", "oncol", "carcinoma", "lymphoma", "leukemia", "melanoma", "sarcoma"], description: "Cancer treatment and immunotherapy research spanning solid tumors, hematologic malignancies, and precision medicine approaches." },
  { slug: "neurology", name: "Neurology", emoji: "🧠", keywords: ["neuro", "alzheimer", "parkinson", "brain", "cns", "epilep", "multiple sclerosis", "migraine"], description: "Neurological disease treatments including neurodegenerative conditions, CNS disorders, and emerging neuromodulation therapies." },
  { slug: "immunotherapy", name: "Immunotherapy", emoji: "🛡️", keywords: ["immun", "autoimmun", "checkpoint", "car-t", "bispecific", "antibody"], description: "Immune system modulation therapies including checkpoint inhibitors, CAR-T cell therapies, and bispecific antibodies." },
  { slug: "gene-therapy", name: "Gene Therapy", emoji: "🧬", keywords: ["gene therap", "gene edit", "crispr", "aav", "viral vector", "genome"], description: "Gene editing and gene replacement therapies using CRISPR, AAV vectors, and other advanced genomic approaches." },
  { slug: "rare-diseases", name: "Rare Diseases", emoji: "💎", keywords: ["rare", "orphan", "ultra-rare", "genetic disorder"], description: "Orphan drug development for conditions affecting small patient populations, driven by favorable regulatory pathways." },
  { slug: "cardiovascular", name: "Cardiovascular", emoji: "❤️", keywords: ["cardio", "heart", "vascular", "hypertension", "atheroscl", "thromb"], description: "Heart and vascular disease treatments including novel lipid-lowering therapies, heart failure drugs, and anticoagulants." },
  { slug: "infectious-disease", name: "Infectious Disease", emoji: "🦠", keywords: ["infect", "antiviral", "antibiot", "antimicrob", "hiv", "hepatitis", "vaccine"], description: "Anti-infective drug development including antivirals, antibiotics, vaccines, and pandemic preparedness programs." },
  { slug: "metabolic", name: "Metabolic & Endocrine", emoji: "⚡", keywords: ["metabol", "diabet", "obesity", "endocr", "thyroid", "insulin", "glp-1"], description: "Metabolic disease therapies including next-generation diabetes treatments, obesity drugs, and metabolic syndrome approaches." },
  { slug: "respiratory", name: "Respiratory", emoji: "🫁", keywords: ["pulmon", "respirat", "asthma", "copd", "lung", "cystic fibrosis"], description: "Respiratory disease treatments including biologics for asthma, COPD therapies, and advanced lung disease interventions." },
  { slug: "ophthalmology", name: "Ophthalmology", emoji: "👁️", keywords: ["ophthalm", "retina", "macula", "eye", "glaucoma", "vision"], description: "Eye disease treatments including retinal therapies, gene therapies for inherited blindness, and novel glaucoma approaches." },
  { slug: "dermatology", name: "Dermatology", emoji: "🧴", keywords: ["dermat", "skin", "psoriasis", "eczema", "atopic", "alopecia"], description: "Skin disease treatments including biologics for inflammatory conditions, JAK inhibitors, and cosmetic dermatology innovations." },
  { slug: "hematology", name: "Hematology", emoji: "🩸", keywords: ["hematol", "blood", "anemia", "hemophilia", "sickle cell", "thalassemia"], description: "Blood disorder treatments including gene therapies for hemoglobinopathies, novel anticoagulants, and platelet disorder drugs." },
];

async function getReportData(): Promise<TherapeuticAreaReport[]> {
  const supabase = getSupabase();

  // Fetch pipeline products for matching
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, product_name, indication, company_id, company_name")
    .limit(5000);

  if (!pipelines) return THERAPEUTIC_AREAS.map(ta => ({
    slug: ta.slug,
    name: ta.name,
    emoji: ta.emoji,
    productCount: 0,
    companyCount: 0,
    topCompanies: [],
    description: ta.description,
  }));

  return THERAPEUTIC_AREAS.map((ta) => {
    const matching = pipelines.filter((p) => {
      const text = `${p.product_name || ""} ${p.indication || ""}`.toLowerCase();
      return ta.keywords.some((kw) => text.includes(kw));
    });

    const companies = new Map<string, number>();
    for (const p of matching) {
      if (p.company_name) {
        companies.set(p.company_name, (companies.get(p.company_name) || 0) + 1);
      }
    }

    const topCompanies = Array.from(companies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    return {
      slug: ta.slug,
      name: ta.name,
      emoji: ta.emoji,
      productCount: matching.length,
      companyCount: companies.size,
      topCompanies,
      description: ta.description,
    };
  });
}

export default async function ReportsPage() {
  const reports = await getReportData();

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium mb-4"
            style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
          >
            <FileText size={14} />
            Intelligence Reports
          </div>
          <h1
            className="text-[36px] md:text-[48px] font-bold tracking-tight mb-3"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-1px" }}
          >
            Biotech Intelligence Reports
          </h1>
          <p
            className="text-[16px] max-w-2xl mx-auto"
            style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}
          >
            AI-generated competitive landscape analysis for every major therapeutic area.
            Powered by real pipeline, funding, and market data.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-10 max-w-xl mx-auto">
          <div className="text-center">
            <div className="text-[24px] font-bold" style={{ color: "var(--color-text-primary)" }}>
              {reports.length}
            </div>
            <div className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>Therapeutic Areas</div>
          </div>
          <div className="text-center">
            <div className="text-[24px] font-bold" style={{ color: "var(--color-text-primary)" }}>
              {reports.reduce((sum, r) => sum + r.productCount, 0).toLocaleString()}
            </div>
            <div className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>Products Analyzed</div>
          </div>
          <div className="text-center">
            <div className="text-[24px] font-bold" style={{ color: "var(--color-text-primary)" }}>
              {reports.reduce((sum, r) => sum + r.companyCount, 0).toLocaleString()}
            </div>
            <div className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>Companies Tracked</div>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Link
              key={report.slug}
              href={`/reports/${report.slug}`}
              className="group rounded-xl p-5 transition-all duration-200 report-card"
              style={{
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[24px]">{report.emoji}</span>
                <h3 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {report.name}
                </h3>
              </div>

              <p className="text-[12px] mb-3" style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                {report.description}
              </p>

              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <Pill size={12} style={{ color: "var(--color-text-tertiary)" }} />
                  <span className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                    {report.productCount.toLocaleString()} products
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 size={12} style={{ color: "var(--color-text-tertiary)" }} />
                  <span className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                    {report.companyCount.toLocaleString()} companies
                  </span>
                </div>
              </div>

              {report.topCompanies.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {report.topCompanies.slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)" }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <div
                className="flex items-center gap-1 text-[12px] font-medium"
                style={{ color: "#6366f1" }}
              >
                View report <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>

        {/* Pro upsell */}
        <div
          className="mt-12 rounded-xl p-8 text-center"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.06))", border: "1px solid rgba(99,102,241,0.15)" }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Lock size={16} style={{ color: "#6366f1" }} />
            <span className="text-[13px] font-semibold" style={{ color: "#6366f1" }}>Pro Feature</span>
          </div>
          <h2 className="text-[24px] font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
            Unlock full intelligence reports
          </h2>
          <p className="text-[14px] mb-5 max-w-xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>
            Get deep competitive analysis, funding trends, phase distribution charts,
            and executive summaries for every therapeutic area.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[14px] font-medium text-white"
            style={{ background: "#6366f1" }}
          >
            Upgrade to Pro <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      <Footer />

      <style>{`
        .report-card:hover {
          border-color: #6366f1 !important;
          box-shadow: 0 4px 16px rgba(99,102,241,0.1);
        }
      `}</style>
    </div>
  );
}
