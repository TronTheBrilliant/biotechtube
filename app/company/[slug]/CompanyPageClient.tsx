"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CompanyProfileHero } from "@/components/CompanyProfile";
import { PipelineBar } from "@/components/PipelineBar";
import { FundingTimeline } from "@/components/FundingTimeline";
// TeamGrid and PublicationsList rendered inline in their tabs
import { AIChatWidget } from "@/components/AIChatWidget";
import { SimilarCompanies } from "@/components/SimilarCompanies";
import { Company, FundingRound } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import { Calendar, FileText, ExternalLink, TrendingUp, Users, FlaskConical, Newspaper, Activity, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const tabs = ["Overview", "Pipeline", "Funding", "Team", "Publications", "News"] as const;
type Tab = (typeof tabs)[number];

// Pipeline data
const mockPipeline: Record<
  string,
  { name: string; indication: string; stage: string; isLead?: boolean; nextCatalyst?: string; nctId?: string; mechanism?: string; status?: string }[]
> = {
  oncoinvent: [
    { name: "Radspherin", indication: "Peritoneal carcinomatosis", stage: "Phase 2", isLead: true, nextCatalyst: "Ph2 data H2 2026", nctId: "NCT03732768", mechanism: "Alpha-emitting microparticles (Ra-224)", status: "Enrolling" },
    { name: "RAD-01", indication: "Ovarian cancer", stage: "Phase 1", nextCatalyst: "IND filing Q3 2026", mechanism: "Alpha-emitting microparticles", status: "IND-enabling" },
  ],
  "nykode-therapeutics": [
    { name: "VB10.16", indication: "HPV-related cancers", stage: "Phase 2", isLead: true, nextCatalyst: "Ph2 readout Q2 2026", nctId: "NCT04455672", mechanism: "DNA vaccine (vaccibody)", status: "Enrolling" },
    { name: "VB10.NEO", indication: "Solid tumours (neoantigen)", stage: "Phase 1/2", nctId: "NCT03548467", mechanism: "Neoantigen DNA vaccine", status: "Active" },
  ],
  "pci-biotech": [
    { name: "Fimaporfin", indication: "Bile duct cancer", stage: "Phase 2", isLead: true, nctId: "NCT01900158", mechanism: "Photochemical internalisation (PCI)", status: "Active" },
    { name: "PCI-PDT", indication: "Head and neck cancer", stage: "Phase 1", mechanism: "Photodynamic therapy", status: "Planning" },
  ],
  photocure: [
    { name: "Hexvix/Cysview", indication: "Bladder cancer detection", stage: "Approved", isLead: true, mechanism: "Blue light cystoscopy (HAL)", status: "Marketed" },
  ],
  "lytix-biopharma": [
    { name: "LTX-315", indication: "Solid tumours (intratumoral)", stage: "Phase 1/2", isLead: true, nextCatalyst: "Combo data 2026", nctId: "NCT01986426", mechanism: "Oncolytic peptide", status: "Active" },
  ],
  "caedo-oncology": [
    { name: "CAE-101", indication: "Solid tumours (immune escape)", stage: "Pre-clinical", isLead: true, mechanism: "Monoclonal antibody (immune escape)", status: "IND-enabling" },
  ],
  "domore-diagnostics": [
    { name: "DoMore-CRC", indication: "Colorectal cancer prognosis", stage: "Pre-clinical", isLead: true, mechanism: "AI deep learning on pathology", status: "Clinical validation" },
  ],
  "zelluna-immunotherapy": [
    { name: "ZEL-101", indication: "Solid tumours (TCR therapy)", stage: "Phase 1", isLead: true, nextCatalyst: "Ph1 enrollment Q1 2026", mechanism: "TCR-engineered T-cells", status: "Enrolling" },
  ],
};

// Team data (expanded)
const mockTeams: Record<string, { name: string; role: string; initials: string; bio?: string }[]> = {
  oncoinvent: [
    { name: "Jan A. Alfheim", role: "CEO", initials: "JA", bio: "20+ years in pharma leadership. Previously VP at Algeta ASA." },
    { name: "Oyvind Bruland", role: "CSO & Co-founder", initials: "OB", bio: "Professor of oncology at Oslo University Hospital. Pioneer in targeted alpha therapy." },
    { name: "Lena Aamodt", role: "CFO", initials: "LA", bio: "Former finance director at Nordic Nanovector." },
    { name: "Erik Larsson", role: "CMO", initials: "EL", bio: "15+ years in clinical development at AstraZeneca and Novartis." },
  ],
  "nykode-therapeutics": [
    { name: "Bernt Eirik Raa Nilsen", role: "CEO", initials: "BN", bio: "Former CEO of Vaccibody. Built the company from research to clinical stage." },
    { name: "Agnete Fredriksen", role: "Co-founder & CSO", initials: "AF", bio: "Inventor of the vaccibody technology platform. PhD in immunology." },
    { name: "Mona Elisabeth Endre", role: "CFO", initials: "ME", bio: "Previously at SpareBank 1 Markets and DNB." },
  ],
  "pci-biotech": [
    { name: "Per Walday", role: "CEO", initials: "PW", bio: "Serial biotech entrepreneur with 25+ years experience." },
    { name: "Anders Hogset", role: "CSO", initials: "AH", bio: "Inventor of PCI technology. PhD in biophysics." },
  ],
  photocure: [
    { name: "Daniel Schneider", role: "President & CEO", initials: "DS", bio: "25+ years in specialty pharma and medical devices." },
    { name: "Erik Dahl", role: "CFO", initials: "ED", bio: "Previously at Visma and Schibsted." },
  ],
};

// Publications (expanded)
const mockPublications: Record<
  string,
  { title: string; journal: string; date: string; isPdf?: boolean; doi?: string; authors?: string }[]
> = {
  oncoinvent: [
    { title: "Alpha-emitting microparticles for peritoneal carcinomatosis: Phase 1 results", journal: "The Lancet Oncology", date: "2025", isPdf: true, doi: "10.1016/S1470-2045(25)00123-4", authors: "Bruland et al." },
    { title: "Dosimetry and biodistribution of Radspherin in ovarian cancer models", journal: "Journal of Nuclear Medicine", date: "2024", isPdf: true, doi: "10.2967/jnumed.124.267890", authors: "Larsson et al." },
    { title: "Targeted alpha therapy for peritoneal carcinomatosis: preclinical proof of concept", journal: "Cancer Research", date: "2023", isPdf: true, authors: "Bruland et al." },
  ],
  "nykode-therapeutics": [
    { title: "Therapeutic DNA vaccines: from preclinical to clinical development", journal: "Nature Reviews Drug Discovery", date: "2024", isPdf: true, authors: "Fredriksen et al." },
    { title: "VB10.16 DNA vaccine targeting HPV16: Phase 1/2a results", journal: "Clinical Cancer Research", date: "2023", isPdf: true, authors: "Nilsen et al." },
  ],
  "pci-biotech": [
    { title: "Photochemical internalisation enhances drug delivery in bile duct cancer", journal: "British Journal of Cancer", date: "2024", isPdf: true, authors: "Hogset et al." },
  ],
};

// News items (mock)
const mockNews: Record<string, { title: string; source: string; date: string; type: string; url?: string }[]> = {
  oncoinvent: [
    { title: "Oncoinvent completes $18M Series B to advance Radspherin", source: "BiotechTube", date: "Feb 10, 2026", type: "Funding" },
    { title: "Phase 2 trial enrollment ahead of schedule for peritoneal cancer therapy", source: "Endpoints News", date: "Jan 22, 2026", type: "Pipeline" },
    { title: "Oncoinvent presents positive interim data at ESMO 2025", source: "Evaluate", date: "Oct 15, 2025", type: "Conference" },
    { title: "Norwegian biotech raises awareness for peritoneal cancer treatment", source: "Dagens Medisin", date: "Sep 8, 2025", type: "Media" },
  ],
  "nykode-therapeutics": [
    { title: "Nykode DNA vaccine shows durable immune responses in HPV study", source: "Endpoints News", date: "Jan 30, 2026", type: "Pipeline" },
    { title: "NYKD shares rise on positive Phase 2 interim data", source: "TDN Direkt", date: "Dec 12, 2025", type: "Market" },
  ],
};

const newsTypeBadge: Record<string, { bg: string; text: string }> = {
  Funding: { bg: "#e8f5f0", text: "#0a3d2e" },
  Pipeline: { bg: "#eff6ff", text: "#1d4ed8" },
  Conference: { bg: "#f5f3ff", text: "#5b21b6" },
  Media: { bg: "#f7f7f6", text: "#6b6b65" },
  Market: { bg: "#fef3e2", text: "#b45309" },
};

// Stock price data generators for public companies
const stockTimescales = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "Max"] as const;
type StockTimescale = (typeof stockTimescales)[number];

