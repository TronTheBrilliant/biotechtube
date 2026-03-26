import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase";

export const revalidate = 3600;

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  author: string;
  published_at: string;
  updated_at: string;
  meta_title: string | null;
  meta_description: string | null;
}

/* ── Markdown to HTML (lightweight, no dependencies) ── */

function markdownToHtml(md: string): string {
  let html = md;

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (_m, header, _sep, body) => {
    const ths = header
      .split("|")
      .filter((c: string) => c.trim())
      .map((c: string) => `<th>${c.trim()}</th>`)
      .join("");
    const rows = body
      .trim()
      .split("\n")
      .map((row: string) => {
        const tds = row
          .split("|")
          .filter((c: string) => c.trim())
          .map((c: string) => `<td>${c.trim()}</td>`)
          .join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");
    return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4 id="$1">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 id="$1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 id="$1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr />");

  // Paragraphs — wrap remaining lines that aren't already HTML
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<table") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<hr")
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  return html;
}

/* ── Extract headings for table of contents ── */

function extractHeadings(md: string) {
  const headings: { level: number; text: string; id: string }[] = [];
  const regex = /^(#{2,3}) (.+)$/gm;
  let match;
  while ((match = regex.exec(md)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2],
      id: match[2],
    });
  }
  return headings;
}

/* ── Reading time calc ── */

function calcReadingTime(content: string) {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 250));
}

/* ── Date formatter ── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function categoryLabel(cat: string) {
  const labels: Record<string, string> = {
    "weekly-recap": "Weekly Recap",
    "market-analysis": "Market Analysis",
    "company-spotlights": "Company Spotlights",
    "sector-reports": "Sector Reports",
    funding: "Funding",
    guides: "Guides",
    analysis: "Analysis",
  };
  return labels[cat] || cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Metadata ── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, meta_title, meta_description, excerpt, slug, published_at, author")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) return { title: "Article Not Found — BiotechTube" };

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || "";

  return {
    title: `${title} — BiotechTube Blog`,
    description,
    alternates: { canonical: `https://biotechtube.io/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at,
      authors: [post.author],
      siteName: "BiotechTube",
      url: `https://biotechtube.io/blog/${post.slug}`,
      images: [
        {
          url: `https://biotechtube.io/api/og?title=${encodeURIComponent(post.title)}&type=blog`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/* ── Static params for build ── */

export async function generateStaticParams() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("status", "published");
  return (data || []).map((p: { slug: string }) => ({ slug: p.slug }));
}

/* ── Page ── */

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single<BlogPost>();

  if (!post) notFound();

  // Fetch related articles (same category, excluding current)
  const { data: related } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, category, published_at")
    .eq("status", "published")
    .eq("category", post.category)
    .neq("slug", slug)
    .order("published_at", { ascending: false })
    .limit(3);

  const htmlContent = markdownToHtml(post.content);
  const headings = extractHeadings(post.content);
  const readTime = calcReadingTime(post.content);

  // JSON-LD Article schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    author: { "@type": "Person", name: post.author },
    datePublished: post.published_at,
    dateModified: post.updated_at,
    publisher: {
      "@type": "Organization",
      name: "BiotechTube",
      url: "https://biotechtube.io",
    },
    mainEntityOfPage: `https://biotechtube.io/blog/${post.slug}`,
    description: post.meta_description || post.excerpt || "",
    image: `https://biotechtube.io/api/og?title=${encodeURIComponent(post.title)}&type=blog`,
  };

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Breadcrumbs */}
        <nav
          className="flex items-center gap-1.5 text-12 mb-6"
          style={{ color: "var(--color-text-tertiary)" }}
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:underline" style={{ color: "var(--color-text-tertiary)" }}>
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:underline" style={{ color: "var(--color-text-tertiary)" }}>
            Blog
          </Link>
          <span>/</span>
          <span className="truncate" style={{ color: "var(--color-text-secondary)" }}>
            {post.title}
          </span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-11 font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full"
              style={{
                background: "var(--color-accent-subtle)",
                color: "var(--color-accent)",
              }}
            >
              {categoryLabel(post.category)}
            </span>
          </div>
          <h1
            className="text-[32px] md:text-[40px] font-bold leading-tight mb-4"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            {post.title}
          </h1>
          <div
            className="flex flex-wrap items-center gap-3 text-13"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span>{post.author}</span>
            <span>&middot;</span>
            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
            <span>&middot;</span>
            <span>{readTime} min read</span>
          </div>
        </header>

        <div className="flex gap-8">
          {/* Table of Contents — desktop sidebar */}
          {headings.length > 2 && (
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="sticky top-20">
                <h4
                  className="text-11 font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Table of Contents
                </h4>
                <nav className="flex flex-col gap-1.5">
                  {headings.map((h, i) => (
                    <a
                      key={i}
                      href={`#${h.id}`}
                      className="text-12 hover:underline transition-colors"
                      style={{
                        color: "var(--color-text-secondary)",
                        paddingLeft: h.level === 3 ? "12px" : "0",
                      }}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Article Content */}
          <article className="flex-1 min-w-0">
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-11 px-2.5 py-1 rounded-full"
                    style={{
                      background: "var(--color-bg-tertiary)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        </div>

        {/* Related Articles */}
        {related && related.length > 0 && (
          <section className="mt-16 pt-8 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
            <h2
              className="text-18 font-semibold mb-6"
              style={{ color: "var(--color-text-primary)" }}
            >
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((r: { slug: string; title: string; excerpt: string | null; published_at: string }) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group rounded-lg border p-5 transition-all hover:shadow-md"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border-subtle)",
                  }}
                >
                  <h3
                    className="text-14 font-semibold mb-2 group-hover:underline line-clamp-2"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {r.title}
                  </h3>
                  {r.excerpt && (
                    <p
                      className="text-12 line-clamp-2 mb-2"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {r.excerpt}
                    </p>
                  )}
                  <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
                    {new Date(r.published_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
