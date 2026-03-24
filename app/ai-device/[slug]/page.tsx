import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface AiMlDevice {
  id: string;
  company_id: string | null;
  device_name: string;
  company_name: string;
  slug: string;
  product_type: string;
  submission_type: string | null;
  decision_date: string | null;
  medical_specialty: string | null;
  panel: string | null;
  submission_number: string | null;
  ai_ml_category: string | null;
  source_url: string | null;
}

async function getAiDevice(slug: string): Promise<AiMlDevice | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("ai_ml_devices")
    .select("*")
    .eq("slug", slug)
    .single();
  return data || null;
}

async function getCompanySlug(companyId: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", companyId)
    .single();
  return data?.slug || null;
}

async function getSimilarAiDevices(
  device: AiMlDevice
): Promise<AiMlDevice[]> {
  const supabase = getSupabase();

  if (device.ai_ml_category) {
    const { data } = await supabase
      .from("ai_ml_devices")
      .select("*")
      .eq("ai_ml_category", device.ai_ml_category)
      .neq("id", device.id)
      .order("decision_date", { ascending: false })
      .limit(10);
    return data || [];
  }

  if (device.medical_specialty) {
    const { data } = await supabase
      .from("ai_ml_devices")
      .select("*")
      .eq("medical_specialty", device.medical_specialty)
      .neq("id", device.id)
      .order("decision_date", { ascending: false })
      .limit(10);
    return data || [];
  }

  return [];
}

function formatDate(d: string | null): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const device = await getAiDevice(params.slug);
  if (!device) return { title: "AI/ML Device Not Found | BiotechTube" };

  const title = `${device.device_name} | AI/ML | ${device.company_name} | BiotechTube`;
  const description = `${device.device_name} by ${device.company_name}. AI/ML-enabled medical device in ${device.ai_ml_category || device.medical_specialty || "healthcare"}. FDA ${device.submission_type || "submission"}.`;

  return {
    robots: "noindex, nofollow",
    title,
    description,
    openGraph: { title, description, type: "article", siteName: "BiotechTube" },
  };
}

