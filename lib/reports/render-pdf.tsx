// biotechtube/lib/reports/render-pdf.tsx
// Minimum-viable PDF renderer using @react-pdf/renderer.
// Chunk 4 will replace this with the full branded template.

import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { ReportContent, ReportSection } from "./types";

export interface RenderInput {
  content: ReportContent;
  company: { name: string; slug: string; ticker?: string | null };
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#555", marginBottom: 24 },
  sectionHeading: { fontSize: 14, fontWeight: 700, marginTop: 18, marginBottom: 6 },
  body: { fontSize: 10, lineHeight: 1.45, marginBottom: 6 },
  meta: { fontSize: 9, color: "#888", marginBottom: 4 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, fontSize: 8, color: "#999", textAlign: "center" },
});

function SectionView({ s }: { s: ReportSection | undefined }) {
  if (!s) return null;
  return (
    <View>
      <Text style={styles.sectionHeading}>{s.heading}</Text>
      <Text style={styles.meta}>
        Confidence: {s.confidence} · Conviction: {s.conviction_score}/100
      </Text>
      <Text style={styles.body}>{s.body}</Text>
    </View>
  );
}

function ReportDoc({ content, company }: RenderInput) {
  const general = content.angles.general;
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{company.name}{company.ticker ? ` (${company.ticker})` : ""}</Text>
        <Text style={styles.subtitle}>
          Equity Research Memo · Generated {new Date(content.generated_at).toLocaleDateString()}
        </Text>

        <SectionView s={general?.executive_summary} />
        <SectionView s={content.pipeline_analysis} />
        <SectionView s={content.competitive_landscape} />
        <SectionView s={content.catalyst_calendar?.intro} />
        <SectionView s={general?.bull_case} />
        <SectionView s={general?.bear_case} />
        <SectionView s={content.valuation_notes} />
        <SectionView s={content.sec_highlights} />
        <SectionView s={content.insider_activity} />
        <SectionView s={content.literature_watch} />
        <SectionView s={content.patent_landscape} />

        <View>
          <Text style={styles.sectionHeading}>Counterfactual Scenarios</Text>
          {content.counterfactuals?.map((cf, i) => (
            <Text key={i} style={styles.body}>
              [{cf.probability}%] {cf.scenario} → {cf.thesis_impact}
            </Text>
          ))}
        </View>

        <View>
          <Text style={styles.sectionHeading}>Sources</Text>
          {content.sources?.map((src) => (
            <Text key={src.id} style={styles.body}>
              [{src.id}] {src.title} ({src.type}){src.url ? ` · ${src.url}` : ""}
            </Text>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          BiotechTube Equity Research · For supplemental research only · Not investment advice
        </Text>
      </Page>
    </Document>
  );
}

export async function renderPdf(input: RenderInput): Promise<Buffer> {
  const doc = <ReportDoc {...input} />;
  const stream = await pdf(doc).toBuffer();
  return await streamToBuffer(stream as any);
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as any) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
