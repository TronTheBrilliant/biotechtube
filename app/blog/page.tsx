import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "BiotechTube Blog — Biotech Market Intelligence & Analysis",
  description:
    "Expert analysis, market reports, and investment insights on biotechnology. In-depth articles on gene therapy, mRNA, CAR-T, AI drug discovery, and more.",
  openGraph: {
    title: "BiotechTube Blog — Biotech Market Intelligence & Analysis",
    description:
      "Expert analysis, market reports, and investment insights on biotechnology.",
    type: "website",
    siteName: "BiotechTube",
    url: "https://biotechtube.io/blog",
    images: [
      {
        url: "https://biotechtube.io/api/og?title=BiotechTube%20Blog&subtitle=Biotech%20Market%20Intelligence&type=blog",
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: {
    canonical: "https://biotechtube.io/blog",
  },
};

export const revalidate = 3600; // revalidate every hour

const CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Weekly Recap", value: "weekly-recap" },
  { label: "Market Analysis", value: "market-analysis" },
  { label: "Company Spotlights", value: "company-spotlights" },
  { label: "Sector Reports", value: "sector-reports" },
  { label: "Funding", value: "funding" },
  { label: "Guides", value: "guides" },
];

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  published_at: string;
  tags: string[];
  author: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function readingTime(excerpt: string | null) {
  // Rough estimate from excerpt length — full content not loaded on listing
  return "5 min read";
}

function categoryLabel(cat: string) {
  const found = CATEGORIES.find((c) => c.value === cat);
  return found ? found.label : cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Category emoji overlay for card thumbnails
function categoryEmoji(cat: string): string {
  switch (cat) {
    case "weekly-recap": return "📊";
    case "market-analysis": return "📈";
    case "company-spotlights": return "🔬";
    case "sector-reports": return "🧬";
    case "funding": return "💰";
    case "guides": return "📖";
    default: return "📰";
  }
}

// Category gradient colors for card thumbnails
function categoryGradient(cat: string) {
  const gradients: Record<string, string> = {
    "weekly-recap": "from-rose-500/80 to-red-800/90",
    "market-analysis": "from-emerald-600/80 to-teal-800/90",
    "company-spotlights": "from-blue-600/80 to-indigo-800/90",
    "sector-reports": "from-violet-600/80 to-purple-800/90",
    funding: "from-amber-500/80 to-orange-700/90",
    guides: "from-cyan-500/80 to-sky-700/90",
    analysis: "from-emerald-600/80 to-teal-800/90",
  };
  return gradients[cat] || "from-gray-600/80 to-gray-800/90";
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const category = params.category || "all";
  const page = parseInt(params.page || "1", 10);
  const perPage = 12;

  const supabase = createServerClient();

  let query = supabase
    .from("blog_posts")
    .select("slug, title, excerpt, category, published_at, tags, author", { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (category !== "all") {
    query = query.eq("category", category);
  }

  const { data: posts, count } = await query.range(
    (page - 1) * perPage,
    page * perPage - 1
  );

  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <span
            className="text-11 font-medium uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            Blog
          </span>
          <h1
            className="text-[32px] font-medium mt-2 mb-3 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Biotech Market Intelligence & Analysis
          </h1>
          <p
            className="text-13 leading-relaxed max-w-lg mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            In-depth articles on the biotech landscape — market analysis, sector
            reports, funding trends, and company spotlights.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.value;
            return (
              <Link
                key={cat.value}
                href={cat.value === "all" ? "/blog" : `/blog?category=${cat.value}`}
                className="px-4 py-1.5 rounded-full text-12 font-medium transition-colors"
                style={{
                  background: isActive ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                  color: isActive ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>

        {/* Article Grid */}
        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: BlogPost) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-xl overflow-hidden border transition-all hover:shadow-md"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                {/* Gradient thumbnail area */}
                <div
                  className={`relative overflow-hidden h-36 bg-gradient-to-br ${categoryGradient(post.category)} flex items-end p-4`}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">
                    {categoryEmoji(post.category)}
                  </div>
                  <span className="text-white/80 text-11 font-medium uppercase tracking-wider bg-black/20 rounded px-2 py-0.5">
                    {categoryLabel(post.category)}
                  </span>
                </div>

                <div className="p-5">
                  <h2
                    className="text-15 font-semibold mb-2 line-clamp-2 group-hover:underline"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p
                      className="text-12 line-clamp-3 mb-3"
                      style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
                    >
                      {post.excerpt}
                    </p>
                  )}
                  <div
                    className="flex items-center gap-3 text-11"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    <span>{formatDate(post.published_at)}</span>
                    <span>&middot;</span>
                    <span>{readingTime(post.excerpt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p style={{ color: "var(--color-text-tertiary)" }}>
              No articles found{category !== "all" ? " in this category" : ""}.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {page > 1 && (
              <Link
                href={`/blog?${category !== "all" ? `category=${category}&` : ""}page=${page - 1}`}
                className="px-4 py-2 rounded-lg text-13 font-medium"
                style={{
                  background: "var(--color-bg-tertiary)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Previous
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/blog?${category !== "all" ? `category=${category}&` : ""}page=${p}`}
                className="px-3 py-2 rounded-lg text-13 font-medium"
                style={{
                  background: p === page ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                  color: p === page ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                {p}
              </Link>
            ))}
            {page < totalPages && (
              <Link
                href={`/blog?${category !== "all" ? `category=${category}&` : ""}page=${page + 1}`}
                className="px-4 py-2 rounded-lg text-13 font-medium"
                style={{
                  background: "var(--color-bg-tertiary)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Next
              </Link>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
