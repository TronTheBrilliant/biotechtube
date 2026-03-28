import { createServerClient } from "@/lib/supabase";
import { callAI, logFixes, type AgentFix } from "./framework";

export async function runPipelineAgent(
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
  let issuesFound = 0;
  let modelName = "";

  // Check featured_pipelines for missing data
  const { data: pipelines } = await supabase
    .from("featured_pipelines")
    .select("*")
    .limit(batchSize);

  if (!pipelines || pipelines.length === 0) {
    return {
      items_scanned: 0,
      items_fixed: 0,
      issues_found: 0,
      summary: "No pipeline items to process",
    };
  }

  for (const item of pipelines) {
    const missing: string[] = [];
    if (!item.ai_summary) missing.push("ai_summary");
    if (!item.reason) missing.push("reason");

    if (missing.length === 0) continue;
    issuesFound++;

    const systemPrompt = `You are a biotech pipeline data analyst. Return ONLY valid JSON with enriched content. Each field should have "value" and "confidence" (0-1).`;

    const prompt = `Enrich this featured pipeline entry by filling missing fields.

Pipeline ID: ${item.pipeline_id || item.id}
Rank: ${item.rank ?? "N/A"}
Featured month: ${item.featured_month || "N/A"}
Current data: ${JSON.stringify(item)}

Missing fields: ${missing.join(", ")}

Return JSON like:
{
  "ai_summary": { "value": "A concise AI-generated summary of this pipeline...", "confidence": 0.85 },
  "reason": { "value": "Why this pipeline is featured this month...", "confidence": 0.9 }
}`;

    try {
      const { response, modelName: mn } = await callAI(prompt, systemPrompt, modelId);
      modelName = mn;

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const corrections = JSON.parse(jsonMatch[0]);
      const updates: Record<string, any> = {};

      for (const field of missing) {
        const correction = corrections[field];
        if (!correction || !correction.value || correction.confidence < 0.8) continue;

        allFixes.push({
          entity_type: "featured_pipeline",
          entity_id: item.id,
          field,
          old_value: (item as any)[field] || null,
          new_value: String(correction.value),
          confidence: correction.confidence,
        });

        updates[field] = correction.value;
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("featured_pipelines").update(updates).eq("id", item.id);
      }
    } catch (err) {
      console.error(`Pipeline agent error for ${item.id}:`, err);
    }
  }

  await logFixes(runId, allFixes);

  const fixedCount = new Set(allFixes.map((f) => f.entity_id)).size;

  return {
    items_scanned: pipelines.length,
    items_fixed: fixedCount,
    issues_found: issuesFound,
    summary: fixedCount > 0
      ? `Enriched ${fixedCount} pipeline items`
      : `Scanned ${pipelines.length} items, no fixes needed`,
    model_used: modelName,
  };
}
