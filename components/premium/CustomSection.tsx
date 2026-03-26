"use client";

interface CustomSectionProps {
  title: string;
  content: string;
  brandColor?: string;
}

/** Simple markdown-to-HTML: bold, italic, links, line breaks, paragraphs */
function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // links [text](url)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="premium-link">$1</a>'
    )
    // double newline = paragraph break
    .replace(/\n\n/g, "</p><p>")
    // single newline = br
    .replace(/\n/g, "<br/>");
}

export function CustomSection({ title, content, brandColor = "#1a7a5e" }: CustomSectionProps) {
  if (!content || !content.trim()) return null;

  const html = renderMarkdown(content);

  return (
    <div>
      <h2
        className="text-[17px] font-semibold mb-4"
        style={{ color: "var(--color-text-primary)" }}
      >
        <span
          className="inline-block w-1 h-5 rounded-full mr-2.5 align-middle"
          style={{ background: brandColor }}
        />
        {title}
      </h2>

      <div
        className="text-13 leading-[1.75] premium-md"
        style={{ color: "var(--color-text-secondary)" }}
        dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
      />

      <style jsx>{`
        .premium-md :global(p) {
          margin-bottom: 0.75em;
        }
        .premium-md :global(p:last-child) {
          margin-bottom: 0;
        }
        .premium-md :global(strong) {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .premium-md :global(a.premium-link) {
          color: ${brandColor};
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .premium-md :global(a.premium-link:hover) {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
