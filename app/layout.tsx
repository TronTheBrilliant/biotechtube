import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BiotechTube — Global Biotech Intelligence Platform",
    template: "%s | BiotechTube",
  },
  description:
    "Track 14,000+ biotech companies worldwide. Funding rounds, pipeline data, company rankings, and investment intelligence.",
  metadataBase: new URL('https://www.biotechtube.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'BiotechTube',
    title: 'BiotechTube — Global Biotech Intelligence Platform',
    description: 'Track 14,000+ biotech companies worldwide. Funding rounds, pipeline data, company rankings, and investment intelligence.',
    url: 'https://www.biotechtube.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BiotechTube — Global Biotech Intelligence Platform',
    description: 'Track 14,000+ biotech companies worldwide. Funding rounds, pipeline data, company rankings, and investment intelligence.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your Google Search Console verification code here
    // google: 'your-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BiotechTube',
    url: 'https://www.biotechtube.com',
    description: 'Global biotech intelligence platform tracking 14,000+ biotech companies worldwide.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.biotechtube.com/companies?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
