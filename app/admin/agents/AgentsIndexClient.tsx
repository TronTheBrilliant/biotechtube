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
                    background: "var(--color-bg-primary)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: 10,
                    padding: 20,
                    cursor: "pointer",
                    boxShadow: isHovered ? "0 4px 12px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.04)",
                    transition: "box-shadow 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "var(--color-bg-secondary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--color-text-secondary)",
                      }}>
                        {meta?.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                          {meta?.name || agent.agent_id}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                          {cronToHuman(agent.schedule_cron)} &middot; Last: {timeAgo(agent.latest_run?.started_at || null)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.02em",
                        color: agent.enabled ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                      }}>
                        {agent.enabled ? "Enabled" : "Paused"}
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 600, color: scoreColor(agent.health_score) }}>
                        {agent.health_score}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 3, background: "var(--color-border-subtle)", borderRadius: 2, marginBottom: 10 }}>
                    <div style={{ height: 3, background: scoreColor(agent.health_score), borderRadius: 2, width: `${agent.health_score}%` }} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    {agent.health_summary}
                  </div>
                  {agent.latest_run && (
                    <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 8 }}>
                      Last: {agent.latest_run.summary || agent.latest_run.status}
                    </div>
                  )}
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
