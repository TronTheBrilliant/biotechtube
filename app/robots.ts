import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/", "/auth/", "/admin", "/login", "/signup", "/profile", "/watchlist"],
      },
    ],
    sitemap: "https://biotechtube.io/sitemap.xml",
  };
}
