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
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "var(--color-text-primary)" }}>
          Agents
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "0 0 24px" }}>
          {agents.length} agents configured. Click any agent to view details and configure.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {agents.map((agent) => {
            const meta = AGENT_META[agent.agent_id];
            return (
              <Link
                key={agent.agent_id}
                href={`/admin/agents/${agent.agent_id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div style={{
                  background: "var(--color-bg-secondary, rgba(255,255,255,0.03))",
                  border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                  borderRadius: 12,
                  padding: 20,
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: `${meta?.color || "#666"}20`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: meta?.color || "#666",
                      }}>
                        {meta?.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>
                          {meta?.name || agent.agent_id}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                          {cronToHuman(agent.schedule_cron)} &middot; Last: {timeAgo(agent.latest_run?.started_at || null)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 4,
                        background: agent.enabled ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
                        color: agent.enabled ? "#22c55e" : "var(--color-text-tertiary)",
                      }}>
                        {agent.enabled ? "Enabled" : "Paused"}
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 700, color: scoreColor(agent.health_score) }}>
                        {agent.health_score}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 10 }}>
                    <div style={{ height: 4, background: scoreColor(agent.health_score), borderRadius: 2, width: `${agent.health_score}%` }} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    {agent.health_summary}
                  </div>
                  {agent.latest_run && (
                    <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 8, opacity: 0.7 }}>
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
