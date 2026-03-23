import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Users, Building2, TrendingUp } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getSupabase, getAllDrugs, getAllPeople, drugSlug, personSlug, DrugWithCompany } from "@/lib/seo-utils";
import { formatCurrency } from "@/lib/formatting";

export const revalidate = 86400;

const AREAS: Record<string, { name: string; emoji: string; description: string }> = {
  oncology: { name: "Oncology", emoji: "🎯", description: "Cancer therapeutics including targeted therapies, immunotherapies, cell therapies, and precision oncology platforms." },
  immunotherapy: { name: "Immunotherapy", emoji: "🛡️", description: "Treatments that harness the immune system to fight disease, including checkpoint inhibitors, CAR-T therapies, and cancer vaccines." },
  immunology: { name: "Immunology", emoji: "🧬", description: "Therapies for autoimmune and inflammatory diseases, including biologics and small molecules targeting immune pathways." },
  neuroscience: { name: "Neuroscience", emoji: "🧠", description: "Drug development for neurological and psychiatric disorders including Alzheimer's, Parkinson's, depression, and rare neurological conditions." },
  "rare-diseases": { name: "Rare Diseases", emoji: "💎", description: "Orphan drug development for conditions affecting small patient populations, often with significant unmet medical need." },
  cardiovascular: { name: "Cardiovascular", emoji: "❤️", description: "Therapies for heart disease, stroke, and vascular conditions including novel lipid-lowering and anti-thrombotic agents." },
  "infectious-diseases": { name: "Infectious Diseases", emoji: "🦠", description: "Antivirals, antibiotics, antifungals, and vaccines targeting bacterial, viral, and parasitic infections." },
  "gene-therapy": { name: "Gene Therapy", emoji: "🧬", description: "Genetic medicines including gene replacement, gene editing (CRISPR), and RNA-based therapeutics." },
  "cell-therapy": { name: "Cell Therapy", emoji: "🔬", description: "Cell-based treatments including CAR-T, TCR therapies, stem cell therapies, and allogeneic cell platforms." },
  diabetes: { name: "Diabetes", emoji: "💉", description: "Treatments for Type 1 and Type 2 diabetes including GLP-1 agonists, insulin technologies, and glucose monitoring." },
  obesity: { name: "Obesity", emoji: "⚖️", description: "Weight management therapies including GLP-1 receptor agonists, dual agonists, and metabolic modulators." },
  diagnostics: { name: "Diagnostics", emoji: "🔬", description: "Diagnostic platforms including liquid biopsy, molecular diagnostics, companion diagnostics, and AI-powered screening." },
  radiopharmaceuticals: { name: "Radiopharmaceuticals", emoji: "☢️", description: "Radioligand therapies and nuclear medicine approaches for targeted cancer treatment and diagnostic imaging." },
  vaccines: { name: "Vaccines", emoji: "💉", description: "Prophylactic and therapeutic vaccines including mRNA platforms, viral vectors, and nanoparticle-based approaches." },
  "metabolic-diseases": { name: "Metabolic Diseases", emoji: "🔄", description: "Treatments for inborn errors of metabolism, lysosomal storage disorders, and other metabolic conditions." },
  dermatology: { name: "Dermatology", emoji: "🧴", description: "Therapies for skin conditions including atopic dermatitis, psoriasis, acne, and rare dermatological disorders." },
  ophthalmology: { name: "Ophthalmology", emoji: "👁️", description: "Eye disease treatments including gene therapies for inherited retinal diseases, anti-VEGF agents, and glaucoma therapies." },
  respiratory: { name: "Respiratory", emoji: "🫁", description: "Treatments for asthma, COPD, cystic fibrosis, idiopathic pulmonary fibrosis, and other lung diseases." },
  neurology: { name: "Neurology", emoji: "🧠", description: "Therapies for neurological conditions including epilepsy, multiple sclerosis, ALS, and neuromuscular diseases." },
  "drug-delivery": { name: "Drug Delivery", emoji: "💊", description: "Novel delivery platforms including lipid nanoparticles, antibody-drug conjugates, and sustained-release formulations." },
  hematology: { name: "Hematology", emoji: "🩸", description: "Blood disease treatments including therapies for hemophilia, sickle cell disease, and myelodysplastic syndromes." },
};

export function generateStaticParams() {
  return Object.keys(AREAS).map((slug) => ({ slug }));
}

interface AreaPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: AreaPageProps): Promise<Metadata> {
  const area = AREAS[params.slug];
  if (!area) return { title: "Therapeutic Area Not Found | BiotechTube" };

