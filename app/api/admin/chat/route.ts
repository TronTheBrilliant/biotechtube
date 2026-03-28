import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { message, modelId } = await req.json();
    if (!message || !modelId) {
      return NextResponse.json({ error: "Missing message or modelId" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Look up model config
    const { data: model, error: modelError } = await supabase
      .from("admin_ai_models")
      .select("*")
      .eq("id", modelId)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Gather platform context
    const [
      { count: companyCount },
      { count: verifiedCount },
      { count: pipelineCount },
      { count: openIssues },
      { count: pendingReports },
      { data: lastPrice },
    ] = await Promise.all([
      supabase.from("companies").select("*", { count: "exact", head: true }),
      supabase.from("profile_quality").select("*", { count: "exact", head: true }).gte("quality_score", 70),
      supabase.from("pipelines").select("*", { count: "exact", head: true }),
      supabase.from("integrity_checks").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("error_reports").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("company_price_history").select("price_date").order("price_date", { ascending: false }).limit(1),
    ]);

    const total = companyCount || 0;
    const verified = verifiedCount || 0;
    const verifiedPct = total > 0 ? Math.round((verified / total) * 100) : 0;

    const systemPrompt = `You are the BiotechTube Quality Assurance Assistant. You help the admin maintain data quality across the platform.

Platform stats:
- ${total.toLocaleString()} companies (${verifiedPct}% verified)
- ${(pipelineCount || 0).toLocaleString()} pipeline programs
- ${openIssues || 0} open integrity issues
- ${pendingReports || 0} pending error reports
- Price data last updated: ${lastPrice?.[0]?.price_date || "unknown"}

You can:
- Query the database to answer questions about data quality
- Suggest fixes for issues
- Explain anomalies in the data
- Help prioritize what to fix next

Available database tables: companies, company_price_history, pipelines, product_scores, funding_rounds, curated_watchlists, curated_watchlist_items, featured_pipelines, fda_calendar, profile_quality, error_reports, integrity_checks, blog_posts, news_items, biotech_events

Always be specific and cite data. If you're not sure about something, say so.`;

    // Get recent chat history for context
    const { data: recentChat } = await supabase
      .from("admin_chat_history")
      .select("role, content")
      .order("created_at", { ascending: true })
      .limit(20);

    const historyMessages = (recentChat || []).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let aiResponse = "";

    // Resolve API key: env var first, then direct
    const apiKey = model.api_key_env_var
      ? process.env[model.api_key_env_var]
      : model.api_key_direct;

    if (model.provider === "anthropic") {
      if (!apiKey) {
        return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
      }
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: model.model_id,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          ...historyMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: message },
        ],
      });
      const block = response.content[0];
      aiResponse = block.type === "text" ? block.text : "";
    } else {
      // OpenAI-compatible (deepseek, openai, custom)
      if (!apiKey) {
        return NextResponse.json({ error: `API key for ${model.provider} not configured` }, { status: 500 });
      }
      const openai = new OpenAI({
        apiKey,
        baseURL: model.base_url ? `${model.base_url}/v1` : undefined,
      });
      const response = await openai.chat.completions.create({
        model: model.model_id,
        max_tokens: 2048,
        messages: [
          { role: "system", content: systemPrompt },
          ...historyMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: message },
        ],
      });
      aiResponse = response.choices[0]?.message?.content || "";
    }

    // Save both messages to chat history
    await supabase.from("admin_chat_history").insert([
      { role: "user", content: message, model_used: model.name },
      { role: "assistant", content: aiResponse, model_used: model.name },
    ]);

    return NextResponse.json({ response: aiResponse, modelUsed: model.name });
  } catch (err: any) {
    console.error("Admin chat error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