function generateStockData(ticker: string, timescale: StockTimescale): { date: string; price: number }[] {
  const pointCounts: Record<string, number> = { "1M": 22, "3M": 65, "6M": 130, "1Y": 252, "3Y": 756, "5Y": 1260, Max: 2000 };
  const points = pointCounts[timescale] || 252;
  // Seed based on ticker for consistent data
  let seed = ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed % 1000) / 1000; };
  const basePrice = ticker === "NYKD" ? 28 : ticker === "PCIB" ? 4.5 : 85;
  const data: { date: string; price: number }[] = [];
  let price = basePrice * 0.6;
  const now = new Date(2026, 2, 18);
  for (let i = points; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    price += (rand() - 0.48) * basePrice * 0.03;
    price = Math.max(price, basePrice * 0.2);
    const month = d.toLocaleString("en", { month: "short" });
    const label = points > 300 ? (i % 60 === 0 ? `${month} ${d.getFullYear().toString().slice(2)}` : "") : (i % 5 === 0 ? `${month} ${d.getDate()}` : "");
    data.push({ date: label, price: Math.round(price * 100) / 100 });
  }
  return data;
}

// Funding round chart data
function buildFundingChartData(rounds: FundingRound[]): { label: string; amount: number; type: string }[] {
  return [...rounds].reverse().map(r => ({
    label: r.type,
    amount: r.amount / 1_000_000,
    type: r.type,
  }));
}

