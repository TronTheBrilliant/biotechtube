"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/admin-utils";
import { AdminNav } from "@/components/admin/AdminNav";
import { Loader2, Search, DollarSign } from "lucide-react";

interface DashboardData {
  todayCount: number;
  todayCostUsd: number;
  last7Days: { date: string; count: number; costUsd: number }[];
  last7DaysCount: number;
  last7DaysCostUsd: number;
  last30DaysCount: number;
  last30DaysCostUsd: number;
  topQueries: { query: string; count: number }[];
}

export default function ChatToolsClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.email !== ADMIN_EMAIL) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/chat-tools")
      .then((r) => (r.ok ? r.json() : r.json().then((b) => Promise.reject(b))))
      .then((d: DashboardData) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.error || "Failed to load");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  if (authLoading || (!user && !error)) {
    return (
      <main style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
        <Nav />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 80 }}>
          <Loader2 className="animate-spin" size={20} style={{ color: "var(--color-text-tertiary)" }} />
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
          Chat Tools — Spend
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", marginBottom: 24 }}>
          Web-search invocations from the Ask BiotechTube chatbot. Firecrawl-billed.
        </p>
        <AdminNav />

        {error && (
          <div style={{
            padding: 12, borderRadius: 6, border: "1px solid #fca5a5",
            background: "#fef2f2", color: "#991b1b", fontSize: 13, marginBottom: 24,
          }}>
            {error}
          </div>
        )}

        {loading && !data && (
          <div style={{ padding: 80, display: "flex", justifyContent: "center" }}>
            <Loader2 className="animate-spin" size={20} style={{ color: "var(--color-text-tertiary)" }} />
          </div>
        )}

        {data && (
          <>
            {/* KPI tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              <Tile label="Today" count={data.todayCount} cost={data.todayCostUsd} />
              <Tile label="Last 7 days" count={data.last7DaysCount} cost={data.last7DaysCostUsd} />
              <Tile label="Last 30 days" count={data.last30DaysCount} cost={data.last30DaysCostUsd} />
            </div>

            {/* 7-day sparkline (simple bars) */}
            <Section title="Last 7 days">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                {data.last7Days.map((d) => {
                  const max = Math.max(1, ...data.last7Days.map((x) => x.count));
                  const h = Math.max(2, (d.count / max) * 90);
                  return (
                    <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div title={`${d.count} calls · $${d.costUsd.toFixed(3)}`}
                        style={{
                          width: "100%",
                          height: h,
                          background: "var(--color-accent)",
                          borderRadius: 4,
                          opacity: d.count === 0 ? 0.2 : 0.85,
                        }}
                      />
                      <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                        {d.date.slice(5)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                        {d.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Top queries */}
            <Section title="Top web_search queries (last 30 days, lowercased)">
              {data.topQueries.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", padding: "8px 0" }}>
                  No queries yet.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border-subtle)", textAlign: "left" }}>
                      <th style={{ padding: "8px 0", fontWeight: 500, color: "var(--color-text-secondary)", width: 60 }}>#</th>
                      <th style={{ padding: "8px 0", fontWeight: 500, color: "var(--color-text-secondary)" }}>Query</th>
                      <th style={{ padding: "8px 0", fontWeight: 500, color: "var(--color-text-secondary)", width: 100, textAlign: "right" }}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topQueries.map((q, i) => (
                      <tr key={q.query} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "8px 0", color: "var(--color-text-tertiary)" }}>{i + 1}</td>
                        <td style={{ padding: "8px 0", color: "var(--color-text-primary)" }}>{q.query}</td>
                        <td style={{ padding: "8px 0", color: "var(--color-text-secondary)", textAlign: "right" }}>{q.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}

function Tile({ label, count, cost }: { label: string; count: number; cost: number }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 8,
      border: "1px solid var(--color-border-subtle)",
      background: "var(--color-bg-secondary)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        <Search size={11} /> {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "var(--color-text-primary)" }}>
        {count.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
        <DollarSign size={11} /> {cost.toFixed(3)} USD
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
