"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { Company, FundingRound, Stage } from "@/lib/types";
import { ArrowRight } from "lucide-react";

import companiesData from "@/data/companies.json";
import fundingData from "@/data/funding.json";

const companies = companiesData as Company[];
const funding = fundingData as FundingRound[];

const stageBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
  Approved: { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "#f7f7f6", text: "#6b6b65", border: "rgba(0,0,0,0.14)" },
};

const stageBarColors: Record<string, string> = {
  "Pre-clinical": "#9e9e96",
  "Phase 1": "#8b5cf6",
  "Phase 1/2": "#8b5cf6",
  "Phase 2": "#3b82f6",
  "Phase 3": "#3b82f6",
  Approved: "#1a7a5e",
};

interface PipelineDrug {
  drug: string;
  companySlug: string;
  companyName: string;
  indication: string;
  stage: Stage;
  status: string;
  nextCatalyst: string;
}

const pipelineData: PipelineDrug[] = [
  { drug: "Radspherin", companySlug: "oncoinvent", companyName: "Oncoinvent AS", indication: "Peritoneal carcinomatosis", stage: "Phase 2", status: "Active", nextCatalyst: "Ph2 data H2 2026" },
  { drug: "RAD-01", companySlug: "oncoinvent", companyName: "Oncoinvent AS", indication: "Ovarian cancer", stage: "Phase 1", status: "Enrolling", nextCatalyst: "IND filing Q3 2026" },
  { drug: "VB10.16", companySlug: "nykode-therapeutics", companyName: "Nykode Therapeutics", indication: "HPV-related cancers", stage: "Phase 2", status: "Active", nextCatalyst: "Ph2 interim Q4 2026" },
  { drug: "VB10.NEO", companySlug: "nykode-therapeutics", companyName: "Nykode Therapeutics", indication: "Melanoma", stage: "Phase 1/2", status: "Active", nextCatalyst: "Combination data 2027" },
  { drug: "Fimaporfin", companySlug: "pci-biotech", companyName: "PCI Biotech", indication: "Bile duct cancer", stage: "Phase 2", status: "Active", nextCatalyst: "Ph2 results Q1 2027" },
  { drug: "Hexvix", companySlug: "photocure", companyName: "Photocure ASA", indication: "Bladder cancer", stage: "Approved", status: "Marketed", nextCatalyst: "Market expansion ongoing" },
  { drug: "LTX-315", companySlug: "lytix-biopharma", companyName: "Lytix Biopharma", indication: "Solid tumours", stage: "Phase 1/2", status: "Active", nextCatalyst: "Combination study 2026" },
  { drug: "CAD-001", companySlug: "caedo-oncology", companyName: "Caedo Oncology", indication: "Solid tumours", stage: "Pre-clinical", status: "IND-enabling", nextCatalyst: "IND-enabling 2027" },
  { drug: "DoMore-v1", companySlug: "domore-diagnostics", companyName: "DoMore Diagnostics", indication: "Colorectal cancer", stage: "Pre-clinical", status: "Validation", nextCatalyst: "Clinical validation 2027" },
  { drug: "ZEL-101", companySlug: "zelluna-immunotherapy", companyName: "Zelluna Immunotherapy", indication: "Solid tumours", stage: "Phase 1", status: "Enrolling", nextCatalyst: "Ph1 enrollment H1 2026" },
];

const stageOrder: Stage[] = ["Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 3", "Approved"];

function getStageDistribution(drugs: PipelineDrug[]) {
  const counts: Record<string, number> = {};
  for (const s of stageOrder) counts[s] = 0;
  for (const d of drugs) counts[d.stage] = (counts[d.stage] || 0) + 1;
  return stageOrder.map((s) => ({ stage: s, count: counts[s] })).filter((s) => s.count > 0);
}

const allIndications = Array.from(new Set(pipelineData.map((d) => d.indication))).sort();
const allCountries = Array.from(new Set(companies.map((c) => c.country))).sort();

