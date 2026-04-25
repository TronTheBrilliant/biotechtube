// biotechtube/app/api/cron/research-event-detector/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { detectEventsForCompany } from "@/lib/reports/events";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: active } = await supabase
    .from("equity_report_purchases")
    .select("company_id, equity_report_id")
    .eq("tier", "living")
    .eq("status", "ready")
    .gt("live_access_expires_at", now);
  if (!active || active.length === 0) return NextResponse.json({ scanned: 0 });

  const seen = new Set<string>();
  const targets = active.filter(a => {
    const k = `${a.company_id}:${a.equity_report_id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return !!a.equity_report_id;
  });

  let totalInserted = 0;
  for (const t of targets) {
    const r = await detectEventsForCompany(t.company_id, t.equity_report_id!).catch(() => ({ inserted: 0 }));
    totalInserted += r.inserted;
  }
  return NextResponse.json({ scanned: targets.length, inserted: totalInserted });
}
