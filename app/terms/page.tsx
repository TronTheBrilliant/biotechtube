import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — BiotechTube",
  description: "Terms and conditions for using BiotechTube.",
};

const sectionStyle: React.CSSProperties = { color: "var(--color-text-secondary)", lineHeight: 1.75 };
const headingStyle: React.CSSProperties = { color: "var(--color-text-primary)", letterSpacing: "-0.5px" };

export default function TermsPage() {
  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1
          className="text-[32px] font-medium mb-1 tracking-tight"
          style={headingStyle}
        >
          Terms of Service
        </h1>
        <p className="text-12 mb-8" style={{ color: "var(--color-text-tertiary)" }}>
          Last updated: March 19, 2026
        </p>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Using BiotechTube</h2>
          <p className="text-13 mb-3" style={sectionStyle}>
            BiotechTube is a biotech intelligence platform that provides company profiles, pipeline data, funding information, and market analytics. By creating an account or using the site you agree to these terms. If you do not agree, please do not use the service.
          </p>
          <p className="text-13" style={sectionStyle}>
            You must be at least 18 years old to create an account. You are responsible for keeping your login credentials secure. If you suspect someone else has accessed your account, contact us immediately at hello@biotechtube.com.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Subscriptions and payments</h2>
          <p className="text-13 mb-3" style={sectionStyle}>
            BiotechTube offers both free and paid access tiers. The free tier gives you limited access to rankings, company profiles, and funding data. The paid subscription ($49/month) unlocks full access to all data, watchlists, alerts, and premium features.
          </p>
          <p className="text-13" style={sectionStyle}>
            Your first month is free. After the trial you will be charged monthly until you cancel. You can cancel at any time from your account settings — your access continues until the end of your current billing period. Refunds are not available for partial months.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Not investment advice</h2>
          <p className="text-13 mb-3" style={sectionStyle}>
            This is important: nothing on BiotechTube is investment advice. The pipeline data, funding round information, company valuations, market indices, and any AI-generated analysis are provided for informational and educational purposes only. They are not recommendations to buy, sell, or hold any securities.
          </p>
          <p className="text-13" style={sectionStyle}>
            Biotech investing carries substantial risk, including the possibility of total loss. Clinical trials fail, companies run out of funding, and regulatory approvals are never guaranteed. Always consult a qualified financial advisor and do your own research before making investment decisions.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Data accuracy</h2>
          <p className="text-13" style={sectionStyle}>
            We compile data from public sources and do our best to keep it accurate, but we cannot guarantee that every data point is correct, complete, or current. Company profiles, pipeline stages, funding amounts, and market data may contain errors or be out of date. If you spot an error, let us know at hello@biotechtube.com and we will correct it as quickly as we can.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Company profiles</h2>
          <p className="text-13 mb-3" style={sectionStyle}>
            Company profiles are created from publicly available information. If you represent a company listed on BiotechTube, you can claim your profile to verify ownership and edit your company information. Profile claiming is free. Premium profile features (enhanced content, analytics, lead access) are available as a paid upgrade.
          </p>
          <p className="text-13" style={sectionStyle}>
            We reserve the right to remove or modify content that is misleading, inaccurate, or violates these terms. Companies that claim profiles are responsible for the accuracy of the information they provide.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Acceptable use</h2>
          <p className="text-13" style={sectionStyle}>
            Do not scrape, crawl, or bulk-download data from BiotechTube without written permission. Do not attempt to circumvent the paywall or access controls. Do not use the platform to distribute spam, malware, or misleading information. We reserve the right to suspend or terminate accounts that violate these rules.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Limitation of liability</h2>
          <p className="text-13" style={sectionStyle}>
            BiotechTube is provided &quot;as is&quot; without warranties of any kind. We are not liable for any losses, damages, or costs arising from your use of the platform or reliance on any data or content provided. This includes, without limitation, any investment losses. Our total liability to you for any claim related to the service is limited to the amount you have paid us in the 12 months before the claim.
          </p>
        </section>

        <section>
          <h2 className="text-14 font-medium mb-2" style={headingStyle}>Contact</h2>
          <p className="text-13" style={sectionStyle}>
            Questions about these terms? Email us at{" "}
            <a href="mailto:hello@biotechtube.com" style={{ color: "var(--color-accent)" }}>
              hello@biotechtube.com
            </a>.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