export function PipelinePageClient() {
  const [phaseFilter, setPhaseFilter] = useState("All");
  const [indicationFilter, setIndicationFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");

  const filtered = useMemo(() => {
    let result = [...pipelineData];
    if (phaseFilter !== "All") result = result.filter((d) => d.stage === phaseFilter);
    if (indicationFilter !== "All") result = result.filter((d) => d.indication === indicationFilter);
    if (countryFilter !== "All") {
      const countrySlugs = companies.filter((c) => c.country === countryFilter).map((c) => c.slug);
      result = result.filter((d) => countrySlugs.includes(d.companySlug));
    }
    return result;
  }, [phaseFilter, indicationFilter, countryFilter]);

  const distribution = getStageDistribution(pipelineData);
  const totalPrograms = pipelineData.length;

  const visibleRows = filtered.slice(0, 5);
  const blurredRows = filtered.slice(5);

  const selectStyle = {
    borderColor: "var(--color-border-medium)",
    background: "var(--color-bg-primary)",
    color: "var(--color-text-secondary)",
  };

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      {/* Page Header */}
      <div
        className="px-5 pt-7 pb-5 border-b"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <span
          className="text-10 uppercase tracking-[0.5px] font-medium"
          style={{ color: "var(--color-accent)" }}
        >
          PIPELINE
        </span>
        <h1
          className="text-[32px] font-medium tracking-tight mt-1"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
        >
          Global Drug Pipeline
        </h1>
        <p
          className="text-13 mt-1"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}
        >
          Tracking {totalPrograms} active programs across {new Set(pipelineData.map((d) => d.companySlug)).size} companies
        </p>
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
          {/* Stage Distribution Bar */}
          <div className="mb-4">
            <div
              className="text-10 uppercase tracking-[0.5px] font-medium mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              STAGE DISTRIBUTION
            </div>
            <div className="flex rounded overflow-hidden h-[28px]">
              {distribution.map((seg) => (
                <div
                  key={seg.stage}
                  className="flex items-center justify-center text-[10px] font-medium text-white"
                  style={{
                    background: stageBarColors[seg.stage],
                    flex: seg.count,
                    minWidth: seg.count > 0 ? 40 : 0,
                  }}
                  title={`${seg.stage}: ${seg.count}`}
                >
                  {seg.count}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {distribution.map((seg) => (
                <div key={seg.stage} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ background: stageBarColors[seg.stage] }}
                  />
                  <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                    {seg.stage} ({seg.count})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Filter Bar */}
          <div
            className="flex items-center gap-2 mb-4 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none" }}
          >
            <select
              className="text-12 px-2.5 py-1.5 rounded border outline-none flex-shrink-0"
              style={selectStyle}
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
            >
              <option value="All">All Phases</option>
              {stageOrder.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="text-12 px-2.5 py-1.5 rounded border outline-none flex-shrink-0"
              style={selectStyle}
              value={indicationFilter}
              onChange={(e) => setIndicationFilter(e.target.value)}
            >
              <option value="All">All Therapeutic Areas</option>
              {allIndications.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
            <select
              className="text-12 px-2.5 py-1.5 rounded border outline-none flex-shrink-0"
              style={selectStyle}
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              <option value="All">All Countries</option>
              {allCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Pipeline Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr
                  className="border-b"
                  style={{ borderColor: "var(--color-border-medium)" }}
                >
                  {["Drug Name", "Company", "Indication", "Phase", "Status", "Next Catalyst"].map(
                    (col) => (
                      <th
                        key={col}
                        className="text-10 uppercase tracking-[0.5px] font-medium py-2.5 pr-3"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((drug, i) => {
                  const sc = stageBadgeColors[drug.stage] || stageBadgeColors["Pre-clinical"];
                  return (
                    <tr
                      key={`${drug.drug}-${i}`}
                      className="border-b transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                    >
                      <td
                        className="text-12 font-medium py-2.5 pr-3"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {drug.drug}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/company/${drug.companySlug}`}
                          className="text-12 hover:underline"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {drug.companyName}
                        </Link>
                      </td>
                      <td
                        className="text-12 py-2.5 pr-3"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {drug.indication}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className="text-10 px-2 py-[2px] rounded-sm border whitespace-nowrap"
                          style={{
                            background: sc.bg,
                            color: sc.text,
                            borderColor: sc.border,
                            borderWidth: "0.5px",
                          }}
                        >
                          {drug.stage}
                        </span>
                      </td>
                      <td
                        className="text-11 py-2.5 pr-3"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {drug.status}
                      </td>
                      <td
                        className="text-11 py-2.5"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {drug.nextCatalyst}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Blurred Rows + Paywall */}
          {blurredRows.length > 0 && (
            <>
              <div style={{ filter: "blur(4px)", opacity: 0.4, pointerEvents: "none" }}>
                <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    {blurredRows.map((drug, i) => {
                      const sc = stageBadgeColors[drug.stage] || stageBadgeColors["Pre-clinical"];
                      return (
                        <tr
                          key={`blur-${drug.drug}-${i}`}
                          className="border-b"
                          style={{ borderColor: "var(--color-border-subtle)" }}
                        >
                          <td
                            className="text-12 font-medium py-2.5 pr-3"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {drug.drug}
                          </td>
                          <td className="text-12 py-2.5 pr-3" style={{ color: "var(--color-accent)" }}>
                            {drug.companyName}
                          </td>
                          <td
                            className="text-12 py-2.5 pr-3"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {drug.indication}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span
                              className="text-10 px-2 py-[2px] rounded-sm border whitespace-nowrap"
                              style={{
                                background: sc.bg,
                                color: sc.text,
                                borderColor: sc.border,
                                borderWidth: "0.5px",
                              }}
                            >
                              {drug.stage}
                            </span>
                          </td>
                          <td
                            className="text-11 py-2.5 pr-3"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {drug.status}
                          </td>
                          <td
                            className="text-11 py-2.5"
                            style={{ color: "var(--color-text-tertiary)" }}
                          >
                            {drug.nextCatalyst}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                className="flex items-center justify-between rounded-lg border px-4 py-3.5 mt-4"
                style={{
                  borderColor: "var(--color-accent)",
                  background: "#e8f5f0",
                  borderWidth: "0.5px",
                }}
              >
                <div>
                  <div
                    className="text-13 font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Sign up to track all pipeline programs
                  </div>
                  <div className="text-11" style={{ color: "var(--color-text-secondary)" }}>
                    Full access to drug pipeline data, catalyst tracking, and clinical trial updates.
                  </div>
                </div>
                <Link
                  href="/signup"
                  className="flex items-center gap-1.5 text-12 font-medium px-3.5 py-2 rounded text-white flex-shrink-0"
                  style={{ background: "var(--color-accent)" }}
                >
                  Sign up free
                  <ArrowRight size={13} />
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[260px] border-t lg:border-t-0">
          <RecentlyFunded funding={funding} companies={companies} />
          <div className="p-3.5">
            <PaywallCard />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
