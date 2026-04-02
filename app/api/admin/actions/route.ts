import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const ADMIN_EMAIL = "trond@biotechtube.io";

const BASE_DIR = "/Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube";

const TERMINAL_COMMANDS: Record<string, { message: string; command: string }> = {
  "run-cia": {
    message: "CIA agent command ready",
    command: `cd ${BASE_DIR} && npx tsx scripts/cia-agent.ts --batch 50`,
  },
  "scrape-news": {
    message: "News scraper command ready",
    command: `cd ${BASE_DIR} && npx tsx scripts/scrape-biotech-news.ts`,
  },
  "integrity-check": {
    message: "Integrity check command ready",
    command: `cd ${BASE_DIR} && npx tsx scripts/daily-integrity-check.ts`,
  },
  "generate-recap": {
    message: "Weekly recap command ready",
    command: `cd ${BASE_DIR} && npx tsx scripts/generate-weekly-recap.ts`,
  },
  "refresh-watchlists": {
    message: "Watchlist refresh command ready",
    command: `cd ${BASE_DIR} && npx tsx scripts/populate-curated-watchlists.ts`,
  },
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
            command: "npx tsx scripts/update-prices.ts",
            copyToClipboard: true,
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

      case "dismiss-report": {
        const { id } = params || {};
        if (!id) return NextResponse.json({ error: "Missing report id" }, { status: 400 });
        await supabase
          .from("error_reports")
          .update({ status: "dismissed", resolved_at: new Date().toISOString() })
          .eq("id", id);
        return NextResponse.json({ success: true, message: "Report dismissed" });
      }

      default: {
        const terminalCmd = TERMINAL_COMMANDS[action];
        if (terminalCmd) {
          return NextResponse.json({
            success: true,
            message: terminalCmd.message,
            command: terminalCmd.command,
            copyToClipboard: true,
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
