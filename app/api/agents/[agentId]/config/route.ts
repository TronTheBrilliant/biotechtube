import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const VALID_AGENTS = ["profiles", "financial", "pipeline", "content", "seo", "ux"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;

  if (!VALID_AGENTS.includes(agentId)) {
    return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 404 });
  }

  try {
    const body = await req.json();
    const supabase = createServerClient();

    // Build update object from allowed fields only
    const updates: Record<string, any> = {};
    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    if (typeof body.schedule_cron === "string" && body.schedule_cron.trim()) {
      updates.schedule_cron = body.schedule_cron.trim();
    }
    if (typeof body.batch_size === "number" && body.batch_size > 0 && body.batch_size <= 500) {
      updates.batch_size = body.batch_size;
    }
    if (body.model_id !== undefined) {
      updates.model_id = body.model_id || null;
    }
    if (body.config !== undefined && typeof body.config === "object") {
      updates.config = body.config;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("agent_config")
      .update(updates)
      .eq("agent_id", agentId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, agent_config: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
