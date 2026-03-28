import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Simple cron parser: checks if an agent is due based on its schedule and last run
function isDue(cronExpr: string, lastRunAt: string | null): boolean {
  if (!lastRunAt) return true; // Never run → due immediately

  const lastRun = new Date(lastRunAt);
  const now = new Date();
  const diffMs = now.getTime() - lastRun.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // Parse simple cron patterns we use
  // "0 */6 * * *" → every 6 hours
  // "0 */2 * * *" → every 2 hours
  // "0 0 * * *"   → daily (every 24 hours)
  // "0 0 * * 0"   → weekly (every 168 hours)
  const parts = cronExpr.split(" ");
  const hourPart = parts[1] || "*";
  const dowPart = parts[4] || "*";

  if (dowPart !== "*") {
    // Weekly: check if 168+ hours since last run
    return diffHours >= 168;
  }

  if (hourPart.startsWith("*/")) {
    const interval = parseInt(hourPart.replace("*/", ""), 10);
    return diffHours >= interval;
  }

  if (hourPart === "0") {
    // Daily
    return diffHours >= 24;
  }

  // Default: run if more than 1 hour since last run
  return diffHours >= 1;
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Get all enabled agent configs
  const { data: configs } = await supabase
    .from("agent_config")
    .select("agent_id, schedule_cron, last_run_id, enabled")
    .eq("enabled", true);

  if (!configs || configs.length === 0) {
    return NextResponse.json({ message: "No agents enabled", triggered: [] });
  }

  // Get last run times
  const runIds = configs
    .map((c: any) => c.last_run_id)
    .filter(Boolean);

  const { data: lastRuns } = runIds.length > 0
    ? await supabase
        .from("agent_runs")
        .select("id, started_at")
        .in("id", runIds)
    : { data: [] };

  const runTimeMap = new Map(
    (lastRuns || []).map((r: any) => [r.id, r.started_at])
  );

  // Check which agents are due
  const dueAgents: string[] = [];
  for (const config of configs) {
    const lastRunAt = config.last_run_id
      ? runTimeMap.get(config.last_run_id) || null
      : null;
    if (isDue(config.schedule_cron, lastRunAt)) {
      dueAgents.push(config.agent_id);
    }
  }

  if (dueAgents.length === 0) {
    return NextResponse.json({ message: "No agents due", triggered: [] });
  }

  // Trigger agents via fire-and-forget fetch (no await on response)
  // This avoids the cron function timing out while waiting for agents.
  // Each agent runs in its own serverless invocation.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://biotechtube.com";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

  for (const agentId of dueAgents) {
    fetch(`${baseUrl}/api/agents/${agentId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ triggered_by: "cron" }),
    }).catch((err) => console.error(`Failed to trigger ${agentId}:`, err));
  }

  return NextResponse.json({
    message: `Triggered ${dueAgents.length} agents`,
    triggered: dueAgents,
  });
}
