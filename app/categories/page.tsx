import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "Product Categories — Drugs, Devices & AI/ML | BiotechTube",
  description:
    "Explore biotech and medtech products by category. Pipeline drugs by phase, medical devices by class, and AI/ML-enabled devices by specialty.",
  keywords: [
    "biotech product categories",
    "drug pipeline by phase",
    "medical devices by class",
    "AI ML medical devices",
    "FDA cleared devices",
  ],
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function aggregateColumn(
  supabase: ReturnType<typeof getSupabase>,
  table: string,
  column: string
): Promise<{ value: string; count: number }[]> {
  const countMap = new Map<string, number>();
  const pageSize = 5000;
  let offset = 0;

  while (offset < 60000) {
    const { data } = await supabase
      .from(table)
      .select(column)
      .not(column, "is", null)
      .range(offset, offset + pageSize - 1);
    if (!data || data.length === 0) break;
    for (const r of data) {
      const val = (r as Record<string, string>)[column];
      if (val) countMap.set(val, (countMap.get(val) || 0) + 1);
    }
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  return Array.from(countMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export default async function CategoriesPage() {
  const supabase = getSupabase();

  // Fetch all stats in parallel - using counts + paginated aggregation
  const [
    stageAgg,
    deviceAgg,
    aiAgg,
    { count: totalPipelines },
    { count: totalDevices },
    { count: totalAiMl },
  ] = await Promise.all([
    aggregateColumn(supabase, "pipelines", "stage"),
    aggregateColumn(supabase, "medical_devices", "medical_specialty"),
    aggregateColumn(supabase, "ai_ml_devices", "ai_ml_category"),
    supabase.from("pipelines").select("id", { count: "exact", head: true }),
    supabase.from("medical_devices").select("id", { count: "exact", head: true }),
    supabase.from("ai_ml_devices").select("id", { count: "exact", head: true }),
  ]);

  const pipelineStages = stageAgg.map((s) => ({ stage: s.value, count: s.count }));
  const deviceSpecialties = deviceAgg.map((s) => ({ specialty: s.value, count: s.count }));
  const aiCategories = aiAgg.map((s) => ({ category: s.value, count: s.count }));

  // Process pipeline stages
  const stageOrder = [
    "Pre-clinical",
    "Phase 1",
    "Phase 1/2",
    "Phase 2",
    "Phase 2/3",
    "Phase 3",
    "Approved",
  ];
  const stageData = pipelineStages.sort((a, b) => {
    const ia = stageOrder.indexOf(a.stage);
    const ib = stageOrder.indexOf(b.stage);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const deviceData = deviceSpecialties;
  const aiData = aiCategories;

  function getStageBg(stage: string): string {
    switch (stage) {
      case "Pre-clinical":
        return "#f3f4f6";
      case "Phase 1":
      case "Phase 1/2":
        return "#eff6ff";
      case "Phase 2":
      case "Phase 2/3":
        return "#faf5ff";
      case "Phase 3":
        return "#f0fdf4";
      case "Approved":
        return "#d1fae5";
      default:
        return "#f3f4f6";
    }
  }

  function getStageColor(stage: string): string {
    switch (stage) {
      case "Pre-clinical":
        return "#4b5563";
      case "Phase 1":
      case "Phase 1/2":
        return "#1d4ed8";
      case "Phase 2":
      case "Phase 2/3":
        return "#7c3aed";
      case "Phase 3":
        return "#15803d";
      case "Approved":
        return "#065f46";
      default:
        return "#6b7280";
    }
  }

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />
      <div className="max-w-5xl mx-auto px-5 py-6">
        {/* Breadcrumb */}
        <div
          className="flex items-center gap-1.5 text-[12px] mb-4"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <span style={{ color: "var(--color-text-secondary)" }}>
            Categories
          </span>
        </div>

        <h1
          className="text-[32px] font-bold tracking-tight mb-2"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-0.5px",
          }}
        >
          Product Categories
        </h1>
        <p
          className="text-[15px] mb-8"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}
        >
          A high-level overview of all products tracked on BiotechTube &mdash;
          pipeline drugs, medical devices, and AI/ML-enabled tools.
        </p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <SummaryCard
            emoji="💊"
            title="Pipeline Drugs"
            count={totalPipelines || 0}
            href="/pipeline"
          />
          <SummaryCard
            emoji="🏥"
            title="Medical Devices"
            count={totalDevices || 0}
            href="/products?tab=devices"
          />
          <SummaryCard
            emoji="🤖"
            title="AI/ML Devices"
            count={totalAiMl || 0}
            href="/products?tab=ai"
          />
        </div>

        {/* Drugs by Phase */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[16px] font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Drugs by Phase
            </h2>
            <Link
              href="/pipeline"
              className="text-[12px] font-medium hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              View pipeline &rarr;
            </Link>
          </div>

          {/* Bar Chart */}
          <div className="space-y-3">
            {stageData.map((s) => {
              const maxCount = Math.max(...stageData.map((d) => d.count));
              const pct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
              return (
                <div key={s.stage} className="flex items-center gap-3">
                  <span
                    className="text-[12px] font-semibold w-[90px] shrink-0 px-2 py-0.5 rounded-full text-center"
                    style={{
                      background: getStageBg(s.stage),
                      color: getStageColor(s.stage),
                    }}
                  >
                    {s.stage}
                  </span>
                  <div
                    className="flex-1 h-[8px] rounded-full overflow-hidden"
                    style={{ background: "var(--color-bg-tertiary)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: getStageColor(s.stage),
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span
                    className="text-[13px] font-bold tabular-nums w-[60px] text-right"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {s.count.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Devices by Specialty */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[16px] font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Medical Devices by Specialty
            </h2>
            <Link
              href="/products?tab=devices"
              className="text-[12px] font-medium hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              View all devices &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {deviceData.slice(0, 16).map((d) => (
              <div
                key={d.specialty}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors"
              >
                <span
                  className="text-[13px] font-medium truncate mr-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {d.specialty}
                </span>
                <span
                  className="text-[11px] font-medium shrink-0 px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--color-bg-tertiary)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {d.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI/ML by Category */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[16px] font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              AI/ML Devices by Specialty
            </h2>
            <Link
              href="/products?tab=ai"
              className="text-[12px] font-medium hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              View all AI/ML &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {aiData.map((a) => (
              <div
                key={a.category}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors"
              >
                <span
                  className="text-[13px] font-medium truncate mr-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {a.category}
                </span>
                <span
                  className="text-[11px] font-medium shrink-0 px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--color-bg-tertiary)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {a.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Browse Links */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <h2
            className="text-[14px] font-bold mb-3"
            style={{ color: "var(--color-text-primary)" }}
          >
            More Ways to Explore
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <BrowseLink
              href="/indications"
              emoji="🎯"
              title="Browse by Indication"
              subtitle="9,800+ disease areas"
            />
            <BrowseLink
              href="/therapeutic-areas"
              emoji="🧬"
              title="Therapeutic Areas"
              subtitle="18 major categories"
            />
            <BrowseLink
              href="/pipeline"
              emoji="💊"
              title="Drug Pipeline"
              subtitle="Clinical trial tracker"
            />
            <BrowseLink
              href="/companies"
              emoji="🏢"
              title="Companies"
              subtitle="14,000+ tracked"
            />
            <BrowseLink
              href="/products"
              emoji="📦"
              title="All Products"
              subtitle="Drugs, devices & AI"
            />
            <BrowseLink
              href="/trending"
              emoji="📈"
              title="Trending"
              subtitle="Hot products this week"
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function SummaryCard({
  emoji,
  title,
  count,
  href,
}: {
  emoji: string;
  title: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl p-5 block hover:shadow-md transition-shadow"
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <span className="text-[28px]">{emoji}</span>
      <p
        className="text-[28px] font-bold tabular-nums mt-2"
        style={{ color: "var(--color-text-primary)" }}
      >
        {count.toLocaleString()}
      </p>
      <p
        className="text-[13px] font-medium"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {title}
      </p>
    </Link>
  );
}

function BrowseLink({
  href,
  emoji,
  title,
  subtitle,
}: {
  href: string;
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors"
    >
      <span className="text-[20px]">{emoji}</span>
      <div>
        <span
          className="text-[13px] font-medium block"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </span>
        <span
          className="text-[11px]"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {subtitle}
        </span>
      </div>
    </Link>
  );
}
