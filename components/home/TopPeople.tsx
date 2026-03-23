import Link from "next/link";

interface Person {
  name: string;
  role: string;
  company: string;
  companySlug: string;
}

export default function TopPeople({ people }: { people: Person[] }) {
  return (
    <div>
      {people.slice(0, 5).map((p, i) => (
        <Link
          key={p.companySlug + p.name}
          href={`/company/${p.companySlug}`}
          className="px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-bg-secondary)] no-underline"
          style={
            i < 4 && i < people.length - 1
              ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
              : undefined
          }
        >
          {/* Rank */}
          <span
            className="text-center font-medium"
            style={{
              fontSize: 12,
              width: 20,
              color: "var(--color-text-tertiary)",
            }}
          >
            {i + 1}
          </span>

          {/* Name + Role */}
          <div className="flex flex-col">
            <span
              className="font-medium"
              style={{ fontSize: 13, color: "var(--color-text-primary)" }}
            >
              {p.name}
            </span>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
              {p.role} · {p.company}
            </span>
          </div>

          {/* Spacer */}
          <span className="flex-1" />
        </Link>
      ))}
    </div>
  );
}
