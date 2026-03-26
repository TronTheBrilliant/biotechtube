import type { Metadata } from "next";
import localFont from "next/font/local";
import { Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth";
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
    url: "https://biotechtube.io",
    images: [{ url: "https://biotechtube.io/api/og?title=BiotechTube&subtitle=Track%20%247.5T%2B%20in%20biotech%20market%20cap&type=default", width: 1200, height: 630, alt: "BiotechTube — Global Biotech Intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@biotechtube",
    title: "BiotechTube — Global Biotech Intelligence Platform",
    description:
      "Track 14,000+ biotech companies worldwide. Clinical pipeline data, biotech market intelligence, funding rounds, and investment analysis.",
    images: ["https://biotechtube.io/api/og?title=BiotechTube&subtitle=Track%20%247.5T%2B%20in%20biotech%20market%20cap&type=default"],
  },
  metadataBase: new URL("https://biotechtube.io"),
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://img.logo.dev" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://niblhjhtkqazfegktnok.supabase.co" />
        <link rel="dns-prefetch" href="https://img.logo.dev" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JFHJXRVELX"
          strategy="beforeInteractive"
        />
        <Script id="google-analytics" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-JFHJXRVELX');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
