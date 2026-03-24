# BiotechTube Product Roadmap
## Community-Driven Biotech Product Intelligence

*Last updated: March 24, 2026*

---

## Vision
Make BiotechTube the definitive platform for discovering, tracking, and ranking biotech products — drugs, devices, and AI/ML health tools — powered by community engagement and real-world data signals.

---

## Phase 1: Product Pages (Foundation)
**Priority: CRITICAL | ETA: Now**

### 1.1 Individual Product Pages (`/product/[slug]`)
Each product gets a dedicated page showing:
- Product name + parent company (with logo + link)
- Hype Score with visual breakdown (community vs clinical vs news)
- Stage timeline visualization (Pre-clinical → Phase 1 → Phase 2 → Phase 3 → Approved)
- Mechanism of action / description
- Indications (what diseases it treats)
- All related clinical trials (NCT IDs, status, dates)
- Competing products (other drugs targeting same indication)
- Community stats (X people watching, Y views this week, trending direction)
- Parent company card with key metrics
- Watchlist button (add to collection)

### 1.2 Product View Tracking
- Create `product_views` table (product_id, user_id nullable, viewed_at, source)
- Track views on product page load
- Aggregate daily/weekly view counts for trending calculations

### 1.3 Product Slug Generation
- Generate URL-friendly slugs for all 54,699 pipeline products + 4,753 FDA approved drugs
- Add `slug` column to `pipelines` and `fda_approvals` tables
- Handle duplicates (append company name or NCT ID)

---

## Phase 2: Expand Product Universe
**Priority: HIGH | ETA: After Phase 1**

### 2.1 Unify Products Table
Create a unified `products` table that merges:
- Pipeline drugs (from `pipelines` table) — 54,699
- FDA approved drugs (from `fda_approvals` table) — 4,753
- Medical devices (new, from FDA 510(k)/PMA) — ~10,000+
- AI/ML health tools (new, from FDA AI/ML database) — ~900

Schema:
```sql
products (
  id, slug, name, description,
  product_type: 'drug' | 'device' | 'ai_ml' | 'biologic',
  company_id, company_name,
  stage, status, approval_date,
  mechanism_of_action, indications[],
  source_id (pipeline_id or fda_id or device_id),
  hype_score, view_count_7d, watchlist_count,
  trending_direction, last_scored_at
)
```

### 2.2 FDA Medical Devices Import
- Scrape FDA 510(k) database (free API)
- Scrape FDA PMA database
- Match to companies in our DB
- Focus on biotech-relevant devices (diagnostics, surgical robots, implants)

### 2.3 FDA AI/ML Health Tools Import
- Scrape FDA's AI/ML-enabled device list
- ~900 approved AI tools
- Hot category — high interest from investors and professionals

---

## Phase 3: Community-Driven Ranking System
**Priority: HIGH | ETA: After Phase 2**

### 3.1 New Hype Score Formula
Replace the current static scoring with engagement-driven scoring:

| Signal | Weight | Source |
|--------|--------|--------|
| Watchlist saves (total) | 30% | `user_watchlist` + `user_pipeline_watchlist` |
| Page views (7-day rolling) | 25% | `product_views` table |
| Clinical stage / approval | 15% | Product stage data |
| View velocity (week-over-week growth) | 15% | Calculated from view data |
| Company market cap percentile | 10% | `company_price_history` |
| News mentions (future) | 5% | News aggregation pipeline |

### 3.2 Trending Algorithm
- Compare this week's engagement to last week's
- 3x+ increase = 🔥 Trending Up
- 2x increase = 📈 Rising
- Stable = ⚡ Active
- Declining = 💤 Cooling
- Calculate daily via cron job

### 3.3 Daily Score Recalculation
- Cron script runs daily at midnight UTC
- Recalculates hype_score for all products
- Updates trending_direction
- Stores historical scores for trend charts

---

## Phase 4: Product Discovery Features
**Priority: MEDIUM | ETA: After Phase 3**

### 4.1 Competing Products
- Group products by indication/therapeutic area
- "Products also targeting [Breast Cancer]" section on product pages
- Side-by-side comparison tool

### 4.2 Product Categories/Tags
- Tag products by: therapeutic area, mechanism of action, modality (small molecule, biologic, gene therapy, etc.)
- Enable filtering by these tags on /products page

### 4.3 Product Alerts
- "Follow this product" → get notified on:
  - Phase advancement
  - FDA decision dates
  - New trial starts
  - Significant view/watchlist spikes
- Email notifications (weekly digest or real-time)

### 4.4 Product News Feed
- Aggregate news mentions for each product
- Show on product page
- Factor into hype score

---

## Phase 5: Revenue & Premium Features
**Priority: MEDIUM | ETA: After Phase 4**

### 5.1 Product Sponsorship
- Companies can "sponsor" their product listing
- Sponsored products get premium placement in search results and category pages
- Pricing: $499/month per product

### 5.2 Competitive Intelligence Reports
- AI-generated reports comparing products in the same therapeutic area
- "Gene Therapy Landscape Report" — all products, companies, stages
- Premium feature for Pro subscribers

### 5.3 API Access
- REST API for programmatic access to product data and scores
- Tier 1: 100 req/day (free)
- Tier 2: 10,000 req/day ($99/month)
- Tier 3: Unlimited ($499/month)

---

## Phase 6: Advanced Features
**Priority: LOW | ETA: Future**

### 6.1 Product Success Predictor
- ML model trained on historical trial outcomes
- "This Phase 2 drug has a 34% probability of reaching Phase 3"
- Based on: therapeutic area success rates, company track record, mechanism novelty

### 6.2 Investment Signal Dashboard
- Products with rapidly increasing hype scores
- Cross-reference with stock price movements
- "Products to Watch This Week" newsletter

### 6.3 Patent Landscape
- Link patents to specific products
- Show patent expiry dates (generic competition risk)
- Patent cliff analysis

### 6.4 Conference Tracker
- Track which products are being presented at major conferences (ASCO, AACR, JPM)
- Conference presentations = major catalysts

---

## Data Sources (All Free)

| Source | Data | Status |
|--------|------|--------|
| ClinicalTrials.gov | Pipeline drugs, trial data | ✅ 54,699 products |
| openFDA | Approved drugs | ✅ 4,753 approvals |
| FDA 510(k) | Medical devices | 🔜 Phase 2 |
| FDA AI/ML list | AI health tools | 🔜 Phase 2 |
| SEC EDGAR | IPO/offering data | ✅ 8,484 filings |
| NIH Reporter | Grant funding | ✅ 5,328 grants |
| PubMed | Scientific publications | ✅ 7,552 papers |
| USPTO | Patents | ✅ 19,171 patents |
| FierceBiotech | Funding news | ✅ 285 rounds |
| BiotechTube community | Views, watchlists | 🔜 Phase 1 |

---

## Current Database Stats

| Table | Records |
|-------|---------|
| Companies | 10,995 |
| Funding Rounds | 26,379 |
| Pipeline Products | 54,699 |
| Product Scores | 54,699 |
| Patents | 19,171 |
| Publications | 7,552 |
| FDA Approvals | 4,753 |
| **Total Data Points** | **~180,000+** |

---

## Success Metrics
- Monthly active users on product pages
- Watchlist add rate (products saved / product views)
- Return visit rate (users coming back to check products)
- Time on product pages
- Conversion: free user → Pro subscriber
- Conversion: company → claimed profile
