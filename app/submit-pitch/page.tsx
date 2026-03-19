import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Submit a Pitch — BiotechTube",
};

const pricingTiers = [
  {
    title: "Video Pitch",
    price: "$1,000",
    unit: "/listing",
    description: "30-day featured placement with video",
  },
  {
    title: "Editorial Post",
    price: "$800",
    unit: "/post",
    description: "Permanent sponsored article",
  },
  {
    title: "Pitch Bundle",
    price: "$1,500",
    unit: " total",
    description: "Video + editorial post combo",
  },
  {
    title: "Featured Pitch",
    price: "$2,500",
    unit: "/month",
    description: "Homepage + newsletter feature",
  },
];

export default function SubmitPitchPage() {
  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <main
        className="mx-auto px-4 py-12"
        style={{ maxWidth: 960 }}
      >
        <div
          className="flex gap-8"
          style={{ flexWrap: "wrap" }}
        >
          {/* Left column — form */}
          <div style={{ flex: "1 1 0", minWidth: 320 }}>
            <p
              className="text-10 font-medium tracking-wider mb-2"
              style={{
                color: "var(--color-accent)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Submit your pitch
            </p>
            <h1
              className="text-[32px] font-medium mb-6 tracking-tight"
              style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
            >
              Get in front of 25,000+ biotech investors
            </h1>

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
                  Contact email
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
                  Pitch type
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
                  <option value="video">Video Pitch — $1,000</option>
                  <option value="editorial">Editorial Post — $800</option>
                  <option value="bundle">Pitch Bundle — $1,500</option>
                  <option value="featured">Featured Pitch — $2,500</option>
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

              <div className="mb-4">
                <label
                  className="text-11 font-medium mb-1 block"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Website URL
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

              <button
                type="button"
                className="w-full text-13 font-medium py-2.5 rounded text-white mt-4"
                style={{ background: "var(--color-accent)" }}
              >
                Submit pitch &rarr;
              </button>
            </form>
          </div>

          {/* Right column — pricing sidebar */}
          <div
            style={{
              width: 300,
              flexShrink: 0,
              position: "sticky",
              top: 24,
              alignSelf: "flex-start",
            }}
          >
            <div className="flex flex-col gap-3">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.title}
                  className="rounded p-4"
                  style={{
                    border: "0.5px solid var(--color-border-medium)",
                    background: "var(--color-bg-secondary)",
                  }}
                >
                  <p
                    className="text-13 font-medium mb-1"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {tier.title}
                  </p>
                  <p className="text-13 mb-1">
                    <span
                      className="font-medium"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {tier.price}
                    </span>
                    <span style={{ color: "var(--color-text-tertiary)" }}>
                      {tier.unit}
                    </span>
                  </p>
                  <p
                    className="text-11"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {tier.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
