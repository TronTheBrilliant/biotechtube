import { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getAllPeople, personSlug, normalizePersonName, PersonWithCompany } from "@/lib/seo-utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Biotech Leaders & Executives — People Directory | BiotechTube",
  description:
    "Browse biotech and pharmaceutical industry leaders, CEOs, CSOs, and executives. Find leadership teams, career histories, and company affiliations across thousands of biotech companies.",
  keywords: [
    "biotech executives",
    "pharma leadership",
    "biotech CEO",
    "biotech CSO",
    "pharmaceutical leaders",
    "biotech people directory",
  ],
};

interface DeduplicatedPerson {
  name: string;
  slug: string;
  roles: { role: string; companyName: string; companySlug: string }[];
}

function deduplicatePeople(people: PersonWithCompany[]): DeduplicatedPerson[] {
  const map = new Map<string, DeduplicatedPerson>();

  for (const p of people) {
    const key = normalizePersonName(p.name);
    if (!map.has(key)) {
      map.set(key, {
        name: p.name,
        slug: personSlug(p.name),
        roles: [],
      });
    }
    const entry = map.get(key)!;
    // Avoid duplicate roles at same company
    if (!entry.roles.some((r) => r.companySlug === p.companySlug && r.role === p.role)) {
      entry.roles.push({
        role: p.role,
        companyName: p.companyName,
        companySlug: p.companySlug,
      });
    }
  }

  return Array.from(map.values());
}

// Group by first letter
function groupByLetter(people: DeduplicatedPerson[]): { letter: string; people: DeduplicatedPerson[] }[] {
  const groups: Record<string, DeduplicatedPerson[]> = {};
  for (const p of people) {
    const letter = p.name.charAt(0).toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(p);
  }
  // Sort each group and return sorted array
  return Object.keys(groups)
    .sort()
    .map((letter) => ({
      letter,
      people: groups[letter].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export default async function PeopleIndex() {
  const allPeople = await getAllPeople();
  const deduplicated = deduplicatePeople(allPeople);
  const grouped = groupByLetter(deduplicated);
  const letters = grouped.map((g) => g.letter);

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <div className="max-w-4xl mx-auto px-5 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-12 mb-4" style={{ color: "var(--color-text-tertiary)" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span style={{ color: "var(--color-text-secondary)" }}>People</span>
        </div>

        <h1
          className="text-[32px] font-medium tracking-tight mb-2"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
        >
          People & Leaders
        </h1>
        <p className="text-15 mb-2" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
          Browse {deduplicated.length.toLocaleString()} biotech and pharmaceutical executives, founders, and scientists.
          Each profile includes their role, company affiliations, pipeline data, and leadership team.
        </p>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="text-13" style={{ color: "var(--color-text-tertiary)" }}>
            <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{deduplicated.length.toLocaleString()}</span> people tracked
          </div>
          <div className="text-13" style={{ color: "var(--color-text-tertiary)" }}>
            <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{new Set(allPeople.map((p) => p.companySlug)).size.toLocaleString()}</span> companies
          </div>
        </div>

        {/* Letter navigation */}
        <div className="flex flex-wrap gap-1 mb-6">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="w-8 h-8 flex items-center justify-center rounded text-13 font-medium transition-colors hover:opacity-80"
              style={{
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              {letter}
            </a>
          ))}
        </div>

        {/* People grouped by letter */}
        {grouped.map(({ letter, people: group }) => {
          return (
            <div key={letter} id={`letter-${letter}`} className="mb-6">
              <h2
                className="text-18 font-semibold mb-3 pb-1 sticky top-0"
                style={{
                  color: "var(--color-text-primary)",
                  background: "var(--color-bg-primary)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                {letter}
                <span className="text-12 font-normal ml-2" style={{ color: "var(--color-text-tertiary)" }}>
                  {group.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.map((person) => {
                  const initials = person.name
                    .split(" ")
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  return (
                    <Link
                      key={person.slug}
                      href={`/people/${person.slug}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-[var(--color-accent)] transition-colors"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-12 font-medium shrink-0"
                        style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)" }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-14 font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                          {person.name}
                        </div>
                        <div className="text-12 truncate flex items-center gap-1" style={{ color: "var(--color-text-tertiary)" }}>
                          <span>{person.roles[0].role}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Building2 size={10} />
                            {person.roles[0].companyName}
                          </span>
                          {person.roles.length > 1 && (
                            <span className="text-[10px] px-1 py-[1px] rounded" style={{ background: "var(--color-bg-tertiary)" }}>
                              +{person.roles.length - 1}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <Footer />
    </div>
  );
}
