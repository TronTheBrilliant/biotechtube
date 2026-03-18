import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CompanyProfileHero } from "@/components/CompanyProfile";
import { PipelineBar } from "@/components/PipelineBar";
import { FundingTimeline } from "@/components/FundingTimeline";
import { TeamGrid } from "@/components/TeamGrid";
import { PublicationsList } from "@/components/PublicationsList";
import { AIChatWidget } from "@/components/AIChatWidget";
import { SimilarCompanies } from "@/components/SimilarCompanies";
import { Company, FundingRound } from "@/lib/types";

import companiesData from "@/data/companies.json";
import fundingData from "@/data/funding.json";

const companies = companiesData as Company[];
const funding = fundingData as FundingRound[];

// Static mock data for profile pages
const mockPipeline: Record<
  string,
  { name: string; indication: string; stage: string; isLead?: boolean; nextCatalyst?: string }[]
> = {
  oncoinvent: [
    { name: "Radspherin", indication: "Peritoneal carcinomatosis", stage: "Phase 2", isLead: true, nextCatalyst: "Ph2 data H2 2026" },
    { name: "RAD-01", indication: "Ovarian cancer", stage: "Phase 1", nextCatalyst: "IND filing Q3 2026" },
  ],
  "nykode-therapeutics": [
    { name: "VB10.16", indication: "HPV-related cancers", stage: "Phase 2", isLead: true, nextCatalyst: "Ph2 readout Q2 2026" },
    { name: "VB10.NEO", indication: "Solid tumours (neoantigen)", stage: "Phase 1/2" },
  ],
  "pci-biotech": [
    { name: "Fimaporfin", indication: "Bile duct cancer", stage: "Phase 2", isLead: true },
    { name: "PCI-PDT", indication: "Head and neck cancer", stage: "Phase 1" },
  ],
  photocure: [
    { name: "Hexvix/Cysview", indication: "Bladder cancer detection", stage: "Approved", isLead: true },
  ],
  "lytix-biopharma": [
    { name: "LTX-315", indication: "Solid tumours (intratumoral)", stage: "Phase 1/2", isLead: true, nextCatalyst: "Combo data 2026" },
  ],
  "caedo-oncology": [
    { name: "CAE-101", indication: "Solid tumours (immune escape)", stage: "Pre-clinical", isLead: true },
  ],
  "domore-diagnostics": [
    { name: "DoMore-CRC", indication: "Colorectal cancer prognosis", stage: "Pre-clinical", isLead: true },
  ],
  "zelluna-immunotherapy": [
    { name: "ZEL-101", indication: "Solid tumours (TCR therapy)", stage: "Phase 1", isLead: true, nextCatalyst: "Ph1 enrollment Q1 2026" },
  ],
};

const mockTeams: Record<string, { name: string; role: string; initials: string }[]> = {
  oncoinvent: [
    { name: "Jan A. Alfheim", role: "CEO", initials: "JA" },
    { name: "Oyvind Bruland", role: "CSO & Co-founder", initials: "OB" },
    { name: "Lena Aamodt", role: "CFO", initials: "LA" },
    { name: "Erik Larsson", role: "CMO", initials: "EL" },
  ],
  "nykode-therapeutics": [
    { name: "Bernt Eirik Raa Nilsen", role: "CEO", initials: "BN" },
    { name: "Agnete Fredriksen", role: "Co-founder & CSO", initials: "AF" },
  ],
};

const mockPublications: Record<
  string,
  { title: string; journal: string; date: string; isPdf?: boolean }[]
> = {
  oncoinvent: [
    { title: "Alpha-emitting microparticles for peritoneal carcinomatosis: Phase 1 results", journal: "The Lancet Oncology", date: "2025", isPdf: true },
    { title: "Dosimetry and biodistribution of Radspherin in ovarian cancer models", journal: "Journal of Nuclear Medicine", date: "2024", isPdf: true },
  ],
  "nykode-therapeutics": [
    { title: "Therapeutic DNA vaccines: from preclinical to clinical development", journal: "Nature Reviews Drug Discovery", date: "2024", isPdf: true },
  ],
};

