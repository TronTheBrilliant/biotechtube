// biotechtube/lib/reports/angle-rewrite.ts
import OpenAI from "openai";
import { createServerClient } from "@/lib/supabase";
import type { Angle, AngleVariant, ReportContent } from "./types";

const ANGLE_DIRECTIVES: Record<Angle, string> = {
  general:    "Balanced, unopinionated. Default voice.",
  long:       "Long-only PM lens. Emphasize multi-year thesis, asymmetric upside, what kills the trade.",
  short:      "Short-seller lens. Emphasize specific failure modes, quality of disclosure, valuation gap.",
  vc:         "VC partner lens. Emphasize team quality, platform vs single-asset, exit pathways, dilution risk.",
  bd:         "BD lens. Emphasize partnership angles, deal-comparable terms, asset-level value vs equity.",
  scientist:  "Scientist lens. Emphasize MoA, target validation, trial design quality, biomarkers, translational risk.",
};

export async function rewriteForAngle(content: ReportContent, angle: Angle): Promise<AngleVariant> {
  const ds = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: process.env.DEEPSEEK_API_KEY! });
  const general = content.angles.general;
  const prompt = `You rewrite three sections (executive_summary, bull_case, bear_case) of an equity research memo for a specific reader angle.

ANGLE DIRECTIVE: ${ANGLE_DIRECTIVES[angle]}

ORIGINAL SECTIONS (the 'general' variant):
${JSON.stringify({ executive_summary: general.executive_summary, bull_case: general.bull_case, bear_case: general.bear_case }, null, 2)}

Rewrite each section to emphasize what matters most for the angle. Preserve all source_ids and citations exactly. Keep claims arrays consistent with the new body. Return JSON exactly matching:
{
  "executive_summary": { /* ReportSection */ },
  "bull_case": { /* ReportSection */ },
  "bear_case": { /* ReportSection */ }
}`;

  const completion = await ds.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 6000,
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as AngleVariant;
}

export async function ensureAngle(reportId: string, angle: Angle): Promise<void> {
  const supabase = createServerClient();
  const { data: row, error } = await supabase
    .from("equity_reports")
    .select("content_jsonb")
    .eq("id", reportId)
    .single();
  if (error || !row) throw new Error(`Report ${reportId} not found`);
  const content = row.content_jsonb as unknown as ReportContent;
  if (content.angles[angle]) return;

  const variant = await rewriteForAngle(content, angle);
  content.angles[angle] = variant;

  await supabase.from("equity_reports").update({ content_jsonb: content as any }).eq("id", reportId);
}
