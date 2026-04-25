// biotechtube/lib/reports/render-audio.ts
import OpenAI from "openai";
import type { ReportContent } from "./types";

export async function renderAudio(content: ReportContent): Promise<Buffer | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn("[render-audio] OPENAI_API_KEY not set; skipping audio");
    return null;
  }
  const general = content.angles.general;
  if (!general) return null;

  const script = [
    `Equity Research Briefing.`,
    general.executive_summary.body,
    `Bull case: ${general.bull_case.body}`,
    `Bear case: ${general.bear_case.body}`,
    `Disclaimer: AI-generated from public sources. For supplemental research only. Not investment advice.`,
  ].join(" ").slice(0, 4000);

  const oa = new OpenAI({ apiKey: key });
  try {
    const res = await oa.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: script,
      response_format: "mp3",
    });
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch (e) {
    console.warn("[render-audio] TTS failed:", e);
    return null;
  }
}
