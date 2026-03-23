# BiotechTube SEO Sprint — 2-Week Plan

**Goal:** Get biotechtube.io indexed, ranking for long-tail biotech queries, and set up for sustained organic growth.

**Current State:** Technical SEO foundation is solid (sitemap, robots.txt, JSON-LD, OG tags, canonical URLs, ISR caching). Missing: Google Search Console verification, analytics, visible breadcrumbs, therapeutic hub pages, real news content, and internal linking depth.

---

## WEEK 1: Technical SEO & Indexing (Days 1–5)

### Day 1–2: Get Indexed

- [ ] **Task 1: Google Search Console setup**
  - Add `verification.google` meta tag to `app/layout.tsx`
  - User action: Register property at search.google.com/search-console, provide verification code
  - Submit sitemap URL (`/sitemap.xml`) via GSC

- [ ] **Task 2: Google Analytics 4 integration**
  - Create `components/GoogleAnalytics.tsx` with `gtag.js` script
  - Add GA4 component to `app/layout.tsx` `<head>`
  - Use `next/script` with `afterInteractive` strategy for performance
  - User action: Create GA4 property, provide Measurement ID (G-XXXXXXX)

### Day 2–3: Visible Breadcrumbs

- [ ] **Task 3: Breadcrumbs UI component**
  - Create `components/Breadcrumbs.tsx` — lightweight, reusable component
  - Style: subtle, small text, separator arrows, links to parent pages
  - Add to: `/company/[slug]`, `/companies/[country]`, `/companies`, `/funding`, `/pipeline`, `/markets`, `/events`, `/news`
  - Already have JSON-LD breadcrumbs — this adds visible HTML breadcrumbs that users + Google both see

### Day 3–4: Therapeutic Area Hub Pages

- [ ] **Task 4: Create `/therapeutic-areas` index page**
  - List all therapeutic areas with company counts (query Supabase `categories` field)
  - Each links to `/therapeutic-areas/[slug]` (e.g., `/therapeutic-areas/oncology`)
  - Add JSON-LD CollectionPage schema
  - SEO metadata targeting "biotech companies by therapeutic area"

- [ ] **Task 5: Create `/therapeutic-areas/[slug]` dynamic pages**
  - Route: `app/therapeutic-areas/[slug]/page.tsx`
  - Content: description of the therapeutic area, filtered company list, key stats (total companies, total raised, avg stage)
  - JSON-LD: CollectionPage + BreadcrumbList
  - `generateStaticParams` for top therapeutic areas
  - Internal links to individual company pages
  - Target keywords: "[Therapeutic Area] biotech companies", "[Therapeutic Area] drug pipeline"

- [ ] **Task 6: Define therapeutic areas data**
  - Create `data/therapeutic-areas.json` with:
    - slug, name, description (100-200 words each), icon/emoji
  - Cover: Oncology, Immunotherapy, Gene Therapy, Cell Therapy, Rare Diseases, Neuroscience, Cardiovascular, Infectious Disease, Diagnostics, Drug Delivery, Radiopharmaceuticals, AI/Digital Health
  - Descriptions should be keyword-rich but natural

### Day 5: Internal Linking Pass

- [ ] **Task 7: Cross-link company pages to therapeutic area hubs**
  - In `CompanyProfile.tsx`, link each focus area tag to its therapeutic area hub page
  - In therapeutic area hub pages, link to top companies

- [ ] **Task 8: Add "Related Pages" section to company pages**
  - Below similar companies, add links to:
    - Country page for this company
    - Therapeutic area pages for this company's focus areas
    - Pipeline page, Funding page

- [ ] **Task 9: Add therapeutic area links to navigation**
  - Add "Therapeutic Areas" to the main nav or as a dropdown under "Companies"
  - Add therapeutic area links to the Footer

---

## WEEK 2: Content & Authority (Days 6–10)

### Day 6–7: Launch News Section

- [ ] **Task 10: Create news article infrastructure**
  - Create `data/news.json` for seed articles (can be migrated to Supabase later)
  - Article type: `{ slug, title, excerpt, body, date, category, relatedCompanies, author }`
  - Create `app/news/[slug]/page.tsx` for individual article pages
  - JSON-LD: NewsArticle schema on each article
  - Dynamic metadata with keyword-optimized titles

