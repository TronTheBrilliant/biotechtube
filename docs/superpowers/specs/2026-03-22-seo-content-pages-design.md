# SEO Content Pages — Design Spec

## Goal

Build a programmatic SEO content machine that generates tens of thousands of interlinked pages from existing company report data. Target: outrank company websites for biotech-related searches across all audience segments (investors, industry professionals, job seekers, general public).

## Architecture

Three layers of content pages, all built on data already in the `company_reports` table in Supabase. No new AI generation needed for Layers 1-2. Layer 3 uses DeepSeek for cheap, data-driven article generation.

**Rendering strategy:** All new SEO pages use on-demand ISR (no `generateStaticParams`, `dynamicParams: true`). Pages are server-rendered on first request, then cached and revalidated every 24 hours. This avoids building 30,000+ pages at deploy time — Vercel generates each page on first visit and caches it. Existing company pages at `/company/[slug]` remain `force-dynamic` for now (they need fresh report data on each load).

**Scope:** Layers 1-2 are the implementation scope of this spec. Layer 3 (articles) is documented here for context but will be a separate spec/implementation cycle with its own infrastructure decisions (cron provider, snapshot diffing strategy).

Dense internal linking across all layers creates a topic cluster architecture that signals domain authority to Google.

## Data Sources

All entity pages pull from existing Supabase tables:

- **`company_reports`** — `pipeline_programs` (array of {name, indication, phase, status, trial_id}), `key_people` (array of {name, role}), `investors` (array of strings), `therapeutic_areas` (array of strings), `summary`, `deep_report`, `competitive_landscape`, `opportunities`, `risks`, `funding_mentions`
- **`companies`** — `slug`, `name`, `country`, `city`, `valuation`, `total_raised`, `stage`, `type`, `ticker`, `focus`, `website`, `founded`

No new database tables needed for Layers 1-2.

---

## Layer 1: Therapeutic Area Hub Pages

**Route:** `/therapeutic-areas/[slug]`
**Count:** 18-25 pages
**Examples:** `/therapeutic-areas/oncology`, `/therapeutic-areas/immunotherapy`

**Index page:** `/therapeutic-areas` lists all therapeutic areas with company counts and links — targets the "biotech therapeutic areas" keyword cluster.

### Data Flow
1. Query all companies where `focus` array or report `therapeutic_areas` contains the area
2. Aggregate pipeline_programs across all matched company reports
3. Aggregate key_people across all matched company reports
4. Compute stats: total companies, total drugs, total funding raised

### Page Structure
- **Hero:** Area name, icon, 2-3 sentence overview (one-time AI-generated, stored in a static data file), key stats row (company count, drug count, total funding)
- **Pipeline table:** All drugs in this area — columns: Drug Name (linked to `/pipeline/[slug]`), Company (linked to `/company/[slug]`), Indication, Phase, Status. Sortable by phase.
- **Top companies:** Ranked by valuation, company cards linking to profiles
- **Key people:** Aggregated leaders in this area, linked to `/people/[slug]`
- **Market overview:** AI-generated paragraph about competitive landscape (one-time, stored in static data)
- **Related areas:** Links to other therapeutic area hub pages

### SEO
- Title: `"Oncology Biotech Companies — Pipeline, Clinical Trials & Market Analysis | BiotechTube"`
- JSON-LD: `CollectionPage` schema with `about` referencing the therapeutic area
- Meta description from overview text
- Keywords: `[area] biotech companies, [area] clinical trials, [area] pipeline, [area] drug development`

### Generation
- `generateStaticParams()` from a static list of therapeutic areas (small enough to pre-render)
- ISR revalidation: 24 hours
- Zero AI cost — all data from existing reports

---

## Layer 2: Programmatic Entity Pages

**Rendering strategy for all Layer 2 pages:** No `generateStaticParams()`. Use `dynamicParams: true` with `revalidate = 86400` (24 hours). Pages are generated on first request and cached. This avoids building 30,000 pages at deploy time.

