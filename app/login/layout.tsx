import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | BiotechTube",
  description: "Sign in to BiotechTube.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
