"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import {
  ADMIN_EMAIL,
  AGENT_META,
  type AgentStatus,
  scoreColor,
  cronToHuman,
  timeAgo,
} from "@/lib/admin-utils";

export default function AgentsIndexClient() {
  const { user, loading: authLoading } = useAuth();
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (user?.email !== ADMIN_EMAIL) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch("/api/agents/status");
        const data = await res.json();
        setAgents(data.agents || []);
      } catch {}
      setLoading(false);
    })();
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <>
        <Nav />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
        </div>
        <Footer />
      </>
    );
  }

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <>
        <Nav />
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--color-text-secondary)" }}>
          Admin access required
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 1rem 2rem" }}>
        <AdminNav />
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px", color: "var(--color-text-primary)" }}>
          Agents
        </h1>
        <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 24px" }}>
          {agents.length} agents configured. Click any agent to view details and configure.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {agents.map((agent) => {
            const meta = AGENT_META[agent.agent_id];
            const isHovered = hoveredCard === agent.agent_id;
            const lastRunStatus = agent.latest_run?.status === "completed"
              ? "Success"
              : agent.latest_run?.status === "failed"
                ? "Failed"
                : agent.latest_run
                  ? "Running"
                  : "Never";
            const lastRunColor = agent.latest_run?.status === "completed"
              ? "#22c55e"
              : agent.latest_run?.status === "failed"
                ? "#ef4444"
                : "var(--color-text-tertiary)";
            return (
              <Link
                key={agent.agent_id}
                href={`/admin/agents/${agent.agent_id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  onMouseEnter={() => setHoveredCard(agent.agent_id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    position: "relative",
                    background: "var(--color-bg-primary)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: 10,
                    padding: 20,
                    cursor: "pointer",
                    boxShadow: isHovered ? "0 4px 12px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.04)",
                    transition: "box-shadow 0.15s, opacity 0.15s",
                    opacity: agent.enabled ? 1 : 0.5,
                  }}
                >
                  {/* Paused overlay */}
                  {!agent.enabled && (
                    <div style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--color-text-tertiary)",
                      background: "var(--color-bg-secondary)",
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}>
                      Paused
                    </div>
                  )}

                  {/* Icon + Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: "var(--color-bg-secondary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--color-text-secondary)",
                    }}>
                      {meta?.icon}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {meta?.name || agent.agent_id}
                    </div>
                  </div>

                  {/* Schedule */}
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 14, paddingLeft: 42 }}>
                    Runs {cronToHuman(agent.schedule_cron).toLowerCase()}
                  </div>

                  {/* Health bar + percentage */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, height: 6, background: "var(--color-border-subtle)", borderRadius: 3 }}>
                      <div style={{
                        height: 6,
                        background: scoreColor(agent.health_score),
                        borderRadius: 3,
                        width: `${agent.health_score}%`,
                        transition: "width 0.3s",
                      }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: scoreColor(agent.health_score), minWidth: 36, textAlign: "right" }}>
                      {agent.health_score}%
                    </span>
                  </div>

                  {/* Last run time + status */}
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 14 }}>
                    Last run: {timeAgo(agent.latest_run?.started_at || null)}
                    {" "}
                    <span style={{ fontWeight: 500, color: lastRunColor }}>
                      &middot; {lastRunStatus}
                    </span>
                  </div>

                  {/* View Details link */}
                  <div style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    textAlign: "center",
                    padding: "8px 0 0",
                    borderTop: "1px solid var(--color-border-subtle)",
                  }}>
                    View Details &rarr;
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <Footer />
    </>
  );
}