  const title = `${area.name} Biotech Companies — Pipeline, Clinical Trials & Market Analysis | BiotechTube`;
  const description = `${area.description} View all ${area.name.toLowerCase()} companies, pipeline drugs, clinical trials, and leadership on BiotechTube.`;

  return {
    title,
    description,
    keywords: [
      `${area.name} biotech`,
      `${area.name} companies`,
      `${area.name} clinical trials`,
      `${area.name} pipeline`,
      `${area.name} drugs`,
      "biotech",
      "pharmaceutical",
    ],
    openGraph: { title, description, type: "website", siteName: "BiotechTube" },
    twitter: { card: "summary", title, description },
  };
}

const phaseColors: Record<string, { bg: string; text: string; border: string }> = {
  "Approved": { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Commercial": { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2/3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "#f7f7f6", text: "#6b6b65", border: "rgba(0,0,0,0.14)" },
};

export default async function TherapeuticAreaPage({ params }: AreaPageProps) {
  const area = AREAS[params.slug];
  if (!area) notFound();

  const supabase = getSupabase();

  // Get companies in this therapeutic area
  const { data: reports } = await supabase
    .from("company_reports")
    .select("report_slug, therapeutic_areas, summary, stage, pipeline_programs, key_people")
    .not("therapeutic_areas", "is", null);

  const matchingReportSlugs: string[] = [];
  for (const r of reports || []) {
    if (!r.therapeutic_areas) continue;
    const match = r.therapeutic_areas.some(
      (a: string) => a.toLowerCase().includes(area.name.toLowerCase()) || area.name.toLowerCase().includes(a.toLowerCase())
    );
    if (match) matchingReportSlugs.push(r.report_slug);
  }

  // Get company data
  const companyData: Array<{ slug: string; name: string; valuation: number | null; stage: string | null; type: string | null; country: string | null }> = [];
  for (let i = 0; i < matchingReportSlugs.length; i += 100) {
    const batch = matchingReportSlugs.slice(i, i + 100);
    const { data } = await supabase
      .from("companies")
      .select("slug, name, valuation, stage, type, country")
      .in("slug", batch)
      .order("valuation", { ascending: false, nullsFirst: false });
    if (data) companyData.push(...data);
  }

  // Sort by valuation
  companyData.sort((a, b) => (b.valuation || 0) - (a.valuation || 0));

  // Get pipeline drugs for this area
  const allDrugs = await getAllDrugs();
  const areaDrugs = allDrugs.filter((d) =>
    d.therapeuticAreas?.some(
      (a) => a.toLowerCase().includes(area.name.toLowerCase()) || area.name.toLowerCase().includes(a.toLowerCase())
    )
  );

  // Deduplicate drugs
  const uniqueDrugs = areaDrugs.reduce((acc, d) => {
    if (!acc.some((x) => drugSlug(x.name) === drugSlug(d.name))) acc.push(d);
    return acc;
  }, [] as DrugWithCompany[]);

  // Get people
  const allPeople = await getAllPeople();
  const areaPeople = allPeople.filter((p) =>
    p.therapeuticAreas?.some(
      (a) => a.toLowerCase().includes(area.name.toLowerCase()) || area.name.toLowerCase().includes(a.toLowerCase())
    )
  );

  // Stats
  const totalFunding = companyData.reduce((sum, c) => sum + (c.valuation || 0), 0);

  // Phase distribution
  const phaseDistribution = uniqueDrugs.reduce((acc, d) => {
    acc[d.phase] = (acc[d.phase] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Related areas
  const relatedSlugs = Object.keys(AREAS).filter((s) => s !== params.slug).slice(0, 6);

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${area.name} Biotech Companies`,
    description: area.description,
    url: `https://biotechtube.io/therapeutic-areas/${params.slug}`,
    about: { "@type": "MedicalSpecialty", name: area.name },
    numberOfItems: companyData.length,
  };

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-5 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-12 mb-4" style={{ color: "var(--color-text-tertiary)" }}>
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <Link href="/therapeutic-areas" className="hover:underline">Therapeutic Areas</Link>
            <span>/</span>
            <span style={{ color: "var(--color-text-secondary)" }}>{area.name}</span>
          </div>

          {/* Hero */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[36px]">{area.emoji}</span>
              <h1
                className="text-[32px] font-medium tracking-tight"
                style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
              >
                {area.name}
              </h1>
            </div>
            <p className="text-15 max-w-3xl" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
              {area.description}
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
              <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>Companies</div>
              <div className="text-[22px] font-medium" style={{ color: "var(--color-text-primary)" }}>{companyData.length}</div>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
              <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>Pipeline Drugs</div>
              <div className="text-[22px] font-medium" style={{ color: "var(--color-text-primary)" }}>{uniqueDrugs.length}</div>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
              <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>Key People</div>
              <div className="text-[22px] font-medium" style={{ color: "var(--color-text-primary)" }}>{areaPeople.length}</div>
            </div>
            {totalFunding > 0 && (
              <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>Combined Value</div>
                <div className="text-[22px] font-medium" style={{ color: "var(--color-accent)" }}>{formatCurrency(totalFunding)}</div>
              </div>
            )}
          </div>

          {/* Pipeline Table */}
          {uniqueDrugs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-18 font-medium mb-3 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                <FlaskConical size={18} />
                {area.name} Pipeline ({uniqueDrugs.length} drugs)
              </h2>

              {/* Phase distribution pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(phaseDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([phase, count]) => {
                    const pc = phaseColors[phase] || phaseColors["Pre-clinical"];
                    return (
                      <span
                        key={phase}
                        className="text-11 px-2 py-[2px] rounded-sm border"
                        style={{ background: pc.bg, color: pc.text, borderColor: pc.border, borderWidth: "0.5px" }}
                      >
                        {phase}: {count}
                      </span>
                    );
                  })}
              </div>

              <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-border-subtle)" }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "var(--color-bg-secondary)" }}>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Drug</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Company</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Indication</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Phase</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueDrugs.slice(0, 50).map((d) => {
                      const pc = phaseColors[d.phase] || phaseColors["Pre-clinical"];
                      return (
                        <tr key={drugSlug(d.name) + d.companySlug} className="border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                          <td className="px-4 py-2.5">
                            <Link href={`/drugs/${drugSlug(d.name)}`} className="text-13 font-medium hover:underline" style={{ color: "var(--color-accent)" }}>
                              {d.name}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5">
                            <Link href={`/company/${d.companySlug}`} className="text-13 hover:underline" style={{ color: "var(--color-text-secondary)" }}>
                              {d.companyName}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-13" style={{ color: "var(--color-text-secondary)" }}>{d.indication}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-11 px-1.5 py-[2px] rounded-sm border" style={{ background: pc.bg, color: pc.text, borderColor: pc.border, borderWidth: "0.5px" }}>
                              {d.phase}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-13 hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>{d.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Companies */}
          {companyData.length > 0 && (
            <div className="mb-8">
              <h2 className="text-18 font-medium mb-3 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                <Building2 size={18} />
                Top {area.name} Companies
              </h2>
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-border-subtle)" }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "var(--color-bg-secondary)" }}>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>#</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Company</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>Country</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>Type</th>
                      <th className="text-right text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Valuation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyData.slice(0, 30).map((c, i) => (
                      <tr key={c.slug} className="border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                        <td className="px-4 py-2.5 text-13" style={{ color: "var(--color-text-tertiary)" }}>{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/company/${c.slug}`} className="text-13 font-medium hover:underline" style={{ color: "var(--color-accent)" }}>
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-13 hidden md:table-cell" style={{ color: "var(--color-text-secondary)" }}>{c.country || "—"}</td>
                        <td className="px-4 py-2.5 text-13 hidden md:table-cell" style={{ color: "var(--color-text-secondary)" }}>{c.type || "—"}</td>
                        <td className="px-4 py-2.5 text-13 text-right font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {c.valuation ? formatCurrency(c.valuation) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Key People */}
          {areaPeople.length > 0 && (
            <div className="mb-8">
              <h2 className="text-18 font-medium mb-3 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                <Users size={18} />
                Key People in {area.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {areaPeople.slice(0, 15).map((p) => {
                  const initials = p.name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
                  return (
                    <Link
                      key={p.name + p.companySlug}
                      href={`/people/${personSlug(p.name)}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-[var(--color-accent)] transition-colors"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-12 font-medium shrink-0"
                        style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)" }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-13 font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{p.name}</div>
                        <div className="text-11 truncate" style={{ color: "var(--color-text-tertiary)" }}>{p.role}</div>
                        <div className="text-11 truncate" style={{ color: "var(--color-accent)" }}>{p.companyName}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Related Areas */}
          <div className="mb-8">
            <h2 className="text-16 font-medium mb-3 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
              <TrendingUp size={16} />
              Related Therapeutic Areas
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedSlugs.map((s) => {
                const ra = AREAS[s];
                return (
                  <Link
                    key={s}
                    href={`/therapeutic-areas/${s}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:border-[var(--color-accent)] transition-colors"
                    style={{ borderColor: "var(--color-border-subtle)" }}
                  >
                    <span>{ra.emoji}</span>
                    <span className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>{ra.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      <Footer />
    </div>
  );
}
