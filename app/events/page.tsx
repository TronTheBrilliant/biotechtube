import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { Company, FundingRound } from "@/lib/types";
import { createClient } from "@supabase/supabase-js";
import fundingData from "@/data/funding.json";
import companiesData from "@/data/companies.json";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const metadata: Metadata = {
  title: "Biotech Events & Conferences 2026-2027 | BiotechTube",
  description:
    "Upcoming biotech conferences, medical meetings, and investor events. BIO International, ASCO, JPMorgan Healthcare, and 40+ more events worldwide.",
  alternates: { canonical: "https://biotechtube.io/events" },
  openGraph: {
    title: "Biotech Events & Conferences 2026-2027",
    description: "Complete calendar of biotech industry events worldwide",
    url: "https://biotechtube.io/events",
    images: ["/api/og?title=Biotech%20Events&subtitle=Conferences%2C%20meetings%2C%20and%20FDA%20dates&type=events"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Biotech Events & Conferences 2026-2027 | BiotechTube",
    description: "Upcoming biotech conferences, medical meetings, and investor events worldwide.",
  },
};

// Revalidate every hour
export const revalidate = 3600;

interface DBEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  city: string | null;
  country: string | null;
  country_flag: string | null;
  type: string;
  description: string | null;
  url: string | null;
}

interface EventItem {
  name: string;
  date: string;
  endDate?: string;
  location: string;
  type: string;
  description?: string;
  url?: string;
  countryFlag?: string;
  past?: boolean;
}

