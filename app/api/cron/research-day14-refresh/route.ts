// biotechtube/app/api/cron/research-day14-refresh/route.ts
// Daily 11:30 UTC: for each living purchase aged 13-15 days, regenerate if any
// material events accumulated since generated_at. Capped at 3 per run to fit
// 300s maxDuration; remaining roll into next day (still in the 13-15d window).

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_CAP = 3;

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const now = Date.now();
  const min = new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString();
  const max = new Date(now - 13 * 24 * 60 * 60 * 1000).toISOString();

  const { data: due } = await supabase
    .from("equity_report_purchases")
    .select("id, company_id, equity_report_id, angle, paid_at")
    .eq("tier", "living")
    .is("day14_refresh_sent_at", null)
    .gte("paid_at", min)
    .lte("paid_at", max)
    .limit(BATCH_CAP);

  if (!due || due.length === 0) return NextResponse.json({ refreshed: 0, skipped: 0 });

  let refreshed = 0, skipped = 0;
  for (const p of due) {
    if (!p.equity_report_id) continue;
    const { data: events } = await supabase
      .from("equity_report_events")
      .select("id")
      .eq("equity_report_id", p.equity_report_id)
      .eq("is_material", true)
      .limit(1);
    if (!events || events.length === 0) {
      await supabase.from("equity_report_purchases").update({ day14_refresh_sent_at: new Date().toISOString() }).eq("id", p.id);
      skipped++;
      continue;
    }
    try {
      const { generateEquityReport } = await import("@/lib/reports/generate");
      await generateEquityReport({ companyId: p.company_id, angle: p.angle as any, purchaseId: p.id });
      await supabase.from("equity_report_purchases").update({ day14_refresh_sent_at: new Date().toISOString() }).eq("id", p.id);
      refreshed++;
    } catch (e) {
      console.error("[day14-refresh] regen failed for", p.id, e);
    }
  }
  return NextResponse.json({ refreshed, skipped });
}
