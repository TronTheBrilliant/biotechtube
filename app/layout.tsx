import type { Metadata } from "next";
import localFont from "next/font/local";
import { Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "BiotechTube — Global Biotech Intelligence Platform",
  description:
    "Track 14,000+ biotech companies worldwide. Clinical pipeline data, biotech market intelligence, funding rounds, company rankings, and investment analysis.",
  keywords:
    "biotech companies, clinical pipeline, biotech market, biotechnology, life sciences, drug development, clinical trials, biotech funding, pharmaceutical companies",
  openGraph: {
    title: "BiotechTube — Global Biotech Intelligence Platform",
    description:
      "Track 14,000+ biotech companies worldwide. Clinical pipeline data, biotech market intelligence, funding rounds, and investment analysis.",
    type: "website",
    siteName: "BiotechTube",
    url: "https://biotechtube.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "BiotechTube — Global Biotech Intelligence Platform",
    description:
      "Track 14,000+ biotech companies worldwide. Clinical pipeline data, biotech market intelligence, funding rounds, and investment analysis.",
  },
  metadataBase: new URL("https://biotechtube.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
