"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useDashboard } from "@/app/manage/layout";

const supabase = createBrowserClient();

interface ViewStat {
  date: string;
  count: number;
}

interface SourceCount {
  source: string;
  count: number;
}

/* ─── SVG Area Chart ─── */
function AreaChart({ data, height = 100 }: { data: ViewStat[]; height?: number }) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          color: "var(--color-text-tertiary)",
        }}
      >
        No views yet
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 100; // viewBox units
  const h = height;
  const pad = 4;
  const step = (w - pad * 2) / (data.length - 1);

  const points = data.map((d, i) => ({
    x: pad + i * step,
    y: h - pad - ((d.count / max) * (h - pad * 2)),
  }));

  // Build smooth path
  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
    >
      {/* Fill */}
      <path d={areaPath} fill="#1a7a5e" fillOpacity={0.08} />
      {/* Stroke */}
      <path
        d={linePath}
        fill="none"
        stroke="#1a7a5e"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function AnalyticsPage() {
  const { company } = useDashboard();

  const [viewStats, setViewStats] = useState<ViewStat[]>([]);
  const [sourceCounts, setSourceCounts] = useState<SourceCount[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: viewsData } = await supabase
      .from("profile_views")
      .select("viewed_at, source")
      .eq("company_id", company.id)
      .gte("viewed_at", thirtyDaysAgo.toISOString());

    if (viewsData) {
      setTotalViews(viewsData.length);

      const byDay: Record<string, number> = {};
      const bySource: Record<string, number> = {};

      viewsData.forEach((v: { viewed_at: string; source: string | null }) => {
        const day = v.viewed_at.slice(0, 10);
        byDay[day] = (byDay[day] || 0) + 1;
        const src = v.source || "direct";
        bySource[src] = (bySource[src] || 0) + 1;
      });

      // Fill all 30 days
      const stats: ViewStat[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        stats.push({ date: key, count: byDay[key] || 0 });
      }
      setViewStats(stats);

      setSourceCounts(
        Object.entries(bySource)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
      );
    } else {
      // Still fill empty days
      const stats: ViewStat[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        stats.push({ date: d.toISOString().slice(0, 10), count: 0 });
      }
      setViewStats(stats);
    }

    setLoading(false);
  }, [company.id]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
        <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          Analytics
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            marginTop: 4,
          }}
        >
          Profile views over the last 30 days
        </p>
      </div>

      {/* Total views stat */}
      <div
        style={{
          background: "var(--color-bg-secondary)",
          border: "0.5px solid var(--color-border-subtle)",
          borderRadius: 8,
          padding: "12px 14px",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <Eye size={16} style={{ color: "var(--color-text-tertiary)" }} />
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--color-text-tertiary)",
              marginBottom: 2,
            }}
          >
            Total Views (30 days)
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.5px",
            }}
          >
            {totalViews.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Chart + sources grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 16,
        }}
      >
        {/* Area chart */}
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: "14px 16px",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Views over time
          </p>

          <AreaChart data={viewStats} height={120} />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <span
              style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}
            >
              {viewStats[0] ? formatDate(viewStats[0].date) : ""}
            </span>
            <span
              style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}
            >
              {viewStats[viewStats.length - 1]
                ? formatDate(viewStats[viewStats.length - 1].date)
                : ""}
            </span>
          </div>
        </div>

        {/* Source breakdown */}
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: "14px 16px",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Traffic sources
          </p>

          {sourceCounts.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0 }}>
              No source data yet
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sourceCounts.map((s) => (
                <div key={s.source}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        textTransform: "capitalize",
                      }}
                    >
                      {s.source}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {s.count}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 3,
                      borderRadius: 2,
                      background: "var(--color-bg-primary)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 2,
                        background: "#1a7a5e",
                        width: `${Math.max(
                          (s.count / (sourceCounts[0]?.count || 1)) * 100,
                          5
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
