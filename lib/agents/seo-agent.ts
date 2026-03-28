import { createServerClient } from "@/lib/supabase";
import { callAI, logFixes, type AgentFix } from "./framework";

export async function runSeoAgent(
  runId: string,
  batchSize: number,
  modelId: string | null
): Promise<{
  items_scanned: number;
  items_fixed: number;
  issues_found: number;
  summary: string;
  details?: Record<string, unknown>;
  model_used?: string;
}> {
  const supabase = createServerClient();
  const allFixes: AgentFix[] = [];
  let modelName = "";

  // Find companies without SEO metadata
  // Left join: companies NOT IN company_seo
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, slug, description, country")
    .limit(batchSize);

  if (!companies || companies.length === 0) {
    return {
      items_scanned: 0,
      items_fixed: 0,
      issues_found: 0,
      summary: "No companies to process",
    };
  }

  // Check which already have SEO data
  const ids = companies.map((c: any) => c.id);
  const { data: existingSeo } = await supabase
    .from("company_seo")
    .select("company_id")
    .in("company_id", ids);

  const existingIds = new Set((existingSeo || []).map((s: any) => s.company_id));
  const needsSeo = companies.filter((c: any) => !existingIds.has(c.id));

  if (needsSeo.length === 0) {
    return {
      items_scanned: companies.length,
      items_fixed: 0,
      issues_found: 0,
      summary: `All ${companies.length} companies already have SEO metadata`,
    };
  }

  const seoRows: any[] = [];

  for (const company of needsSeo) {
    const systemPrompt = `You are an SEO expert for a biotech data platform. Return ONLY valid JSON.`;

    const prompt = `Generate SEO metadata for this biotech company page.

Company: ${company.name}
Description: ${company.description || "N/A"}
Slug: ${company.slug || "N/A"}
Country: ${company.country || "N/A"}

Return JSON:
{
  "meta_description": "max 160 chars, compelling description for search results",
  "og_title": "max 70 chars, title for social sharing",
  "og_description": "max 200 chars, description for social sharing"
}`;

    try {
      const { response, modelName: mn } = await callAI(prompt, systemPrompt, modelId);
      modelName = mn;

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const seo = JSON.parse(jsonMatch[0]);

      seoRows.push({
        company_id: company.id,
        meta_description: seo.meta_description || null,
        og_title: seo.og_title || null,
        og_description: seo.og_description || null,
        updated_at: new Date().toISOString(),
      });

      allFixes.push({
        entity_type: "company_seo",
        entity_id: company.id,
        field: "meta_description",
        old_value: null,
        new_value: seo.meta_description || null,
        confidence: 0.9,
      });
    } catch (err) {
      console.error(`SEO agent error for ${company.name}:`, err);
    }
  }

  // Batch upsert SEO data
  if (seoRows.length > 0) {
    await supabase.from("company_seo").upsert(seoRows, { onConflict: "company_id" });
  }

  await logFixes(runId, allFixes);

  return {
    items_scanned: companies.length,
    items_fixed: seoRows.length,
    issues_found: needsSeo.length,
    summary: seoRows.length > 0
      ? `Generated SEO metadata for ${seoRows.length} companies`
      : `Scanned ${companies.length} companies, no SEO updates needed`,
    model_used: modelName,
  };
}
