# Database & Data Pipeline Foundation — Design Spec

**Date:** 2026-03-22
**Scope:** New database tables, AI sector classification, Yahoo Finance stock price backfill, daily aggregation pipeline, GitHub Actions cron
**Depends on:** Existing `companies` table (11K rows, 861 with tickers), `sectors` table (20 sectors), `company_reports` table (700+ reports)
**Does NOT cover:** Frontend changes, pricing page, company page redesign, funding rounds extraction

---

## Context

BiotechTube is pivoting from a biotech company intelligence platform to a biotech financial market tracker. The core product is now about money flow: market indices, sector performance, stock charts, and funding tracking.

This spec covers the foundational data layer that everything else depends on. No frontend work is included — this is pure database schema + data pipeline.

### Current State
- 11K companies in `companies` table with names, countries, descriptions, categories, valuations
- 861 companies have ticker symbols (Yahoo Finance format: `MRNA`, `NYKD.OL`, `ALDVI.PA`, etc.) across 37 countries
- 20 sectors defined in `sectors` table but `company_count = 0` — no companies are mapped to sectors yet
- 700+ AI-generated deep reports in `company_reports` with therapeutic areas, descriptions, and financial mentions
- Companies have a `categories` TEXT[] column with tags like "Small Molecules", "Diagnostics", "Biologics" — partial overlap with sector definitions
- `companies.valuation` is typed as `BIGINT` — needs migration to `NUMERIC` for precision
- No historical price data tables exist
- No aggregation/index tables exist
- No daily cron jobs exist

### Target State
- `companies.valuation` migrated to `NUMERIC` for floating-point market cap values
- Every company mapped to 1-3 sectors via `company_sectors` join table
- Full historical daily price data for all 861 public companies, normalized to USD
- Daily snapshots of global index, sector indices, and country indices (all in USD)
- Automated daily pipeline via GitHub Actions

---

## 1. Database Schema

### 1.0 Schema Migration on Existing Tables

**`companies.valuation`**: `ALTER COLUMN valuation TYPE NUMERIC` — required because Yahoo Finance returns floating-point market cap values, and the current `BIGINT` type would silently truncate decimals.

**`companies.total_raised`**: `ALTER COLUMN total_raised TYPE NUMERIC` — same reason, for consistency.

### 1.1 `company_sectors` (new table)

