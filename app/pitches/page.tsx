import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { Company, FundingRound } from "@/lib/types";
import { Play, ArrowRight } from "lucide-react";

import companiesData from "@/data/companies.json";
import fundingData from "@/data/funding.json";

export const metadata: Metadata = {
  title: "Pitches — BiotechTube",
  description: "Watch biotech company pitches and editorial posts from industry leaders.",
};

const companies = companiesData as Company[];
const funding = fundingData as FundingRound[];

const videoPitches = [
  {
    company: "Oncoinvent AS",
    slug: "oncoinvent",
    description: "Alpha-emitting microparticle therapy for peritoneal cancers — Phase 2 update and investor overview.",
    tag: "Radiopharmaceuticals",
    tagColor: { bg: "#fef3e2", text: "#b45309", border: "#fcd34d" },
    gradient: "linear-gradient(135deg, #064e3b 0%, #059669 100%)",
    duration: "12:34",
    views: 1420,
  },
  {
    company: "Nykode Therapeutics",
    slug: "nykode-therapeutics",
    description: "DNA vaccine platform for cancer immunotherapy — clinical pipeline and upcoming catalysts.",
    tag: "Immunotherapy",
    tagColor: { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
    duration: "8:47",
    views: 983,
  },
  {
    company: "Lytix Biopharma",
    slug: "lytix-biopharma",
    description: "Oncolytic peptides that destroy tumour cells and activate systemic immune responses.",
    tag: "Oncology",
    tagColor: { bg: "#fff0f0", text: "#a32d2d", border: "#f09595" },
    gradient: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)",
    duration: "10:15",
    views: 756,
  },
  {
    company: "Zelluna Immunotherapy",
    slug: "zelluna-immunotherapy",
    description: "TCR-engineered T-cell therapy platform targeting solid tumours — preclinical data review.",
    tag: "Cell Therapy",
    tagColor: { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
    gradient: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    duration: "6:22",
    views: 412,
  },
];

const editorialPosts = [
  {
    company: "PCI Biotech",
    slug: "pci-biotech",
    title: "Why photochemical internalisation could change drug delivery",
    excerpt: "PCI Biotech's Fimaporfin uses light-activated technology to enhance the intracellular delivery of drugs — a platform with broad oncology applications.",
    date: "Mar 12, 2026",
    readTime: "4 min read",
    views: 328,
    gradient: "linear-gradient(135deg, #b45309 0%, #d97706 100%)",
  },
  {
    company: "Caedo Oncology",
    slug: "caedo-oncology",
    title: "First-in-class antibodies for immune escape in solid tumours",
    excerpt: "Caedo Oncology is developing monoclonal antibodies that target a previously undruggable mechanism of immune evasion in solid tumours.",
    date: "Mar 5, 2026",
    readTime: "5 min read",
    views: 214,
    gradient: "linear-gradient(135deg, #059669 0%, #34d399 100%)",
  },
];

const pricingOptions = [
  {
    title: "Video Pitch",
    price: "$1,000",
    period: "/ listing",
    description: "30-day featured video pitch on the Pitches page. Seen by investors browsing biotech opportunities.",
  },
  {
    title: "Editorial Post",
    price: "$800",
    period: "/ post",
    description: "Permanent sponsored editorial on BiotechTube. SEO-indexed, linked from your company profile.",
  },
  {
    title: "Featured Pitch",
    price: "$2,500",
    period: "/ month",
    description: "Homepage placement + weekly newsletter feature. Maximum visibility to our investor audience.",
  },
  {
    title: "Pitch Bundle",
    price: "$1,500",
    period: "total",
    description: "Video pitch + editorial post combined. Best value for companies telling their full story.",
  },
];

export default function PitchesPage() {
  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      {/* Hero */}
      <div className="px-5 pt-7 pb-5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
        <span
          className="text-10 uppercase tracking-[0.5px] font-medium"
          style={{ color: "var(--color-accent)" }}
        >
          FEATURED PITCHES
        </span>
        <h1
          className="text-[32px] font-medium tracking-tight mt-1"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
        >
          Biotech companies, in their own words
        </h1>
        <p className="text-13 mt-1" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
          Video pitches and editorial posts from biotech companies reaching 25,000+ monthly investors and industry professionals.
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
        <div className="px-5 py-4 min-w-0 lg:border-r" style={{ borderColor: "var(--color-border-subtle)" }}>

          {/* Video Pitches */}
          <section className="mb-6">
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              VIDEO PITCHES
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {videoPitches.map((pitch) => (
                <div
                  key={pitch.slug}
                  className="rounded-lg overflow-hidden border cursor-pointer transition-all duration-150 hover:border-[var(--color-border-medium)]"
                  style={{ borderColor: "var(--color-border-subtle)" }}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative h-[100px] flex items-center justify-center"
                    style={{ background: pitch.gradient }}
                  >
                    {/* Play button */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(255,255,255,0.15)",
                        border: "1px solid rgba(255,255,255,0.3)",
                      }}
                    >
                      <Play size={16} fill="white" color="white" />
                    </div>
                    {/* Type badge */}
                    <span
                      className="absolute top-2 left-2 text-[9px] font-medium px-[7px] py-[2px] rounded-sm text-white"
                      style={{ background: "rgba(0,0,0,0.4)" }}
                    >
                      Video Pitch
                    </span>
                    {/* Duration */}
                    <span
                      className="absolute top-2 right-2 text-[9px]"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {pitch.duration}
                    </span>
                  </div>
                  {/* Body */}
                  <div className="px-3 py-2.5">
                    <div
                      className="text-12 font-medium mb-[2px]"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {pitch.company}
                    </div>
                    <p
                      className="text-11 mb-2 line-clamp-2"
                      style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
                    >
                      {pitch.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-11 px-2 py-[3px] rounded-sm border"
                        style={{
                          background: pitch.tagColor.bg,
                          color: pitch.tagColor.text,
                          borderColor: pitch.tagColor.border,
                          borderWidth: "0.5px",
                          fontWeight: 400,
                        }}
                      >
                        {pitch.tag}
                      </span>
                      <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                        {pitch.views.toLocaleString()} views
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Editorial Posts */}
          <section className="mb-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              EDITORIAL POSTS
            </h2>
            <div className="flex flex-col gap-3">
              {editorialPosts.map((post) => (
                <div
                  key={post.slug}
                  className="flex gap-3 py-3 border-b cursor-pointer transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
                  style={{ borderColor: "var(--color-border-subtle)" }}
                >
                  <div
                    className="w-[80px] h-[60px] rounded-md flex-shrink-0"
                    style={{ background: post.gradient }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-13 font-medium mb-[2px] line-clamp-2"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {post.title}
                    </div>
                    <div className="text-10 mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                      {post.company} · <span style={{ color: "var(--color-accent)" }}>Sponsored post</span>
                    </div>
                    <p
                      className="text-11 line-clamp-2 mb-1"
                      style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
                    >
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-2 text-10" style={{ color: "var(--color-text-tertiary)" }}>
                      <span>{post.date}</span>
                      <span>·</span>
                      <span>{post.readTime}</span>
                      <span>·</span>
                      <span>{post.views} views</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Submit Your Pitch */}
          <section className="mb-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-1"
              style={{ color: "var(--color-accent)" }}
            >
              SUBMIT YOUR PITCH
            </h2>
            <h3
              className="text-[18px] font-medium tracking-tight mb-1"
              style={{ color: "var(--color-text-primary)", letterSpacing: "-0.3px" }}
            >
              Get in front of 25,000+ biotech investors
            </h3>
            <p className="text-12 mb-4" style={{ color: "var(--color-text-secondary)" }}>
              Your pitch is seen by investors, analysts, and industry professionals actively tracking the biotech space.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              {pricingOptions.map((opt) => (
                <div
                  key={opt.title}
                  className="rounded-lg border px-3.5 py-3 transition-all duration-150 hover:border-[var(--color-accent)]"
                  style={{ borderColor: "var(--color-border-subtle)" }}
                >
                  <div
                    className="text-12 font-medium mb-[2px]"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {opt.title}
                  </div>
                  <div className="mb-2">
                    <span
                      className="text-[18px] font-medium tracking-tight"
                      style={{ color: "var(--color-text-primary)", letterSpacing: "-0.3px" }}
                    >
                      {opt.price}
                    </span>
                    <span className="text-11 ml-1" style={{ color: "var(--color-text-secondary)" }}>
                      {opt.period}
                    </span>
                  </div>
                  <p className="text-11" style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    {opt.description}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/submit-pitch"
              className="inline-flex items-center gap-1.5 text-13 font-medium px-4 py-2.5 rounded text-white transition-colors duration-150"
              style={{ background: "var(--color-accent)" }}
            >
              Submit your pitch
              <ArrowRight size={14} />
            </Link>
          </section>
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
