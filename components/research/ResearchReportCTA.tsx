import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";

export function ResearchReportCTA({ companyName, slug }: { companyName: string; slug: string }) {
  return (
    <Link href={`/research/${slug}`} className="block rounded-xl p-4 border" style={{ borderColor: "var(--color-border-subtle)", background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))" }}>
      <div className="flex items-center gap-2 mb-2">
        <FileText size={14} style={{ color: "var(--color-accent)" }} />
        <span className="text-[11px] font-semibold uppercase" style={{ color: "var(--color-accent)" }}>Premium</span>
      </div>
      <div className="text-[13px] font-semibold leading-tight">
        Get the equity research memo on {companyName}
      </div>
      <div className="text-[12px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
        15-20 pages · quant catalysts · 30-day live dashboard · AI chat
      </div>
      <div className="flex items-center gap-1 mt-2 text-[12px] font-medium" style={{ color: "var(--color-accent)" }}>
        From $99 <ArrowRight size={12} />
      </div>
    </Link>
  );
}