Many-to-many mapping between companies and sectors.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `company_id` | UUID | FK → companies.id ON DELETE CASCADE, NOT NULL | |
| `sector_id` | UUID | FK → sectors.id ON DELETE CASCADE, NOT NULL | |
| `is_primary` | BOOLEAN | NOT NULL, DEFAULT false | Exactly one per company |
| `confidence` | NUMERIC(3,2) | NOT NULL, CHECK (confidence >= 0 AND confidence <= 1) | 0.00–1.00, from AI classification |
| `classified_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | For tracking re-classifications |

**Primary key:** `(company_id, sector_id)`
**Indexes:**
- `sector_id` (for sector page queries)
- `company_id` (for company page sector badges)
- Partial unique index: `CREATE UNIQUE INDEX ON company_sectors (company_id) WHERE is_primary = true` — enforces exactly one primary sector per company at the database level
**RLS:** Public SELECT, service_role INSERT/UPDATE/DELETE

### 1.2 `company_price_history` (new table)

Daily OHLCV stock data per company. All monetary values stored in native currency; `market_cap_usd` used for aggregation.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `company_id` | UUID | FK → companies.id ON DELETE CASCADE, NOT NULL | |
| `date` | DATE | NOT NULL | Trading day |
| `ticker` | TEXT | NOT NULL | Denormalized for query convenience |
| `open` | NUMERIC | | Native currency |
| `high` | NUMERIC | | Native currency |
| `low` | NUMERIC | | Native currency |
| `close` | NUMERIC | | Native currency |
| `adj_close` | NUMERIC | NOT NULL | Split/dividend adjusted; primary value for charts |
| `volume` | BIGINT | | |
| `currency` | TEXT | NOT NULL, DEFAULT 'USD' | Native currency of the stock |
| `market_cap_usd` | NUMERIC | | Market cap converted to USD — used for all aggregations |
| `change_pct` | NUMERIC | | Daily % change vs previous close (pre-calculated) |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Primary key:** `(company_id, date)` — natural key, no surrogate UUID
**Indexes:**
- `(company_id, date DESC)` — chart queries (get price history for a company)
- `(date)` — daily aggregation (get all prices for a given day)
- `(date DESC, change_pct DESC NULLS LAST)` — top gainers query
- `(date DESC, change_pct ASC NULLS LAST)` — top losers query
- `ticker` — for legacy API compatibility

**RLS:** Public SELECT, service_role INSERT/UPDATE/DELETE

**Estimated size:** 861 tickers × ~15 years avg × 252 trading days = ~3.3M rows. Well within Supabase free tier (500MB).

### 1.3 `market_snapshots` (new table)

Daily global biotech index values. All monetary values in USD.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `date` | DATE | PK | Natural key |
| `total_market_cap` | NUMERIC | NOT NULL | Sum of all `market_cap_usd` values |
| `public_company_count` | INT | NOT NULL | Companies with price data on this date |
| `total_volume` | NUMERIC | | Sum of all volumes |
| `change_1d_pct` | NUMERIC | | vs previous trading day snapshot |
| `change_7d_pct` | NUMERIC | | vs nearest trading day ≤ 7 days ago |
| `change_30d_pct` | NUMERIC | | vs nearest trading day ≤ 30 days ago |
| `change_ytd_pct` | NUMERIC | | vs first trading day of current year |
| `top_gainer_id` | UUID | FK → companies.id ON DELETE SET NULL | |
| `top_gainer_pct` | NUMERIC | | |
| `top_loser_id` | UUID | FK → companies.id ON DELETE SET NULL | |
| `top_loser_pct` | NUMERIC | | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Index:** `date DESC` (latest snapshot query)
**RLS:** Public SELECT, service_role INSERT/UPDATE/DELETE

### 1.4 `sector_market_data` (new table)

Daily per-sector aggregation. All monetary values in USD.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `sector_id` | UUID | FK → sectors.id ON DELETE CASCADE, NOT NULL | |
| `date` | DATE | NOT NULL | |
| `combined_market_cap` | NUMERIC | NOT NULL | Sum of member companies' `market_cap_usd` |
| `company_count` | INT | NOT NULL | Total companies in sector |
| `public_company_count` | INT | NOT NULL | Companies with price data |
| `total_volume` | NUMERIC | | |
| `change_1d_pct` | NUMERIC | | vs previous trading day |
| `change_7d_pct` | NUMERIC | | vs nearest trading day ≤ 7 days ago |
| `change_30d_pct` | NUMERIC | | vs nearest trading day ≤ 30 days ago |
| `top_company_id` | UUID | FK → companies.id | Largest by market cap |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Primary key:** `(sector_id, date)` — natural key, no surrogate UUID
**Index:** `(sector_id, date DESC)` — sector chart queries
**RLS:** Public SELECT, service_role INSERT/UPDATE/DELETE

### 1.5 `country_market_data` (new table)

Daily per-country aggregation. All monetary values in USD.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `country` | TEXT | NOT NULL | Matches `companies.country` |
| `date` | DATE | NOT NULL | |
| `combined_market_cap` | NUMERIC | NOT NULL | Sum of `market_cap_usd` |
| `company_count` | INT | NOT NULL | Total companies in country |
| `public_company_count` | INT | NOT NULL | |
| `total_volume` | NUMERIC | | |
| `change_1d_pct` | NUMERIC | | vs previous trading day |
| `change_7d_pct` | NUMERIC | | vs nearest trading day ≤ 7 days ago |
| `change_30d_pct` | NUMERIC | | vs nearest trading day ≤ 30 days ago |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Primary key:** `(country, date)` — natural key, no surrogate UUID
**Index:** `(country, date DESC)` — country chart queries
**RLS:** Public SELECT, service_role INSERT/UPDATE/DELETE

---

## 2. Currency Normalization Strategy

**Problem:** Companies trade in 10+ currencies (USD, EUR, GBP, NOK, SEK, DKK, CHF, JPY, AUD, CAD, etc.). Summing raw market caps across currencies produces meaningless numbers.

**Solution:** Store a `market_cap_usd` column on `company_price_history`. All aggregation tables (`market_snapshots`, `sector_market_data`, `country_market_data`) sum `market_cap_usd` exclusively.

**How `market_cap_usd` is populated:**

For the **daily update** (current data):
- `yahooFinance.quote(ticker)` returns `marketCap` already in USD for most tickers (Yahoo normalizes this)
- For tickers where Yahoo returns local currency market cap, convert using `financialCurrency` and `regularMarketPrice` fields
- Store the USD-normalized value in `market_cap_usd`

For **historical backfill**:
- Yahoo's historical endpoint does not include market cap
- Strategy: fetch current `sharesOutstanding` from `yahooFinance.quoteSummary(ticker)` once per company
- Calculate historical market cap: `adj_close × shares_outstanding`
- Convert to USD using a fixed approximation: use today's exchange rate for all historical data
- This is imperfect (historical exchange rates varied) but is standard practice for historical index construction
- The alternative (fetching daily historical exchange rates for 15 currencies over 15 years) adds massive complexity for marginal accuracy improvement
- Store `shares_outstanding` on the `companies` table (new column, `BIGINT`) for reuse

**New column on `companies` table:**
- `shares_outstanding BIGINT` — fetched once during backfill, updated daily

**Exchange rate source for non-USD:**
- During backfill: use current rate from Yahoo Finance (`yahooFinance.quote('USDNOK=X')`) as a static approximation
- During daily updates: fetch live rate from Yahoo Finance for each needed currency pair
- Cache rate per currency per day (only ~10-12 unique currencies needed)

---

## 3. AI Sector Classification

### Script: `scripts/classify-sectors.ts`

**Purpose:** Map all ~11K companies to 1-3 of the 20 defined sectors using Claude API.

**Input data per company:**
- `name`, `description`, `categories[]` from `companies` table
- `therapeutic_areas[]`, `technology_platform`, `summary` from `company_reports` (if exists)

**Classification prompt strategy:**
- Send companies in batches of 50 to Claude
- System prompt includes all 20 sector definitions with slugs and descriptions
- Ask Claude to return JSON array: `[{ company_slug: string, sectors: [{ sector_slug: string, is_primary: boolean, confidence: number }] }]`
- Each company gets 1-3 sector assignments; exactly one marked `is_primary`
- Confidence threshold: only insert mappings with confidence ≥ 0.5

**Execution details:**
- Batch size: 50 companies per API call
- Delay: 500ms between calls
- ~220 API calls total
- Estimated runtime: ~5-10 minutes
- Estimated cost: ~$2-5 (input tokens are small, output is structured JSON)
- Idempotent: skips companies that already have entries in `company_sectors`
- Progress logging: prints batch number, companies classified, errors

**Error handling:**
- If Claude returns invalid JSON for a batch, log and retry once, then skip
- If a `company_slug` doesn't match any company in the batch, log and skip that entry
- If a `sector_slug` doesn't match our 20 sectors, log and skip that mapping
- Retry failed batches once before skipping
- Final summary: X companies classified, Y failed, Z total mappings created

**Post-classification update:**
- After classification completes, update `sectors` table denormalized counts:
  - `company_count` = count of companies in that sector
  - `public_company_count` = count of companies in that sector that have a ticker

---

## 4. Stock Price Backfill

### Script: `scripts/backfill-prices.ts`

**Purpose:** Fetch full historical daily price data for all 861 tickers using `yahoo-finance2`.

**Dependencies:** `yahoo-finance2` npm package (to be added)

**Process:**
1. Query all companies with non-null, non-empty `ticker` from DB
2. For each company, fetch `sharesOutstanding` via `yahooFinance.quoteSummary(ticker, { modules: ['defaultKeyStatistics'] })` — store on `companies.shares_outstanding`
3. For each company, check latest date in `company_price_history`
   - If no data: fetch from earliest available (`period1: '1990-01-01'`)
   - If has data: fetch from latest date + 1 day (incremental)
4. Call `yahooFinance.historical(ticker, { period1, period2: 'today' })`
5. Map Yahoo response to DB rows:
   - `open`, `high`, `low`, `close` from Yahoo fields
   - `adj_close` from Yahoo's `adjClose`
   - `volume` from Yahoo
   - `currency` from quote metadata (fetched once per ticker)
   - `market_cap_usd` = `adj_close × shares_outstanding × exchange_rate_to_usd`
   - `change_pct` = calculated from previous day's `adj_close` (within the fetched data)
6. Batch insert into `company_price_history` (upsert on `(company_id, date)`)

**Currency conversion during backfill:**
- Before starting, fetch current USD exchange rate for each unique currency via Yahoo Finance
- Cache as a lookup table: `{ 'NOK': 0.092, 'GBP': 1.27, 'EUR': 1.08, ... }`
- USD companies get rate = 1.0
- Apply same rate to all historical data for that ticker (approximation — see Section 2)

**Concurrency:**
- Worker pool: 5 concurrent fetches
- Delay between dispatches: 500ms
- Estimated per-ticker time: 3-8 seconds (depends on history length)
- Total estimated runtime: 60-90 minutes for full backfill

**Error handling:**
- Invalid ticker / delisted: log warning, continue
- Rate limiting: exponential backoff (1s, 2s, 4s, 8s) up to 3 retries
- Network errors: retry once, then skip and log
- Missing `sharesOutstanding`: set `market_cap_usd` to NULL for that company's rows; log warning
- Summary at end: X tickers succeeded, Y failed, Z total rows inserted

**Ticker format handling:**
- Yahoo Finance format is already used in DB (e.g., `NYKD.OL`, `ALDVI.PA`, `OXB.L`)
- No translation needed

---

## 5. Daily Update Pipeline

### Script: `scripts/daily-update.ts`

**Purpose:** Run once daily to fetch latest prices and calculate all indices/aggregations.

**Step 1: Fetch latest prices** (~5-10 min)
- Same logic as backfill but only fetches last 5 trading days (to catch any gaps from weekends/holidays)
- Upserts into `company_price_history`
- Fetches current `marketCap` (USD) and `sharesOutstanding` via `yahooFinance.quote(ticker)` for each company
- Fetches current exchange rates for all needed currencies
- Calculates `market_cap_usd` using live exchange rates
- Calculates `change_pct` from previous close
- Updates `companies.valuation` with latest USD market cap
- Updates `companies.shares_outstanding` with latest value

**Step 2: Calculate market snapshot** (~10 sec)
- Get all companies' latest `market_cap_usd` from today's `company_price_history`
- Sum → `total_market_cap`
- Count → `public_company_count`
- Sum volumes → `total_volume`
- Find top gainer: company with highest `change_pct`
- Find top loser: company with lowest `change_pct`
- Calculate % changes:
  - `change_1d_pct`: compare `total_market_cap` to nearest previous trading day's snapshot (query: `WHERE date < today ORDER BY date DESC LIMIT 1`)
  - `change_7d_pct`: compare to nearest snapshot with `date <= today - 7` (`ORDER BY date DESC LIMIT 1`)
  - `change_30d_pct`: compare to nearest snapshot with `date <= today - 30`
  - `change_ytd_pct`: compare to first snapshot where `date >= Jan 1 of current year`
- Upsert into `market_snapshots` on `date`

**Step 3: Calculate sector data** (~10 sec)
- For each sector:
  - Join `company_sectors` → `company_price_history` (latest date)
  - Sum `market_cap_usd` of member companies
  - Count companies
  - Calculate % changes using same "nearest trading day" logic as step 2
  - Find top company by `market_cap_usd`
- Upsert into `sector_market_data` on `(sector_id, date)`

**Step 4: Calculate country data** (~10 sec)
- For each country that has public companies:
  - Filter `company_price_history` (latest date) by company country
  - Sum `market_cap_usd`
  - Count companies
  - Calculate % changes using same "nearest trading day" logic
- Upsert into `country_market_data` on `(country, date)`

**Step 5: Update denormalized fields** (~5 sec)
- Update `sectors` table: `company_count`, `public_company_count`, `combined_market_cap`

**Total estimated runtime:** 8-15 minutes

---

## 6. Historical Aggregation Backfill

### Script: `scripts/backfill-aggregations.ts`

**Purpose:** After price history is backfilled, retroactively calculate historical `market_snapshots`, `sector_market_data`, and `country_market_data` so that index charts have full history from day one.

**Historical market cap approach:**
- Uses `market_cap_usd` from `company_price_history` (calculated during price backfill as `adj_close × shares_outstanding × static_usd_rate`)
- Companies without `shares_outstanding` will have NULL `market_cap_usd` and are excluded from aggregations
- This means historical indices only include companies where shares outstanding data was available
- Expected coverage: ~90%+ of public companies by market cap (large companies always have this data)

**Process:**
1. Get all distinct dates from `company_price_history`, ordered ascending
2. Process in batches of 100 dates using batch SQL (not per-day queries):
   - For each date: aggregate `market_cap_usd` across all companies → `market_snapshots`
   - For each date × sector: aggregate → `sector_market_data`
   - For each date × country: aggregate → `country_market_data`
3. After all inserts, run a second pass to calculate `change_*_pct` columns using window functions or lookback queries

**Estimated scope:** ~3,780 trading days processed in batches of 100 = ~38 batch operations. Total runtime: 5-15 minutes (batch SQL is much faster than per-day queries).

**Dependency:** Requires both `company_price_history` AND `company_sectors` to be populated first.

---

## 7. GitHub Actions Workflow

### File: `.github/workflows/daily-market-data.yml`

```yaml
name: Daily Market Data Update
on:
  schedule:
    - cron: '0 10 * * 1-5'  # 10:00 UTC weekdays (after all major markets close)
  workflow_dispatch: {}      # Manual trigger for testing
jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsx scripts/daily-update.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

**Schedule:** Weekdays only at 10:00 UTC
- US markets close at 21:00 ET (01:00-02:00 UTC)
- European markets close ~16:30 CET (15:30 UTC)
- Tokyo close: 06:00 UTC; Hong Kong close: 08:00 UTC; Shanghai close: 07:00 UTC
- 10:00 UTC catches end-of-day data for all major markets including Asia
- Yahoo Finance data typically settles within 1-2 hours of market close

**Secrets required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 8. Schema Migration Script

### File: `scripts/run-pivot-schema.ts`

Follows the existing pattern of `scripts/run-schema.ts`. Executes raw SQL against Supabase to create all 5 new tables with indexes, constraints, and RLS policies.

Also includes:
- `ALTER TABLE companies ALTER COLUMN valuation TYPE NUMERIC`
- `ALTER TABLE companies ALTER COLUMN total_raised TYPE NUMERIC`
- `ALTER TABLE companies ADD COLUMN IF NOT EXISTS shares_outstanding BIGINT`

Attaches the existing `update_updated_at()` trigger function (from `schema.sql`) to all new tables that have `updated_at` columns: `company_sectors`, `company_price_history`, `market_snapshots`, `sector_market_data`, `country_market_data`.

Idempotent: uses `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `ADD COLUMN IF NOT EXISTS`.

---

## 9. New npm Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `yahoo-finance2` | Stock price data fetching | `^2.x` |

No other new dependencies required. Claude API (`@anthropic-ai/sdk`) is already installed for sector classification.

---

## 10. Execution Order

```
1. run-pivot-schema.ts          → Creates 5 new tables + alters companies columns
2. classify-sectors.ts          → Maps 11K companies to sectors (~10 min)
3. backfill-prices.ts           → Fetches historical prices for 861 tickers (~90 min)
4. backfill-aggregations.ts     → Calculates historical indices (~15 min)
5. Set up GitHub Actions secrets
6. Enable daily-market-data.yml → Automated daily updates
```

Steps 2 and 3 can run in parallel (independent data). Step 4 depends on both 2 and 3 completing.

---

## 11. Verification

After pipeline completion, verify with these queries:

```sql
-- Sector classification coverage
SELECT COUNT(DISTINCT company_id) FROM company_sectors;
-- Expected: ~11,000

