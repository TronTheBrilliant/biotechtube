import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import {
  getAllPeople,
  normalizePersonName,
  PersonWithCompany,
} from "@/lib/seo-utils";
import Link from "next/link";

export const revalidate = 3600; // 1 hour (was 5 min)

interface RankedPerson {
  name: string;
  role: string;
  companyName: string;
  companySlug: string;
  roleCount: number;
}

function rankPeople(people: PersonWithCompany[]): RankedPerson[] {
  // Deduplicate by normalized name, keep the most prominent role
  const map = new Map<
    string,
    {
      name: string;
      roles: { role: string; companyName: string; companySlug: string }[];
    }
  >();

  for (const p of people) {
    const key = normalizePersonName(p.name);
    if (!map.has(key)) {
      map.set(key, { name: p.name, roles: [] });
    }
    const entry = map.get(key)!;
    if (
      !entry.roles.some(
        (r) => r.companySlug === p.companySlug && r.role === p.role
      )
    ) {
      entry.roles.push({
        role: p.role,
        companyName: p.companyName,
        companySlug: p.companySlug,
      });
    }
  }

  // Convert to ranked list, sort by number of roles/affiliations desc
  return Array.from(map.values())
    .map((entry) => ({
      name: entry.name,
      role: entry.roles[0].role,
      companyName: entry.roles[0].companyName,
      companySlug: entry.roles[0].companySlug,
      roleCount: entry.roles.length,
    }))
    .sort((a, b) => {
      if (b.roleCount !== a.roleCount) return b.roleCount - a.roleCount;
      return a.name.localeCompare(b.name);
    });
}

export default async function TopPeoplePage() {
  const allPeople = await getAllPeople();
  const ranked = rankPeople(allPeople);
  const top50 = ranked.slice(0, 50);

  // Count unique people (deduplicated)
  const uniqueNames = new Set(
    allPeople.map((p) => normalizePersonName(p.name))
  );

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />

      {/* Hero */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <h1
          className="text-[32px] md:text-[48px] font-bold tracking-tight"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-1px",
            lineHeight: 1.1,
          }}
        >
          Top People in Biotech
        </h1>
        <p
          className="text-[15px] md:text-[17px] mt-2 max-w-[560px]"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          Leaders, scientists, and executives shaping the biotech industry.
        </p>

        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-4">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[13px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Showing
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {uniqueNames.size.toLocaleString()} people tracked
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 md:px-6 pb-8 max-w-[1200px] mx-auto">
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            background: "var(--color-bg-secondary)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    borderBottom: "0.5px solid var(--color-border-subtle)",
                  }}
                >
                  <th
                    className="text-left text-10 font-medium px-3 py-2 w-10"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    #
                  </th>
                  <th
                    className="text-left text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Name
                  </th>
                  <th
                    className="text-left text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Role
                  </th>
                  <th
                    className="text-left text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Company
                  </th>
                </tr>
              </thead>
              <tbody>
                {top50.map((person, i) => (
                  <tr
                    key={`${person.name}-${i}`}
                    className="transition-colors duration-100 hover:bg-[var(--color-bg-primary)]"
                    style={{
                      borderBottom: "0.5px solid var(--color-border-subtle)",
                    }}
                  >
                    <td
                      className="px-3 py-2 text-12"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {i + 1}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="text-12 font-medium"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {person.name}
                      </span>
                    </td>
                    <td
                      className="px-3 py-2 text-12"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <span className="truncate max-w-[120px] md:max-w-[200px] inline-block">
                        {person.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/company/${person.companySlug}`}
                        className="text-12 hover:underline"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {person.companyName}
                      </Link>
                    </td>
                  </tr>
                ))}
                {top50.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-13"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      No people data available at this time.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
