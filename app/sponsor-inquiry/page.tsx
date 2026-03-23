import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Become a Sponsor — BiotechTube",
};

export default function SponsorInquiryPage() {
  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <main className="mx-auto px-4 py-12" style={{ maxWidth: 480 }}>
        <div
          className="rounded p-6"
          style={{
            border: "0.5px solid var(--color-border-medium)",
            background: "var(--color-bg-secondary)",
          }}
        >
          <h1
            className="text-[32px] font-medium mb-2 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Become a sponsor
          </h1>
          <p
            className="text-13 mb-6"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Reach 25,000+ biotech professionals monthly
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
                Contact name
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
                Preferred tier
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
                <option value="standard">Standard — $500/mo</option>
                <option value="partner">Partner — $1,500/mo</option>
                <option value="platinum">Platinum — $4,000/mo</option>
              </select>
            </div>

            <div className="mb-4">
              <label
                className="text-11 font-medium mb-1 block"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Message
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
              Send inquiry &rarr;
            </button>
          </form>

          <p
            className="text-11 mt-4 text-center"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Questions? Email hello@biotechtube.com
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
