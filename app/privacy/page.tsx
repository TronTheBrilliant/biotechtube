import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — BiotechTube",
  description: "How BiotechTube collects, uses, and protects your data.",
};

const sectionStyle: React.CSSProperties = { color: "var(--color-text-secondary)", lineHeight: 1.75 };
const headingStyle: React.CSSProperties = { color: "var(--color-text-primary)", letterSpacing: "-0.5px" };

export default function PrivacyPage() {
  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1
          className="text-[32px] font-medium mb-1 tracking-tight"
          style={headingStyle}
        >
          Privacy Policy
        </h1>
        <p className="text-12 mb-8" style={{ color: "var(--color-text-tertiary)" }}>
          Last updated: March 19, 2026
        </p>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>What we collect</h2>
          <p className="text-13 mb-3" style={sectionStyle}>
            When you create an account we collect your email address and password. If you claim a company profile we also store your name and work email. When you browse the site we collect basic analytics data — page views, time on page, and which features you use — so we can improve the product. We do not sell this data to third parties.
          </p>
          <p className="text-13" style={sectionStyle}>
            If you contact us through a form or email we keep the message and your email address so we can respond. Payment information is handled entirely by Stripe — we never see or store your card details.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>How we use your data</h2>
          <p className="text-13 mb-3" style={sectionStyle}>
            We use your data to provide the service — showing you company rankings, funding data, and pipeline information. Your email is used for account access, password resets, and (if you opt in) our weekly newsletter. We may send occasional product updates but you can unsubscribe at any time.
          </p>
          <p className="text-13" style={sectionStyle}>
            We use anonymous, aggregated analytics to understand how people use BiotechTube so we can make it better. We do not build advertising profiles or share your browsing data with advertisers.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Cookies</h2>
          <p className="text-13" style={sectionStyle}>
            We use essential cookies to keep you logged in and remember your preferences. We use Vercel Analytics for basic site performance data. We do not use third-party advertising cookies or tracking pixels. You can disable cookies in your browser settings, though this may affect your ability to stay logged in.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Data disclaimer</h2>
          <p className="text-13 mb-3" style={sectionStyle}>
            The company profiles, pipeline data, funding round information, and market data on BiotechTube are compiled from public sources including ClinicalTrials.gov, national business registries, press releases, and public filings. We do our best to keep this information accurate and up to date, but we cannot guarantee it is complete or error-free.
          </p>
          <p className="text-13" style={sectionStyle}>
            Nothing on BiotechTube constitutes investment advice, a recommendation to buy or sell securities, or a solicitation of any kind. All financial and pipeline data is provided for informational purposes only. Always do your own due diligence and consult a qualified financial advisor before making investment decisions.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Your rights</h2>
          <p className="text-13" style={sectionStyle}>
            You can request a copy of your data, ask us to correct it, or ask us to delete your account and all associated data at any time. Just email us at hello@biotechtube.io and we will handle it within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Contact</h2>
          <p className="text-13" style={sectionStyle}>
            If you have questions about this privacy policy or how we handle your data, email us at{" "}
            <a href="mailto:hello@biotechtube.io" style={{ color: "var(--color-accent)" }}>
              hello@biotechtube.io
            </a>.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