- [ ] **Task 11: Rebuild `/news` page as article listing**
  - Replace "coming soon" with actual article cards
  - Category filters (Funding, Pipeline, Partnerships, Regulatory)
  - Keep email signup form at bottom
  - Pagination-ready design

- [ ] **Task 12: Write 10-15 seed news articles**
  - Create `data/news.json` with articles covering:
    - "Top 50 Oncology Biotech Companies to Watch in 2026"
    - "Gene Therapy Pipeline: Key Clinical Trials in 2026"
    - "Biotech Funding Trends Q1 2026"
    - "Immunotherapy Breakthroughs: Companies Leading the Charge"
    - "Rare Disease Biotech: Companies Tackling Unmet Medical Needs"
    - Plus 5-10 more covering different therapeutic areas and topics
  - Each 400-800 words, keyword-rich, linking to relevant company profiles

### Day 7–8: FAQ Schema on Company Pages

- [ ] **Task 13: Add FAQ section to company pages**
  - Generate 3-5 FAQs per company dynamically:
    - "What does [Company] do?" → description
    - "Where is [Company] located?" → city, country
    - "What stage is [Company]'s pipeline?" → stage info
    - "How much funding has [Company] raised?" → total raised
    - "Is [Company] publicly traded?" → ticker info
  - Add FAQPage JSON-LD schema
  - Display as collapsible accordion below company profile

### Day 8–9: Page Performance

- [ ] **Task 14: Core Web Vitals optimization**
  - Audit with `next build` and check bundle sizes
  - Lazy-load below-fold components (charts, similar companies)
  - Ensure all images use `next/image` with proper `width`/`height`/`sizes`
  - Add `loading="lazy"` to non-critical images
  - Check for layout shift issues (CLS)

- [ ] **Task 15: Add `last-modified` timestamps**
  - Company pages: use data update timestamp
  - Static pages: use build timestamp
  - Helps Google understand content freshness

### Day 9–10: SEO Polish

- [ ] **Task 16: Create a `/about` page enhancement**
  - Add team info, mission, differentiation
  - OrganizationSchema JSON-LD for BiotechTube itself (not just companies)
  - This builds E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)

- [ ] **Task 17: XML sitemap enhancement**
  - Add therapeutic area pages to sitemap
  - Add news article pages to sitemap
  - Set appropriate priorities and change frequencies

- [ ] **Task 18: Create programmatic meta descriptions**
  - Ensure every therapeutic area page has a unique, compelling meta description
  - Ensure every news article has a unique meta description
  - Audit company pages for duplicate/thin descriptions

---

## Implementation Order (Prioritized)

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| P0 | Google Search Console (Task 1) | Critical | Low |
| P0 | Google Analytics (Task 2) | Critical | Low |
| P1 | Breadcrumbs component (Task 3) | High | Medium |
| P1 | Therapeutic area data (Task 6) | High | Medium |
| P1 | Therapeutic area pages (Tasks 4-5) | High | High |
| P1 | News infrastructure (Tasks 10-12) | High | High |
| P2 | FAQ schema on company pages (Task 13) | Medium | Medium |
| P2 | Internal linking (Tasks 7-9) | Medium | Medium |
| P2 | Core Web Vitals (Task 14) | Medium | Medium |
| P3 | Sitemap updates (Task 17) | Low | Low |
| P3 | Meta description audit (Task 18) | Low | Low |
| P3 | About page enhancement (Task 16) | Low | Medium |
| P3 | Last-modified timestamps (Task 15) | Low | Low |

---

## What The User Needs To Do (Can't Be Automated)

1. **Create Google Search Console property** → provide verification code
2. **Create Google Analytics 4 property** → provide Measurement ID
3. **Submit site to biotech directories** (Crunchbase, Product Hunt, etc.)
4. **Share data-driven articles** on LinkedIn, Twitter, biotech forums
5. **Reach out for backlinks** — university resource pages, industry associations

---

## Expected Outcomes After 2 Weeks

- 14,000+ company pages + 12+ therapeutic hub pages + 10-15 news articles indexed
- Ranking for long-tail queries within 2-4 weeks of indexing
- Proper analytics tracking user behavior and traffic sources
- Strong internal linking structure for link equity distribution
- FAQ rich results appearing in Google SERPs for company queries
- Breadcrumbs showing in Google search results
- Foundation for sustained content growth
