import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import companies from "@/data/companies.json";
import { Company } from "@/lib/types";
import VerifyForm from "./VerifyForm";

const typedCompanies = companies as Company[];

export function generateStaticParams() {
  return typedCompanies.map((c) => ({ slug: c.slug }));
}

export default function VerifyPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div
      className="page-content"
      style={{
        background: "var(--color-bg-primary)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Nav />
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <VerifyForm slug={params.slug} />
      </main>
      <Footer />
    </div>
  );
}
