"use client";

import { useState, useEffect, useRef } from "react";
import {
  Users, TrendingUp, Beaker, FileText,
  Globe, Monitor, Check, Loader2, AlertCircle, AlertTriangle,
} from "lucide-react";

// ─── Constants ───

export const ADMIN_EMAIL = "trond@biotechtube.io";

export const AGENT_IDS = ["profiles", "financial", "pipeline", "content", "seo", "ux"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_META: Record<string, { name: string; icon: React.ReactNode; description: string }> = {
  profiles: { name: "Profiles", icon: <Users size={18} />, description: "Crawls company profiles, fact-checks data, fills missing fields" },
  financial: { name: "Financial", icon: <TrendingUp size={18} />, description: "Checks price freshness, detects market cap anomalies" },
  pipeline: { name: "Pipeline", icon: <Beaker size={18} />, description: "Enriches pipeline data, fills missing indications and stages" },
  content: { name: "Content", icon: <FileText size={18} />, description: "Monitors news and blog freshness, checks for weekly recaps" },
  seo: { name: "SEO", icon: <Globe size={18} />, description: "Generates meta descriptions and Open Graph tags for company pages" },
  ux: { name: "UX", icon: <Monitor size={18} />, description: "Checks error reports, spot-checks page availability" },
};

// ─── Types ───

export interface AgentStatus {
  agent_id: string;
  enabled: boolean;
  schedule_cron: string;
  batch_size: number;
  health_score: number;
  health_summary: string;
  latest_run: AgentRun | null;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  items_scanned: number;
  items_fixed: number;
  issues_found: number;
  summary: string | null;
  triggered_by: string;
}

export interface AgentFix {
  id: string;
  run_id: string;
  entity_type: string;
  entity_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  confidence: number | null;
  created_at: string;
}

// ─── Utilities ───

export function scoreColor(score: number): string {
  if (score >= 80) return "var(--color-accent)";
  if (score >= 60) return "#ca8a04";
  if (score >= 40) return "#ea580c";
  return "#dc2626";
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (d < 1) return "Just now";
  if (d < 60) return `${d}m ago`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function cronToHuman(cron: string): string {
  const parts = cron.split(" ");
  const hour = parts[1] || "*";
  const dow = parts[4] || "*";
  if (dow !== "*") return "Weekly";
  if (hour.startsWith("*/")) return `Every ${hour.replace("*/", "")}h`;
  if (hour === "0") return "Daily";
  return cron;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Shared Color Constants ───

export const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  funding_deal: { label: "Funding", color: "#059669" },
  clinical_trial: { label: "Clinical Trial", color: "#2563eb" },
  market_analysis: { label: "Market", color: "#7c3aed" },
  company_deep_dive: { label: "Spotlight", color: "#ea580c" },
  weekly_roundup: { label: "Roundup", color: "#ca8a04" },
  breaking_news: { label: "Breaking", color: "#dc2626" },
  science_essay: { label: "Deep Science", color: "#0891b2" },
  innovation_spotlight: { label: "Innovation", color: "#d946ef" },
};

export const STATUS_COLORS: Record<string, string> = {
  published: "#22c55e",
  in_review: "#eab308",
  draft: "#9ca3af",
  archived: "#ef4444",
};

export const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#22c55e",
  medium: "#eab308",
  low: "#ef4444",
};

// ─── ConfirmDialog ───

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus confirm button when dialog opens
    setTimeout(() => confirmRef.current?.focus(), 0);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-bg-primary)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
          width: "90vw",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        }}
      >
        <h3 style={{
          fontSize: 16,
          fontWeight: 600,
          margin: "0 0 8px",
          color: "var(--color-text-primary)",
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: 14,
          color: "var(--color-text-secondary)",
          margin: "0 0 20px",
          lineHeight: 1.5,
        }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: 6,
              color: "var(--color-text-secondary)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              background: isDanger ? "#dc2626" : "var(--color-text-primary)",
              border: "none",
              borderRadius: 6,
              color: isDanger ? "#fff" : "var(--color-bg-primary)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SaveIndicator ───

interface SaveIndicatorProps {
  status: "saved" | "saving" | "unsaved" | "error";
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (status === "saved") {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
    setVisible(true);
  }, [status]);

  if (!visible) return null;

  const config: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    saved: {
      color: "var(--color-accent)",
      label: "Saved",
      icon: <Check size={12} />,
    },
    saving: {
      color: "var(--color-text-tertiary)",
      label: "Saving...",
      icon: <Loader2 size={12} className="animate-spin" />,
    },
    unsaved: {
      color: "#ca8a04",
      label: "Unsaved changes",
      icon: <AlertTriangle size={12} />,
    },
    error: {
      color: "#dc2626",
      label: "Save failed",
      icon: <AlertCircle size={12} />,
    },
  };

  const { color, label, icon } = config[status];

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 12,
      color,
    }}>
      {icon}
      {label}
    </span>
  );
}
