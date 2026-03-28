import { createServerClient } from "@/lib/supabase";
import { callAI, logFixes, type AgentFix } from "./framework";

export async function runProfilesAgent(
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

  // Fetch batch: lowest quality scores first, or oldest checked
  const { data: batch } = await supabase
    .from("profile_quality")
    .select("company_id, quality_score")
    .order("quality_score", { ascending: true })
    .order("last_checked_at", { ascending: true })
    .limit(batchSize);

  if (!batch || batch.length === 0) {
    return {
      items_scanned: 0,
      items_fixed: 0,
      issues_found: 0,
      summary: "No companies to process",
    };
  }

  const companyIds = batch.map((b: any) => b.company_id);
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, slug, ticker, country, city, description, founded_year, category, sub_category")
    .in("id", companyIds);

  if (!companies || companies.length === 0) {
    return {
      items_scanned: 0,
      items_fixed: 0,
      issues_found: 0,
      summary: "No company data found for batch",
    };
  }

  const allFixes: AgentFix[] = [];
  let issuesFound = 0;
  let modelName = "";

  for (const company of companies) {
    // Identify missing/suspect fields
    const missing: string[] = [];
    if (!company.description) missing.push("description");
    if (!company.country) missing.push("country");
    if (!company.city) missing.push("city");
    if (!company.founded_year) missing.push("founded_year");
    if (!company.category) missing.push("category");

    if (missing.length === 0) continue;
    issuesFound++;

    const systemPrompt = `You are a biotech data analyst. Return ONLY valid JSON with corrections for the specified fields. Each field should have a "value" and "confidence" (0-1). If you cannot determine a field with confidence > 0.5, set value to null.`;

    const prompt = `Research this biotech company and provide corrections for missing fields.

Company: ${company.name}
Ticker: ${company.ticker || "N/A"}
Current data: ${JSON.stringify({
      country: company.country,
      city: company.city,
      description: company.description,
      founded_year: company.founded_year,
      category: company.category,
      sub_category: company.sub_category,
    })}

Missing/suspect fields: ${missing.join(", ")}

Return JSON like:
{
  "description": { "value": "...", "confidence": 0.9 },
  "country": { "value": "US", "confidence": 0.95 },
  ...
}`;

    try {
      const { response, modelName: mn } = await callAI(prompt, systemPrompt, modelId);
      modelName = mn;

      // Parse AI response — extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const corrections = JSON.parse(jsonMatch[0]);
      const updates: Record<string, any> = {};

      for (const field of missing) {
        const correction = corrections[field];
        if (!correction || !correction.value || correction.confidence < 0.8) continue;

        allFixes.push({
          entity_type: "company",
          entity_id: company.id,
          field,
          old_value: (company as any)[field] || null,
          new_value: String(correction.value),
          confidence: correction.confidence,
        });

        updates[field] = correction.value;
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("companies").update(updates).eq("id", company.id);
      }
    } catch (err) {
      // Log error but continue with next company
      console.error(`Profiles agent error for ${company.name}:`, err);
    }

    // Update last_checked_at regardless of success
    await supabase
      .from("profile_quality")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("company_id", company.id);
  }

  // Log all fixes
  await logFixes(runId, allFixes);

  const fixedCount = new Set(allFixes.map((f) => f.entity_id)).size;
  const fieldCounts = allFixes.reduce((acc, f) => {
    acc[f.field] = (acc[f.field] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const fieldSummary = Object.entries(fieldCounts)
    .map(([field, count]) => `${count} ${field}s`)
    .join(", ");

  return {
    items_scanned: companies.length,
    items_fixed: fixedCount,
    issues_found: issuesFound,
    summary: fixedCount > 0
      ? `Fixed ${fixedCount} profiles: ${fieldSummary}`
      : `Scanned ${companies.length} profiles, no fixes needed`,
    model_used: modelName,
  };
}
