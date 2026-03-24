"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { Company, FundingRound, Stage } from "@/lib/types";
import { ArrowRight, X, SlidersHorizontal } from "lucide-react";

import companiesData from "@/data/companies.json";
import fundingData from "@/data/funding.json";

const companies = companiesData as Company[];
const funding = fundingData as FundingRound[];

/* ─── Stage colors ─── */

const stageBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
  Approved: { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)" },
};

const stageBarColors: Record<string, string> = {
  "Pre-clinical": "#9e9e96",
  "Phase 1": "#8b5cf6",
  "Phase 1/2": "#8b5cf6",
  "Phase 2": "#3b82f6",
  "Phase 3": "#3b82f6",
  Approved: "#1a7a5e",
};

/* ─── Therapeutic category helpers ─── */

type TherapeuticCategory =
  | "Oncology"
  | "Immunotherapy"
  | "Radiopharmaceuticals"
  | "Drug Delivery"
  | "Diagnostics"
  | "Gene Therapy"
  | "CNS"
  | "Other";

const categoryEmojis: Record<TherapeuticCategory, string> = {
  Oncology: "\uD83C\uDFAF",
  Immunotherapy: "\uD83D\uDEE1\uFE0F",
  Radiopharmaceuticals: "\u2622\uFE0F",
  "Drug Delivery": "\uD83D\uDC89",
  Diagnostics: "\uD83D\uDD2C",
  "Gene Therapy": "\uD83E\uDDEC",
  CNS: "\uD83E\uDDE0",
  Other: "\uD83D\uDC8A",
};

const categoryKeywords: { category: TherapeuticCategory; keywords: RegExp }[] = [
  { category: "Diagnostics", keywords: /diagnostic|detection|imaging|pathology|\bAI\b/i },
  { category: "Radiopharmaceuticals", keywords: /radioligand|alpha|radium|microparticle/i },
  { category: "Drug Delivery", keywords: /delivery|internalisation|\bPCI\b/i },
  { category: "Gene Therapy", keywords: /gene|genetic|\bDNA\b|\bRNA\b/i },
  { category: "CNS", keywords: /neurological|brain|alzheimer/i },
  { category: "Immunotherapy", keywords: /immune|T-cell|\bTCR\b|vaccine|HPV/i },
  { category: "Oncology", keywords: /cancer|carcinoma|tumou?r|peritoneal|ovarian|colorectal|bladder|melanoma|solid/i },
  { category: "Other", keywords: /.*/ },
];

function classifyIndication(indication: string, drugName: string): TherapeuticCategory {
  const text = `${indication} ${drugName}`;
  for (const { category, keywords } of categoryKeywords) {
    if (keywords.test(text)) return category;
  }
  return "Other";
}

/* ─── Region / country model ─── */

type Region = "Global" | "Nordic" | "Europe" | "N. America" | "APAC";

const regionEmojis: Record<Region, string> = {
  Global: "\uD83C\uDF0D",
  Nordic: "\uD83C\uDF3F",
  Europe: "\uD83C\uDDEA\uD83C\uDDFA",
  "N. America": "\uD83C\uDF0E",
  APAC: "\uD83C\uDF0F",
};

const regionCountries: Record<Exclude<Region, "Global">, string[]> = {
  Nordic: ["Norway", "Sweden", "Denmark", "Finland"],
  Europe: ["UK", "Germany", "France", "Netherlands", "Switzerland", "Belgium", "Spain", "Italy"],
  "N. America": ["USA", "Canada"],
  APAC: ["Australia", "Japan", "South Korea", "Singapore"],
};

const regions: Region[] = ["Global", "Nordic", "Europe", "N. America", "APAC"];

/* ─── Pipeline data ─── */

interface PipelineDrug {
  drug: string;
  companySlug: string;
  companyName: string;
  indication: string;
  stage: Stage;
  status: string;
  nextCatalyst: string;
  therapeuticCategory: TherapeuticCategory;
  country: string;
}

