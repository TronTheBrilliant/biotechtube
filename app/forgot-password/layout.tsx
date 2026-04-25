import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset password | BiotechTube",
  description: "Reset your BiotechTube password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
