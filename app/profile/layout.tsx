import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your profile | BiotechTube",
  description: "Manage your BiotechTube profile and preferences.",
  robots: { index: false, follow: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