const rawPipelineData = [
  { drug: "Radspherin", companySlug: "oncoinvent", companyName: "Oncoinvent AS", indication: "Peritoneal carcinomatosis", stage: "Phase 2" as Stage, status: "Active", nextCatalyst: "Ph2 data H2 2026" },
  { drug: "RAD-01", companySlug: "oncoinvent", companyName: "Oncoinvent AS", indication: "Ovarian cancer", stage: "Phase 1" as Stage, status: "Enrolling", nextCatalyst: "IND filing Q3 2026" },
  { drug: "VB10.16", companySlug: "nykode-therapeutics", companyName: "Nykode Therapeutics", indication: "HPV-related cancers", stage: "Phase 2" as Stage, status: "Active", nextCatalyst: "Ph2 interim Q4 2026" },
  { drug: "VB10.NEO", companySlug: "nykode-therapeutics", companyName: "Nykode Therapeutics", indication: "Melanoma", stage: "Phase 1/2" as Stage, status: "Active", nextCatalyst: "Combination data 2027" },
  { drug: "Fimaporfin", companySlug: "pci-biotech", companyName: "PCI Biotech", indication: "Bile duct cancer", stage: "Phase 2" as Stage, status: "Active", nextCatalyst: "Ph2 results Q1 2027" },
  { drug: "Hexvix", companySlug: "photocure", companyName: "Photocure ASA", indication: "Bladder cancer", stage: "Approved" as Stage, status: "Marketed", nextCatalyst: "Market expansion ongoing" },
  { drug: "LTX-315", companySlug: "lytix-biopharma", companyName: "Lytix Biopharma", indication: "Solid tumours", stage: "Phase 1/2" as Stage, status: "Active", nextCatalyst: "Combination study 2026" },
  { drug: "CAD-001", companySlug: "caedo-oncology", companyName: "Caedo Oncology", indication: "Solid tumours", stage: "Pre-clinical" as Stage, status: "IND-enabling", nextCatalyst: "IND-enabling 2027" },
  { drug: "DoMore-v1", companySlug: "domore-diagnostics", companyName: "DoMore Diagnostics", indication: "Colorectal cancer", stage: "Pre-clinical" as Stage, status: "Validation", nextCatalyst: "Clinical validation 2027" },
  { drug: "ZEL-101", companySlug: "zelluna-immunotherapy", companyName: "Zelluna Immunotherapy", indication: "Solid tumours", stage: "Phase 1" as Stage, status: "Enrolling", nextCatalyst: "Ph1 enrollment H1 2026" },
];

const pipelineData: PipelineDrug[] = rawPipelineData.map((d) => {
  const comp = companies.find((c) => c.slug === d.companySlug);
  return {
    ...d,
    therapeuticCategory: classifyIndication(d.indication, d.drug),
    country: comp?.country ?? "Norway",
  };
});

const stageOrder: Stage[] = ["Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 3", "Approved"];
const phase2PlusStages: Stage[] = ["Phase 2", "Phase 3", "Approved"];

function getStageDistribution(drugs: PipelineDrug[]) {
  const counts: Record<string, number> = {};
  for (const s of stageOrder) counts[s] = 0;
  for (const d of drugs) counts[d.stage] = (counts[d.stage] || 0) + 1;
  return stageOrder.map((s) => ({ stage: s, count: counts[s] })).filter((s) => s.count > 0);
}

/* ─── Shared pill styles ─── */

const pillBase: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  padding: "5px 12px",
  borderRadius: 6,
  border: "0.5px solid var(--color-border-medium)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
  userSelect: "none",
};

function activePill(): React.CSSProperties {
  return {
    ...pillBase,
    background: "var(--color-accent)",
    color: "#fff",
    borderColor: "var(--color-accent)",
  };
}

function inactivePill(): React.CSSProperties {
  return {
    ...pillBase,
    background: "var(--color-bg-secondary)",
    color: "var(--color-text-secondary)",
  };
}

/* ─── Component ─── */

