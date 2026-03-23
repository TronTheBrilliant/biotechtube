# BiotechTube Platform Roadmap

> The Bloomberg Terminal for Biotech — financial data + professional network + market intelligence.

## Mission
1. Financially measure the global biotech market
2. Become the hub for biotech professionals and biotech investors

---

## Phase 1: Data Foundation (Tier 1 Enrichment)
**Status: NEXT UP**
**Effort: 1-2 hours (DeepSeek batch scripts)**

Enrich all 10,995 companies with basic data:

- [ ] **Categories/therapeutic areas** — 5,356 companies missing (51% gap)
- [ ] **Descriptions** — 1,580 companies missing (14% gap)
- [ ] **City/HQ location** — 10,761 companies missing (98% gap)
- [ ] **Founded year** — 9,802 companies missing (89% gap)
- [ ] **Stage** (Pre-clinical → Approved) — estimate from pipeline data
- [ ] **Company type** (Public/Private) — verify and fill gaps
- [ ] **Employee range** — estimate for well-known companies

### Scripts needed:
- `scripts/enrich-tier1-deepseek.ts` — batch enrich categories, description, city, founded
- Process in batches of 10 companies per API call
- ~1,100 API calls for 10,995 companies

---

## Phase 2: Pipeline Data (Biggest Differentiator)
**Status: PLANNED**
**Effort: 3-5 hours**

Create a comprehensive drug/product pipeline database.

### Database schema:
```sql
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  product_name TEXT NOT NULL,
  indication TEXT,                    -- e.g. "Non-small cell lung cancer"
  therapeutic_area TEXT,              -- e.g. "Oncology"
  stage TEXT,                         -- "Discovery", "Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 3", "Filed", "Approved"
  mechanism_of_action TEXT,           -- e.g. "PD-1 inhibitor"
  molecule_type TEXT,                 -- e.g. "Small molecule", "Antibody", "Cell therapy"
  partner TEXT,                       -- collaboration partner if any
  start_date TEXT,                    -- when this stage started
  expected_completion TEXT,           -- estimated completion
  description TEXT,
  source TEXT,                        -- "DeepSeek estimate", "Public data", etc.
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Data sourcing:
- [ ] DeepSeek enrichment for 861 public companies (known pipelines)
- [ ] Extend to top 2,000 private companies with known products
- [ ] Cross-reference with existing `/pipeline` page data
- [ ] Build pipeline detail pages at `/drugs/[slug]`

### UI:
- [ ] Company page pipeline section (table of products + stages)
- [ ] Global pipeline tracker at `/pipeline` (filterable by stage, indication, company)
- [ ] Pipeline statistics on homepage
- [ ] "Pipeline alerts" feature (Phase 6)

---

## Phase 3: Funding History (Investor Intelligence)
**Status: PLANNED**
**Effort: 3-4 hours**

Move funding data from JSON files into a proper database table.

### Database schema:
```sql
CREATE TABLE funding_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  round_type TEXT NOT NULL,           -- "Seed", "Series A", "Series B", etc.
  amount BIGINT,                      -- in USD
  currency TEXT DEFAULT 'USD',
  date TEXT,                          -- YYYY-MM-DD
  lead_investor TEXT,
  co_investors TEXT[],                -- array of investor names
  pre_money_valuation BIGINT,
  post_money_valuation BIGINT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT,                          -- "VC", "PE", "Corporate", "Government", "Angel"
  website TEXT,
  description TEXT,
  aum BIGINT,                         -- assets under management
  focus_areas TEXT[],
  notable_investments TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Data sourcing:
- [ ] Import existing 246 rounds from `funding-historical.json`
- [ ] DeepSeek enrichment for public companies' IPO/funding history
- [ ] Enrich top 1,000 private companies with known funding rounds
- [ ] Calculate `total_raised` per company from rounds
- [ ] Build investor profiles from round data

### UI:
- [ ] Company page funding timeline
- [ ] Investor detail pages with portfolio breakdown
- [ ] Funding analytics dashboard
- [ ] Quarterly funding trend charts (already built, will use real DB data)

---

## Phase 4: Private Company Valuations
**Status: PLANNED**
**Effort: 2-3 hours**

Estimate valuations for private companies.

### Methodology:
1. **Post-money from last round** — if we know the last funding round amount and type, estimate post-money:
   - Seed: amount × 5-8x
   - Series A: amount × 3-5x
   - Series B: amount × 2-3x
   - Series C+: amount × 1.5-2x
2. **Revenue multiple** — for companies with known revenue (rare for pre-revenue biotech)
3. **Comparable analysis** — compare to similar public companies by stage/indication
4. **Total raised proxy** — total_raised × 3-5x as rough estimate

### Implementation:
- [ ] Script to calculate estimated valuations from funding_rounds
- [ ] Flag all estimates with `is_estimated: true`
- [ ] Show "Est." badge on estimated valuations in UI
- [ ] Recalculate when new funding data is added

---

## Phase 5: User System & Authentication
**Status: PLANNED**
**Effort: 4-6 hours**

Build user accounts using Supabase Auth.

