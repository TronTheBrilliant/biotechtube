import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Google, Bing — allow everything, they respect crawl budget
        userAgent: ["Googlebot", "Bingbot", "Slurp"],
        allow: "/",
        disallow: ["/dashboard", "/api/", "/auth/", "/admin", "/login", "/signup", "/company-login", "/forgot-password", "/profile", "/watchlist", "/manage"],
      },
      {
        // Block aggressive AI scrapers that burn serverless time
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "Claude-Web", "Bytespider", "PetalBot"],
        disallow: "/",
      },
      {
        // Block aggressive SEO crawlers
        userAgent: ["AhrefsBot", "SemrushBot", "DotBot", "MJ12bot", "BLEXBot"],
        disallow: "/",
      },
      {
        // All other bots — allow but with same disallow list
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/", "/auth/", "/admin", "/login", "/signup", "/company-login", "/forgot-password", "/profile", "/watchlist", "/manage"],
      },
    ],
    sitemap: [
      "https://biotechtube.io/sitemap.xml",
      "https://biotechtube.io/sitemap-news.xml",
    ],
  };
}
