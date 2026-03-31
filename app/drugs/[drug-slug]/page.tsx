import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, FlaskConical, Building2, Activity, ExternalLink } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getAllDrugs, drugSlug, DrugWithCompany } from "@/lib/seo-utils";

export const revalidate = 86400; // 24 hours
export const dynamicParams = true;

interface DrugPageProps {
  params: { "drug-slug": string };
}

async function getDrugData(slug: string): Promise<DrugWithCompany[] | null> {
  const allDrugs = await getAllDrugs();
  const matches = allDrugs.filter((d) => drugSlug(d.name) === slug);
  return matches.length > 0 ? matches : null;
}

export async function generateMetadata({ params }: DrugPageProps): Promise<Metadata> {
  const drugs = await getDrugData(params["drug-slug"]);
  if (!drugs || drugs.length === 0) return { title: "Drug Not Found | BiotechTube" };

  const drug = drugs[0];
  const companies = Array.from(new Set(drugs.map((d) => d.companyName))).join(", ");
  const title = `${drug.name} — ${drug.indication} | ${drug.phase} Clinical Trial | BiotechTube`;
  const description = `${drug.name} is a ${drug.phase} drug candidate for ${drug.indication} developed by ${companies}. View clinical trial status, pipeline details, and company analysis on BiotechTube.`;

  return {
    title,
    description,
    keywords: [drug.name, drug.indication, drug.phase, "clinical trial", "biotech", "pipeline", ...drugs.map((d) => d.companyName)],
    openGraph: { title, description, type: "article", siteName: "BiotechTube" },
    twitter: { card: "summary", title, description },
  };
}

const phaseColors: Record<string, { bg: string; text: string; border: string }> = {
  "Approved": { bg: "#ecfdf5", text: "#064e3b", border: "#34d399" },
  "Commercial": { bg: "#ecfdf5", text: "#064e3b", border: "#34d399" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2/3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)" },
};

