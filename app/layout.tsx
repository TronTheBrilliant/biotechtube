import type { Metadata } from "next";
import localFont from "next/font/local";
import { Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

// display: "swap" avoids FOIT (LCP penalty when fonts are blocking).
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  preload: true,
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: false,
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["600", "700"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "BiotechTube — Global Biotech Intelligence Platform",
  description:
    "Track $7.5T+ in biotech market cap. Company profiles, drug pipelines, funding data, and market analysis for 11,000+ biotech companies worldwide. Free.",
  keywords:
    "biotech companies, clinical pipeline, biotech market, biotechnology, life sciences, drug development, clinical trials, biotech funding, pharmaceutical companies, biotech market cap",
  openGraph: {
    title: "BiotechTube — The Bloomberg Terminal for Biotech, but Free",
    description:
      "Track $7.5T+ in biotech market cap. Company profiles, drug pipelines, funding data, and market analysis for 11,000+ biotech companies worldwide. Free.",
    type: "website",
    siteName: "BiotechTube",
    url: "https://biotechtube.io",
    images: [{ url: "https://biotechtube.io/api/og?title=BiotechTube&subtitle=Track%20%247.5T%2B%20in%20biotech%20market%20cap&type=default", width: 1200, height: 630, alt: "BiotechTube — Global Biotech Intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@biotechtube",
    title: "BiotechTube — The Bloomberg Terminal for Biotech, but Free",
    description:
      "Track $7.5T+ in biotech market cap. Company profiles, drug pipelines, funding data, and market analysis for 11,000+ biotech companies worldwide. Free.",
    images: ["https://biotechtube.io/api/og?title=BiotechTube&subtitle=Track%20%247.5T%2B%20in%20biotech%20market%20cap&type=default"],
  },
  metadataBase: new URL("https://biotechtube.io"),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="alternate" type="application/rss+xml" title="BiotechTube (RSS)" href="/api/feed/rss" />
        <link rel="alternate" type="application/atom+xml" title="BiotechTube (Atom)" href="/api/feed/atom" />
        <link rel="alternate" type="application/feed+json" title="BiotechTube (JSON Feed)" href="/api/feed/json" />
        <link rel="alternate" hrefLang="en" href="https://biotechtube.io" />
        <link rel="alternate" hrefLang="x-default" href="https://biotechtube.io" />
        <link rel="preconnect" href="https://img.logo.dev" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://niblhjhtkqazfegktnok.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://niblhjhtkqazfegktnok.supabase.co" />
        <link rel="dns-prefetch" href="https://img.logo.dev" />
        <meta name="application-name" content="BiotechTube" />
        <meta name="apple-mobile-web-app-title" content="BiotechTube" />
        <meta name="theme-color" content="#1a7a5e" />
        {/* Sitewide structured data: Organization + WebSite (with SearchAction) + primary nav */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "@id": "https://biotechtube.io/#organization",
                name: "BiotechTube",
                url: "https://biotechtube.io",
                logo: { "@type": "ImageObject", url: "https://biotechtube.io/logo.png", width: 512, height: 512 },
                sameAs: ["https://twitter.com/biotechtube", "https://www.linkedin.com/company/biotechtube"],
                description: "Global biotech intelligence platform tracking 14,000+ companies, 54,000+ drugs, and $7.5T+ in market cap.",
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "@id": "https://biotechtube.io/#website",
                url: "https://biotechtube.io",
                name: "BiotechTube",
                publisher: { "@id": "https://biotechtube.io/#organization" },
                inLanguage: "en",
                potentialAction: {
                  "@type": "SearchAction",
                  target: { "@type": "EntryPoint", urlTemplate: "https://biotechtube.io/companies?q={search_term_string}" },
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "SiteNavigationElement",
                name: ["Trending", "Top Companies", "Funding", "Pipeline", "Sectors", "Markets", "Charts", "Countries", "Events", "News", "Blog", "Pricing", "About"],
                url: [
                  "https://biotechtube.io/trending", "https://biotechtube.io/top-companies", "https://biotechtube.io/funding",
                  "https://biotechtube.io/pipelines", "https://biotechtube.io/sectors", "https://biotechtube.io/markets",
                  "https://biotechtube.io/charts", "https://biotechtube.io/countries", "https://biotechtube.io/events",
                  "https://biotechtube.io/news", "https://biotechtube.io/blog", "https://biotechtube.io/pricing", "https://biotechtube.io/about",
                ],
              },
            ]),
          }}
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JFHJXRVELX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
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
