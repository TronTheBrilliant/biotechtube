// biotechtube/app/api/research/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerClient } from "@/lib/supabase";
import { verifyPurchaseAccess } from "@/lib/research/auth";
import { RESEARCH_AGENT_SYSTEM, loadAgentContext } from "@/lib/chat/research-agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { purchase_id?: string; messages?: { role: string; content: string }[] } | null;
  if (!body?.purchase_id || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const access = await verifyPurchaseAccess(
    body.purchase_id, user?.id ?? null, user?.email ?? null,
    { requireReady: true, requireLiving: true, requireLiveNotExpired: true },
  );
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: 403 });

  const ctx = await loadAgentContext(body.purchase_id);
  if (!ctx) return NextResponse.json({ error: "Context unavailable" }, { status: 404 });

  const userMsg = body.messages[body.messages.length - 1];
  await persistMessage(body.purchase_id, userMsg);

  const ds = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: process.env.DEEPSEEK_API_KEY! });
  const stream = await ds.chat.completions.create({
    model: "deepseek-v4-flash",
    stream: true,
    temperature: 0.3,
    max_tokens: 1500,
    messages: [
      { role: "system", content: RESEARCH_AGENT_SYSTEM },
      { role: "system", content: `MEMO CONTEXT for ${ctx.companyName}:\n${ctx.memo}` },
      ...body.messages.map(m => ({ role: m.role as any, content: m.content })),
    ],
  });

  let fullText = "";
  let aborted = false;
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      // Abort on client disconnect — don't burn tokens or persist partial.
      req.signal.addEventListener("abort", () => { aborted = true; });
      try {
        for await (const chunk of stream) {
          if (aborted) break;
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            fullText += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          }
        }
        if (!aborted) {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
          await persistMessage(body.purchase_id!, { role: "assistant", content: fullText });
        } else {
          controller.close();
        }
      } catch (e) {
        console.error("[research/chat] stream error:", e);
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`)); } catch {}
        try { controller.close(); } catch {}
      }
    },
  });
  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" },
  });
}

async function persistMessage(purchaseId: string, msg: { role: string; content: string }) {
  // Atomic JSONB append via RPC — see supabase/migrations/20260425_chat_append_rpc.sql
  const supabase = createServerClient();
  const newMsg = { ...msg, timestamp: new Date().toISOString() };
  await supabase.rpc("append_equity_report_chat" as any, { p_purchase: purchaseId, p_msg: newMsg as any });
}