export default async function DrugPage({ params }: DrugPageProps) {
  const drugs = await getDrugData(params["drug-slug"]);
  if (!drugs || drugs.length === 0) notFound();

  const primaryDrug = drugs[0];
  const companies = Array.from(new Set(drugs.map((d) => d.companySlug)));
  const pc = phaseColors[primaryDrug.phase] || phaseColors["Pre-clinical"];

  // Collect related therapeutic areas
  const areas = Array.from(new Set(drugs.flatMap((d) => d.therapeuticAreas || [])));

  // Find related drugs (same indication from other companies)
  const allDrugs = await getAllDrugs();
  const relatedDrugs = allDrugs
    .filter(
      (d) =>
        d.indication.toLowerCase() === primaryDrug.indication.toLowerCase() &&
        drugSlug(d.name) !== params["drug-slug"]
    )
    .reduce((acc, d) => {
      const slug = drugSlug(d.name);
      if (!acc.some((x) => drugSlug(x.name) === slug)) acc.push(d);
      return acc;
    }, [] as DrugWithCompany[])
    .slice(0, 12);

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Drug",
    name: primaryDrug.name,
    description: `${primaryDrug.name} is a ${primaryDrug.phase} drug candidate for ${primaryDrug.indication}.`,
    relevantSpecialty: areas[0] || primaryDrug.indication,
    manufacturer: drugs.map((d) => ({
      "@type": "Organization",
      name: d.companyName,
      url: `https://biotechtube.io/company/${d.companySlug}`,
    })),
  };

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto px-5 pt-4">
          <div className="flex items-center gap-1.5 text-12" style={{ color: "var(--color-text-tertiary)" }}>
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <Link href="/pipeline" className="hover:underline">Pipeline</Link>
            <span>/</span>
            <span style={{ color: "var(--color-text-secondary)" }}>{primaryDrug.name}</span>
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-4xl mx-auto px-5 py-6">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: pc.bg, border: `1px solid ${pc.border}` }}
            >
              <FlaskConical size={22} style={{ color: pc.text }} />
            </div>
            <div>
              <h1
                className="text-[28px] font-medium tracking-tight"
                style={{ color: "var(--color-text-primary)", letterSpacing: "-0.4px" }}
              >
                {primaryDrug.name}
              </h1>
              <p className="text-14 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                {primaryDrug.indication}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-5">
            <span
              className="text-12 px-2 py-[3px] rounded-sm border"
              style={{ background: pc.bg, color: pc.text, borderColor: pc.border, borderWidth: "0.5px" }}
            >
              {primaryDrug.phase}
            </span>
            <span
              className="text-12 px-2 py-[3px] rounded-sm border"
              style={{
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-secondary)",
                borderColor: "var(--color-border-subtle)",
                borderWidth: "0.5px",
              }}
            >
              {primaryDrug.status}
            </span>
            {primaryDrug.trial_id && (
              <a
                href={`https://clinicaltrials.gov/study/${primaryDrug.trial_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-12 px-2 py-[3px] rounded-sm border flex items-center gap-1 hover:opacity-80"
                style={{
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  borderColor: "#93c5fd",
                  borderWidth: "0.5px",
                }}
              >
                {primaryDrug.trial_id}
                <ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* Key Facts Card */}
          <div
            className="rounded-lg border p-5 mb-6"
            style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)" }}
          >
            <h2 className="text-14 font-medium mb-3" style={{ color: "var(--color-text-primary)" }}>
              Key Facts
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                  Indication
                </div>
                <div className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {primaryDrug.indication}
                </div>
              </div>
              <div>
                <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                  Phase
                </div>
                <div className="text-14 font-medium" style={{ color: pc.text }}>
                  {primaryDrug.phase}
                </div>
              </div>
              <div>
                <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                  Status
                </div>
                <div className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {primaryDrug.status}
                </div>
              </div>
              <div>
                <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                  {companies.length > 1 ? "Companies" : "Company"}
                </div>
                <div className="text-14 font-medium">
                  {drugs.map((d, i) => (
                    <span key={d.companySlug}>
                      {i > 0 && ", "}
                      <Link href={`/company/${d.companySlug}`} className="hover:underline" style={{ color: "var(--color-accent)" }}>
                        {d.companyName}
                      </Link>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Company Context */}
          {drugs.map((d) =>
            d.companySummary ? (
              <div key={d.companySlug} className="mb-6">
                <h2 className="text-16 font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
                  <Link href={`/company/${d.companySlug}`} className="hover:underline flex items-center gap-1.5">
                    <Building2 size={16} />
                    About {d.companyName}
                  </Link>
                </h2>
                <p className="text-14" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
                  {d.companySummary}
                </p>
                <Link
                  href={`/company/${d.companySlug}`}
                  className="text-13 mt-2 inline-flex items-center gap-1 hover:underline"
                  style={{ color: "var(--color-accent)" }}
                >
                  View full company profile <ArrowUpRight size={12} />
                </Link>
              </div>
            ) : null
          )}

          {/* Therapeutic Areas */}
          {areas.length > 0 && (
            <div className="mb-6">
              <h2 className="text-16 font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
                Therapeutic Areas
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((area) => (
                  <Link
                    key={area}
                    href={`/therapeutic-areas/${area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`}
                    className="text-12 px-2 py-[3px] rounded-sm border hover:opacity-80"
                    style={{
                      background: "var(--color-bg-secondary)",
                      color: "var(--color-text-secondary)",
                      borderColor: "var(--color-border-subtle)",
                      borderWidth: "0.5px",
                    }}
                  >
                    {area}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related Drugs */}
          {relatedDrugs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-16 font-medium mb-3 flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
                <Activity size={16} />
                Other {primaryDrug.indication} Drugs
              </h2>
              <div
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "var(--color-bg-secondary)" }}>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Drug</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Company</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Phase</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedDrugs.map((d) => {
                      const dpc = phaseColors[d.phase] || phaseColors["Pre-clinical"];
                      return (
                        <tr key={drugSlug(d.name)} className="border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/drugs/${drugSlug(d.name)}`}
                              className="text-13 font-medium hover:underline"
                              style={{ color: "var(--color-accent)" }}
                            >
                              {d.name}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/company/${d.companySlug}`}
                              className="text-13 hover:underline"
                              style={{ color: "var(--color-text-secondary)" }}
                            >
                              {d.companyName}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="text-11 px-1.5 py-[2px] rounded-sm border"
                              style={{ background: dpc.bg, color: dpc.text, borderColor: dpc.border, borderWidth: "0.5px" }}
                            >
                              {d.phase}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-13 hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>
                            {d.status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      <Footer />
    </div>
  );
}
