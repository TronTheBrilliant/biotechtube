import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, Users, ArrowUpRight } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getAllPeople, getAllDrugs, personSlug, normalizePersonName, drugSlug, PersonWithCompany } from "@/lib/seo-utils";

export const revalidate = 300;

interface PersonPageProps {
  params: { "person-slug": string };
}

async function getPersonData(slug: string): Promise<PersonWithCompany[] | null> {
  const allPeople = await getAllPeople();
  // Match by slug — could be "jane-smith" or "jane-smith-novartis"
  const matches = allPeople.filter((p) => {
    const baseSlug = personSlug(p.name);
    const companySlug = personSlug(p.name, p.companySlug);
    return baseSlug === slug || companySlug === slug;
  });
  return matches.length > 0 ? matches : null;
}

export async function generateMetadata({ params }: PersonPageProps): Promise<Metadata> {
  const people = await getPersonData(params["person-slug"]);
  if (!people || people.length === 0) return { title: "Person Not Found | BiotechTube" };

  const person = people[0];
  const title = `${person.name} — ${person.role} at ${person.companyName} | BiotechTube`;
  const description = `${person.name} is ${person.role} at ${person.companyName}. View leadership team, company pipeline, and analysis on BiotechTube.`;

  return {
    title,
    description,
    keywords: [person.name, person.role, person.companyName, "biotech", "leadership", "executive"],
    openGraph: { title, description, type: "profile", siteName: "BiotechTube" },
    twitter: { card: "summary", title, description },
  };
}

export default async function PersonPage({ params }: PersonPageProps) {
  const people = await getPersonData(params["person-slug"]);
  if (!people || people.length === 0) notFound();

  const person = people[0];
  const initials = person.name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Get teammates (other people at the same company)
  const allPeople = await getAllPeople();
  const teammates = allPeople
    .filter(
      (p) =>
        p.companySlug === person.companySlug &&
        normalizePersonName(p.name) !== normalizePersonName(person.name)
    )
    .slice(0, 10);

  // Get company pipeline
  const allDrugs = await getAllDrugs();
  const companyDrugs = allDrugs
    .filter((d) => d.companySlug === person.companySlug)
    .reduce((acc, d) => {
      if (!acc.some((x) => drugSlug(x.name) === drugSlug(d.name))) acc.push(d);
      return acc;
    }, [] as typeof allDrugs)
    .slice(0, 8);

  const areas = person.therapeuticAreas || [];

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    jobTitle: person.role,
    worksFor: {
      "@type": "Organization",
      name: person.companyName,
      url: `https://biotechtube.vercel.app/company/${person.companySlug}`,
    },
  };

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto px-5 pt-4">
          <div className="flex items-center gap-1.5 text-12" style={{ color: "var(--color-text-tertiary)" }}>
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <Link href={`/company/${person.companySlug}`} className="hover:underline">{person.companyName}</Link>
            <span>/</span>
            <span style={{ color: "var(--color-text-secondary)" }}>{person.name}</span>
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-4xl mx-auto px-5 py-6">
          <div className="flex items-start gap-4 mb-5">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-[20px] font-medium shrink-0"
              style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border-subtle)" }}
            >
              {initials}
            </div>
            <div>
              <h1
                className="text-[28px] font-medium tracking-tight"
                style={{ color: "var(--color-text-primary)", letterSpacing: "-0.4px" }}
              >
                {person.name}
              </h1>
              <p className="text-15 mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                {person.role}
              </p>
              <Link
                href={`/company/${person.companySlug}`}
                className="text-14 mt-1 inline-flex items-center gap-1 hover:underline"
                style={{ color: "var(--color-accent)" }}
              >
                <Building2 size={14} />
                {person.companyName}
              </Link>
            </div>
          </div>

          {/* If person holds roles at multiple companies */}
          {people.length > 1 && (
            <div
              className="rounded-lg border p-4 mb-6"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <h2 className="text-14 font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
                Roles
              </h2>
              {people.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <span className="text-14" style={{ color: "var(--color-text-primary)" }}>{p.role}</span>
                  <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>at</span>
                  <Link href={`/company/${p.companySlug}`} className="text-14 hover:underline" style={{ color: "var(--color-accent)" }}>
                    {p.companyName}
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Therapeutic Areas */}
          {areas.length > 0 && (
            <div className="mb-6">
              <h2 className="text-14 font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
                Therapeutic Areas
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((area) => (
                  <Link
                    key={area}
                    href={`/therapeutic-areas/${area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`}
                    className="text-12 px-2 py-[3px] rounded-sm border hover:opacity-80"
                    style={{
                      background: "var(--color-bg-secondary)",
                      color: "var(--color-text-secondary)",
                      borderColor: "var(--color-border-subtle)",
                      borderWidth: "0.5px",
                    }}
                  >
                    {area}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Company Pipeline */}
          {companyDrugs.length > 0 && (
            <div className="mb-6">
              <h2 className="text-16 font-medium mb-3" style={{ color: "var(--color-text-primary)" }}>
                {person.companyName} Pipeline
              </h2>
              <div
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "var(--color-bg-secondary)" }}>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Drug</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Indication</th>
                      <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Phase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyDrugs.map((d) => (
                      <tr key={drugSlug(d.name)} className="border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                        <td className="px-4 py-2.5">
                          <Link href={`/drugs/${drugSlug(d.name)}`} className="text-13 font-medium hover:underline" style={{ color: "var(--color-accent)" }}>
                            {d.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-13" style={{ color: "var(--color-text-secondary)" }}>
                          {d.indication}
                        </td>
                        <td className="px-4 py-2.5 text-13" style={{ color: "var(--color-text-secondary)" }}>
                          {d.phase}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Team */}
          {teammates.length > 0 && (
            <div className="mb-8">
              <h2 className="text-16 font-medium mb-3 flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
                <Users size={16} />
                Leadership Team at {person.companyName}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {teammates.map((t) => {
                  const tInitials = t.name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
                  return (
                    <Link
                      key={t.name + t.companySlug}
                      href={`/people/${personSlug(t.name)}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-[var(--color-accent)] transition-colors"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-12 font-medium shrink-0"
                        style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)" }}
                      >
                        {tInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-13 font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                          {t.name}
                        </div>
                        <div className="text-12 truncate" style={{ color: "var(--color-text-tertiary)" }}>
                          {t.role}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <Link
                href={`/company/${person.companySlug}`}
                className="text-13 mt-3 inline-flex items-center gap-1 hover:underline"
                style={{ color: "var(--color-accent)" }}
              >
                View full {person.companyName} profile <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
        </div>
      <Footer />
    </div>
  );
}
