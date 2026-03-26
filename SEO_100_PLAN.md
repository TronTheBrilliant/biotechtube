# SEO 100/100 Execution Plan

## Goal: Take BiotechTube from 65/100 to 100/100 SEO score

---

## Phase 1: Request Indexing for Top Pages (30 min)
**Impact: HIGH | Effort: LOW**

Google hasn't indexed any of our 23,353 pages yet. We need to manually request indexing for the most important pages via Google Search Console's URL Inspection tool.

### Pages to request indexing (top 30):
1. Homepage: https://biotechtube.io
2. /top-companies
3. /trending
4. /funding
5. /markets
6. /top-sectors
7. /countries
8. /company/eli-lilly
9. /company/pfizer
10. /company/novartis
11. /company/roche
12. /company/astrazeneca
13. /company/merck
14. /company/amgen
15. /company/gilead-sciences
16. /company/moderna
17. /company/abbvie
18. /sectors/small-molecules
19. /sectors/biologics
20. /sectors/cell-therapy
21. /sectors/ai-machine-learning
22. /countries/united-states
23. /countries/united-kingdom
24. /countries/japan
25. /countries/germany
26. /countries/switzerland
27. /countries/china
28. /countries/france
29. /countries/south-korea
30. /countries/india

### Action: Use Google Search Console URL Inspection to request indexing for each.

---

## Phase 2: Content Engine — AI Blog (2-3 hours)
**Impact: MASSIVE | Effort: MEDIUM**

### 2.1 Database table
Create `blog_posts` table in Supabase:
- id, slug, title, content (markdown), excerpt, category, tags[],
- author (default "BiotechTube Research"), published_at, updated_at
- meta_title, meta_description, og_image_url
- status (draft/published), view_count

### 2.2 Blog infrastructure
- `/blog` page — list of articles with pagination
- `/blog/[slug]` page — individual article with full markdown rendering
- Blog sitemap entries (auto-added)
- JSON-LD Article schema on each post
- Internal links to company/sector/country pages within articles

### 2.3 AI Article Generator Script
`scripts/generate-articles.ts` — Uses DeepSeek to write articles:

**Evergreen articles (high search volume):**
- "Top 50 Biotech Companies by Market Cap (2026)"
- "Biotech IPOs in 2026: Complete List and Analysis"
- "CAR-T Therapy Companies: Complete Guide"
- "CRISPR Gene Editing: Companies Leading the Revolution"
- "mRNA Technology Beyond COVID: Companies to Watch"
- "Biotech Funding Trends: Where VCs Are Investing in 2026"
- "Best Biotech Stocks to Watch in 2026"
- "Gene Therapy Companies: The Complete Landscape"
- "AI in Drug Discovery: Top Companies and Platforms"
- "Biotech Companies in Europe: Market Overview"
- "Small Molecule Drug Companies: Market Leaders"
- "Immunotherapy Companies: Who's Leading the Race"
- "Biotech Market Cap: Historical Analysis 1990-2026"
- "Orphan Drug Companies: Rare Disease Biotech"
- "Digital Health Companies Transforming Healthcare"

**Data-driven articles (auto-generated from our DB):**
- "This Week in Biotech: [date range]" — weekly market recap
- "Biotech Market Report: [month] 2026" — monthly analysis
- "Top Biotech Funding Rounds This Quarter"
- "FDA Approvals This Month: What You Need to Know"
- "Trending Biotech Companies: Weekly Movers"

Each article:
- 1500-3000 words
- Includes data tables from our DB
- Links to 5-10 company profiles
- Links to relevant sector/country pages
- Targets specific long-tail keywords
- Has unique meta title + description

### 2.4 Weekly Auto-Generation
Set up a cron that generates 1 weekly recap article automatically from our data.

---

## Phase 3: Page Speed Optimization (1 hour)
**Impact: HIGH | Effort: MEDIUM**

### 3.1 Lazy load TradingView charts
- Don't load lightweight-charts JS until user scrolls to the chart
- Use `IntersectionObserver` or dynamic import with `loading` state

### 3.2 Reduce homepage queries
- Cache top companies, sectors, countries data more aggressively
- Use `revalidate = 600` (10 min) instead of 300

### 3.3 Static generation for top companies
- Pre-render the top 100 company pages at build time
- Use `generateStaticParams()` to list them

### 3.4 Image optimization
- All company logos already use img.logo.dev (external, cached)
- Add `loading="lazy"` to logos below the fold
- Preconnect already added for img.logo.dev

### 3.5 Font optimization
- Already using next/font — good
- Verify fonts are preloaded

---

## Phase 4: Internal Linking Strategy (1 hour)
**Impact: HIGH | Effort: MEDIUM**

### 4.1 Company pages → Related pages
- Sector badges link to sector pages
- Country name links to country page
- "More companies in [sector]" section
- "More companies in [country]" section
- Related companies (already have "Similar Companies")

### 4.2 Sector pages → Company pages
- Top companies section already links
- Add "Related sectors" section

### 4.3 Blog → Data pages
- Every blog article links to relevant company profiles
- Every blog article links to relevant sector pages
- Every blog article links to the funding page

### 4.4 Data pages → Blog
- Company pages: "Read about [company] on our blog"
- Sector pages: "Sector analysis: [link to blog post]"
- Funding page: "Latest funding analysis: [link]"

### 4.5 Footer
- Add popular company links
- Add sector links
- Add "Latest articles" section

---

## Phase 5: Embeddable Widgets (30 min)
**Impact: MEDIUM | Effort: LOW**

Create simple embeddable widgets that other sites can use:
- Biotech market cap ticker (shows $7.5T with live update)
- Company stock badge (shows company name + price + change)
- "Powered by BiotechTube" link back to us

Each embed = a backlink from the embedding site.

Widget endpoint: `/api/widget/market-cap` returns an HTML snippet.

---

## Phase 6: Directory Submissions & Backlinks (30 min)
**Impact: MEDIUM | Effort: LOW**

Submit BiotechTube to:
- Product Hunt
- Hacker News (Show HN)
- Reddit r/biotech, r/investing
- Biotech industry directories
- Startup directories (BetaList, AlternativeTo)
- Add to GitHub README as a project

Create a list of 20 directories to submit to.

---

## Phase 7: Social Media Foundation (30 min)
**Impact: MEDIUM | Effort: LOW**

- Create Twitter/X: @biotechtube
- Create LinkedIn company page
- Set up auto-posting: when a blog article is published, share on social
- Add social links to the website footer

---

## Execution Order:
1. Phase 2.1-2.2: Blog infrastructure (DB + pages)
2. Phase 2.3: Generate first 15 evergreen articles
3. Phase 1: Request indexing for top pages
4. Phase 3: Speed optimization
5. Phase 4: Internal linking
6. Phase 2.4: Weekly auto-generation
7. Phase 5: Embeddable widgets
8. Phase 6: Directory list
9. Phase 7: Social media setup notes

---

## Success Metrics:
- [ ] 15+ blog articles published
- [ ] Top 30 pages submitted for indexing
- [ ] Blog sitemap entries included
- [ ] Page load < 3s on mobile
- [ ] Every page has internal links to 3+ other pages
- [ ] JSON-LD Article schema on all blog posts
- [ ] OG images on all pages
- [ ] Weekly recap auto-generated
- [ ] Widget endpoint live
- [ ] Directory submission list created
