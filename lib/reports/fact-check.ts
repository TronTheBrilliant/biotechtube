// biotechtube/lib/reports/fact-check.ts
import OpenAI from "openai";
import type { ReportContent, ReportSection } from "./types";

export async function factCheck(content: ReportContent, contextBlob: string): Promise<ReportContent> {
  const ds = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: process.env.DEEPSEEK_API_KEY! });

  const claims: { path: string; idx: number; text: string; source_id: number }[] = [];
  const sections: { path: string; section: ReportSection }[] = collectSections(content);
  for (const { path, section } of sections) {
    section.claims?.forEach((c, idx) => claims.push({ path, idx, text: c.text, source_id: c.source_id }));
  }
  if (claims.length === 0) return content;

  // Batch in groups of 30
  const BATCH = 30;
  for (let i = 0; i < claims.length; i += BATCH) {
    const batch = claims.slice(i, i + BATCH);
    const prompt = `You verify factual claims against a context blob. For each numbered claim, return verified=true if the claim is directly supported by the context, false otherwise. Return JSON: {"results":[{"i":1,"verified":true},...]}.

CONTEXT (truncated):
${contextBlob.slice(0, 30000)}

CLAIMS:
${batch.map((c, j) => `${j + 1}. (source_id=${c.source_id}) ${c.text}`).join("\n")}`;

    const completion = await ds.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 2000,
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { results?: { i: number; verified: boolean }[] } = {};
    try { parsed = JSON.parse(raw); } catch {}
    const verifiedSet = new Set((parsed.results ?? []).filter(r => r.verified).map(r => r.i));
    batch.forEach((c, j) => {
      if (!verifiedSet.has(j + 1)) {
        const sec = sections.find(s => s.path === c.path)?.section;
        if (sec && sec.claims) sec.claims[c.idx] = { ...sec.claims[c.idx], unverified: true };
      }
    });
  }

  return content;
}

function collectSections(c: ReportContent): { path: string; section: ReportSection }[] {
  const out: { path: string; section: ReportSection }[] = [];
  for (const angle of Object.keys(c.angles) as (keyof typeof c.angles)[]) {
    const a = c.angles[angle];
    if (!a) continue;
    out.push({ path: `angles.${String(angle)}.executive_summary`, section: a.executive_summary });
    out.push({ path: `angles.${String(angle)}.bull_case`, section: a.bull_case });
    out.push({ path: `angles.${String(angle)}.bear_case`, section: a.bear_case });
  }
  out.push({ path: "pipeline_analysis", section: c.pipeline_analysis });
  out.push({ path: "competitive_landscape", section: c.competitive_landscape });
  out.push({ path: "catalyst_calendar.intro", section: c.catalyst_calendar.intro });
  out.push({ path: "valuation_notes", section: c.valuation_notes });
  out.push({ path: "sec_highlights", section: c.sec_highlights });
  out.push({ path: "insider_activity", section: c.insider_activity });
  out.push({ path: "literature_watch", section: c.literature_watch });
  out.push({ path: "patent_landscape", section: c.patent_landscape });
  return out;
}
