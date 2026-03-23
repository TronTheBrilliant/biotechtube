# Frontend Market Pivot — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** Transform BiotechTube's frontend from hardcoded demo data to real market data from the database.

**Architecture:** Server components fetch from Supabase directly. Client components handle interactivity. Recharts for charts. Consistent number formatting utility.

**Tech Stack:** Next.js 14 App Router, Supabase, Recharts, TypeScript

---

## Phase 1: Markets Page + API Routes + Formatting

### Task 1: Create number formatting utility

**Files:**
- Create: `lib/market-utils.ts`

- [ ] Create `lib/market-utils.ts` with these functions:
  - `formatMarketCap(value: number): string` — formats as $12.9T / $842B / $1.2M / $450K
  - `formatVolume(value: number): string` — formats as 2.5B / 142M / 8.3K
  - `formatPercent(value: number | null): string` — formats as +3.21% / -0.54% / —
  - `formatCompactCurrency(value: number): string` — same as market cap but without $ prefix
- [ ] Commit

### Task 2: Create market data API routes

**Files:**
- Create: `app/api/market/snapshot/route.ts`
- Create: `app/api/market/sectors/route.ts`
- Create: `app/api/market/countries/route.ts`

- [ ] `GET /api/market/snapshot` — accepts `?days=365` query param
  - Fetches from `market_snapshots` table, ordered by snapshot_date desc
  - Returns: `{ latest: MarketSnapshot, history: MarketSnapshot[] }`
  - Default: latest + 365 days of history
  - Uses service role key from env

- [ ] `GET /api/market/sectors` — no params needed
  - Fetches latest date from `sector_market_data`, then all sectors for that date
  - Joins with `sectors` table for name, slug, description
  - Returns: `{ date: string, sectors: SectorData[] }`
  - Sorted by combined_market_cap descending

- [ ] `GET /api/market/countries` — no params needed
  - Fetches latest date from `country_market_data`, then all countries for that date
  - Returns: `{ date: string, countries: CountryData[] }`
  - Sorted by combined_market_cap descending

- [ ] Commit

### Task 3: Rewrite markets page with real data

**Files:**
- Rewrite: `app/markets/page.tsx` — convert to server component that fetches data
- Create: `app/markets/MarketsPageClient.tsx` — client component with charts and interactivity

- [ ] `app/markets/page.tsx` (server component):
  - Fetches latest market snapshot from Supabase
  - Fetches latest sector data for all 20 sectors
  - Fetches latest country data
  - Fetches recent 30 days of snapshots for initial chart
  - Passes all data as props to MarketsPageClient

- [ ] `app/markets/MarketsPageClient.tsx` (client component):
  - **Stats strip**: Total Market Cap, 1D Change, 7D Change, 30D Change, Public Companies, Total Volume — all from real snapshot data
  - **Main chart**: Historical total market cap as area chart
    - Timescale selector: 1Y, 3Y, 5Y, 10Y, Max
    - Fetches more history from `/api/market/snapshot?days=N` on timescale change
    - Shows absolute value + percentage change for selected period
  - **Sector performance table**: All 20 sectors in a table/grid
    - Columns: Sector name, Market Cap, 1D %, 7D %, 30D %, Companies
    - Rows link to `/sectors/[slug]` (future phase)
    - Sorted by market cap descending
    - Color-coded percentage changes (green positive, red negative)
  - **Country performance table**: Top countries
    - Columns: Country (with flag), Market Cap, 1D %, 7D %, Companies
    - Sorted by market cap descending
  - **Top movers**: Top gainer and top loser from snapshot data
    - Links to company pages

- [ ] Commit

### Task 4: Update homepage with real market data

**Files:**
- Modify: `app/page.tsx` — add market snapshot fetch
- Modify: `components/IndexCards.tsx` — accept real data as props
- Modify hero text/pills

- [ ] `app/page.tsx`:
  - Fetch latest market_snapshot from Supabase (server-side)
  - Pass snapshot data to IndexCards as props
  - Update hero: "Global Biotech Intelligence." → "The Biotech Market Tracker."
  - Update subtitle to mention market data
  - Update feature pills: market cap, public companies, sectors tracked, countries

- [ ] `components/IndexCards.tsx`:
  - Accept `snapshot` prop with real market data
  - Card 1: Global Market Cap from snapshot.total_market_cap
  - Card 2: 24h Change from snapshot.change_1d_pct
  - Card 3: Public Companies from snapshot.public_companies_count
  - Card 4: Total Volume from snapshot.total_volume
  - Remove hardcoded values
  - Sparkline data: fetch last 30 days of snapshots for mini charts

- [ ] Uncomment IndexCards in page.tsx

- [ ] Commit

### Task 5: Create sector pages

**Files:**
- Create: `app/sectors/page.tsx` — server component, sector overview
- Create: `app/sectors/SectorsPageClient.tsx` — client component
- Create: `app/sectors/[slug]/page.tsx` — server component, individual sector
- Create: `app/sectors/[slug]/SectorDetailClient.tsx` — client component

- [ ] `/sectors` overview page:
  - Fetches all sectors from `sectors` table
  - Fetches latest sector_market_data for all sectors
  - Displays 20 sector cards in a grid (4 cols desktop, 2 mobile)
  - Each card: sector name, market cap, 1D/7D change %, public company count
  - Cards link to `/sectors/[slug]`

- [ ] `/sectors/[slug]` detail page:
  - Fetches sector info from `sectors` table
  - Fetches recent sector_market_data for chart (last 365 days)
  - Fetches top companies in sector via company_sectors join
  - Shows: hero with sector name/description, historical market cap chart, company list ranked by market cap
  - generateStaticParams from sectors table

- [ ] Add "Sectors" to navigation (Nav.tsx)

- [ ] Commit

### Task 6: Add stock charts to company pages

**Files:**
- Create: `app/api/market/company/[id]/history/route.ts`
- Modify: `app/company/[slug]/CompanyPageClient.tsx` — add stock chart section

- [ ] API route for company price history:
  - `GET /api/market/company/[id]/history?days=365`
  - Fetches from company_price_history
  - Returns: `{ history: PricePoint[] }`

- [ ] Add stock chart to company detail page:
  - Show price chart (adj_close over time) with timescale selector
  - Key stats row: Market Cap, Volume, Daily Change %, 52-week range
  - Only shown for companies with ticker (public companies)
  - Sector badges from company_sectors

- [ ] Commit

### Task 7: Build verification

- [ ] Run `npx tsc --noEmit` — fix any TypeScript errors
- [ ] Run `npm run build` — fix any build errors
- [ ] Verify markets page renders with real data
- [ ] Verify homepage index cards show real data
- [ ] Verify sector pages work
- [ ] Verify company stock charts work
- [ ] Commit any fixes
