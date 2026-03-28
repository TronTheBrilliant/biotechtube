import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const url = new URL(req.url);
  const runId = url.searchParams.get("run_id");

  if (!runId) {
    return NextResponse.json({ error: "Missing run_id parameter" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("agent_fixes")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ fixes: data });
}
