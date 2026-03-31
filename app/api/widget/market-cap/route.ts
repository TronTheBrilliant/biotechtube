import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function formatMarketCapWidget(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: snapshot } = await supabase
    .from("market_snapshots")
    .select("total_market_cap")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  const marketCap = snapshot?.total_market_cap
    ? formatMarketCapWidget(Number(snapshot.total_market_cap))
    : "$7.5T";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biotech Market Cap Widget</title></head>
<body style="margin:0;padding:0;background:transparent">
<div style="font-family:system-ui,-apple-system,sans-serif;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;display:inline-flex;align-items:center;gap:8px;background:#fff">
  <span style="font-weight:600;font-size:13px;color:#374151">Biotech Market Cap</span>
  <span style="font-size:18px;font-weight:700;color:#059669">${marketCap}</span>
  <a href="https://biotechtube.io" target="_blank" rel="noopener" style="font-size:11px;color:#6b7280;text-decoration:none">BiotechTube</a>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
      "X-Frame-Options": "ALLOWALL",
    },
  });
}