### Features:
- [ ] **Sign up / Sign in** — email + password, Google OAuth, LinkedIn OAuth
- [ ] **User profiles** — name, role, company, bio
- [ ] **Watchlists** — save companies to personal watchlists
  - Multiple named watchlists ("My Portfolio", "Competitors", "Pipeline Watch")
  - Email alerts when watched companies have news/funding/pipeline updates
- [ ] **Premium tiers**:
  - Free: basic access, limited company views, no API
  - Pro ($29/mo): unlimited access, watchlists, pipeline alerts, export
  - Enterprise ($199/mo): API access, custom reports, team features

### Database schema:
```sql
-- Extend existing profiles table
ALTER TABLE profiles ADD COLUMN role TEXT;
ALTER TABLE profiles ADD COLUMN company TEXT;
ALTER TABLE profiles ADD COLUMN bio TEXT;
ALTER TABLE profiles ADD COLUMN tier TEXT DEFAULT 'free'; -- 'free', 'pro', 'enterprise'
ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;

CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL DEFAULT 'My Watchlist',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(watchlist_id, company_id)
);
```

### Payment:
- [ ] Stripe integration for subscriptions
- [ ] Pricing page (exists, needs real payment flow)
- [ ] Trial period (14 days free Pro)

---

## Phase 6: Advanced Features
**Status: FUTURE**

### Company Comparison Tool
- [ ] Side-by-side comparison of 2-3 companies
- [ ] Compare: valuation, pipeline, funding, team size, stage
- [ ] Shareable comparison URLs

### Pipeline Tracker Alerts
- [ ] "Notify me when Company X advances to Phase 3"
- [ ] Email digest: weekly pipeline updates for watched companies
- [ ] Push notifications (web)

### Sector Reports (AI-Generated)
- [ ] Weekly AI-generated sector summaries using DeepSeek
- [ ] Market trends, notable moves, funding highlights
- [ ] Delivered via email to Pro subscribers
- [ ] Published on `/news` page

### API Access (Enterprise)
- [ ] RESTful API for programmatic data access
- [ ] API keys management
- [ ] Rate limiting (100 req/min free, 10,000 req/min enterprise)
- [ ] Endpoints: companies, pipelines, funding, market data
- [ ] OpenAPI/Swagger documentation

### News Aggregation
- [ ] Aggregate biotech news from RSS feeds (BioPharma Dive, STAT News, FierceBiotech)
- [ ] AI-powered ranking and summarization via DeepSeek
- [ ] Trending news on homepage
- [ ] Company-specific news on company pages

### Events System
- [ ] Real events data from conference APIs (BIO, ASCO, AACR, JPM Healthcare)
- [ ] Event detail pages with agenda, speakers, exhibitors
- [ ] "Attending" feature for users
- [ ] Calendar integration (Google Calendar, iCal export)

### Job Board
- [ ] Companies can post jobs
- [ ] Users can set job alerts by role type, location, therapeutic area
- [ ] Integration with LinkedIn job posts
- [ ] Revenue stream: sponsored job listings

### Science Papers Ranking
- [ ] PubMed API integration for citation data
- [ ] Semantic Scholar API for impact metrics
- [ ] Top 100 all-time papers ranking
- [ ] Company-linked research (papers by company researchers)

---

## Phase 7: Growth & Monetization
**Status: FUTURE**

### Sponsor System
- [ ] Self-serve sponsor dashboard
- [ ] Sponsor placements: search overlay, sector pages, country pages, homepage
- [ ] Analytics: impressions, clicks, CTR
- [ ] Pricing tiers: $500/mo (basic), $2,000/mo (premium), $5,000/mo (enterprise)

### SEO
- [ ] Proper meta descriptions for all pages
- [ ] Open Graph images (auto-generated per page)
- [ ] Structured data (JSON-LD) for companies, people, events
- [ ] Sitemap optimization
- [ ] Blog/content marketing for organic traffic

### Analytics
- [ ] Track page views, search queries, popular companies
- [ ] User behavior analytics (what do investors look at?)
- [ ] A/B testing framework
- [ ] Monthly growth reports

---

## Current Status (March 2026)

### Completed:
- [x] Core platform with 10,995 companies
- [x] Market data pipeline (daily updates from Yahoo Finance)
- [x] TradingView charts (markets, sectors, countries, companies)
- [x] Homepage redesign with 14 list-driven sections
- [x] Dedicated ranking pages (trending, top companies, sectors, countries, investors, people)
- [x] Country detail pages with market cap charts
- [x] Sector detail pages with charts and descriptions
- [x] Search overlay with trending + sponsored sections
- [x] Company website enrichment (100% coverage)
- [x] Funding ecosystem (246 rounds, quarterly chart)
- [x] ISR caching for performance
- [x] Mobile optimization
- [x] Global padding consistency

### Database Coverage:
| Field | Coverage |
|-------|----------|
| Website/Logo/Domain | 100% |
| Description | 86% |
| Categories | 51% |
| Founded | 11% |
| City | 2% |
| Employees | 1% |
| Total Raised | 0% |
| Pipeline Products | 0% |

### Next Up:
1. Phase 1: Tier 1 enrichment (categories, descriptions, city, founded)
2. Phase 2: Pipeline data
3. Phase 3: Funding history in DB
4. Phase 5: User system + watchlists
