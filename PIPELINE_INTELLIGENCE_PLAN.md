# Pipeline Intelligence System — Build Plan

## Vision
Make BiotechTube the go-to platform for discovering promising biotech pipeline programs, segmented by company size, powered by real news data, and curated by intelligent agents.

---

## Phase 1: News-Powered Drug Ranking Engine (Foundation)

### 1.1 Daily News Scraper Enhancement
- Enhance `scripts/scrape-biotech-news.ts` to run daily
- Track drug/product mentions per news article
- Create `drug_mentions` table: drug_name, pipeline_id, source, article_title, date
- Count mentions per drug per week = "news velocity"

### 1.2 Drug Interest Score (replaces hype score)
New scoring formula based on REAL signals:
```
Interest Score (0-100) =
  News Velocity (30%): mentions this week vs average
  Clinical Stage (20%): Phase 3 = 20, Phase 2 = 12, Phase 1 = 6
  Trial Activity (15%): Recruiting = 15, Active = 10, Completed = 5
  Company Health (15%): Market cap percentile
  Recency (10%): Days since last news mention
  Community (10%): View count + watchlist saves (real data)
```

### 1.3 Recalculate scores daily via cron

---

## Phase 2: Market-Cap Segmented Watchlists

### 2.1 Three flagship curated lists:

**🔬 Small-Cap Pipeline Watch** (companies < $1B)
- The "hidden gems" list — most actionable for investors
- 25 drugs from small companies with Phase 2+ data
- Subtitle: "Early-stage companies with breakthrough potential"

**📊 Mid-Cap Catalyst Watch** ($1B - $10B)
- "Emerging pharma" with multiple pipeline programs
- 25 drugs with near-term catalysts
- Subtitle: "Growing companies approaching inflection points"

**🏛️ Big Pharma Pipeline** ($10B+)
- Industry landscape — what the giants are building
- 25 drugs showing where the industry is heading
- Subtitle: "Where the world's largest pharma companies are investing"

### 2.2 Sector-specific watchlists:
- 🧬 Oncology Pipeline Watch
- 🧠 Neuroscience Pipeline Watch
- 💊 Rare Disease Pipeline Watch
- 🔬 Gene & Cell Therapy Watch
- 💉 GLP-1 & Metabolic Watch

### 2.3 Database: `curated_watchlists` table
```sql
curated_watchlists (
  id, name, slug, description, icon,
  category (size|sector),
  market_cap_min, market_cap_max,
  therapeutic_filter,
  updated_at
)

curated_watchlist_items (
  id, watchlist_id, pipeline_id,
  rank, reason, added_at
)
```

---

## Phase 3: PDUFA Date Tracker (FDA Decision Calendar)

### 3.1 Scrape FDA PDUFA dates
- Source: FDA website + biotech news
- Create `fda_calendar` table: drug_name, company, pdufa_date, decision_type, pipeline_id
- Show countdown to each decision

### 3.2 UI: "Upcoming FDA Decisions" section
- On homepage (next 3 decisions)
- On pipeline page (full calendar view)
- On company pages (their upcoming FDA dates)
- Countdown timer: "FDA decision in 14 days"

---

## Phase 4: Enhanced Pipeline Page UX

### 4.1 Pipeline page redesign
Three tabs at top:
- **Curated Lists** (default) — BiotechTube's watchlists
- **FDA Calendar** — Upcoming decisions
- **Browse All** — Full 54K database with filters

### 4.2 Curated Lists tab layout:
```
┌────────────────────────────────────────┐
│ 🔬 Small-Cap Pipeline Watch           │
│ "Hidden gems with breakthrough..."     │
│ Updated March 2026 · 25 programs      │
│                                        │
│ 1. Drug X (CompanyA) · Phase 3        │
│    Indication · Interest: 87/100      │
│    "Recently showed positive..."       │
│    [View Analysis →] [♡ Watch]        │
│                                        │
│ 2. Drug Y (CompanyB) · Phase 2        │
│    ...                                 │
├────────────────────────────────────────┤
│ 📊 Mid-Cap Catalyst Watch             │
│ ...                                    │
├────────────────────────────────────────┤
│ 🏛️ Big Pharma Pipeline               │
│ ...                                    │
├────────────────────────────────────────┤
│ 🧬 SECTOR WATCHES                     │
│ [Oncology] [Neuroscience] [Rare...]   │
└────────────────────────────────────────┘
```

### 4.3 FDA Calendar tab:
```
┌────────────────────────────────────────┐
│ 📅 FDA Decision Calendar              │
│                                        │
│ APR 15  DrugName (Company)  ⏰ 18 days│
│         Indication · PDUFA date       │
│                                        │
│ MAY 02  DrugName (Company)  ⏰ 35 days│
│         ...                            │
└────────────────────────────────────────┘
```

---

## Phase 5: Product Page Enhancement

### 5.1 For ALL pipeline pages:
- View count (real, tracked via product_views)
- Watchlist count (real, from user_pipeline_watchlist)
- "X people watching this drug" social proof
- Interest Score badge (0-100)

### 5.2 For FEATURED drugs (in curated lists):
- "BiotechTube Pick" badge
- Why we're watching (editorial reason)
- Full analysis section
- Competitive landscape
- Key facts sidebar
- Which curated list(s) it appears in

### 5.3 Historical context section:
- "What happened to similar drugs?"
- Show 5 comparable drugs (same indication + phase) and their outcomes
- "4 of 7 similar drugs were approved. Average timeline: 18 months."

---

## Phase 6: Homepage Integration

### 6.1 Replace current "Pipelines to Watch" with:
- Show top 5 from Small-Cap Pipeline Watch (most actionable)
- "View all curated lists →" button
- Next upcoming FDA decision with countdown

### 6.2 Add "FDA Decision This Week" alert banner
- If a PDUFA date is within 7 days, show a subtle banner

---

## Phase 7: Alert System (Premium Feature)

### 7.1 Pipeline alerts for Pro users:
- "Drug X advanced from Phase 2 to Phase 3"
- "FDA decision on Drug Y is in 7 days"
- "Drug Z received Breakthrough Therapy designation"
- "Company A's stock moved +15% (pipeline catalyst)"

### 7.2 Implementation:
- `user_alerts` table with preferences
- Daily check script compares current state vs previous
- Email notification via Supabase Edge Function or external service

---

## Execution Order

| Step | Task | Time | Dependencies |
|------|------|------|-------------|
| 1 | News scraper enhancement + drug mentions | 30 min | None |
| 2 | Interest Score calculation | 20 min | Step 1 |
| 3 | Curated watchlists DB + generation | 40 min | Step 2 |
| 4 | Pipeline page redesign (3 tabs) | 45 min | Step 3 |
| 5 | PDUFA date scraping + calendar | 30 min | None (parallel) |
| 6 | Product page enhancements | 30 min | Step 3 |
| 7 | Homepage integration | 15 min | Steps 4, 5 |
| 8 | Full app revision + polish | 30 min | All above |

**Total estimated: ~4 hours**

---

## Quality Standards
- All data must come from verifiable sources
- No fake counts — real engagement only
- Rankings must be explainable (show why a drug scored high)
- Mobile-first design for all new UI
- Dark mode compatible
- Fast loading (ISR caching)
