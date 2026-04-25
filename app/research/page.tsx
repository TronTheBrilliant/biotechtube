import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ArrowRight, FileText, MessageSquare, Headphones, Activity, Lock, BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Equity Research Memos — BiotechTube",
  description: "Premium AI-generated equity research memos on biotech and pharma companies. PDF + 30-day live dashboard + AI chat agent.",
};

const SAMPLE_PDF = "/sample-equity-research.pdf";

export default function ResearchLandingPage() {
  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-[1100px] mx-auto px-4 md:px-6 py-12">
        {/* Hero */}
        <section className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium mb-4"
            style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
            <FileText size={14} /> Living Research v1
          </div>
          <h1 className="text-[40px] md:text-[52px] font-bold tracking-tight"
              style={{ color: "var(--color-text-primary)", letterSpacing: "-1px", lineHeight: 1.1 }}>
            Analyst-grade equity research,<br/>without the analyst price tag.
          </h1>
          <p className="text-[16px] mt-5 max-w-2xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>
            One company per memo. 15-20 pages. Real SEC + ClinicalTrials.gov + literature data.
            Quant-scored catalysts. AI chat agent. Daily-refreshed dashboard.
          </p>
          <div className="flex gap-3 justify-center mt-7">
            <Link href="/companies" className="px-5 py-2.5 rounded text-white font-medium" style={{ background: "var(--color-accent)" }}>
              Browse companies
            </Link>
            <a href={SAMPLE_PDF} className="px-5 py-2.5 rounded font-medium border" style={{ borderColor: "var(--color-border-subtle)" }}>
              Download sample report
            </a>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {[
            { icon: BarChart3, title: "Quant-scored catalysts", body: "P(success) for every trial readout, computed from our historical pipelines DB. Not a guess." },
            { icon: FileText, title: "SEC + CT.gov + Literature", body: "10-K diffs, real Form 4 insider activity, live trial status, last-90d PubMed/bioRxiv." },
            { icon: MessageSquare, title: "AI chat agent", body: "Ask follow-up questions grounded in the memo. Streaming responses, V4-Flash." },
            { icon: Headphones, title: "5-min audio briefing", body: "Listen on your commute. Same exec summary, audio format." },
            { icon: Activity, title: "30-day live dashboard", body: "Catalyst calendar updates daily. Day-14 refresh if material events. Event alerts opt-in." },
            { icon: Lock, title: "Per-claim citations", body: "Every claim tied to a source. Fact-checked by a second AI pass. Unverified flagged." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl p-5" style={{ background: "var(--color-bg-secondary)" }}>
              <Icon size={20} style={{ color: "var(--color-accent)" }} />
              <h3 className="text-[15px] font-semibold mt-2.5">{title}</h3>
              <p className="text-[13px] mt-1" style={{ color: "var(--color-text-secondary)" }}>{body}</p>
            </div>
          ))}
        </section>

        <section className="mb-14">
          <h2 className="text-[24px] font-bold text-center mb-6">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PricingCard title="Snapshot" price="$99" features={["Full PDF (15-20 pages)", "All quant signals", "Bibliography + per-claim citations"]} />
            <PricingCard title="⭐ Living" price="$299" recommended features={["Everything in Snapshot", "30-day live dashboard", "AI chat agent", "Audio briefing", "Day-14 refresh", "Event alerts (opt-in)"]} />
            <PricingCard title="Institutional" price="$2,999/yr" features={["Any 50 reports/yr", "All Living tier", "Team seats"]} cta="Talk to sales" href="mailto:research@biotechtube.io" />
          </div>
        </section>

        <section className="max-w-2xl mx-auto">
          <h2 className="text-[24px] font-bold mb-6">FAQ</h2>
          {[
            { q: "How is this different from prompting ChatGPT?", a: "We have the proprietary normalized DB joins, the quant base rates from historical pipelines, the live SEC + ClinicalTrials.gov fetch, and the day-14 refresh. ChatGPT has fragments and stale training data." },
            { q: "How fresh is the data?", a: "Generated at purchase time using last 24-72h external data. Living tier refreshes catalyst calendar daily on the dashboard, regenerates the PDF at day 14 if material events occurred." },
            { q: "Can I get a refund if quality is weak?", a: "Yes. Email research@biotechtube.io within 7 days for a full refund, no questions asked." },
            { q: "Is this investment advice?", a: "No. Reports are AI-generated from public sources. For supplemental research only. Do your own diligence." },
          ].map(f => (
            <details key={f.q} className="py-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
              <summary className="text-[14px] font-medium cursor-pointer">{f.q}</summary>
              <p className="text-[13px] mt-2" style={{ color: "var(--color-text-secondary)" }}>{f.a}</p>
            </details>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function PricingCard({ title, price, features, recommended, cta, href }: { title: string; price: string; features: string[]; recommended?: boolean; cta?: string; href?: string }) {
  return (
    <div className="rounded-xl p-5 border" style={{ borderColor: recommended ? "var(--color-accent)" : "var(--color-border-subtle)", background: recommended ? "rgba(99,102,241,0.04)" : "transparent" }}>
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[14px] font-semibold">{title}</div>
        <div className="text-[20px] font-bold">{price}</div>
      </div>
      <ul className="space-y-1 mb-4">
        {features.map(f => <li key={f} className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>· {f}</li>)}
      </ul>
      {href ? (
        <a href={href} className="block text-center py-2 rounded text-[13px] font-medium border" style={{ borderColor: "var(--color-border-subtle)" }}>
          {cta ?? "Buy"}
        </a>
      ) : (
        <Link href="/companies" className="block text-center py-2 rounded text-[13px] font-medium text-white" style={{ background: recommended ? "var(--color-accent)" : "var(--color-text-primary)" }}>
          Pick a company
        </Link>
      )}
    </div>
  );
}