export function PipelinePageClient() {
  /* Filter state */
  const [selectedStages, setSelectedStages] = useState<Stage[]>([]);
  const [phase2Plus, setPhase2Plus] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region>("Global");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TherapeuticCategory | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Close drawer on resize above mobile */
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768 && mobileOpen) setMobileOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileOpen]);

  /* Derived: available categories */
  const availableCategories = useMemo(() => {
    const cats = new Set(pipelineData.map((d) => d.therapeuticCategory));
    const order: TherapeuticCategory[] = [
      "Oncology", "Immunotherapy", "Radiopharmaceuticals", "Drug Delivery",
      "Diagnostics", "Gene Therapy", "CNS", "Other",
    ];
    return order.filter((c) => cats.has(c));
  }, []);

  /* Derived: countries for selected region */
  const countriesForRegion = useMemo(() => {
    if (selectedRegion === "Global") return [];
    return regionCountries[selectedRegion] ?? [];
  }, [selectedRegion]);

  /* Active stages (union of manual selection and phase2+) */
  const activeStages = useMemo(() => {
    const set = new Set<Stage>(selectedStages);
    if (phase2Plus) {
      for (const s of phase2PlusStages) set.add(s);
    }
    return Array.from(set);
  }, [selectedStages, phase2Plus]);

  /* Filtering logic */
  const filtered = useMemo(() => {
    let result = [...pipelineData];

    // Stage filter
    if (activeStages.length > 0) {
      result = result.filter((d) => activeStages.includes(d.stage));
    }

    // Region / country
    if (selectedCountry) {
      result = result.filter((d) => d.country === selectedCountry);
    } else if (selectedRegion !== "Global") {
      const allowed = regionCountries[selectedRegion] ?? [];
      result = result.filter((d) => allowed.includes(d.country));
    }

    // Category
    if (selectedCategory) {
      result = result.filter((d) => d.therapeuticCategory === selectedCategory);
    }

    return result;
  }, [activeStages, selectedRegion, selectedCountry, selectedCategory]);

  /* Stage distribution based on filtered results */
  const distribution = getStageDistribution(filtered);
  const totalPrograms = pipelineData.length;

  const visibleRows = filtered; // paywall disabled
  const blurredRows: typeof filtered = [];

  /* Active filter count */
  const activeFilterCount =
    (activeStages.length > 0 ? 1 : 0) +
    (selectedRegion !== "Global" ? 1 : 0) +
    (selectedCountry ? 1 : 0) +
    (selectedCategory ? 1 : 0);

  /* Handlers */
  const toggleStage = useCallback(
    (stage: Stage) => {
      setSelectedStages((prev) =>
        prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
      );
    },
    []
  );

  const togglePhase2Plus = useCallback(() => {
    setPhase2Plus((prev) => !prev);
    // Clear individual stage selections that overlap
    if (!phase2Plus) {
      setSelectedStages((prev) => prev.filter((s) => !phase2PlusStages.includes(s)));
    }
  }, [phase2Plus]);

  const handleRegion = useCallback((r: Region) => {
    setSelectedRegion(r);
    setSelectedCountry(null);
  }, []);

  const handleCountry = useCallback((c: string) => {
    setSelectedCountry((prev) => (prev === c ? null : c));
  }, []);

  const handleCategory = useCallback((c: TherapeuticCategory) => {
    setSelectedCategory((prev) => (prev === c ? null : c));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedStages([]);
    setPhase2Plus(false);
    setSelectedRegion("Global");
    setSelectedCountry(null);
    setSelectedCategory(null);
  }, []);

  /* Active filter pills data */
  const activeFilterPills: { label: string; onRemove: () => void }[] = [];
  if (activeStages.length > 0 && !phase2Plus) {
    activeFilterPills.push({
      label: `Stage: ${activeStages.join(", ")}`,
      onRemove: () => setSelectedStages([]),
    });
  }
  if (phase2Plus) {
    activeFilterPills.push({
      label: "Phase 2+",
      onRemove: () => {
        setPhase2Plus(false);
        setSelectedStages([]);
      },
    });
  }
  if (selectedStages.length > 0 && phase2Plus) {
    const extra = selectedStages.filter((s) => !phase2PlusStages.includes(s));
    if (extra.length > 0) {
      activeFilterPills.push({
        label: `Stage: ${extra.join(", ")}`,
        onRemove: () => setSelectedStages([]),
      });
    }
  }
  if (selectedRegion !== "Global") {
    activeFilterPills.push({
      label: `Region: ${selectedRegion}`,
      onRemove: () => {
        setSelectedRegion("Global");
        setSelectedCountry(null);
      },
    });
  }
  if (selectedCountry) {
    activeFilterPills.push({
      label: `Country: ${selectedCountry}`,
      onRemove: () => setSelectedCountry(null),
    });
  }
  if (selectedCategory) {
    activeFilterPills.push({
      label: `${categoryEmojis[selectedCategory]} ${selectedCategory}`,
      onRemove: () => setSelectedCategory(null),
    });
  }

  /* ─── Filter sections (shared between desktop & mobile drawer) ─── */

  const stageFilterSection = (
    <div>
      <div
        className="text-10 uppercase tracking-[0.5px] font-medium mb-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Stage
      </div>
      <div className="flex flex-wrap gap-1.5">
        {stageOrder.map((s) => {
          const isActive =
            selectedStages.includes(s) || (phase2Plus && phase2PlusStages.includes(s));
          const sc = stageBadgeColors[s];
          const style: React.CSSProperties = isActive
            ? { ...pillBase, background: sc.bg, color: sc.text, borderColor: sc.border }
            : { ...pillBase, background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)", opacity: 0.7 };
          return (
            <button key={s} style={style} onClick={() => toggleStage(s)}>
              {s}
            </button>
          );
        })}
        <button
          style={phase2Plus ? activePill() : inactivePill()}
          onClick={togglePhase2Plus}
        >
          Phase 2+
        </button>
      </div>
    </div>
  );

  const regionFilterSection = (
    <div>
      <div
        className="text-10 uppercase tracking-[0.5px] font-medium mb-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Region
      </div>
      <div className="flex flex-wrap gap-1.5">
        {regions.map((r) => (
          <button
            key={r}
            style={selectedRegion === r ? activePill() : inactivePill()}
            onClick={() => handleRegion(r)}
          >
            {regionEmojis[r]} {r}
          </button>
        ))}
      </div>
      {countriesForRegion.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {countriesForRegion.map((c) => (
            <button
              key={c}
              style={selectedCountry === c ? activePill() : inactivePill()}
              onClick={() => handleCountry(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const categoryFilterSection = (
    <div>
      <div
        className="text-10 uppercase tracking-[0.5px] font-medium mb-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Therapeutic Area
      </div>
      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {availableCategories.map((c) => (
          <button
            key={c}
            style={selectedCategory === c ? activePill() : inactivePill()}
            onClick={() => handleCategory(c)}
          >
            {categoryEmojis[c]} {c}
          </button>
        ))}
      </div>
    </div>
  );

  /* ─── Render ─── */

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
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
          Tracking {totalPrograms} active programs across{" "}
          {new Set(pipelineData.map((d) => d.companySlug)).size} companies
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
              STAGE DISTRIBUTION{" "}
              {activeFilterCount > 0 && (
                <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400, textTransform: "none" }}>
                  (filtered)
                </span>
              )}
            </div>
            <div className="flex rounded overflow-hidden h-[28px]">
              {distribution.length > 0 ? (
                distribution.map((seg) => (
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
                ))
              ) : (
                <div
                  className="flex items-center justify-center text-[10px] w-full"
                  style={{
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  No programs match
                </div>
              )}
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

          {/* ─── Desktop Filters (hidden below 768px) ─── */}
          <div
            className="hidden md:flex flex-col gap-3 mb-4 pb-3 border-b"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            {/* Row 1: Stage */}
            {stageFilterSection}
            {/* Row 2: Region + Country */}
            {regionFilterSection}
            {/* Row 3: Therapeutic Category */}
            {categoryFilterSection}
          </div>

          {/* ─── Mobile Filter Button (shown below 768px) ─── */}
          <div className="md:hidden mb-3">
            <button
              style={{
                ...pillBase,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: activeFilterCount > 0 ? "var(--color-accent)" : "var(--color-bg-secondary)",
                color: activeFilterCount > 0 ? "#fff" : "var(--color-text-secondary)",
                borderColor: activeFilterCount > 0 ? "var(--color-accent)" : "var(--color-border-medium)",
              }}
              onClick={() => setMobileOpen(true)}
            >
              <SlidersHorizontal size={13} />
              Filters{activeFilterCount > 0 ? ` \u00B7 ${activeFilterCount}` : ""}
            </button>
          </div>

          {/* ─── Mobile Bottom Sheet ─── */}
          {mobileOpen && (
            <div
              className="md:hidden fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.35)" }}
              onClick={() => setMobileOpen(false)}
            >
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t-2xl p-5 pb-8 flex flex-col gap-4"
                style={{
                  background: "var(--color-bg-primary)",
                  maxHeight: "80vh",
                  overflowY: "auto",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-13 font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Filters
                  </span>
                  <button
                    onClick={() => setMobileOpen(false)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
                {stageFilterSection}
                {regionFilterSection}
                {categoryFilterSection}
                {activeFilterCount > 0 && (
                  <button
                    className="text-12 font-medium mt-1"
                    style={{
                      ...pillBase,
                      background: "var(--color-bg-secondary)",
                      color: "var(--color-text-secondary)",
                      textAlign: "center",
                    }}
                    onClick={clearAll}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── Active Filters Summary ─── */}
          <div
            className="flex flex-wrap items-center gap-2 mb-4 text-12"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span>
              Showing{" "}
              <strong style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                {filtered.length}
              </strong>{" "}
              of {totalPrograms} programs
            </span>
            {activeFilterPills.map((fp) => (
              <span
                key={fp.label}
                className="inline-flex items-center gap-1"
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text-secondary)",
                  border: "0.5px solid var(--color-border-medium)",
                }}
              >
                {fp.label}
                <button
                  onClick={fp.onRemove}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    lineHeight: 1,
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="text-11"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-accent)",
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                Clear all
              </button>
            )}
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
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-12 py-8 text-center"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      No programs match the current filters.
                    </td>
                  </tr>
                )}
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
