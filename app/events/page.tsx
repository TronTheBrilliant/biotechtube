import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { Company, FundingRound } from "@/lib/types";
import eventsData from "@/data/events.json";
import fundingData from "@/data/funding.json";
import companiesData from "@/data/companies.json";

export const metadata: Metadata = {
  title: "Biotech Events & Conferences Calendar | BiotechTube",
  description: "Upcoming biotech conferences, investor days, and industry events worldwide. Never miss a key biotech event.",
  alternates: { canonical: 'https://www.biotechtube.com/events' },
  openGraph: {
    title: "Biotech Events & Conferences Calendar",
    description: "Upcoming biotech conferences, investor days, and industry events worldwide.",
    url: 'https://www.biotechtube.com/events',
    siteName: 'BiotechTube',
    type: 'website',
  },
};

interface EventItem {
  name: string;
  date: string;
  endDate?: string;
  location: string;
  type: string;
  past?: boolean;
}

const flagMap: Record<string, string> = {
  USA: "\u{1F1FA}\u{1F1F8}",
  Spain: "\u{1F1EA}\u{1F1F8}",
  Norway: "\u{1F1F3}\u{1F1F4}",
  Germany: "\u{1F1E9}\u{1F1EA}",
};

function getCountryFromLocation(location: string): string {
  const parts = location.split(",");
  return parts[parts.length - 1].trim();
}

function getFlag(location: string): string {
  const country = getCountryFromLocation(location);
  return flagMap[country] || "";
}

const jsonEvents: EventItem[] = eventsData.map((e) => ({
  name: e.name,
  date: e.date,
  endDate: e.endDate,
  location: e.location,
  type: "Conference",
}));

const extraEvents: EventItem[] = [
  { name: "JPMorgan Healthcare Conference", date: "2026-01-12", endDate: "2026-01-15", location: "San Francisco, USA", type: "Conference", past: true },
  { name: "BIO International Convention", date: "2026-06-08", endDate: "2026-06-11", location: "Boston, USA", type: "Conference" },
  { name: "ESMO Congress", date: "2026-09-18", endDate: "2026-09-22", location: "Berlin, Germany", type: "Conference" },
  { name: "ASH Annual Meeting", date: "2026-12-05", endDate: "2026-12-08", location: "San Francisco, USA", type: "Conference" },
  { name: "Biotech Showcase", date: "2027-01-12", endDate: "2027-01-14", location: "San Francisco, USA", type: "Showcase" },
];

const allEvents: EventItem[] = [...jsonEvents, ...extraEvents].sort(
  (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
);

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

export default function EventsPage() {
  const grouped = groupByMonth(allEvents);
  const now = new Date();

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-[32px] font-medium mb-1 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Biotech Events
          </h1>
          <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>
            Conferences, summits, and investor meetings
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
                  {events.map((ev) => {
                    const isPast = ev.past || new Date(ev.date) < now;
                    const badge = typeBadgeColors[ev.type] || typeBadgeColors.Conference;

                    return (
                      <div
                        key={ev.name}
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
                              {getFlag(ev.location)} {ev.location}
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className="inline-block px-2 py-[2px] rounded text-[10px] font-medium"
                                style={{ background: badge.bg, color: badge.text }}
                              >
                                {ev.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