export default async function AiDevicePage({
  params,
}: {
  params: { slug: string };
}) {
  const device = await getAiDevice(params.slug);
  if (!device) notFound();

  const [companySlug, similarDevices] = await Promise.all([
    device.company_id
      ? getCompanySlug(device.company_id)
      : Promise.resolve(null),
    getSimilarAiDevices(device),
  ]);

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-1.5 text-[12px] mb-4"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <Link href="/products" className="hover:underline">
            Products
          </Link>
          <span>/</span>
          <span>AI/ML Devices</span>
          <span>/</span>
          <span style={{ color: "var(--color-text-secondary)" }}>
            {device.device_name.length > 60
              ? device.device_name.substring(0, 60) + "..."
              : device.device_name}
          </span>
        </nav>

        {/* Header */}
        <div
          className="rounded-xl p-5 md:p-6 mb-6"
          style={{
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1
                  className="text-[24px] md:text-[32px] font-bold tracking-tight"
                  style={{
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.5px",
                    lineHeight: 1.15,
                  }}
                >
                  {device.device_name}
                </h1>
                <span
                  className="px-2.5 py-1 rounded-full text-[12px] font-semibold"
                  style={{ background: "#dbeafe", color: "#1e40af" }}
                >
                  AI/ML
                </span>
              </div>

              {/* Company */}
              {companySlug ? (
                <Link
                  href={`/company/${companySlug}`}
                  className="text-[14px] font-medium hover:underline inline-block mb-3"
                  style={{ color: "var(--color-accent)" }}
                >
                  {device.company_name}
                </Link>
              ) : (
                <p
                  className="text-[14px] font-medium mb-3"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {device.company_name}
                </p>
              )}

              {/* Tags */}
              <div className="flex items-center gap-2 flex-wrap">
                {device.ai_ml_category && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: "#faf5ff", color: "#7c3aed" }}
                  >
                    {device.ai_ml_category}
                  </span>
                )}
                {device.submission_type && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: "#eff6ff", color: "#1d4ed8" }}
                  >
                    {device.submission_type}
                  </span>
                )}
                {device.medical_specialty && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: "#f0fdf4", color: "#15803d" }}
                  >
                    {device.medical_specialty}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard
                label="AI/ML Category"
                value={device.ai_ml_category || "\u2014"}
              />
              <InfoCard
                label="Submission Type"
                value={device.submission_type || "\u2014"}
              />
              <InfoCard
                label="Decision Date"
                value={formatDate(device.decision_date)}
              />
              <InfoCard
                label="Medical Specialty"
                value={device.medical_specialty || "\u2014"}
              />
              <InfoCard
                label="Panel"
                value={device.panel || "\u2014"}
              />
              <InfoCard
                label="Submission Number"
                value={device.submission_number || "\u2014"}
              />
            </div>

            {/* About */}
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h2
                className="text-[14px] font-bold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                About This AI/ML Device
              </h2>
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {device.device_name} is an AI/ML-enabled medical device
                developed by {device.company_name}
                {device.ai_ml_category
                  ? ` in the ${device.ai_ml_category} category`
                  : ""}
                .
                {device.submission_type
                  ? ` It was submitted via ${device.submission_type}`
                  : ""}
                {device.decision_date
                  ? ` with an FDA decision on ${formatDate(device.decision_date)}`
                  : ""}
                .
                {device.medical_specialty
                  ? ` The device falls under the ${device.medical_specialty} medical specialty.`
                  : ""}
              </p>

              {device.source_url && (
                <a
                  href={device.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium mt-3 hover:underline"
                  style={{ color: "var(--color-accent)" }}
                >
                  View FDA listing &rarr;
                </a>
              )}
            </div>

            {/* Similar AI/ML Devices */}
            {similarDevices.length > 0 && (
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
                    Similar AI/ML Devices ({similarDevices.length})
                  </h2>
                  <p
                    className="text-[12px] mt-0.5"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Same category:{" "}
                    {device.ai_ml_category || device.medical_specialty}
                  </p>
                </div>
                <div
                  className="overflow-x-auto"
                  style={{ scrollbarWidth: "thin" }}
                >
                  <table className="w-full text-left">
                    <thead>
                      <tr
                        style={{
                          borderBottom:
                            "1px solid var(--color-border-subtle)",
                        }}
                      >
                        <th
                          className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Device
                        </th>
                        <th
                          className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Company
                        </th>
                        <th
                          className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider hidden md:table-cell"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Category
                        </th>
                        <th
                          className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider hidden md:table-cell"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {similarDevices.map((d) => (
                        <tr
                          key={d.id}
                          className="hover:bg-[var(--color-bg-primary)] transition-colors"
                          style={{
                            borderBottom:
                              "1px solid var(--color-border-subtle)",
                          }}
                        >
                          <td className="px-5 py-2.5">
                            <Link
                              href={`/ai-device/${d.slug}`}
                              className="text-[13px] font-medium hover:underline block max-w-[250px] truncate"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {d.device_name}
                            </Link>
                          </td>
                          <td
                            className="px-4 py-2.5 text-[12px] max-w-[200px] truncate"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {d.company_name}
                          </td>
                          <td
                            className="px-4 py-2.5 text-[12px] hidden md:table-cell"
                            style={{ color: "var(--color-text-tertiary)" }}
                          >
                            {d.ai_ml_category || "\u2014"}
                          </td>
                          <td
                            className="px-4 py-2.5 text-[12px] hidden md:table-cell"
                            style={{ color: "var(--color-text-tertiary)" }}
                          >
                            {formatDate(d.decision_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Company card */}
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h3
                className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Developer
              </h3>
              <p
                className="text-[15px] font-bold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                {device.company_name}
              </p>
              {companySlug && (
                <Link
                  href={`/company/${companySlug}`}
                  className="text-[12px] font-medium hover:underline inline-flex items-center gap-1"
                  style={{ color: "var(--color-accent)" }}
                >
                  View company profile &rarr;
                </Link>
              )}
            </div>

            {/* Quick Facts */}
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h3
                className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Quick Facts
              </h3>
              <div className="space-y-2">
                {device.ai_ml_category && (
                  <Fact label="Category" value={device.ai_ml_category} />
                )}
                {device.panel && (
                  <Fact label="Panel" value={device.panel} />
                )}
                {device.submission_number && (
                  <Fact label="Submission #" value={device.submission_number} />
                )}
              </div>
            </div>

            {/* Browse More */}
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h3
                className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Explore More
              </h3>
              <div className="space-y-2">
                <Link
                  href="/categories"
                  className="text-[12px] font-medium hover:underline block"
                  style={{ color: "var(--color-accent)" }}
                >
                  Browse all categories &rarr;
                </Link>
                <Link
                  href="/products"
                  className="text-[12px] font-medium hover:underline block"
                  style={{ color: "var(--color-accent)" }}
                >
                  All products &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-wider block mb-1"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        {label}
      </span>
      <p
        className="text-[14px] font-medium"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between py-1.5"
      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
    >
      <span
        className="text-[11px] font-medium"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        {label}
      </span>
      <span
        className="text-[13px] font-bold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}