// Company overview summaries
const overviewSummaries: Record<string, { thesis: string; strengths: string[]; risks: string[]; keyMetric: string; keyMetricValue: string }> = {
  oncoinvent: {
    thesis: "Oncoinvent is developing a differentiated alpha-emitting microparticle therapy for peritoneal cancers — an area with few effective treatments and significant unmet need. The Phase 2 Radspherin program has shown encouraging early data and is approaching a key data readout in H2 2026.",
    strengths: ["First-mover in alpha-emitting microparticles for peritoneal cancers", "Phase 2 enrollment ahead of schedule", "Strong Norwegian investor base (Investinor-led Series B)", "Experienced team from Algeta (acquired by Bayer for $2.9B)"],
    risks: ["Single lead asset concentration risk", "Limited clinical data to date", "Peritoneal administration requires specialist centers", "Competitive landscape evolving in radiopharmaceuticals"],
    keyMetric: "Ph2 Data Readout",
    keyMetricValue: "H2 2026",
  },
  "nykode-therapeutics": {
    thesis: "Nykode (OSE: NYKD) is a publicly traded biotech developing therapeutic DNA vaccines using its proprietary vaccibody platform. The lead program VB10.16 targets HPV-related cancers and has shown durable immune responses in early clinical data. As a public company, it offers investors direct market exposure to the DNA vaccine space.",
    strengths: ["Publicly listed — liquid investment (OSE: NYKD)", "Platform technology with multiple pipeline candidates", "Strong Phase 2 data in HPV cancers", "Partnerships with major pharma under exploration"],
    risks: ["Share price volatility typical of clinical-stage biotechs", "Competition from mRNA vaccine platforms (Moderna, BioNTech)", "DNA vaccine delivery challenges vs mRNA", "Regulatory pathway for therapeutic cancer vaccines still evolving"],
    keyMetric: "Market Cap",
    keyMetricValue: "~$210M",
  },
  "pci-biotech": {
    thesis: "PCI Biotech (OSE: PCIB) is developing photochemical internalisation technology to enhance intracellular drug delivery. The lead program Fimaporfin is in Phase 2 for bile duct cancer. As a platform technology company, successful clinical validation could open multiple indication opportunities.",
    strengths: ["Unique platform mechanism (PCI)", "Publicly listed (OSE: PCIB)", "Multiple potential indications", "Strong IP portfolio"],
    risks: ["Technology requires specialised light equipment", "Small patient populations in lead indication", "Capital-intensive clinical development", "Market education needed for PCI mechanism"],
    keyMetric: "Market Cap",
    keyMetricValue: "~$185M",
  },
  photocure: {
    thesis: "Photocure (OSE: PHO) is a rare profitable Nordic biotech with an approved product (Hexvix/Cysview) in bladder cancer detection. The company generates revenue and is expanding market penetration in the US and Europe. A de-risked investment profile relative to clinical-stage peers.",
    strengths: ["Revenue-generating with approved product", "Market leader in blue light cystoscopy", "Growing US market penetration", "Strong margins and path to profitability"],
    risks: ["Single-product revenue concentration", "Reimbursement challenges in some markets", "Competition from white light and NBI technologies", "Limited pipeline beyond bladder cancer"],
    keyMetric: "Revenue (2025)",
    keyMetricValue: "~$45M",
  },
};

