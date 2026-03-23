import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Get a Template — BiotechTube",
};

export default function TemplateInquiryPage() {
  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <main className="mx-auto px-4 py-12" style={{ maxWidth: 480 }}>
        <h1
          className="text-[32px] font-medium mb-6 tracking-tight"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
        >
          Get your biotech website
        </h1>

        {/* Option cards */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Option 1 — Buy a template */}
          <a
            href="/templates"
            className="rounded p-5 block"
            style={{
              border: "0.5px solid var(--color-border-medium)",
              background: "var(--color-bg-secondary)",
              textDecoration: "none",
            }}
          >
            <p
              className="text-13 font-medium mb-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              Buy a template
            </p>
            <p
              className="text-13 font-medium mb-1"
              style={{ color: "var(--color-accent)" }}
            >
              $299 &ndash; $399
            </p>
            <p
              className="text-11"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Self-serve with Claude Code
            </p>
            <p
              className="text-11 mt-2"
              style={{ color: "var(--color-accent)" }}
            >
              Browse templates &rarr;
            </p>
          </a>

          {/* Option 2 — Done for you */}
          <div
            className="rounded p-5"
            style={{
              border: "0.5px solid var(--color-border-medium)",
              background: "var(--color-bg-secondary)",
            }}
          >
            <p
              className="text-13 font-medium mb-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              Done for you
            </p>
            <p
              className="text-13 font-medium mb-1"
              style={{ color: "var(--color-accent)" }}
            >
              From $2,500
            </p>
            <p
              className="text-11 mb-4"
              style={{ color: "var(--color-text-secondary)" }}
            >
              We build everything
            </p>

            <form>
              <div className="mb-4">
                <label
                  className="text-11 font-medium mb-1 block"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Company name
                </label>
                <input
                  type="text"
                  className="w-full text-13 px-3 py-2 rounded border outline-none"
                  style={{
                    borderColor: "var(--color-border-medium)",
                    background: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                    borderWidth: "0.5px",
                  }}
                />
              </div>

              <div className="mb-4">
                <label
                  className="text-11 font-medium mb-1 block"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  className="w-full text-13 px-3 py-2 rounded border outline-none"
                  style={{
                    borderColor: "var(--color-border-medium)",
                    background: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                    borderWidth: "0.5px",
                  }}
                />
              </div>

              <div className="mb-4">
                <label
                  className="text-11 font-medium mb-1 block"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Budget
                </label>
                <select
                  className="w-full text-13 px-3 py-2 rounded border outline-none"
                  style={{
                    borderColor: "var(--color-border-medium)",
                    background: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                    borderWidth: "0.5px",
                  }}
                >
                  <option value="2500-5000">$2,500 &ndash; $5,000</option>
                  <option value="5000-10000">$5,000 &ndash; $10,000</option>
                  <option value="10000+">$10,000+</option>
                </select>
              </div>

              <div className="mb-4">
                <label
                  className="text-11 font-medium mb-1 block"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Description
                </label>
                <textarea
                  rows={4}
                  className="w-full text-13 px-3 py-2 rounded border outline-none"
                  style={{
                    borderColor: "var(--color-border-medium)",
                    background: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                    borderWidth: "0.5px",
                    resize: "vertical",
                  }}
                />
              </div>

              <button
                type="button"
                className="w-full text-13 font-medium py-2.5 rounded text-white mt-4"
                style={{ background: "var(--color-accent)" }}
              >
                Get in touch &rarr;
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
