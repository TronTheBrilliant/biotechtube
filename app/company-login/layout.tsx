import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company sign in | BiotechTube",
  description: "Sign in to manage your company's BiotechTube profile.",
  robots: { index: false, follow: false },
};

export default function CompanyLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
