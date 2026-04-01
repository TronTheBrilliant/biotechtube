import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/seo-utils";

export const revalidate = 3600;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getStageBadgeStyle(stage: string | null): React.CSSProperties {
  switch (stage) {
    case "Pre-clinical":
      return { background: "#f3f4f6", color: "#4b5563" };
    case "Phase 1":
    case "Phase 1/2":
      return { background: "#eff6ff", color: "#1d4ed8" };
    case "Phase 2":
    case "Phase 2/3":
      return { background: "#faf5ff", color: "#7c3aed" };
    case "Phase 3":
      return { background: "#f0fdf4", color: "#15803d" };
    case "Approved":
      return { background: "#d1fae5", color: "#065f46" };
    default:
      return { background: "#f3f4f6", color: "#6b7280" };
  }
}

// Find the original indication name by matching slugified version
async function findIndicationBySlug(
  slug: string
): Promise<{ indication: string; products: Array<{
  id: string;
  slug: string;
  product_name: string;
  company_name: string;
  company_id: string;
  indication: string;
  stage: string | null;
  trial_status: string | null;
  nct_id: string | null;
  hype_score: number;
}> } | null> {
  const supabase = getSupabase();

  // Get all products with indications, we'll match by slug (paginated, up to 5000 rows)
  const pipelines: any[] = [];
  const PAGE_SIZE = 1000;
  const MAX_PAGES = 5;
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const { data } = await supabase
      .from("pipelines")
      .select("id, slug, product_name, company_name, company_id, indication, stage, trial_status, nct_id")
      .not("indication", "is", null)
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    pipelines.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  if (pipelines.length === 0) return null;

  // Find matching indication
  const matchingProducts = pipelines.filter(
    (p) => p.indication && slugify(p.indication) === slug
  );

  if (matchingProducts.length === 0) return null;

  const indicationName = matchingProducts[0].indication;

  // Get hype scores
  const ids = matchingProducts.map((p) => p.id);
  const scoreMap = new Map<string, number>();

  // Batch in groups of 100
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { data: scores } = await supabase
      .from("product_scores")
      .select("pipeline_id, hype_score")
      .in("pipeline_id", batch);
    if (scores) {
      for (const s of scores) {
        scoreMap.set(s.pipeline_id, s.hype_score);
      }
    }
  }

  const products = matchingProducts.map((p) => ({
    ...p,
    hype_score: scoreMap.get(p.id) ?? 0,
  }));

  // Sort by hype score descending
  products.sort((a, b) => b.hype_score - a.hype_score);

  return { indication: indicationName, products };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const result = await findIndicationBySlug(params.slug);
  if (!result) return { title: "Indication Not Found | BiotechTube" };

  const title = `${result.indication} — ${result.products.length} Competing Products | BiotechTube`;
  const description = `Track ${result.products.length} drugs and therapies in development for ${result.indication}. Compare clinical stages, company pipelines, and hype scores.`;

  return {
    robots: "noindex, nofollow",
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "BiotechTube",
    },
  };
}

export default async function IndicationDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const result = await findIndicationBySlug(params.slug);
  if (!result) notFound();

  const { indication, products } = result;

  // Phase distribution
  const phaseCounts: Record<string, number> = {};
  for (const p of products) {
    const stage = p.stage || "Unknown";
    phaseCounts[stage] = (phaseCounts[stage] || 0) + 1;
  }

  const phaseOrder = ["Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 2/3", "Phase 3", "Approved"];
  const sortedPhases = Object.entries(phaseCounts).sort((a, b) => {
    const ia = phaseOrder.indexOf(a[0]);
    const ib = phaseOrder.indexOf(b[0]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />
      <div className="max-w-5xl mx-auto px-5 py-6">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-1.5 text-[12px] mb-4"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link href="/indications" className="hover:underline">
            Indications
          </Link>
          <span>/</span>
          <span style={{ color: "var(--color-text-secondary)" }}>
            {indication}
          </span>
        </nav>

        <h1
          className="text-[28px] md:text-[36px] font-bold tracking-tight mb-2"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-0.5px",
          }}
        >
          {indication}
        </h1>
        <p
          className="text-[14px] mb-6"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {products.length} competing product{products.length !== 1 ? "s" : ""}{" "}
          in clinical development for {indication}.
        </p>

        {/* Phase Distribution */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <h2
            className="text-[11px] font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Pipeline by Phase
          </h2>
          <div className="flex flex-wrap gap-3">
            {sortedPhases.map(([phase, count]) => (
              <div
                key={phase}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "var(--color-bg-primary)" }}
              >
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={getStageBadgeStyle(phase)}
                >
                  {phase}
                </span>
                <span
                  className="text-[14px] font-bold tabular-nums"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div className="px-5 pt-5 pb-3">
            <h2
              className="text-[14px] font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              All Products ({products.length})
            </h2>
          </div>
          <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
            <table className="w-full text-left">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <th
                    className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Product
                  </th>
                  <th
                    className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Company
                  </th>
                  <th
                    className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Stage
                  </th>
                  <th
                    className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Hype
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[var(--color-bg-primary)] transition-colors"
                    style={{
                      borderBottom: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/product/${p.slug}`}
                        className="text-[13px] font-medium hover:underline"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {p.product_name}
                      </Link>
                    </td>
                    <td
                      className="px-4 py-2.5 text-[12px]"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {p.company_name}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.stage && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={getStageBadgeStyle(p.stage)}
                        >
                          {p.stage}
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-2.5 text-[12px]"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {p.trial_status || "\u2014"}
                    </td>
                    <td className="px-4 py-2.5">
                      <HypeBar score={p.hype_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function getHypeLabel(score: number) {
  if (score >= 80)
    return { gradient: "linear-gradient(90deg, #ef4444, #f97316)", color: "#dc2626" };
  if (score >= 60)
    return { gradient: "linear-gradient(90deg, #22c55e, #16a34a)", color: "#16a34a" };
  if (score >= 40)
    return { gradient: "linear-gradient(90deg, #3b82f6, #2563eb)", color: "#2563eb" };
  return { gradient: "linear-gradient(90deg, #d1d5db, #9ca3af)", color: "#9ca3af" };
}

function HypeBar({ score }: { score: number }) {
  const { gradient, color } = getHypeLabel(score);
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-[5px] rounded-full flex-shrink-0"
        style={{
          width: 40,
          background: "var(--color-bg-tertiary)",
          overflow: "hidden",
        }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: gradient }}
        />
      </div>
      <span
        className="text-[11px] font-bold tabular-nums"
        style={{ color, minWidth: 20 }}
      >
        {score}
      </span>
    </div>
  );
}
