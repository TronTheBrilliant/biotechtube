import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { calculateHealth } from "@/lib/agents/health";

export const dynamic = "force-dynamic";

const AGENT_IDS = ["profiles", "financial", "pipeline", "content", "seo", "ux"];

export async function GET() {
  const supabase = createServerClient();

  const [configRes, runsRes, activityRes, healthResults] = await Promise.all([
    supabase.from("agent_config").select("*"),
    supabase
      .from("agent_runs")
      .select("*")
      .in("agent_id", AGENT_IDS)
      .order("started_at", { ascending: false })
      .limit(12),
    supabase
      .from("agent_runs")
      .select("id, agent_id, status, started_at, summary, items_scanned, items_fixed, issues_found, triggered_by")
      .order("started_at", { ascending: false })
      .limit(20),
    Promise.all(AGENT_IDS.map((id) => calculateHealth(id))),
  ]);

  const configs = configRes.data || [];
  const runs = runsRes.data || [];
  const activity = activityRes.data || [];
  const healthMap = new Map(healthResults.map((h) => [h.agent_id, h]));

  const agents = AGENT_IDS.map((id) => {
    const config = configs.find((c: any) => c.agent_id === id);
    const latestRun = runs.find((r: any) => r.agent_id === id);
    const health = healthMap.get(id);

    return {
      agent_id: id,
      enabled: config?.enabled ?? true,
      schedule_cron: config?.schedule_cron ?? "",
      batch_size: config?.batch_size ?? 50,
      health_score: health?.score ?? 0,
      health_summary: health?.summary ?? "",
      health_details: health?.details ?? {},
      latest_run: latestRun || null,
    };
  });

  const overallHealth = Math.round(
    agents.reduce((sum, a) => sum + a.health_score, 0) / agents.length
  );

  return NextResponse.json({ agents, overall_health: overallHealth, activity });
}