-- Primary sector constraint
SELECT company_id, COUNT(*) FROM company_sectors WHERE is_primary = true
GROUP BY company_id HAVING COUNT(*) > 1;
-- Expected: 0 rows (partial unique index enforces this)

-- Price history coverage
SELECT COUNT(DISTINCT company_id) FROM company_price_history;
-- Expected: ~861

-- Total price rows
SELECT COUNT(*) FROM company_price_history;
-- Expected: ~2-4M

-- Market cap USD coverage
SELECT COUNT(*) FROM company_price_history WHERE market_cap_usd IS NOT NULL;
-- Expected: ~90%+ of total rows

-- Market snapshots
SELECT COUNT(*) FROM market_snapshots;
-- Expected: ~3,000-4,000 (15+ years of trading days)

-- Latest global index value
SELECT date, total_market_cap, public_company_count, change_1d_pct
FROM market_snapshots ORDER BY date DESC LIMIT 1;
-- Expected: recent date, non-zero market cap

-- Sector data
SELECT s.name, smd.combined_market_cap, smd.company_count
FROM sector_market_data smd
JOIN sectors s ON s.id = smd.sector_id
WHERE smd.date = (SELECT MAX(date) FROM sector_market_data)
ORDER BY smd.combined_market_cap DESC;
-- Expected: 20 rows with non-zero market caps

-- Country data
SELECT country, combined_market_cap, public_company_count
FROM country_market_data
WHERE date = (SELECT MAX(date) FROM country_market_data)
ORDER BY combined_market_cap DESC
LIMIT 10;
-- Expected: US at top, followed by major biotech countries
```

---

## 12. Follow-up Tasks (Out of Scope for This Spec)

- **Migrate `/api/stock/route.ts`** — currently fetches live from Yahoo. After backfill, should read from `company_price_history` instead.
- **Frontend changes** — homepage dashboard, sector pages, country pages, company page simplification
- **Funding rounds extraction** from company reports
- **Real-time price streaming**
- **Authentication / subscription gating**
- **Email campaigns**
- **Pricing page updates**
- **Pipeline monitoring** — consider adding a `pipeline_runs` table or Slack webhook for failure alerts
