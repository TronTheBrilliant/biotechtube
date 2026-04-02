import {
  Users, TrendingUp, Beaker, FileText,
  Globe, Monitor,
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
  if (score >= 80) return "var(--color-text-primary)";
  if (score >= 50) return "#b58a1b";
  return "#c45a5a";
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