interface CompanyPageClientProps {
  company: Company;
  companyFunding: FundingRound[];
  similar: Company[];
}

export function CompanyPageClient({ company, companyFunding, similar }: CompanyPageClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [stockTimescale, setStockTimescale] = useState<StockTimescale>("1Y");

  const pipeline = mockPipeline[company.slug] || [];
  const team = mockTeams[company.slug] || [
    { name: "CEO (not disclosed)", role: "Chief Executive Officer", initials: "CE" },
  ];
  const publications = mockPublications[company.slug] || [];
  const news = mockNews[company.slug] || [];
  const overview = overviewSummaries[company.slug];

  const isPublic = company.type === "Public" && company.ticker;
  const stockData = useMemo(
    () => (isPublic ? generateStockData(company.ticker!, stockTimescale) : []),
    [isPublic, company.ticker, stockTimescale]
  );
  const fundingChartData = useMemo(() => buildFundingChartData(companyFunding), [companyFunding]);

  const currentPrice = stockData.length > 0 ? stockData[stockData.length - 1].price : 0;
  const startPrice = stockData.length > 0 ? stockData[0].price : 0;
  const priceChange = currentPrice - startPrice;
  const priceChangePct = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <CompanyProfileHero company={company} />

      {/* Tab Bar */}
      <div
        className="flex items-center gap-4 px-5 border-b overflow-x-auto"
        style={{ borderColor: "var(--color-border-subtle)", scrollbarWidth: "none" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="text-12 py-2.5 transition-all duration-200 border-b-[1.5px] whitespace-nowrap flex-shrink-0"
            style={{
              color: activeTab === tab ? "var(--color-accent)" : "var(--color-text-secondary)",
              borderBottomColor: activeTab === tab ? "var(--color-accent)" : "transparent",
              fontWeight: activeTab === tab ? 500 : 400,
            }}
          >
            {tab}
          </button>
        ))}
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
          {/* ============ OVERVIEW TAB ============ */}
          {activeTab === "Overview" && (
            <>
              {/* Stock Price Chart (public companies only) */}
              {isPublic && stockData.length > 0 && (
                <section className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity size={14} style={{ color: "var(--color-accent)" }} />
                      <h2 className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                        {company.ticker} · STOCK PRICE
                      </h2>
                    </div>
                    <div className="flex items-center gap-1">
                      {stockTimescales.map((ts) => (
                        <button
                          key={ts}
                          onClick={() => setStockTimescale(ts)}
                          className="text-10 font-medium px-2 py-1 rounded transition-all duration-150"
                          style={{
                            background: stockTimescale === ts ? "var(--color-accent)" : "transparent",
                            color: stockTimescale === ts ? "white" : "var(--color-text-tertiary)",
                          }}
                        >
                          {ts}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-[22px] font-medium tracking-tight" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}>
                      NOK {currentPrice.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-0.5 text-12 font-medium" style={{ color: priceChange >= 0 ? "var(--color-accent)" : "#c0392b" }}>
                      {priceChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {priceChange >= 0 ? "+" : ""}{priceChangePct.toFixed(1)}%
                    </span>
                    <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                      {stockTimescale}
                    </span>
                  </div>
                  <div className="h-[160px] rounded-lg overflow-hidden" style={{ background: "var(--color-bg-secondary)" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stockData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={priceChange >= 0 ? "#1a7a5e" : "#c0392b"} stopOpacity={0.15} />
                            <stop offset="100%" stopColor={priceChange >= 0 ? "#1a7a5e" : "#c0392b"} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <Tooltip
                          contentStyle={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)", borderRadius: 6, fontSize: 11 }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
formatter={((value: number) => [`NOK ${value.toFixed(2)}`, "Price"]) as any}
                        />
                        <Area type="monotone" dataKey="price" stroke={priceChange >= 0 ? "#1a7a5e" : "#c0392b"} strokeWidth={1.5} fill="url(#stockGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              {/* Investment Thesis / Summary */}
              {overview && (
                <section className="mb-5 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <h2 className="text-10 uppercase tracking-[0.5px] font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
                    INVESTMENT OVERVIEW
                  </h2>
                  <p className="text-12 mb-3" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
                    {overview.thesis}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <div className="text-10 uppercase tracking-[0.3px] font-medium mb-2" style={{ color: "var(--color-accent)" }}>Strengths</div>
                      <ul className="flex flex-col gap-1.5">
                        {overview.strengths.map((s, i) => (
                          <li key={i} className="text-11 flex items-start gap-1.5" style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                            <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: "var(--color-accent)" }} />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <div className="text-10 uppercase tracking-[0.3px] font-medium mb-2" style={{ color: "#b45309" }}>Risks</div>
                      <ul className="flex flex-col gap-1.5">
                        {overview.risks.map((r, i) => (
                          <li key={i} className="text-11 flex items-start gap-1.5" style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                            <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#b45309" }} />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              {/* Funding Rounds Chart */}
              {fundingChartData.length > 0 && (
                <section className="mb-5 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={14} style={{ color: "var(--color-accent)" }} />
                      <h2 className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                        FUNDING ROUNDS
                      </h2>
                    </div>
                    <button onClick={() => setActiveTab("Funding")} className="text-10" style={{ color: "var(--color-accent)" }}>
                      Details →
                    </button>
                  </div>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fundingChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} width={45} />
                        <Tooltip
                          contentStyle={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)", borderRadius: 6, fontSize: 11 }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
formatter={((value: number) => [`$${value}M`, "Amount"]) as any}
                        />
                        <Bar dataKey="amount" fill="#1a7a5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              {/* Key Metrics Row */}
              <section className="mb-5 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
                <h2 className="text-10 uppercase tracking-[0.5px] font-medium mb-3" style={{ color: "var(--color-text-secondary)" }}>
                  KEY METRICS
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-md px-3 py-2.5 border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>Programs</div>
                    <div className="text-[16px] font-medium" style={{ color: "var(--color-text-primary)" }}>{pipeline.length}</div>
                  </div>
                  <div className="rounded-md px-3 py-2.5 border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>Team Size</div>
                    <div className="text-[16px] font-medium" style={{ color: "var(--color-text-primary)" }}>{company.employees}</div>
                  </div>
                  <div className="rounded-md px-3 py-2.5 border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>Founded</div>
                    <div className="text-[16px] font-medium" style={{ color: "var(--color-text-primary)" }}>{company.founded}</div>
                  </div>
                  <div className="rounded-md px-3 py-2.5 border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
                    <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>{overview?.keyMetric || "Total Raised"}</div>
                    <div className="text-[16px] font-medium" style={{ color: "var(--color-accent)" }}>{overview?.keyMetricValue || formatCurrency(company.totalRaised)}</div>
                  </div>
                </div>
              </section>

              {/* Pipeline Quick View */}
              {pipeline.length > 0 && (
                <section className="mb-5 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                      PIPELINE SNAPSHOT
                    </h2>
                    <button onClick={() => setActiveTab("Pipeline")} className="text-10" style={{ color: "var(--color-accent)" }}>
                      Full pipeline →
                    </button>
                  </div>
                  {pipeline.slice(0, 2).map((p) => (
                    <PipelineBar key={p.name} name={p.name} indication={p.indication} stage={p.stage} isLead={p.isLead} nextCatalyst={p.nextCatalyst} />
                  ))}
                </section>
              )}

              {/* Express Interest CTA */}
              <section className="border-t pt-4 pb-4" style={{ borderColor: "var(--color-border-subtle)" }}>
                <Link
                  href="/signup"
                  className="block w-full py-2.5 rounded text-13 font-medium border transition-colors duration-150 text-center"
                  style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)", background: "transparent" }}
                >
                  Express Investment Interest
                </Link>
              </section>
            </>
          )}

          {/* ============ PIPELINE TAB ============ */}
          {activeTab === "Pipeline" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Drug Pipeline — {company.name}
                </h2>
              </div>

              {/* Pipeline stage summary */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="text-center">
                  <div className="text-[18px] font-medium" style={{ color: "var(--color-accent)" }}>{pipeline.length}</div>
                  <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>Programs</div>
                </div>
                <div className="text-center">
                  <div className="text-[18px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {pipeline.filter(p => p.stage !== "Pre-clinical").length}
                  </div>
                  <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>In clinic</div>
                </div>
                <div className="text-center">
                  <div className="text-[18px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {pipeline.filter(p => p.nextCatalyst).length}
                  </div>
                  <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>Upcoming catalysts</div>
                </div>
              </div>

              {/* Detailed pipeline cards */}
              {pipeline.map((p) => (
                <div key={p.name} className="mb-4 pb-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <PipelineBar name={p.name} indication={p.indication} stage={p.stage} isLead={p.isLead} nextCatalyst={p.nextCatalyst} />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {p.mechanism && (
                      <div>
                        <div className="text-10 uppercase tracking-[0.3px]" style={{ color: "var(--color-text-tertiary)" }}>Mechanism</div>
                        <div className="text-11" style={{ color: "var(--color-text-secondary)" }}>{p.mechanism}</div>
                      </div>
                    )}
                    {p.status && (
                      <div>
                        <div className="text-10 uppercase tracking-[0.3px]" style={{ color: "var(--color-text-tertiary)" }}>Status</div>
                        <div className="text-11" style={{ color: "var(--color-text-secondary)" }}>{p.status}</div>
                      </div>
                    )}
                    {p.nctId && (
                      <div>
                        <div className="text-10 uppercase tracking-[0.3px]" style={{ color: "var(--color-text-tertiary)" }}>NCT ID</div>
                        <a
                          href={`https://clinicaltrials.gov/study/${p.nctId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-11 flex items-center gap-1"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {p.nctId}
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {pipeline.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>No pipeline data available for this company yet.</p>
                  <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                    <Link href={`/claim/${company.slug}`} style={{ color: "var(--color-accent)" }}>Claim this profile</Link> to add pipeline information.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ============ FUNDING TAB ============ */}
          {activeTab === "Funding" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Funding History — {company.name}
                </h2>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="rounded-md px-3 py-2.5 border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
                  <div className="text-10 uppercase tracking-[0.3px] mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>Total Raised</div>
                  <div className="text-[16px] font-medium" style={{ color: "var(--color-accent)" }}>{formatCurrency(company.totalRaised)}</div>
                  {company.isEstimated && <div className="text-[9px]" style={{ color: "var(--color-text-tertiary)" }}>Estimated</div>}
                </div>
                <div className="rounded-md px-3 py-2.5 border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
                  <div className="text-10 uppercase tracking-[0.3px] mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>Rounds</div>
                  <div className="text-[16px] font-medium" style={{ color: "var(--color-text-primary)" }}>{companyFunding.length || "—"}</div>
                </div>
                <div className="rounded-md px-3 py-2.5 border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
                  <div className="text-10 uppercase tracking-[0.3px] mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>Last Round</div>
                  <div className="text-[16px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {companyFunding.length > 0 ? companyFunding[0].type : "—"}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {companyFunding.length > 0 ? (
                <FundingTimeline rounds={companyFunding} totalRaised={company.totalRaised} />
              ) : (
                <div className="py-8 text-center">
                  <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>No public funding records available.</p>
                  <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                    Total raised: {formatCurrency(company.totalRaised)} {company.isEstimated && "(estimated)"}
                  </p>
                </div>
              )}

              {/* Investor CTA */}
              <div className="mt-6 rounded-lg border p-4" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                <div className="text-12 font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Interested in investing?</div>
                <p className="text-11 mb-3" style={{ color: "var(--color-text-secondary)" }}>
                  Express your interest and we&apos;ll connect you with the company when they&apos;re raising.
                </p>
                <Link
                  href="/signup"
                  className="inline-block text-11 font-medium px-3 py-1.5 rounded text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  Express interest →
                </Link>
              </div>
            </section>
          )}

          {/* ============ TEAM TAB ============ */}
          {activeTab === "Team" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Leadership Team — {company.name}
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                {team.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                    style={{ borderColor: "var(--color-border-subtle)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--color-bg-tertiary)" }}
                    >
                      <span className="text-12 font-medium" style={{ color: "var(--color-text-secondary)" }}>
                        {member.initials}
                      </span>
                    </div>
                    <div>
                      <div className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {member.name}
                      </div>
                      <div className="text-11" style={{ color: "var(--color-accent)" }}>
                        {member.role}
                      </div>
                      {member.bio && (
                        <p className="text-11 mt-1" style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                          {member.bio}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--color-bg-secondary)" }}>
                <p className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
                  Team data sourced from public records and company websites.{" "}
                  <Link href={`/claim/${company.slug}`} style={{ color: "var(--color-accent)" }}>
                    Claim this profile
                  </Link>{" "}
                  to update team information.
                </p>
              </div>
            </section>
          )}

          {/* ============ PUBLICATIONS TAB ============ */}
          {activeTab === "Publications" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Publications — {company.name}
                </h2>
              </div>

              {publications.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {publications.map((pub) => (
                    <div
                      key={pub.title}
                      className="p-3 rounded-lg border"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                    >
                      <div className="text-12 font-medium mb-1" style={{ color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                        {pub.title}
                      </div>
                      <div className="flex items-center gap-2 text-11" style={{ color: "var(--color-text-secondary)" }}>
                        <span>{pub.authors}</span>
                        <span>·</span>
                        <span style={{ color: "var(--color-accent)" }}>{pub.journal}</span>
                        <span>·</span>
                        <span>{pub.date}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {pub.isPdf && (
                          <span
                            className="text-[9px] font-medium px-1.5 py-[2px] rounded-sm"
                            style={{ background: "#fff0f0", color: "#a32d2d", border: "0.5px solid #f09595" }}
                          >
                            PDF
                          </span>
                        )}
                        {pub.doi && (
                          <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                            DOI: {pub.doi}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>No publications tracked yet.</p>
                  <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                    <Link href={`/claim/${company.slug}`} style={{ color: "var(--color-accent)" }}>Claim this profile</Link> to add publications.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ============ NEWS TAB ============ */}
          {activeTab === "News" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Newspaper size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  News — {company.name}
                </h2>
              </div>

              {news.length > 0 ? (
                <div className="flex flex-col gap-0">
                  {news.map((item, i) => {
                    const badge = newsTypeBadge[item.type] || newsTypeBadge.Media;
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 py-3 border-b"
                        style={{ borderColor: "var(--color-border-subtle)" }}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <Calendar size={14} style={{ color: "var(--color-text-tertiary)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-12 font-medium mb-1" style={{ color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                            {item.title}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[9px] font-medium px-1.5 py-[2px] rounded-sm"
                              style={{ background: badge.bg, color: badge.text }}
                            >
                              {item.type}
                            </span>
                            <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                              {item.source}
                            </span>
                            <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                              {item.date}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>No news articles tracked yet.</p>
                  <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                    News monitoring is coming soon. <Link href="/news" style={{ color: "var(--color-accent)" }}>Learn more</Link>
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--color-bg-secondary)" }}>
                <p className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
                  News is aggregated from public sources. Coverage will expand as our AI news engine launches.
                </p>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[260px] border-t lg:border-t-0">
          {/* Company Info */}
          <div className="px-3.5 py-3 border-b">
            <h3 className="text-10 uppercase tracking-[0.5px] font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
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
                  <span className="text-11" style={{ color: "var(--color-text-secondary)" }}>{item.label}</span>
                  <span className="text-11 font-medium text-right" style={{ color: "var(--color-text-primary)" }}>{item.value}</span>
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
