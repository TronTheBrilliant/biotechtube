import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Embeddable Widgets — BiotechTube",
  description:
    "Embed live biotech market data on your website. Free widgets showing real-time biotech market cap powered by BiotechTube.",
  alternates: {
    canonical: "https://biotechtube.io/embed",
  },
};

export default function EmbedPage() {
  const iframeCode = `<iframe src="https://biotechtube.io/api/widget/market-cap" width="320" height="50" frameborder="0" style="border:none;overflow:hidden"></iframe>`;

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />

      <div className="max-w-[700px] mx-auto px-4 md:px-6 py-12">
        <h1
          className="text-[32px] font-bold tracking-tight mb-2"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-0.5px",
          }}
        >
          Embeddable Widgets
        </h1>
        <p
          className="text-[15px] mb-8"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}
        >
          Add live biotech market data to your website or blog. Our widgets
          update automatically and require no JavaScript dependencies.
        </p>

        {/* Widget preview */}
        <div className="mb-8">
          <h2
            className="text-[11px] uppercase tracking-[0.5px] font-semibold mb-3"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Market Cap Widget
          </h2>
          <div
            className="rounded-lg border p-6 mb-4"
            style={{
              background: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <iframe
              src="/api/widget/market-cap"
              width="320"
              height="50"
              style={{ border: "none", overflow: "hidden" }}
              title="Biotech Market Cap Widget Preview"
            />
          </div>
        </div>

        {/* Code snippet */}
        <div className="mb-8">
          <h2
            className="text-[11px] uppercase tracking-[0.5px] font-semibold mb-3"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Embed Code
          </h2>
          <p
            className="text-[13px] mb-3"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Copy and paste this code into your HTML:
          </p>
          <div
            className="rounded-lg border p-4 font-mono text-[12px] overflow-x-auto"
            style={{
              background: "var(--color-bg-tertiary)",
              borderColor: "var(--color-border-subtle)",
              color: "var(--color-text-primary)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {iframeCode}
          </div>
        </div>

        {/* Features */}
        <div>
          <h2
            className="text-[11px] uppercase tracking-[0.5px] font-semibold mb-3"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Features
          </h2>
          <ul
            className="text-[13px] space-y-2"
            style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
          >
            <li>Live biotech market cap data, updated hourly</li>
            <li>No JavaScript dependencies -- pure HTML embed</li>
            <li>Responsive and lightweight (under 1KB)</li>
            <li>Free to use on any website</li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  );
}
