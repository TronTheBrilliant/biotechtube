import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { ArrowRight, Download, Eye } from "lucide-react";

export const metadata: Metadata = {
  title: "Templates — BiotechTube",
  description: "Premium biotech website templates. Buy, hand to Claude Code, deploy to Vercel.",
};

const templates = [
  {
    name: "Helix",
    description: "Dark, science-forward design for clinical-stage biotechs. Built for companies with serious pipeline data who want to look the part.",
    price: "$399",
    stack: ["Next.js", "Sanity CMS"],
    includes: ["Code", "Figma", "Manual"],
    gradient: "linear-gradient(135deg, #0a1a14 0%, #0a3d2e 50%, #1a7a5e 100%)",
  },
  {
    name: "Catalyst",
    description: "Clean white aesthetic for diagnostics and medtech companies. Minimal, precise, and trust-building. Ideal for regulatory-focused companies.",
    price: "$299",
    stack: ["Next.js", "Tailwind"],
    includes: ["Code", "Figma", "Manual"],
    gradient: "linear-gradient(135deg, #f7f7f6 0%, #e8f5f0 50%, #5DCAA5 100%)",
  },
  {
    name: "Atlas",
    description: "Data-rich layout for genomics and bioinformatics companies. Designed to showcase datasets, publications, and technical depth.",
    price: "$349",
    stack: ["Next.js", "Tailwind"],
    includes: ["Code", "Figma", "Manual"],
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #93c5fd 100%)",
  },
];

const steps = [
  {
    number: "1",
    title: "Buy the template",
    description: "Download the GitHub repo with all source code, Figma files, and a setup manual.",
  },
  {
    number: "2",
    title: "Open Claude Code",
    description: 'Say "Build my website using this repo as the base" — Claude handles the customisation.',
  },
  {
    number: "3",
    title: "Deploy to Vercel",
    description: "Push to GitHub, connect to Vercel, and your biotech website is live in minutes.",
  },
];

export default function TemplatesPage() {
  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      {/* Hero */}
      <div className="px-5 pt-7 pb-5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
        <span
          className="text-10 uppercase tracking-[0.5px] font-medium"
          style={{ color: "var(--color-accent)" }}
        >
          WEBSITE TEMPLATES
        </span>
        <h1
          className="text-[24px] font-medium tracking-tight mt-1"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.4px" }}
        >
          Premium biotech websites, ready to build
        </h1>
        <p className="text-13 mt-1 max-w-[600px]" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
          Buy the template, hand it to Claude Code, deploy to Vercel. Every template includes source code, Figma files, and a setup manual.
        </p>
      </div>

      {/* Full Width Content */}
      <div className="px-5 py-6 max-w-[960px] mx-auto">

        {/* Template Showcase */}
        <section className="mb-8">
          <h2
            className="text-10 uppercase tracking-[0.5px] font-medium mb-4"
            style={{ color: "var(--color-text-secondary)" }}
          >
            TEMPLATES
          </h2>
          <div className="flex flex-col gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.name}
                className="rounded-xl overflow-hidden border transition-all duration-150 hover:border-[var(--color-border-medium)]"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                {/* Preview Area */}
                <div
                  className="h-[180px] sm:h-[220px] relative"
                  style={{ background: tpl.gradient }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="text-[28px] font-medium tracking-tight"
                      style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "-0.6px" }}
                    >
                      {tpl.name}
                    </span>
                  </div>
                </div>
                {/* Details */}
                <div className="px-4 py-4 sm:flex sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0 sm:pr-4">
                    <h3
                      className="text-[16px] font-medium tracking-tight mb-1"
                      style={{ color: "var(--color-text-primary)", letterSpacing: "-0.2px" }}
                    >
                      {tpl.name}
                    </h3>
                    <p
                      className="text-12 mb-3"
                      style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}
                    >
                      {tpl.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 sm:mb-0">
                      {tpl.stack.map((s) => (
                        <span
                          key={s}
                          className="text-10 px-2 py-[3px] rounded-sm border"
                          style={{
                            background: "var(--color-bg-secondary)",
                            color: "var(--color-text-secondary)",
                            borderColor: "var(--color-border-subtle)",
                            borderWidth: "0.5px",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                      {tpl.includes.map((inc) => (
                        <span
                          key={inc}
                          className="text-10 px-2 py-[3px] rounded-sm border"
                          style={{
                            background: "#e8f5f0",
                            color: "#0a3d2e",
                            borderColor: "#5DCAA5",
                            borderWidth: "0.5px",
                          }}
                        >
                          {inc}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-2">
                    <span
                      className="text-[20px] font-medium tracking-tight"
                      style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
                    >
                      {tpl.price}
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="flex items-center gap-1 text-11 font-medium px-3 py-1.5 rounded border transition-colors duration-150"
                        style={{
                          borderColor: "var(--color-border-medium)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        <Eye size={12} />
                        Preview
                      </button>
                      <button
                        className="flex items-center gap-1 text-11 font-medium px-3 py-1.5 rounded text-white transition-colors duration-150"
                        style={{ background: "var(--color-accent)" }}
                      >
                        <Download size={12} />
                        Get the code
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-8 border-t pt-6" style={{ borderColor: "var(--color-border-subtle)" }}>
          <h2
            className="text-10 uppercase tracking-[0.5px] font-medium mb-4"
            style={{ color: "var(--color-text-secondary)" }}
          >
            HOW IT WORKS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-12 font-medium"
                  style={{ background: "var(--color-accent)", color: "white" }}
                >
                  {step.number}
                </div>
                <div>
                  <div
                    className="text-13 font-medium mb-[2px]"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {step.title}
                  </div>
                  <p className="text-11" style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Done For You */}
        <section className="mb-6 border-t pt-6" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div
            className="rounded-xl overflow-hidden border"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <div className="px-5 py-4" style={{ background: "#0a3d2e" }}>
              <div className="text-[18px] font-medium tracking-tight" style={{ color: "#5DCAA5", letterSpacing: "-0.3px" }}>
                Want us to build it for you?
              </div>
              <div className="mt-1">
                <span className="text-11" style={{ color: "rgba(93,202,165,0.7)" }}>From </span>
                <span className="text-[22px] font-medium tracking-tight" style={{ color: "#5DCAA5", letterSpacing: "-0.5px" }}>
                  $2,500
                </span>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-13 mb-2" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
                We handle everything — design customisation, content integration, and deployment. You get a production-ready biotech website without writing a line of code.
              </p>
              <p className="text-11 mb-4" style={{ color: "var(--color-text-tertiary)" }}>
                Full brand identity package (site + logo + animations) from $10,000
              </p>
              <button
                className="flex items-center gap-1.5 text-13 font-medium px-4 py-2.5 rounded text-white transition-colors duration-150"
                style={{ background: "var(--color-accent)" }}
              >
                Get in touch
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        className="flex items-center justify-center h-10 border-t text-10"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        BiotechTube &copy; 2026 &middot; Global Biotech Intelligence
      </footer>
    </div>
  );
}
