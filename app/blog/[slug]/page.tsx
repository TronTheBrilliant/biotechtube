import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { ChartEmbed } from "@/components/blog/ChartEmbed";
import { extractChartPlaceholders, fetchChartData, type ChartPoint } from "@/lib/blog-chart-data";

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

/* ── Category colors ── */

const CATEGORY_GRADIENTS: Record<string, string> = {
  "market-analysis": "linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)",
  "sector-reports": "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #3b82f6 100%)",
  guides: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #8b5cf6 100%)",
  funding: "linear-gradient(135deg, #78350f 0%, #d97706 50%, #f59e0b 100%)",
  "weekly-recap": "linear-gradient(135deg, #881337 0%, #e11d48 50%, #f43f5e 100%)",
  analysis: "linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)",
  "company-spotlights": "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #3b82f6 100%)",
};

const CATEGORY_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  "market-analysis": { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
  "sector-reports": { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
  guides: { bg: "rgba(139,92,246,0.15)", text: "#8b5cf6" },
  funding: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  "weekly-recap": { bg: "rgba(244,63,94,0.15)", text: "#f43f5e" },
  analysis: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
  "company-spotlights": { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
};

function getCategoryGradient(cat: string) {
  return CATEGORY_GRADIENTS[cat] || "linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)";
}

function getCategoryBadge(cat: string) {
  return CATEGORY_BADGE_COLORS[cat] || { bg: "rgba(16,185,129,0.15)", text: "#10b981" };
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
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

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

  // Paragraphs
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

  // Convert [Source: N] citations to styled badges
  html = html.replace(
    /\[Source:?\s*(\d+)\]/gi,
    '<span class="source-citation" title="Source $1">$1</span>'
  );

  // Wrap the Sources section in a styled container
  html = html.replace(
    /(<h2[^>]*id="Sources"[^>]*>Sources<\/h2>)/i,
    '<div class="sources-section">$1'
  );
  // If sources section exists, close the wrapper at the end
  if (html.includes('class="sources-section"')) {
    html += "</div>";
  }

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
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
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

/* ── Insert newsletter CTA into HTML at ~50% mark ── */

function splitContentForNewsletter(html: string): { before: string; after: string } {
  const paragraphs = html.split("</p>");
  if (paragraphs.length < 4) return { before: html, after: "" };

  const midPoint = Math.floor(paragraphs.length / 2);
  const before = paragraphs.slice(0, midPoint).join("</p>") + "</p>";
  const after = paragraphs.slice(midPoint).join("</p>");
  return { before, after };
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
  let { data: related } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, category, published_at")
    .eq("status", "published")
    .eq("category", post.category)
    .neq("slug", slug)
    .order("published_at", { ascending: false })
    .limit(3);

  // Fallback: most recent if no same-category matches
  if (!related || related.length === 0) {
    const { data: fallback } = await supabase
      .from("blog_posts")
      .select("slug, title, excerpt, category, published_at")
      .eq("status", "published")
      .neq("slug", slug)
      .order("published_at", { ascending: false })
      .limit(3);
    related = fallback;
  }

  const htmlContent = markdownToHtml(post.content);
  const headings = extractHeadings(post.content);
  const readTime = calcReadingTime(post.content);
  const { before, after } = splitContentForNewsletter(htmlContent);
  const articleUrl = `https://biotechtube.io/blog/${post.slug}`;

  // Fetch chart data for any [chart:...] placeholders
  const chartPlaceholders = extractChartPlaceholders(post.content);
  const chartDataMap = new Map<string, { title: string; type: string; data: ChartPoint[] }>();
  await Promise.all(
    chartPlaceholders.map(async (cp) => {
      try {
        const data = await fetchChartData(cp);
        if (data.length > 0) {
          chartDataMap.set(cp.placeholder, { title: cp.title, type: cp.type, data });
        }
      } catch { /* ignore chart fetch errors */ }
    })
  );

  // Author initials
  const initials = post.author
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
    mainEntityOfPage: articleUrl,
    description: post.meta_description || post.excerpt || "",
    image: `https://biotechtube.io/api/og?title=${encodeURIComponent(post.title)}&type=blog`,
  };

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <ReadingProgress />
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero Section ── */}
      <header
        className="relative overflow-hidden"
        style={{ background: getCategoryGradient(post.category) }}
      >
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 pt-10 pb-12 md:pt-14 md:pb-16">
          {/* Breadcrumbs */}
          <nav
            className="flex items-center gap-1.5 text-[12px] mb-6"
            style={{ color: "rgba(255,255,255,0.6)" }}
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:underline" style={{ color: "rgba(255,255,255,0.6)" }}>
              Home
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:underline" style={{ color: "rgba(255,255,255,0.6)" }}>
              Blog
            </Link>
            <span>/</span>
            <span className="truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
              {post.title}
            </span>
          </nav>

          {/* Category badge */}
          <span
            className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full mb-5"
            style={{
              background: "rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {categoryLabel(post.category)}
          </span>

          {/* Title */}
          <h1
            className="text-[28px] md:text-[40px] lg:text-[44px] font-bold leading-[1.15] mb-6"
            style={{ color: "#fff", letterSpacing: "-0.5px", maxWidth: "800px" }}
          >
            {post.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 mb-5">
            {/* Author avatar */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
                style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
              >
                {initials}
              </div>
              <div>
                <p className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.95)" }}>
                  BiotechTube Research
                </p>
                <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                  <span>&middot;</span>
                  <span>{readTime} min read</span>
                </div>
              </div>
            </div>
          </div>

          {/* Share buttons */}
          <ShareButtons title={post.title} url={articleUrl} />
        </div>
      </header>

      {/* ── Article Body ── */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Mobile TOC */}
        <div className="lg:hidden">
          <TableOfContents headings={headings} variant="mobile" />
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-10" id="article-content">
          {/* Article Content */}
          <article className="min-w-0">
            {/* Render content with inline charts */}
            {(() => {
              // Combine before + newsletter + after, then split by chart placeholders
              const fullHtml = after ? before + after : before;
              const chartKeys = [...chartDataMap.keys()];

              if (chartKeys.length === 0) {
                // No charts — render normally with newsletter CTA
                return (
                  <>
                    <div className="prose" dangerouslySetInnerHTML={{ __html: before }} />
                    {after && <NewsletterCTA />}
                    {after && <div className="prose" dangerouslySetInnerHTML={{ __html: after }} />}
                  </>
                );
              }

              // Split content at chart placeholders and interleave with chart components
              const segments: React.ReactNode[] = [];
              let remaining = fullHtml;
              let segIdx = 0;
              let newsletterInserted = false;

              for (const key of chartKeys) {
                const htmlKey = markdownToHtml(key); // The placeholder might be wrapped in <p>
                const plainKey = key;
                const splitPoint = remaining.indexOf(htmlKey) !== -1 ? htmlKey :
                                   remaining.indexOf(plainKey) !== -1 ? plainKey :
                                   remaining.indexOf(key.replace(/\[/g, '\\[').replace(/\]/g, '\\]')) !== -1 ? key : null;

                if (splitPoint) {
                  const idx = remaining.indexOf(splitPoint);
                  const beforeChart = remaining.substring(0, idx);
                  remaining = remaining.substring(idx + splitPoint.length);

                  if (beforeChart.trim()) {
                    segments.push(<div key={`seg-${segIdx++}`} className="prose" dangerouslySetInnerHTML={{ __html: beforeChart }} />);
                  }

                  // Insert newsletter CTA roughly in the middle
                  if (!newsletterInserted && segIdx >= 1) {
                    segments.push(<NewsletterCTA key="newsletter" />);
                    newsletterInserted = true;
                  }

                  const cd = chartDataMap.get(key)!;
                  segments.push(
                    <ChartEmbed key={`chart-${segIdx++}`} type={cd.type as any} title={cd.title} data={cd.data} />
                  );
                }
              }

              // Remaining content after last chart
              if (remaining.trim()) {
                if (!newsletterInserted) {
                  segments.push(<NewsletterCTA key="newsletter" />);
                }
                segments.push(<div key={`seg-${segIdx++}`} className="prose" dangerouslySetInnerHTML={{ __html: remaining }} />);
              }

              return <>{segments}</>;
            })()}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div
                className="flex flex-wrap gap-2 mt-10 pt-6 border-t"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-1 rounded-full"
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

          {/* Desktop TOC sidebar */}
          <div className="hidden lg:block">
            <TableOfContents headings={headings} />
          </div>
        </div>

        {/* Related Articles */}
        {related && related.length > 0 && (
          <section className="mt-16 pt-10 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
            <h2
              className="text-[20px] font-semibold mb-6"
              style={{ color: "var(--color-text-primary)" }}
            >
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map(
                (r: {
                  slug: string;
                  title: string;
                  excerpt: string | null;
                  category: string;
                  published_at: string;
                }) => {
                  const rBadge = getCategoryBadge(r.category);
                  return (
                    <Link
                      key={r.slug}
                      href={`/blog/${r.slug}`}
                      className="group rounded-xl border p-5 transition-all hover:shadow-md"
                      style={{
                        background: "var(--color-bg-secondary)",
                        borderColor: "var(--color-border-subtle)",
                      }}
                    >
                      <span
                        className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3"
                        style={{ background: rBadge.bg, color: rBadge.text }}
                      >
                        {categoryLabel(r.category)}
                      </span>
                      <h3
                        className="text-[14px] font-semibold mb-2 group-hover:underline line-clamp-2"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {r.title}
                      </h3>
                      {r.excerpt && (
                        <p
                          className="text-[12px] line-clamp-2 mb-3"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {r.excerpt}
                        </p>
                      )}
                      <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                        {new Date(r.published_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </Link>
                  );
                }
              )}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