### 2a. Pipeline Drug Pages

**Route:** `/drugs/[drug-slug]` (avoids conflict with existing `/pipeline` page)
**Count:** 5,000-15,000 pages (depends on report data)

#### Data Flow
1. On request, query all `pipeline_programs` across all company reports where program name matches the slug
2. Aggregate data if same drug appears at multiple companies (show all on one page)

#### Deduplication Strategy (v1: exact match)
- Normalize: lowercase, trim whitespace, strip parenthetical brand names for matching
- Slug: full name slugified — `"Pembrolizumab (Keytruda)"` → `pembrolizumab-keytruda`
- Same normalized name across companies = same page, show all companies
- Different casing/formatting = different pages (acceptable for v1, manual cleanup later)
- Future: drug name lookup table for canonical names (e.g., mapping "MK-3475" → "pembrolizumab")

#### Minimum Content Threshold
A drug page is only rendered if it has at least: drug name, one company, and one indication. Pages missing these fields return 404 (not indexed).

#### Page Structure
- **H1:** Drug/candidate name
- **Key facts card:** Company (linked), indication, phase, status, trial ID (linked to clinicaltrials.gov if NCT)
- **Company context:** 2-3 sentences from the parent company's report summary
- **Related drugs:** Other drugs in the same indication or therapeutic area (linked)
- **Company link:** Prominent CTA to view full company profile

#### SEO
- Title: `"[Drug Name] — [Indication] | Phase [X] Clinical Trial | BiotechTube"`
- JSON-LD: `Drug` schema with `manufacturer`, `relevantSpecialty`
- Canonical URL: always the slugified drug name URL, even if accessed via alternate slug

### 2b. People Pages

**Route:** `/people/[person-slug]`
**Count:** 5,000-15,000 pages

#### Data Flow
1. On request, query all `key_people` across all company reports where normalized name matches
2. If person appears at multiple companies, show all roles

#### Deduplication Strategy (v1: exact normalized match)
- Normalize: lowercase, trim, strip prefixes (Dr., Prof.) and suffixes (PhD, MD, Jr., Sr.)
- `"Dr. Jane Smith, PhD"` → `jane-smith` (slug) and `jane smith` (match key)
- Name collisions (different people with same name): append company slug — `jane-smith-novartis`
- Collision detection: if same normalized name appears at different companies AND different roles, treat as separate people (append company slug). Same name + same company = same person.
- Future: entity resolution using LinkedIn data or manual review

#### Minimum Content Threshold
A person page requires: full name, role/title, and linked company. Pages below this threshold return 404.

#### Page Structure
- **H1:** Full name
- **Role & Company:** Title, company name (linked to `/company/[slug]`)
- **Company context:** Brief summary of what the company does
- **Team:** Other leaders at the same company (linked)
- **Therapeutic area:** What area this person works in (linked to hub page)

#### SEO
- Title: `"[Name] — [Role] at [Company] | BiotechTube"`
- JSON-LD: `Person` schema with `jobTitle`, `worksFor`
- Canonical URL: the person's slug (with company suffix if collision)
- Target queries: "[person name]", "[person name] [company]", "[role] of [company]"

### 2c. Investor Pages

**Route:** `/investors/[investor-slug]`
**Count:** 500-2,000 pages

#### Data Flow
1. On request, query all company reports where `investors` array contains matching name
2. Group all portfolio companies for this investor

#### Deduplication
- Normalize: lowercase, trim, remove trailing "LLC", "LP", "Inc.", etc.
- Exact normalized match only

#### Minimum Content Threshold
Investor page requires: investor name and at least 2 portfolio companies. Single-company investors are not worth a dedicated page.

#### Page Structure
- **H1:** Investor/firm name
- **Portfolio:** List of companies they've invested in (linked), with each company's valuation, stage, therapeutic area
- **Stats:** Number of portfolio companies, sectors covered, total estimated investment
- **Related investors:** Other investors who co-invested in the same companies

