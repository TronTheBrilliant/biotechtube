import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { companyId, pageUrl, issueType, description, email } = await req.json();

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase.from("error_reports").insert({
      company_id: companyId || null,
      page_url: pageUrl || null,
      issue_type: issueType || "data_error",
      description,
      reporter_email: email || null,
      status: "open",
    });

    if (error) {
      console.error("Error inserting report:", error);
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Report error endpoint:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
