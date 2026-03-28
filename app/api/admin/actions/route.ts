import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const ADMIN_EMAIL = "trond.skattum@gmail.com";

// Terminal commands for long-running scripts (can't run on Vercel)
const TERMINAL_COMMANDS: Record<string, string> = {
  "run-cia": "npx tsx scripts/cia-agent.ts --batch 50",
  "scrape-news": "npx tsx scripts/scrape-biotech-news.ts",
  "integrity-check": "npx tsx scripts/daily-integrity-check.ts",
  "generate-recap": "npx tsx scripts/generate-weekly-recap.ts",
  "refresh-watchlists": "npx tsx scripts/populate-curated-watchlists.ts",
};

export async function POST(req: NextRequest) {
  try {
    const { action, params } = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const supabase = createServerClient();

    switch (action) {
      case "refresh-prices": {
        // Call internal cron endpoint
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://biotechtube.com";
        try {
          fetch(`${baseUrl}/api/cron/update-prices`, { method: "POST" }).catch(() => {});
          return NextResponse.json({
            success: true,
            message: "Price update triggered. Running in background.",
          });
        } catch {
          return NextResponse.json({
            success: false,
            message: "Failed to trigger price update",
            terminalCommand: "npx tsx scripts/update-prices.ts",
          });
        }
      }

      case "dismiss-issue": {
        const { id } = params || {};
        if (!id) return NextResponse.json({ error: "Missing issue id" }, { status: 400 });
        await supabase
          .from("integrity_checks")
          .update({ status: "dismissed", resolved_at: new Date().toISOString() })
          .eq("id", id);
        return NextResponse.json({ success: true, message: "Issue dismissed" });
      }

      case "resolve-issue": {
        const { id } = params || {};
        if (!id) return NextResponse.json({ error: "Missing issue id" }, { status: 400 });
        await supabase
          .from("integrity_checks")
          .update({ status: "resolved", resolved_at: new Date().toISOString() })
          .eq("id", id);
        return NextResponse.json({ success: true, message: "Issue resolved" });
      }

      case "resolve-report": {
        const { id, note } = params || {};
        if (!id) return NextResponse.json({ error: "Missing report id" }, { status: 400 });
        await supabase
          .from("error_reports")
          .update({
            status: "resolved",
            resolution_note: note || "",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", id);
        return NextResponse.json({ success: true, message: "Report resolved" });
      }

      default: {
        // Long-running scripts: return terminal command
        const cmd = TERMINAL_COMMANDS[action];
        if (cmd) {
          return NextResponse.json({
            success: true,
            message: `Run locally: ${cmd}`,
            terminalCommand: cmd,
            isBackground: true,
          });
        }
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
      }
    }
  } catch (err: any) {
    console.error("Admin action error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
