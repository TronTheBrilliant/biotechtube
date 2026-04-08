import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const investor = request.nextUrl.searchParams.get("investor");
  if (!investor) {
    return NextResponse.json({ error: "Missing investor parameter" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_investor_details" as any, { p_investor: investor });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data as any[]) || [];
  const sectors = rows
    .filter((r) => r.sector !== null)
    .map((r) => ({ sector: r.sector, count: Number(r.sector_count) }));
  const deals = rows
    .filter((r) => r.company_name !== null)
    .map((r) => ({
      companyName: r.company_name,
      amountUsd: Number(r.amount_usd),
      roundType: r.round_type,
      announcedDate: r.announced_date,
    }));

  return NextResponse.json({ sectors, deals });
}