export function generateStaticParams() {
  return companies.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const company = companies.find((c) => c.slug === params.slug);
  if (!company) return { title: "Company Not Found" };

  return {
    title: `${company.name} — BiotechTube`,
    description: company.description,
  };
}

export default function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  const company = companies.find((c) => c.slug === params.slug);
  if (!company) notFound();

  const companyFunding = funding.filter((f) => f.companySlug === company.slug);
  const pipeline = mockPipeline[company.slug] || [];
  const team = mockTeams[company.slug] || [
    { name: "CEO (not disclosed)", role: "Chief Executive Officer", initials: "CE" },
  ];
  const publications = mockPublications[company.slug] || [];
  const similar = companies.filter(
    (c) => c.slug !== company.slug && c.focus.some((f) => company.focus.includes(f))
  ).slice(0, 4);

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <CompanyProfileHero company={company} />

      {/* Tab Bar */}
      <div
        className="flex items-center gap-4 px-5 border-b"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        {["Overview", "Pipeline", "Funding", "Team", "Publications", "News"].map(
          (tab, i) => (
            <button
              key={tab}
              className="text-12 py-2.5 transition-all duration-200 border-b-[1.5px]"
              style={{
                color:
                  i === 0
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                borderBottomColor:
                  i === 0 ? "var(--color-accent)" : "transparent",
                fontWeight: i === 0 ? 500 : 400,
              }}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* Two Column Layout */}
      <div
        className="flex flex-col lg:grid border-t"
        style={{
          gridTemplateColumns: "1fr 260px",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {/* Main Content */}
        <div
          className="px-5 py-4 min-w-0 lg:border-r"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {/* Pipeline Section */}
          {pipeline.length > 0 && (
            <section className="mb-6">
              <h2
                className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                DRUG PIPELINE
              </h2>
              {pipeline.map((p) => (
                <PipelineBar
                  key={p.name}
                  name={p.name}
                  indication={p.indication}
                  stage={p.stage}
                  isLead={p.isLead}
                  nextCatalyst={p.nextCatalyst}
                />
              ))}
            </section>
          )}

          {/* Funding Timeline */}
          {companyFunding.length > 0 && (
            <section className="mb-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
              <h2
                className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                FUNDING HISTORY
              </h2>
              <FundingTimeline rounds={companyFunding} totalRaised={company.totalRaised} />
            </section>
          )}

          {/* Team */}
          <section className="mb-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              LEADERSHIP TEAM
            </h2>
            <TeamGrid members={team} />
          </section>

          {/* Publications */}
          {publications.length > 0 && (
            <section className="mb-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
              <h2
                className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                KEY PUBLICATIONS
              </h2>
              <PublicationsList publications={publications} />
            </section>
          )}

          {/* Express Investment Interest */}
          <section className="border-t pt-4 pb-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <button
              className="w-full py-2.5 rounded text-13 font-medium border transition-colors duration-150"
              style={{
                borderColor: "var(--color-accent)",
                color: "var(--color-accent)",
                background: "transparent",
              }}
            >
              Express Investment Interest
            </button>
          </section>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[260px] border-t lg:border-t-0">
          {/* Company Info */}
          <div className="px-3.5 py-3 border-b">
            <h3
              className="text-10 uppercase tracking-[0.5px] font-medium mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              COMPANY INFO
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { label: "Type", value: company.type },
                { label: "Founded", value: String(company.founded) },
                { label: "Employees", value: company.employees },
                { label: "Website", value: company.website },
                { label: "Location", value: `${company.city}, ${company.country}` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-11" style={{ color: "var(--color-text-secondary)" }}>
                    {item.label}
                  </span>
                  <span
                    className="text-11 font-medium text-right"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Chat Widget */}
          <div className="p-3.5">
            <AIChatWidget companyName={company.name} />
          </div>

          {/* Similar Companies */}
          {similar.length > 0 && <SimilarCompanies companies={similar} />}
        </div>
      </div>

      <Footer />
    </div>
  );
}