#### SEO
- Title: `"[Investor Name] — Biotech Portfolio & Investments | BiotechTube"`
- JSON-LD: `Organization` schema with `investor` role
- Canonical URL on investor slug
- Target queries: "[investor] portfolio", "[investor] biotech investments"

---

## Layer 3: Data-Driven Articles (DEFERRED — separate implementation cycle)

**Route:** `/insights/[slug]`
**Table:** `content_articles` in Supabase

Layer 3 requires infrastructure decisions (cron provider, event detection/diffing strategy, content review workflow) that are out of scope for this spec. Documented here for architectural context only.

### Content Quality Rules
1. **80% data, 20% narrative** — tables, numbers, links first. AI narrates, never fabricates.
2. **Publish only on real events** — phase transitions, funding rounds, FDA actions, leadership changes. No filler.
3. **Source everything** — every claim links to a company profile, drug page, or external source.
4. **Analyst tone** — concise, opinionated where data supports it, no marketing fluff.
5. **2-5 articles per week** — quality over quantity.

### Article Types
- **"This Week in Biotech"** — weekly roundup of notable events across all companies
- **Pipeline Milestones** — when drugs move phases (triggered by report data changes)
- **Funding Spotlights** — notable funding rounds with context
- **Therapeutic Area Deep Dives** — quarterly deep analysis per area

### Database Schema: `content_articles`
```
id: uuid
slug: text (unique)
title: text
summary: text (meta description)
body: text (markdown)
article_type: text (weekly_roundup | pipeline_milestone | funding_spotlight | area_deep_dive)
therapeutic_area: text (nullable)
related_company_slugs: text[] (for interlinking)
related_drug_slugs: text[] (for interlinking)
published_at: timestamptz
created_at: timestamptz
updated_at: timestamptz
```

---

## Interlinking Strategy

Every page type links to every other relevant page type:

- **Company page** → its drugs, its people, its investors, its therapeutic areas
- **Drug page** → its company, related drugs, therapeutic area hub
- **Person page** → their company, their company's drugs, therapeutic area
- **Investor page** → portfolio companies, those companies' drugs
- **Therapeutic area hub** → all companies, all drugs, all people, all investors in that area
- **Articles** → mentioned companies, drugs, people

This creates a dense link graph that signals topical authority to search engines.

---

## Sitemap Architecture

The current `app/sitemap.ts` returns a single sitemap. With 30,000+ URLs, we must use a **sitemap index** with multiple child sitemaps (Google limits each sitemap to 50,000 URLs).

Use Next.js `generateSitemaps()` to split into:
- `sitemap/0.xml` — static pages + company pages (priority 0.8-1.0)
- `sitemap/1.xml` — therapeutic area pages (priority 0.8)
- `sitemap/2.xml` — drug pages batch 1 (priority 0.6)
- `sitemap/3.xml` — drug pages batch 2 (priority 0.6)
- `sitemap/4.xml` — people pages (priority 0.5)
- `sitemap/5.xml` — investor pages (priority 0.5)
- `sitemap/6.xml` — articles (priority 0.7)

Each child sitemap stays well under the 50,000 URL limit.

### robots.txt
Verify `app/robots.ts` allows all new route prefixes: `/therapeutic-areas/`, `/drugs/`, `/people/`, `/investors/`, `/insights/`. Current config allows "/" and only disallows "/api/", so no changes needed.

---

## Implementation Order

1. **Layer 2a: Drug pages** (`/drugs/[drug-slug]`) — highest SEO value, most unique content
2. **Layer 2b: People pages** (`/people/[person-slug]`) — captures name searches
3. **Layer 1: Therapeutic area hubs** (`/therapeutic-areas/[slug]` + index) — authority anchors
4. **Layer 2c: Investor pages** (`/investors/[investor-slug]`) — high-value audience
5. **Sitemap index** — replace single sitemap with multi-sitemap architecture
6. **JSON-LD + meta tags** — structured data on all new page types

Layer 3 (articles) is a separate implementation cycle.
