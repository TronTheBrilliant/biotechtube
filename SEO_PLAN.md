# BiotechTube SEO Optimization Plan

## Overview
Make every page on BiotechTube discoverable, indexable, and ranking in Google. The goal is to turn our 15,000+ pages into organic traffic magnets targeting biotech professionals and investors.

---

## Phase 1: Meta Tags (Highest Impact)

### 1.1 Company Pages (`/company/[slug]`)
**Target queries:** "eli lilly stock", "moderna pipeline", "roche market cap"

```
Title: "{name} ({ticker}) — Stock, Pipeline & Market Cap | BiotechTube"
Title (no ticker): "{name} — Biotech Company Profile | BiotechTube"
Description: "{name} is a {country} {stage} biotech company{marketCap}. {pipelineCount} pipeline drugs, {patentCount} patents. Track stock price, funding, and FDA approvals."
```

### 1.2 Sector Pages (`/sectors/[slug]`)
**Target queries:** "biotech small molecule companies", "cell therapy sector"

```
Title: "{sectorName} — Biotech Sector Analysis & Companies | BiotechTube"
Description: "Track the {sectorName} biotech sector: ${marketCap} market cap, {companyCount} companies. View indexed price chart, top companies, and market data."
```

### 1.3 Country Pages (`/countries/[slug]`)
**Target queries:** "biotech companies in japan", "swiss pharma companies"

```
Title: "Biotech in {country} — {companyCount} Companies & Market Data | BiotechTube"
Description: "Explore {country}'s biotech market: ${marketCap} market cap, {publicCount} public companies. View stock index, top companies, and biotech hubs."
```

### 1.4 Top Companies Page (`/top-companies`)
**Target queries:** "top biotech companies", "largest biotech companies by market cap"

```
Title: "Top Biotech Companies by Market Cap (2026) | BiotechTube"
Description: "Ranked list of the world's largest biotech companies by market cap. Track {count}+ public biotech stocks across 30+ countries. Updated daily."
```

### 1.5 Trending Page (`/trending`)
**Target queries:** "trending biotech stocks", "best biotech stocks this month"

```
Title: "Trending Biotech Stocks — Top Movers This Month | BiotechTube"
Description: "See which biotech stocks are trending. Top 50 companies ranked by 30-day market cap change. Updated daily with real market data."
```

### 1.6 Funding Page (`/funding`)
**Target queries:** "biotech funding rounds", "biotech vc investment 2026"

```
Title: "Biotech Funding Tracker — VC Rounds, IPOs & Grants | BiotechTube"
Description: "Track {totalRounds}+ biotech funding rounds totaling ${totalAmount}. Filter by round type, country, and investor. From seed to IPO."
```

### 1.7 Markets Page (`/markets`)
**Target queries:** "biotech market cap", "biotech index"

```
Title: "Biotech Market Overview — ${totalMarketCap} Total Market Cap | BiotechTube"
Description: "Global biotech market data: ${totalMarketCap} total market cap across {companyCount}+ companies. Sector performance, country breakdown, and historical charts."
```

### 1.8 Homepage
**Target queries:** "biotechtube", "biotech market data", "biotech company database"

```
Title: "BiotechTube — Global Biotech Market Intelligence"
Description: "Track ${marketCap}+ in biotech market cap across {companyCount}+ companies, 20 sectors, and 30+ countries. Stock prices, pipeline data, funding rounds, and market analysis."
```

---

## Phase 2: Technical SEO

### 2.1 Dynamic Sitemap (`/sitemap.xml`)
Auto-generated sitemap including ALL pages:
- Homepage + static pages (~20)
- All company profiles (~15,000)
- All sector pages (~20)
- All country pages (~30)
- Top companies, trending, funding, markets
- Priority weighting: homepage 1.0, companies 0.8, sectors 0.7, countries 0.7

### 2.2 robots.txt
```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /api/
Disallow: /auth/
Sitemap: https://biotechtube.io/sitemap.xml
```

### 2.3 Canonical URLs
Every page gets a `<link rel="canonical">` to prevent duplicate content.

### 2.4 Proper HTML semantics
- One `<h1>` per page
- Proper heading hierarchy (h1 > h2 > h3)
- Alt text on all images
- Proper `<nav>`, `<main>`, `<footer>` landmarks

---

## Phase 3: Structured Data (JSON-LD)

### 3.1 Company Pages — Organization Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Eli Lilly",
  "url": "https://lilly.com",
  "description": "...",
  "foundingDate": "1876",
  "address": { "addressCountry": "United States" },
  "tickerSymbol": "LLY"
}
```

### 3.2 Homepage — WebSite + SearchAction
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "BiotechTube",
  "url": "https://biotechtube.io",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://biotechtube.io/companies?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### 3.3 Funding Page — Dataset Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Biotech Funding Rounds",
  "description": "...",
  "creator": { "@type": "Organization", "name": "BiotechTube" }
}
```

---

## Phase 4: Open Graph Images

### 4.1 Dynamic OG Image Generator (`/api/og`)
Using `@vercel/og` (built into Next.js) to generate images on-the-fly.

**Company OG Image:**
- Company logo (large, centered)
- Company name in bold
- Market cap + ticker + 1D change
- Mini stock chart sparkline
- BiotechTube branding at bottom
- Size: 1200x630px

**Sector OG Image:**
- Sector emoji + name
- Market cap + company count
- Green/red indicator for performance
- BiotechTube branding

**Default OG Image:**
- BiotechTube logo
- "Global Biotech Market Intelligence"
- Key stat: "$7.5T+ tracked"

### 4.2 Twitter Card Tags
```html
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:site" content="@biotechtube" />
<meta property="twitter:image" content="/api/og?company=eli-lilly" />
```

---

## Phase 5: Internal Linking

### 5.1 Company → Related pages
- Link to sector page from company profile
- Link to country page from company profile
- "Similar companies" section already exists — good
- Add "Other companies in this sector" links
- Add "Other companies in this country" links

### 5.2 Breadcrumbs
Company pages: Home > Sectors > Small Molecules > Eli Lilly
Country pages: Home > Countries > United States
Sector pages: Home > Sectors > Cell Therapy

### 5.3 Footer links
- Top 10 companies by market cap
- Top 5 sectors
- Top 5 countries

---

## Phase 6: Performance

### 6.1 Core Web Vitals
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

### 6.2 Image optimization
- Company logos: proper sizing, lazy loading
- Charts: render after page load

---

## Implementation Order

| Step | Task | Impact | Time |
|------|------|--------|------|
| 1 | Meta tags for all page types | Very High | 1-2 hours |
| 2 | sitemap.xml + robots.txt | Very High | 30 min |
| 3 | JSON-LD structured data | High | 1 hour |
| 4 | OG image generator | High | 1-2 hours |
| 5 | Internal linking + breadcrumbs | Medium | 1 hour |
| 6 | Performance audit | Medium | 30 min |

**Total estimated time: 5-7 hours**

---

## Success Metrics

- Google Search Console: pages indexed (target: 15,000+)
- Organic traffic growth (weekly)
- Average position for key terms
- Click-through rate from search results
- Rich snippet appearances
