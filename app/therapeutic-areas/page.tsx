import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getSupabase } from "@/lib/seo-utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Therapeutic Areas — Biotech Companies by Sector | BiotechTube",
  description:
    "Explore biotech and pharmaceutical companies by therapeutic area. Oncology, immunotherapy, gene therapy, diagnostics, and more. Pipeline data, clinical trials, and market analysis.",
  keywords: [
    "biotech therapeutic areas",
    "oncology biotech",
    "immunotherapy companies",
    "gene therapy",
    "clinical trials by disease",
    "pharmaceutical sectors",
  ],
};

const AREAS = [
  { slug: "oncology", name: "Oncology", emoji: "🎯" },
  { slug: "immunotherapy", name: "Immunotherapy", emoji: "🛡️" },
  { slug: "immunology", name: "Immunology", emoji: "🧬" },
  { slug: "neuroscience", name: "Neuroscience", emoji: "🧠" },
  { slug: "rare-diseases", name: "Rare Diseases", emoji: "💎" },
  { slug: "cardiovascular", name: "Cardiovascular", emoji: "❤️" },
  { slug: "infectious-diseases", name: "Infectious Diseases", emoji: "🦠" },
  { slug: "gene-therapy", name: "Gene Therapy", emoji: "🧬" },
  { slug: "cell-therapy", name: "Cell Therapy", emoji: "🔬" },
  { slug: "diabetes", name: "Diabetes", emoji: "💉" },
  { slug: "obesity", name: "Obesity", emoji: "⚖️" },
  { slug: "diagnostics", name: "Diagnostics", emoji: "🔬" },
  { slug: "radiopharmaceuticals", name: "Radiopharmaceuticals", emoji: "☢️" },
  { slug: "vaccines", name: "Vaccines", emoji: "💉" },
  { slug: "metabolic-diseases", name: "Metabolic Diseases", emoji: "🔄" },
  { slug: "dermatology", name: "Dermatology", emoji: "🧴" },
  { slug: "ophthalmology", name: "Ophthalmology", emoji: "👁️" },
  { slug: "respiratory", name: "Respiratory", emoji: "🫁" },
];

export default async function TherapeuticAreasIndex() {
  // Get counts per area
  const supabase = getSupabase();
  const { data: reports } = await supabase
    .from("company_reports")
    .select("therapeutic_areas")
    .not("therapeutic_areas", "is", null);

  const areaCounts: Record<string, number> = {};
  for (const r of reports || []) {
    if (!r.therapeutic_areas) continue;
    for (const area of r.therapeutic_areas) {
      const normalized = area.toLowerCase();
      areaCounts[normalized] = (areaCounts[normalized] || 0) + 1;
    }
  }

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <div className="max-w-4xl mx-auto px-5 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-12 mb-4" style={{ color: "var(--color-text-tertiary)" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span style={{ color: "var(--color-text-secondary)" }}>Therapeutic Areas</span>
        </div>

        <h1
          className="text-[32px] font-medium tracking-tight mb-2"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
        >
          Therapeutic Areas
        </h1>
        <p className="text-15 mb-8" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
          Explore biotech and pharmaceutical companies organized by disease area and therapeutic focus.
          Each area includes pipeline data, key companies, leadership teams, and market analysis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {AREAS.map((area) => {
            const count = areaCounts[area.name.toLowerCase()] || 0;
            return (
              <Link
                key={area.slug}
                href={`/therapeutic-areas/${area.slug}`}
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-[var(--color-accent)] transition-colors"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <span className="text-[28px]">{area.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-15 font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {area.name}
                  </div>
                  {count > 0 && (
                    <div className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                      {count} {count === 1 ? "company" : "companies"}
                    </div>
                  )}
                </div>
                <span className="text-14" style={{ color: "var(--color-text-tertiary)" }}>→</span>
              </Link>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}
