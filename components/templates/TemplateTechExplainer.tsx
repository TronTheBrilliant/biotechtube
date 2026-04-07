"use client";
import { useMemo } from "react";
import { Dna, Package, Factory, Layers, Shield, Lightbulb, Crosshair, Cpu } from "lucide-react";
import { useScrollReveal } from "@/lib/hooks";

interface Props {
  technologyText: string;
  competitiveLandscape: string | null;
  brandColor: string;
}

interface TechStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function getStepIcon(title: string, brandColor: string): React.ReactNode {
  const lower = title.toLowerCase();
  const size = 28;
  const style = { color: brandColor };
  if (lower.includes("mrna") || lower.includes("rna") || lower.includes("design") || lower.includes("sequence")) return <Dna size={size} style={style} />;
  if (lower.includes("lipid") || lower.includes("nanoparticle") || lower.includes("delivery") || lower.includes("lnp")) return <Package size={size} style={style} />;
  if (lower.includes("manufactur") || lower.includes("production") || lower.includes("scale")) return <Factory size={size} style={style} />;
  if (lower.includes("modalit") || lower.includes("platform") || lower.includes("application")) return <Layers size={size} style={style} />;
  if (lower.includes("immune") || lower.includes("safety") || lower.includes("tolerab")) return <Shield size={size} style={style} />;
  if (lower.includes("target") || lower.includes("precision") || lower.includes("specific")) return <Crosshair size={size} style={style} />;
  if (lower.includes("digital") || lower.includes("ai") || lower.includes("comput")) return <Cpu size={size} style={style} />;
  return <Lightbulb size={size} style={style} />;
}

function parseTechSteps(text: string, brandColor: string): TechStep[] {
  const lines = text.split("\n").filter((l) => l.trim().startsWith("*") || l.trim().startsWith("-"));
  if (lines.length < 2) return [];

  return lines.map((line) => {
    const clean = line.replace(/^\s*[\*\-]\s*/, "").replace(/\*\*/g, "");
    const colonIdx = clean.indexOf(":");
    if (colonIdx > 0 && colonIdx < 60) {
      const title = clean.slice(0, colonIdx).trim();
      const description = clean.slice(colonIdx + 1).trim();
      return { title, description, icon: getStepIcon(title, brandColor) };
    }
    return { title: clean.slice(0, 40), description: clean, icon: getStepIcon(clean, brandColor) };
  });
}

function StepCard({ step, index, total, brandColor }: { step: TechStep; index: number; total: number; brandColor: string }) {
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <div className="flex flex-col items-center relative">
      <div
        ref={ref}
        className="rounded-2xl p-6 w-full transition-all"
        style={{
          background: "var(--color-bg-primary)",
          border: "0.5px solid var(--color-border-subtle)",
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(24px)",
          transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.15}s`,
        }}
      >
        {/* Step number + icon */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${brandColor}10` }}
          >
            {step.icon}
          </div>
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Step {index + 1}
          </span>
        </div>

        <h4 style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 8, lineHeight: 1.3 }}>
          {step.title}
        </h4>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
          {step.description}
        </p>
      </div>

      {/* Connecting arrow (desktop only, not on last card) */}
      {index < total - 1 && (
        <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke={brandColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function TemplateTechExplainer({ technologyText, competitiveLandscape, brandColor }: Props) {
  const steps = useMemo(() => parseTechSteps(technologyText, brandColor), [technologyText, brandColor]);

  return (
    <section id="technology" className="py-20 sm:py-28">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex items-center gap-2">
          <Dna size={14} style={{ color: brandColor }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: brandColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Technology
          </span>
        </div>
        <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          How It Works
        </h2>
        <p className="mt-3 max-w-xl" style={{ fontSize: 16, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          A step-by-step look at the technology platform powering the pipeline.
        </p>

        {/* Visual step flow — horizontal scrollable gallery */}
        {steps.length >= 2 && (
          <div className="mt-12 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
            <div className="flex gap-5" style={{ minWidth: steps.length * 300 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ width: 280, flexShrink: 0 }}>
                  <StepCard step={step} index={i} total={steps.length} brandColor={brandColor} />
                </div>
              ))}
            </div>
            {/* Scroll hint on mobile */}
            <div className="sm:hidden text-center mt-3">
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Swipe to explore →</span>
            </div>
          </div>
        )}

        {/* Full technology text (for depth) */}
        <div className="mt-16 max-w-3xl">
          <h3 className="mb-6" style={{ fontSize: 20, fontWeight: 400, color: "var(--color-text-primary)" }}>
            Platform Deep Dive
          </h3>
          {technologyText.split("\n\n").map((paragraph, i) => {
            // Skip bullet points (already shown as step cards)
            if (paragraph.trim().startsWith("*") || paragraph.trim().startsWith("-")) return null;
            const clean = paragraph.replace(/\*\*/g, "").trim();
            if (!clean) return null;
            return (
              <p key={i} className="mb-5" style={{ fontSize: 15, lineHeight: 1.85, color: "var(--color-text-secondary)" }}>
                {clean}
              </p>
            );
          })}
        </div>

        {/* Competitive position */}
        {competitiveLandscape && (
          <div className="mt-12 p-6 rounded-xl" style={{ background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={14} style={{ color: brandColor }} />
              <h4 style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Competitive Position</h4>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--color-text-secondary)" }}>
              {competitiveLandscape}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
