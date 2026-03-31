"use client";
import { useState } from "react";

interface Props {
  confidence: string | null;
  sourceName: string | null;
  compact?: boolean; // true = dot only (mobile/tight spaces)
}

interface BadgeConfig {
  label: string;
  icon: string;
  bg: string;
  text: string;
  tooltip: string;
}

function getConfig(
  confidence: string | null,
  sourceName: string | null
): BadgeConfig | null {
  if (!confidence) return null;

  if (confidence === "official") {
    return {
      label: "Verified",
      icon: "✓",
      bg: "#f0fdf4",
      text: "#166534",
      tooltip: sourceName === "nih_reporter"
        ? "Source: NIH Reporter (official government data)"
        : `Source: ${sourceName || "Official record"}`,
    };
  }

  if (confidence === "scraped") {
    return {
      label: "Reported",
      icon: "◉",
      bg: "#eff6ff",
      text: "#1e40af",
      tooltip: sourceName === "fiercebiotech"
        ? "Source: FierceBiotech (industry news)"
        : `Source: ${sourceName || "News report"}`,
    };
  }

  if (confidence === "estimated") {
    return {
      label: "Estimated",
      icon: "~",
      bg: "#fffbeb",
      text: "#b45309",
      tooltip: sourceName === "deepseek"
        ? "AI estimate (DeepSeek) — amounts and investors may be approximate"
        : `Source: ${sourceName || "AI estimate"}`,
    };
  }

  if (confidence === "filing_only") {
    return {
      label: "Filing",
      icon: "▪",
      bg: "#f3f4f6",
      text: "#6b7280",
      tooltip: "SEC EDGAR filing — round type detected from filing, amounts not available",
    };
  }

  if (confidence === "ai_enriched") {
    return {
      label: "AI",
      icon: "~",
      bg: "#fffbeb",
      text: "#b45309",
      tooltip: `AI-enriched data — ${sourceName ? `from ${sourceName}` : "may be approximate"}`,
    };
  }

  return null;
}

export function ConfidenceBadge({ confidence, sourceName, compact }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = getConfig(confidence, sourceName);

  if (!config) return null;

  if (compact) {
    return (
      <span
        className="relative inline-flex"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span
          className="inline-block rounded-full"
          style={{
            width: 6,
            height: 6,
            backgroundColor: config.text,
            opacity: 0.6,
          }}
          title={config.tooltip}
        />
        {showTooltip && <Tooltip text={config.tooltip} />}
      </span>
    );
  }

  return (
    <span
      className="relative inline-flex items-center gap-0.5 rounded px-1 py-px"
      style={{
        fontSize: 9,
        fontWeight: 500,
        background: config.bg,
        color: config.text,
        lineHeight: 1.4,
        letterSpacing: "0.2px",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span style={{ fontSize: 8 }}>{config.icon}</span>
      {config.label}
      {showTooltip && <Tooltip text={config.tooltip} />}
    </span>
  );
}

function Tooltip({ text }: { text: string }) {
  return (
    <span
      className="absolute z-50 pointer-events-none"
      style={{
        bottom: "calc(100% + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--color-bg-primary)",
        border: "0.5px solid var(--color-border-medium)",
        borderRadius: 6,
        padding: "5px 8px",
        fontSize: 11,
        lineHeight: 1.4,
        color: "var(--color-text-secondary)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        whiteSpace: "normal",
        width: 220,
        textAlign: "center",
      }}
    >
      {text}
    </span>
  );
}
