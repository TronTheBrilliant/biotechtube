import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { calculateHealth } from "@/lib/agents/health";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;
  const supabase = createServerClient();

  const [runsRes, health] = await Promise.all([
    supabase
      .from("agent_runs")
      .select("items_scanned, items_fixed, started_at")
      .eq("agent_id", agentId)
      .eq("status", "completed"),
    calculateHealth(agentId),
  ]);

  const runs = runsRes.data || [];
  const totalRuns = runs.length;
  const totalFixed = runs.reduce((sum, r: any) => sum + (r.items_fixed || 0), 0);
  const totalScanned = runs.reduce((sum, r: any) => sum + (r.items_scanned || 0), 0);
  const lastRunAt = runs.length > 0
    ? runs.sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0].started_at
    : null;

  return NextResponse.json({
    total_runs: totalRuns,
    total_fixed: totalFixed,
    total_scanned: totalScanned,
    last_run_at: lastRunAt,
    health,
  });
}
