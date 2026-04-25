// biotechtube/lib/reports/publisher.ts
// Uploads PDF + (eventually) audio to private Supabase Storage and inserts the
// equity_reports row. Returns the new row's id + accounting fields.

import { createServerClient } from "@/lib/supabase";
import type { EnrichmentBundle, ReportContent } from "./types";

const BUCKET = "equity-reports";

export interface PublishInput {
  companyId: string;
  content: ReportContent;
  enrichment: EnrichmentBundle;
  pdfBytes: Buffer;
  audioBytes: Buffer | null;
  mechanismSvg: string | null;
  costCents: number;
  generationSeconds: number;
  expiresAt: string;
}

export interface PublishResult {
  reportId: string;
  costCents: number;
  generationSeconds: number;
}

export async function publish(input: PublishInput): Promise<PublishResult> {
  const supabase = createServerClient();

  const { data: row, error: insertErr } = await supabase
    .from("equity_reports")
    .insert({
      company_id: input.companyId,
      content_jsonb: input.content as any,
      enrichment_jsonb: input.enrichment as any,
      cost_cents: Math.round(input.costCents),
      generation_seconds: input.generationSeconds,
      expires_at: input.expiresAt,
      mechanism_svg: input.mechanismSvg,
      pdf_url: null,
      audio_url: null,
    })
    .select("id")
    .single();

  if (insertErr || !row) {
    throw new Error(`Insert equity_reports failed: ${insertErr?.message}`);
  }

  const pdfPath = `${row.id}/report.pdf`;
  const { error: pdfErr } = await supabase.storage
    .from(BUCKET)
    .upload(pdfPath, input.pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (pdfErr) {
    throw new Error(`PDF upload failed: ${pdfErr.message}`);
  }

  let audioPath: string | null = null;
  if (input.audioBytes) {
    audioPath = `${row.id}/briefing.mp3`;
    const { error: audioErr } = await supabase.storage
      .from(BUCKET)
      .upload(audioPath, input.audioBytes, {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (audioErr) {
      console.warn(`Audio upload failed: ${audioErr.message}`);
      audioPath = null;
    }
  }

  const { error: updateErr } = await supabase
    .from("equity_reports")
    .update({ pdf_url: pdfPath, audio_url: audioPath })
    .eq("id", row.id);
  if (updateErr) {
    console.error(`Update equity_reports paths failed: ${updateErr.message}`);
  }

  return {
    reportId: row.id,
    costCents: input.costCents,
    generationSeconds: input.generationSeconds,
  };
}