async function getEvents(): Promise<EventItem[]> {
  const supabase = getSupabase();

  // Get upcoming events and recent (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("biotech_events")
    .select("*")
    .gte("start_date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("start_date", { ascending: true });

  if (error || !data) {
    console.error("Error fetching events:", error);
    return [];
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return (data as DBEvent[]).map((e) => ({
    name: e.name,
    date: e.start_date,
    endDate: e.end_date || undefined,
    location: [e.city, e.country].filter(Boolean).join(", "),
    type: e.type || "Conference",
    description: e.description || undefined,
    url: e.url || undefined,
    countryFlag: e.country_flag || undefined,
    past: new Date(e.start_date) < now,
  }));
}

function formatDateRange(date: string, endDate?: string): string {
  const d = new Date(date);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = d.toLocaleDateString("en-US", opts);
  if (!endDate) return `${start}, ${d.getFullYear()}`;
  const e = new Date(endDate);
  const end = e.toLocaleDateString("en-US", opts);
  return `${start} - ${end}, ${d.getFullYear()}`;
}

function getMonthYear(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const typeBadgeColors: Record<string, { bg: string; text: string }> = {
  Conference: { bg: "#eff6ff", text: "#1d4ed8" },
  "Medical Meeting": { bg: "#f5f3ff", text: "#5b21b6" },
  "Investor Meeting": { bg: "#fef3e2", text: "#b45309" },
  "FDA Date": { bg: "#fef2f2", text: "#b91c1c" },
  Summit: { bg: "#f5f3ff", text: "#5b21b6" },
  Showcase: { bg: "#fef3e2", text: "#b45309" },
};

// Group events by month
function groupByMonth(events: EventItem[]): Record<string, EventItem[]> {
  const groups: Record<string, EventItem[]> = {};
  for (const ev of events) {
    const key = getMonthYear(ev.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  }
  return groups;
}

export default async function EventsPage() {
  const allEvents = await getEvents();
  const upcomingEvents = allEvents.filter((e) => !e.past);
  const recentEvents = allEvents.filter((e) => e.past);
  const grouped = groupByMonth(upcomingEvents);

  // JSON-LD Event structured data
  const eventsJsonLd = allEvents
    .filter((e) => !e.past)
    .slice(0, 30)
    .map((ev) => ({
      "@context": "https://schema.org",
      "@type": "Event",
      name: ev.name,
      startDate: ev.date,
      ...(ev.endDate ? { endDate: ev.endDate } : {}),
      location: {
        "@type": "Place",
        name: ev.location,
      },
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      ...(ev.description ? { description: ev.description } : {}),
      ...(ev.url ? { url: ev.url } : {}),
    }));

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Events" },
  ];

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      {eventsJsonLd.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-[32px] font-medium mb-1 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Biotech Events
          </h1>
          <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>
            {allEvents.length} conferences, summits, and investor meetings
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 mb-6">
          <button
            className="text-12 font-medium px-3 py-1.5 rounded"
            style={{ background: "var(--color-accent)", color: "white" }}
          >
            List
          </button>
          <button
            className="text-12 font-medium px-3 py-1.5 rounded"
            style={{ color: "var(--color-text-tertiary)", cursor: "not-allowed", opacity: 0.5 }}
            disabled
          >
            Calendar
          </button>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6" style={{ alignItems: "flex-start" }}>
          {/* Main column */}
          <div className="flex-1 min-w-0">
            {/* Recent events section */}
            {recentEvents.length > 0 && (
              <div className="mb-8">
                <h2
                  className="text-13 font-medium mb-3"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Recent Events
                </h2>
                <div className="flex flex-col gap-3">
                  {recentEvents.map((ev) => (
                    <EventCard key={ev.name + ev.date} event={ev} isPast />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming events grouped by month */}
            {Object.entries(grouped).map(([month, events]) => (
              <div key={month} className="mb-6">
                {/* Month header */}
                <h2
                  className="text-13 font-medium mb-3"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {month}
                </h2>

                <div className="flex flex-col gap-3">
                  {events.map((ev) => (
                    <EventCard key={ev.name + ev.date} event={ev} isPast={false} />
                  ))}
                </div>
              </div>
            ))}

            {/* Submit event CTA */}
            <div
              className="rounded-lg px-4 py-5 mt-4 text-center"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <p
                className="text-13 font-medium mb-1"
                style={{ color: "var(--color-text-primary)" }}
              >
                Know of a biotech event we&apos;re missing?
              </p>
              <Link
                href="/submit-event"
                className="text-13 font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                Submit an event
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block" style={{ width: 260, flexShrink: 0 }}>
            <div
              className="rounded-lg overflow-hidden mb-4"
              style={{
                border: "0.5px solid var(--color-border-subtle)",
                background: "var(--color-bg-secondary)",
              }}
            >
              <RecentlyFunded funding={fundingData as FundingRound[]} companies={companiesData as Company[]} />
            </div>
            <PaywallCard />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function EventCard({ event: ev, isPast }: { event: EventItem; isPast: boolean }) {
  const badge = typeBadgeColors[ev.type] || typeBadgeColors.Conference;
  const flag = ev.countryFlag || "";

  const inner = (
    <div
      className="rounded-lg px-4 py-3.5"
      style={{
        background: "var(--color-bg-secondary)",
        border: "0.5px solid var(--color-border-subtle)",
        opacity: isPast ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-14 font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {ev.name}
            </span>
            {isPast && (
              <span
                className="inline-block px-2 py-[1px] rounded text-[10px] font-medium"
                style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}
              >
                Past
              </span>
            )}
          </div>
          <div
            className="text-12 font-medium mb-1"
            style={{ color: "var(--color-accent)" }}
          >
            {formatDateRange(ev.date, ev.endDate)}
          </div>
          <div className="text-12 mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {flag} {ev.location}
          </div>
          <div className="flex items-center gap-3">
            <span
              className="inline-block px-2 py-[2px] rounded text-[10px] font-medium"
              style={{ background: badge.bg, color: badge.text }}
            >
              {ev.type}
            </span>
            {ev.description && (
              <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
                {ev.description}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (ev.url) {
    return (
      <a href={ev.url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
        {inner}
      </a>
    );
  }

  return inner;
}
