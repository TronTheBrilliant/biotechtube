import { createServerClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ─── Types ───

export interface AgentRun {
  id: string;
  agent_id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  items_scanned: number;
  items_fixed: number;
  issues_found: number;
  summary: string | null;
  details: Record<string, unknown>;
  model_used: string | null;
  triggered_by: string;
}

export interface AgentFix {
  entity_type: string;
  entity_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  confidence: number | null;
}

export interface AgentConfig {
  agent_id: string;
  enabled: boolean;
  schedule_cron: string;
  batch_size: number;
  model_id: string | null;
  last_run_id: string | null;
  config: Record<string, unknown>;
}

interface AiModel {
  id: string;
  name: string;
  provider: string;
  api_key_env_var: string | null;
  api_key_direct: string | null;
  base_url: string | null;
  model_id: string;
  is_default: boolean;
}

export interface AgentResult {
  run_id: string;
  status: "completed" | "failed";
  agent_id: string;
  items_scanned: number;
  items_fixed: number;
  issues_found: number;
  summary: string;
}

// ─── Run Lifecycle ───

export async function createRun(
  agentId: string,
  triggeredBy: "manual" | "cron"
): Promise<string> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({ agent_id: agentId, triggered_by: triggeredBy })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create run: ${error.message}`);
  return data.id;
}

export async function completeRun(
  runId: string,
  result: {
    status: "completed" | "failed";
    items_scanned: number;
    items_fixed: number;
    issues_found: number;
    summary: string;
    details?: Record<string, unknown>;
    model_used?: string;
  }
): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("agent_runs")
    .update({
      status: result.status,
      completed_at: new Date().toISOString(),
      items_scanned: result.items_scanned,
      items_fixed: result.items_fixed,
      issues_found: result.issues_found,
      summary: result.summary,
      details: (result.details || {}) as any,
      model_used: result.model_used || null,
    })
    .eq("id", runId);

  // Update agent_config.last_run_id
  const { data: run } = await supabase
    .from("agent_runs")
    .select("agent_id")
    .eq("id", runId)
    .single();
  if (run) {
    await supabase
      .from("agent_config")
      .update({ last_run_id: runId })
      .eq("agent_id", run.agent_id);
  }
}

export async function logFixes(
  runId: string,
  fixes: AgentFix[]
): Promise<void> {
  if (fixes.length === 0) return;
  const supabase = createServerClient();
  const rows = fixes.map((f) => ({ run_id: runId, ...f }));
  const { error } = await supabase.from("agent_fixes").insert(rows);
  if (error) throw new Error(`Failed to log fixes: ${error.message}`);
}

// ─── Config ───

export async function getAgentConfig(
  agentId: string
): Promise<AgentConfig | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("agent_config")
    .select("*")
    .eq("agent_id", agentId)
    .single();
  return data as AgentConfig | null;
}

// ─── AI Calls ───

async function getModel(modelId: string | null): Promise<AiModel | null> {
  const supabase = createServerClient();
  if (modelId) {
    const { data } = await supabase
      .from("admin_ai_models")
      .select("*")
      .eq("id", modelId)
      .single();
    return data as AiModel | null;
  }
  // Fall back to default model
  const { data } = await supabase
    .from("admin_ai_models")
    .select("*")
    .eq("is_default", true)
    .limit(1)
    .single();
  return data as AiModel | null;
}

function getApiKey(model: AiModel): string {
  if (model.api_key_env_var) {
    const key = process.env[model.api_key_env_var];
    if (key) return key;
  }
  if (model.api_key_direct) return model.api_key_direct;
  throw new Error(`No API key found for model ${model.name}`);
}

export async function callAI(
  prompt: string,
  systemPrompt: string,
  modelId: string | null
): Promise<{ response: string; modelName: string }> {
  const model = await getModel(modelId);
  if (!model) throw new Error("No AI model configured");

  const apiKey = getApiKey(model);

  if (model.provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: model.model_id,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });
    const text =
      msg.content[0].type === "text" ? msg.content[0].text : "";
    return { response: text, modelName: model.name };
  }

  // OpenAI-compatible (DeepSeek, GPT, etc.)
  const client = new OpenAI({
    apiKey,
    baseURL: model.base_url || undefined,
  });
  const completion = await client.chat.completions.create({
    model: model.model_id,
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });
  const text = completion.choices[0]?.message?.content || "";
  return { response: text, modelName: model.name };
}
