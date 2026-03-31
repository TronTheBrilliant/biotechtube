# BiotechTube Product Roadmap

> The Bloomberg Terminal for Biotech — financial data + professional network + market intelligence.

## Mission
1. Financially measure the global biotech market
2. Become the hub for biotech professionals and biotech investors

---

## Completed

### Core Platform
- [x] 11,000+ biotech company profiles across 30+ countries
- [x] 1,039 public companies with daily stock price updates (Yahoo Finance)
- [x] TradingView financial charts (markets, sectors, countries, companies)
- [x] Homepage with 14+ data-driven sections
- [x] Global search overlay with trending + sponsored
- [x] 20 therapeutic sector pages with market data
- [x] 30+ country pages with market data
- [x] Trending companies, top companies, top investors pages
- [x] Mobile-optimized across all pages
- [x] Dark mode support

### Pipeline Intelligence
- [x] 54,699 pipeline drugs from ClinicalTrials.gov
- [x] 4,753 FDA-approved drugs
- [x] Individual product pages at `/product/[slug]`
- [x] FDA decision calendar with PDUFA dates
- [x] Curated watchlists with AI analysis ("BiotechTube 100")
- [x] Interest/hype scoring engine
- [x] Rich pipeline filtering (stage, region, therapeutic area)

### Funding Ecosystem
- [x] 26,379 funding rounds in database
- [x] Funding tracker with interactive charts (annual, quarterly, monthly)
- [x] Top investors ranking
- [x] Round type distribution visualization
- [x] Funding radar on homepage

### Research Data
- [x] 19,171 patents (USPTO)
- [x] 7,552 publications (PubMed)
- [x] 5,328 NIH grants
- [x] Company-linked research data

### Content & SEO
- [x] 32+ blog articles (AI-generated, fact-checked)
- [x] Full SEO: meta tags, JSON-LD, sitemap, canonical URLs, OG images
- [x] News feed from database
- [x] TradingView chart embeds in articles

### User Features
- [x] Authentication (Supabase Auth)
- [x] User dashboard with auth guard
- [x] Company claim/verification flow
- [x] Company management dashboard (jobs, branding, media, pipeline, team)
- [x] Watchlists (save companies and products)
- [x] Tiered company profiles (basic → enhanced → premium)
- [x] Social feed (posts, comments, likes, follows, notifications)

### Admin & Automation
- [x] 6 AI agents (profiles, financial, pipeline, content, SEO, UX)
- [x] Command Center admin dashboard
- [x] Data quality monitoring
- [x] CIA system (Continuous Improvement Agent)
- [x] Daily cron jobs for market data + agent execution

### Monetization (Partially)
- [x] Pricing page with tier descriptions
- [x] Stripe checkout flow (stubbed)
- [x] Pitches, sponsors, templates pages
- [x] Company profile upgrade tiers ($150-300/mo)

---

## In Progress

### Data Enrichment (March 2026)
- [x] Two-pass enrichment pipeline designed (DeepSeek + Claude)
- [ ] **Running:** Fill categories, descriptions, city, founded for all companies
- [ ] Verify enrichment quality and fix failures

### Database Coverage Targets
| Field | Current | Target |
|-------|---------|--------|
| Website/Logo | 100% | 100% |
| Description | 86% | 99%+ |
| Categories | 51% | 95%+ |
| Founded year | 11% | 80%+ |
| City/HQ | 2% | 80%+ |

---

## Next Up

### Data Infrastructure
- [ ] **Normalize investors** — create proper `investors` table from TEXT[] arrays
- [ ] **Pipeline schema enrichment** — add molecule_type, therapeutic_area, partner columns
- [ ] **Sync total_raised** — calculate from funding_rounds → companies table
- [ ] **Stripe webhooks** — real webhook verification + plan change handling

### Private Company Valuations
- [ ] Estimate valuations from funding data (post-money multiples)
- [ ] Flag all estimates with `is_estimated: true`
- [ ] Show "Est." badge on estimated valuations in UI

---

## Planned Features

### Company Comparison Tool
- [ ] Side-by-side comparison of 2-3 companies
- [ ] Compare: valuation, pipeline, funding, team size, stage
- [ ] Shareable comparison URLs

### Pipeline Alerts
- [ ] "Notify me when Company X advances to Phase 3"
- [ ] Weekly pipeline update digest for watched companies
- [ ] Push notifications (web)

### AI Sector Reports
- [ ] Weekly AI-generated sector summaries
- [ ] Market trends, notable moves, funding highlights
- [ ] Delivered via email to Pro subscribers

### API Access (Enterprise)
- [ ] RESTful API with company, pipeline, funding endpoints
- [ ] API key management + rate limiting
- [ ] OpenAPI/Swagger documentation

### Newsletter Automation
- [ ] Weekly digest: top funding rounds, pipeline updates, new companies
- [ ] AI-curated with real data
- [ ] Signup in nav and sidebar

### Job Board
- [ ] Companies post jobs
- [ ] Job alerts by role, location, therapeutic area
- [ ] Revenue stream: sponsored listings

### Events System
- [ ] Real conference data (BIO, ASCO, AACR, JPM)
- [ ] "Attending" feature for users
- [ ] Calendar integration

---

## Growth & Monetization

### Sponsor System
- [ ] Self-serve sponsor dashboard with analytics
- [ ] Placements: search overlay, sector pages, country pages, homepage
- [ ] Tiers: $500/mo (basic), $2,000/mo (premium), $5,000/mo (enterprise)

### Revenue Targets
| Stream | Price | Status |
|--------|-------|--------|
| User subscriptions | $49/mo | Pricing page live, Stripe pending |
| Company profile upgrades | $150-300/mo | Claim flow live, payment pending |
| Pitches | $800-2,500 | Page live, payment pending |
| Sponsorships | $500-4,000/mo | Page live, inquiries open |
| Website templates | $2,500-5,000 | Page live, inquiries open |
| API access | $200-500/mo | Planned |

---

## Technical Debt

- [ ] Fix TypeScript build errors (currently ignored)
- [ ] Stripe webhook implementation (stubbed)
- [ ] Remove JSON file fallbacks (fully rely on Supabase)
- [ ] Optimize ISR revalidation intervals
- [ ] Clean up duplicate investor data model (TEXT[] vs table)

---

*Last updated: March 31, 2026*
