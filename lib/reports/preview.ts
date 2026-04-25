// biotechtube/lib/reports/preview.ts
// Lightweight V4-Flash preview: exec summary + first 3 catalysts.
// Cached in equity_reports as a sentinel row (content_jsonb._is_preview = true).

import OpenAI from "openai";
import { createServerClient } from "@/lib/supabase";

const PREVIEW_TTL_DAYS = 7;

export interface PreviewContent {
  _is_preview: true;
  executive_summary: string;
  conviction_score: number;
  catalysts: { title: string; expected_window: string | null; p_success: number }[];
  generated_at: string;
}

export async function getOrGeneratePreview(companyId: string, companyName: string): Promise<PreviewContent> {
  const supabase = createServerClient();
  const cutoff = new Date(Date.now() - PREVIEW_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await supabase
    .from("equity_reports")
    .select("content_jsonb, generated_at")
    .eq("company_id", companyId)
    .gte("generated_at", cutoff)
    .order("generated_at", { ascending: false })
    .limit(5);

  for (const row of rows ?? []) {
    const c = row.content_jsonb as any;
    if (c?._is_preview === true) return c as PreviewContent;
    if (c?.angles?.general?.executive_summary?.body) {
      return {
        _is_preview: true,
        executive_summary: c.angles.general.executive_summary.body,
        conviction_score: c.angles.general.executive_summary.conviction_score ?? 60,
        catalysts: ((c.catalyst_calendar?.entries ?? []) as any[]).slice(0, 3).map((e: any) => ({
          title: e.title,
          expected_window: e.expected_window ?? e.expected_date,
          p_success: e.p_success,
        })),
        generated_at: row.generated_at as string,
      };
    }
  }

  const ds = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: process.env.DEEPSEEK_API_KEY! });
  const { data: company } = await supabase.from("companies").select("*").eq("id", companyId).single();
  const { data: pipelines } = await supabase.from("pipelines").select("*").eq("company_id", companyId).limit(20);

  const prompt = `Write a 2-paragraph executive summary (~250 words) and a list of up to 3 upcoming catalysts for "${companyName}". Return JSON:
{
  "executive_summary": "...",
  "conviction_score": 0-100,
  "catalysts": [{ "title": "...", "expected_window": "Q3 2026" or null, "p_success": 0-100 }]
}

Company: ${JSON.stringify(company, null, 2)}
Pipelines (first 10): ${JSON.stringify((pipelines ?? []).slice(0, 10), null, 2)}`;
  const completion = await ds.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 1200,
    temperature: 0.4,
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  const preview: PreviewContent = {
    _is_preview: true,
    executive_summary: parsed.executive_summary ?? "",
    conviction_score: Number(parsed.conviction_score ?? 60),
    catalysts: (parsed.catalysts ?? []).slice(0, 3),
    generated_at: new Date().toISOString(),
  };

  await supabase.from("equity_reports").insert({
    company_id: companyId,
    content_jsonb: preview as any,
    cost_cents: 5,
    generation_seconds: 5,
    expires_at: new Date(Date.now() + PREVIEW_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  });

  return preview;
}
