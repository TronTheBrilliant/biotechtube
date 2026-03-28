import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  createRun,
  completeRun,
  getAgentConfig,
} from "@/lib/agents/framework";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "trond.skattum@gmail.com";

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && process.env.CRON_SECRET) {
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
  }
  return true;
}

// Dynamic imports for agents to avoid circular dependencies
async function getRunner(agentId: string) {
  switch (agentId) {
    case "profiles": return (await import("@/lib/agents/profiles-agent")).runProfilesAgent;
    case "financial": return (await import("@/lib/agents/financial-agent")).runFinancialAgent;
    case "pipeline": return (await import("@/lib/agents/pipeline-agent")).runPipelineAgent;
    case "content": return (await import("@/lib/agents/content-agent")).runContentAgent;
    case "seo": return (await import("@/lib/agents/seo-agent")).runSeoAgent;
    case "ux": return (await import("@/lib/agents/ux-agent")).runUxAgent;
    default: return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;
  const runner = await getRunner(agentId);
  if (!runner) {
    return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 404 });
  }

  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const triggeredBy = body.triggered_by || "manual";
    const config = await getAgentConfig(agentId);
    const batchSize = body.batch_size || config?.batch_size || 50;
    const modelId = config?.model_id || null;

    const runId = await createRun(agentId, triggeredBy);

    try {
      const result = await runner(runId, batchSize, modelId);
      await completeRun(runId, { status: "completed", ...result });

      return NextResponse.json({
        run_id: runId,
        status: "completed",
        agent_id: agentId,
        items_scanned: result.items_scanned,
        items_fixed: result.items_fixed,
        issues_found: result.issues_found,
        summary: result.summary,
      });
    } catch (agentErr: any) {
      await completeRun(runId, {
        status: "failed",
        items_scanned: 0,
        items_fixed: 0,
        issues_found: 0,
        summary: `Failed: ${agentErr.message}`,
      });
      return NextResponse.json(
        { error: agentErr.message, run_id: runId, status: "failed" },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Agent execution failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("agent_id", agentId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: data });
}
