# BiotechTube News Engine — Design Spec

**Date:** 2026-04-08
**Status:** Approved
**Approach:** Article Engine as a Service Layer (Approach 2)

---

## Overview

Build a full-stack news engine that transforms BiotechTube from a market data platform into a biotech intelligence publication. The engine auto-generates 5-10 magazine-quality articles per day across 6 content types, with a confidence-based publishing system, built-in admin editor, branded imagery, and SEO optimization.

**Design principles:**
- DRY: article types are configurations, not separate codepaths
- Forbes-meets-Endpoints editorial voice as baseline
- Near-zero cost ($0.03/article via DeepSeek + free manual image generation)
- No breaking changes during build — old routes/tables stay live until cutover

**Implementation phasing (must be built today):**

- **Phase A (this session):** Database migration, article engine core with `funding_deal` and `breaking_news` types, simplified article page (render JSONB blocks), orchestrator cron, confidence scoring, branded placeholder component, SEO, homepage integration.
- **Phase B (next session):** Admin editor with TipTap, all custom block types, regeneration, image upload workflow.
- **Phase C (follow-up):** Remaining 4 article types (`clinical_trial`, `market_analysis`, `company_deep_dive`, `weekly_roundup`), News Hub redesign, RSS feed output, data migration from old tables.

Phase A is the target for today. Phases B and C follow in subsequent sessions.

---

## 1. Data Model

### New `articles` table

Replaces `funding_articles`, `blog_posts`, and `news_items` for all new content. Old tables remain untouched during development.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key (gen_random_uuid) |
| slug | TEXT UNIQUE | URL path segment |
| type | TEXT NOT NULL | `funding_deal`, `clinical_trial`, `market_analysis`, `company_deep_dive`, `weekly_roundup`, `breaking_news` |
| status | TEXT NOT NULL DEFAULT 'draft' | `draft`, `in_review`, `published`, `archived` |
| confidence | TEXT NOT NULL DEFAULT 'medium' | `high`, `medium`, `low` |
| headline | TEXT NOT NULL | Main title |
| subtitle | TEXT | Key insight / deck head |
| body | JSONB NOT NULL | TipTap-compatible block structure |
| summary | TEXT | 2-3 sentence summary for cards and SEO |
| hero_image_url | TEXT | Uploaded hero image (nullable) |
| hero_image_prompt | TEXT | AI-generated prompt for manual image creation |
| hero_placeholder_style | JSONB | `{pattern, accentColor, icon}` for CSS placeholder |
| sources | JSONB DEFAULT '[]' | Array of `{name, url, date}` |
| company_id | UUID REFERENCES companies(id) | Primary company (nullable) |
| company_ids | UUID[] DEFAULT '{}' | All companies mentioned |
| sector | TEXT | Primary sector |
| article_style | TEXT | `investor_lens`, `science_lens`, `market_analyst`, `editorial_narrative`, `deal_spotlight`, `data_digest` |
| metadata | JSONB DEFAULT '{}' | Type-specific data (funding amount, trial ID, etc.) |
| seo_title | TEXT | Override for meta title |
| seo_description | TEXT | Override for meta description |
| reading_time_min | INT | Estimated read time |
| published_at | TIMESTAMPTZ | When it went live |
| created_at | TIMESTAMPTZ DEFAULT now() | When AI generated it |
| updated_at | TIMESTAMPTZ DEFAULT now() | Last edit |
| edited_by | TEXT DEFAULT 'ai' | `ai`, `human`, `ai+human` |

**Indexes:**
- `idx_articles_slug` on `slug` (unique)
- `idx_articles_type_status` on `(type, status)`
- `idx_articles_published_at` on `published_at DESC`
- `idx_articles_company_id` on `company_id`
- `idx_articles_confidence` on `confidence`

**RLS:** Service role for writes (cron/admin), anon key for reads (published only).

### TipTap Block Structure (body JSONB)

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Opening paragraph..." }]
    },
    {
      "type": "companyCard",
      "attrs": { "companyId": "uuid-here" }
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "The Deal" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "More analysis..." }]
    },
    {
      "type": "pullQuote",
      "attrs": { "content": "This is the largest oncology Series B of 2026" }
    },
    {
      "type": "chartEmbed",
      "attrs": { "companyId": "uuid", "chartType": "price_history", "period": "6m" }
    },
    {
      "type": "pipelineTable",
      "attrs": { "companyId": "uuid" }
    }
  ]
}
```

**Custom block types:**
- `companyCard` — Live company data (logo, market cap, price change, sector)
- `chartEmbed` — Stock price, funding history, or sector comparison chart
- `pipelineTable` — Drug pipeline table from `pipelines` table
- `pullQuote` — Styled quote callout
- `dataCallout` — Key statistic with label (e.g., "$2.1B market cap")
- `competitorTable` — Side-by-side company comparison
- `image` — Uploaded or placeholder image with caption

### Metadata JSONB by Article Type

**funding_deal:**
```json
{
  "amount_usd": 150000000,
  "round_type": "Series C",
  "lead_investor": "Flagship Pioneering",
  "investors": ["Flagship Pioneering", "ARCH Venture Partners"],
  "funding_round_id": "uuid",
  "deal_size_category": "growth"
}
```

**clinical_trial:**
```json
{
  "trial_id": "NCT00123456",
  "phase": "Phase 3",
  "indication": "Non-small cell lung cancer",
  "drug_name": "Drug-XYZ",
  "result": "positive",
  "endpoint_met": true
}
```

**market_analysis:**
```json
{
  "sector_id": "uuid",
  "period": "Q1 2026",
  "market_cap_change_pct": 12.5,
  "top_movers": ["company-uuid-1", "company-uuid-2"]
}
```

**company_deep_dive:**
```json
{
  "is_sponsored": false,
  "sponsor_label": null,
  "coverage_depth": "full"
}
```

**weekly_roundup:**
```json
{
  "week_start": "2026-04-01",
  "week_end": "2026-04-07",
  "funding_count": 12,
  "trial_count": 5,
  "fda_count": 2,
  "total_funding_usd": 890000000
}
```

**breaking_news:**
```json
{
  "original_source_name": "GlobeNewswire",
  "original_source_url": "https://...",
  "original_published_at": "2026-04-08T14:00:00Z"
}
```

---

## 2. Article Engine Architecture

### Directory Structure

```
lib/article-engine/
├── index.ts              — Main entry: ArticleEngine.generate()
├── types.ts              — TypeScript types for configs, blocks, articles
├── sources/              — Data gathering per article type
│   ├── funding.ts        — Funding round + company + pipeline data
│   ├── clinical-trial.ts — Trial data + related company info
│   ├── market-analysis.ts— Sector/country aggregations + trends
│   ├── company-profile.ts— Full company data for deep dives
│   ├── roundup.ts        — Aggregate week's events across all types
│   └── breaking-news.ts  — Process scraped RSS item + enrich with DB context
├── prompts/
│   ├── base-system.ts    — Shared editorial voice + rules
│   ├── styles.ts         — 6 writing styles with tone/structure guidance
│   └── templates/        — Per-type prompt builders
│       ├── funding.ts
│       ├── clinical-trial.ts
│       ├── market-analysis.ts
│       ├── company-profile.ts
│       ├── roundup.ts
│       └── breaking-news.ts
├── confidence.ts         — Score confidence based on source quality + data backing
├── image-prompt.ts       — Generate branded image prompts per article
├── blocks.ts             — Convert AI structured output → TipTap JSON
└── publisher.ts          — Insert to DB, set status based on confidence
```

### Core API

```typescript
// lib/article-engine/index.ts

interface ArticleInput {
  type: ArticleType
  source: Record<string, any>  // Type-specific source data
  style?: ArticleStyle         // Override auto-selected style
}

interface GeneratedArticle {
  slug: string
  headline: string
  subtitle: string
  body: TipTapDoc
  summary: string
  sources: Source[]
  hero_image_prompt: string
  hero_placeholder_style: PlaceholderStyle
  confidence: ConfidenceLevel
  metadata: Record<string, any>
  reading_time_min: number
  sector: string
  company_id?: string
  company_ids: string[]
  article_style: ArticleStyle
}

class ArticleEngine {
  static async generate(input: ArticleInput): Promise<GeneratedArticle> {
    // 1. Gather context from DB based on source data
    const context = await sources[input.type].gather(input.source)

    // 2. Select writing style (or use override)
    const style = input.style || selectStyle(input.type, context)

    // 3. Build prompt from base + style + type template + context
    const prompt = buildPrompt(input.type, style, context)

    // 4. Call DeepSeek
    const raw = await callDeepSeek(prompt)

    // 5. Convert to TipTap blocks
    const body = convertToBlocks(raw, context)

    // 6. Generate image prompt
    const imagePrompt = generateImagePrompt(input.type, context, raw)

    // 7. Score confidence
    const confidence = scoreConfidence(input.type, context, raw)

    // 8. Build article object
    return { slug, headline, subtitle, body, ... }
  }
}
```

### Orchestrator Cron

```typescript
// app/api/cron/generate-articles/route.ts (replaces current)

const pipelines: Pipeline[] = [
  {
    type: 'breaking_news',
    source: () => getUnprocessedRSSItems(),
    limit: 5,
    schedule: 'daily',
    priority: 1
  },
  {
    type: 'funding_deal',
    source: () => getNewFundingRounds({ minAmount: 10_000_000 }),
    limit: 3,
    schedule: 'daily',
    priority: 2
  },
  {
    type: 'clinical_trial',
    source: () => getNewTrialResults(),
    limit: 2,
    schedule: 'daily',
    priority: 3
  },
  {
    type: 'market_analysis',
    source: () => getMarketMovers(),
    limit: 1,
    schedule: 'daily',
    priority: 4
  },
  {
    type: 'weekly_roundup',
    source: () => getWeekSummary(),
    limit: 1,
    schedule: 'sunday',
    priority: 5
  },
  {
    type: 'company_deep_dive',
    source: () => getTopUncoveredCompany(),
    limit: 1,
    schedule: 'wednesday',
    priority: 6
  }
]

// Process in priority order, respecting daily limits and 300s Vercel timeout
```

### Confidence Scoring

```typescript
// lib/article-engine/confidence.ts

function scoreConfidence(type: ArticleType, context: Context, output: AIOutput): ConfidenceLevel {
  let score = 0

  // Source quality (0-40 points)
  score += Math.min(context.sources.length * 15, 40)

  // Data backing (0-30 points)
  if (context.companyInDB) score += 10
  if (context.companyHasFullProfile) score += 10
  if (context.numbersVerifiedFromDB) score += 10

  // Article type baseline (0-20 points)
  const typeScores = {
    funding_deal: 20,      // Structured data, highly verifiable
    clinical_trial: 15,    // Trial IDs verifiable, results need checking
    breaking_news: 10,     // Rewrite quality varies
    market_analysis: 10,   // Aggregated data, interpretation varies
    weekly_roundup: 15,    // Compilation of verified events
    company_deep_dive: 5   // Most AI interpretation, least structured
  }
  score += typeScores[type]

  // AI output quality (0-10 points)
  if (output.sources.length >= 2) score += 5
  if (!containsGenericPhrases(output.body)) score += 5

  // Thresholds
  if (score >= 65) return 'high'     // Auto-publish
  if (score >= 40) return 'medium'   // Publish, flag for review
  return 'low'                       // Draft only
}
```

---

## 3. Editorial Voice & Prompt System

### Base System Prompt

All articles receive this as the system prompt foundation:

```
You are a senior biotech journalist at BiotechTube, a market intelligence publication
read by biotech investors, executives, and scientists.

VOICE:
- Authoritative but not academic. Assume your reader knows biotech — do not explain
  basic concepts (IND filings, Phase 3 trials, EPS, market cap).
- Business-forward with scientific precision when the science matters.
- Lead with WHY it matters, not WHAT happened.
- The headline sells the insight, not the event.

RULES:
- NEVER open with "[Company] announced/raised/reported..."
- NEVER use: "capital infusion", "vote of confidence", "it remains to be seen",
  "only time will tell", "in the ever-evolving landscape", "poised to",
  "game-changer", "paradigm shift"
- USE specific drug names and mechanisms of action — never "its lead candidate"
  or "the company's pipeline"
- Every factual claim must trace to a provided source. If you cannot cite it,
  do not state it.
- Include one forward-looking insight per article — "watch for X next"
- Vary headline structures. Not always "[Company] Secures $XM [Round Type]"

SOURCES:
- You will be provided with source data. Cite sources by name and URL.
- Clearly distinguish between verified facts (from sources) and your analysis.
- If the source data is thin, write a shorter article rather than padding with
  unsupported claims.

OUTPUT FORMAT:
- Return valid JSON matching the specified schema
- body_sections is an array of typed blocks — use paragraph, heading, pullQuote,
  companyCard, chartEmbed, and pipelineTable blocks where appropriate
- Aim for 300-500 words depending on article style
```

### 6 Writing Styles

```typescript
// lib/article-engine/prompts/styles.ts

const styles = {
  investor_lens: {
    persona: "Biotech VC partner writing an investment memo",
    tone: "Analytical, thesis-driven, risk-aware",
    structure: "Investment thesis → supporting evidence → risk factors → outlook",
    opens_with: "A punchy thesis sentence about the deal's significance",
    best_for: ["funding_deal", "company_deep_dive"]
  },

  science_lens: {
    persona: "Principal scientist presenting at a conference",
    tone: "Precise, mechanistic, clinically grounded",
    structure: "Mechanism of action → clinical data → significance → what's next",
    opens_with: "The specific science that makes this noteworthy",
    best_for: ["clinical_trial", "company_deep_dive"]
  },

  market_analyst: {
    persona: "Goldman Sachs biotech sector analyst",
    tone: "Data-driven, comparative, sector-contextual",
    structure: "Key data point → sector context → peer comparison → implication",
    opens_with: "A striking number or trend that frames the analysis",
    best_for: ["market_analysis", "funding_deal"]
  },

  editorial_narrative: {
    persona: "STAT News senior correspondent",
    tone: "Vivid, story-driven, connects dots across the industry",
    structure: "Scene-setting hook → backstory → analysis → forward-looking kicker",
    opens_with: "A specific, vivid detail about the company or its mission",
    best_for: ["breaking_news", "company_deep_dive"]
  },

  deal_spotlight: {
    persona: "BioPharma Dive beat reporter",
    tone: "Crisp, fact-dense, respects reader's time",
    structure: "Info-rich lead → company context → deal terms → sector positioning",
    opens_with: "The single most important fact about this deal",
    best_for: ["funding_deal", "breaking_news"]
  },

  data_digest: {
    persona: "The Economist's 'Daily chart' writer",
    tone: "Dry wit, number-forward, makes data tell a story",
    structure: "Key number → why it matters → trend context → chart reference",
    opens_with: "A number that surprises or reframes expectations",
    best_for: ["weekly_roundup", "market_analysis"]
  }
}
```

### Style Selection Logic

```typescript
function selectStyle(type: ArticleType, context: Context): ArticleStyle {
  // Each type has preferred styles; rotate to ensure variety
  const preferences = {
    funding_deal: ['investor_lens', 'deal_spotlight', 'market_analyst'],
    clinical_trial: ['science_lens', 'editorial_narrative'],
    market_analysis: ['market_analyst', 'data_digest'],
    company_deep_dive: ['editorial_narrative', 'investor_lens', 'science_lens'],
    weekly_roundup: ['data_digest'],
    breaking_news: ['deal_spotlight', 'editorial_narrative']
  }

  // Check last 5 articles of same type, pick least-recently-used style
  const recentStyles = getRecentStylesForType(type, 5)
  const candidates = preferences[type]
  return candidates.find(s => !recentStyles.includes(s)) || candidates[0]
}
```

---

## 4. Image System

### Layer 1: Branded Placeholder (CSS/SVG, zero cost)

Every article gets an auto-generated placeholder that renders via a React component. No external API calls.

**Design system:**
- Background: deep navy (#0f172a)
- Accent: BiotechTube green (#059669)
- Secondary: cool gray (#64748b)
- Typography: Inter (matches site font)

**Patterns by article type:**
- `funding_deal` — ascending bar chart shapes with floating currency dots
- `clinical_trial` — hexagonal molecule grid with connecting lines
- `market_analysis` — flowing sine wave lines (market chart aesthetic)
- `company_deep_dive` — concentric circles radiating from center
- `weekly_roundup` — tiled grid of small category icons
- `breaking_news` — angular burst/flash pattern

**Component:** `ArticlePlaceholder({ type, sector, headline })` renders a styled SVG/CSS card with the pattern, category label, and subtle branding.

**Used for:**
- Homepage article cards (when no hero image uploaded)
- Social share OpenGraph image fallback
- Article page hero when no image

### Layer 2: AI Image Prompt Generation

The engine generates a specific, copy-paste-ready prompt stored in `hero_image_prompt`.

**Base template:**
```
Abstract editorial illustration for a biotech news article.
Style: bold geometric data visualization combined with organic biotech elements.
{TOPIC_ELEMENTS}
Color palette: deep navy (#0f172a) background, electric green (#059669) accents,
white and cool gray highlights.
Modern, clean, Bloomberg Businessweek meets scientific journal aesthetic.
No text, no letters, no words, no numbers rendered as text.
16:9 aspect ratio.
```

**Topic element generation** (from article context):
```typescript
// lib/article-engine/image-prompt.ts

function generateTopicElements(type: ArticleType, context: Context): string {
  switch (type) {
    case 'funding_deal':
      return `Floating geometric shapes suggesting growth and capital flow.
        Abstract representation of ${context.sector || 'biotechnology'}.
        Ascending data visualization elements.`

    case 'clinical_trial':
      return `Molecular structure patterns, clinical data scatter plot shapes.
        Abstract ${context.metadata.indication || 'therapeutic'} imagery.
        Precision and scientific rigor conveyed through geometric forms.`

    case 'market_analysis':
      return `Flowing market data streams, sector treemap patterns.
        Abstract financial chart elements merging with biological forms.
        Sense of movement and market dynamics.`

    case 'company_deep_dive':
      return `Corporate silhouette merging with ${context.sector || 'biotech'} imagery.
        Layered data visualization suggesting depth of analysis.
        Professional, authoritative composition.`

    case 'weekly_roundup':
      return `Mosaic of small data visualization elements — charts, molecules, arrows.
        Sense of compilation and overview.
        Multiple small geometric forms creating a unified composition.`

    case 'breaking_news':
      return `Dynamic angular composition suggesting urgency and significance.
        Bold geometric forms with sharp contrasts.
        Abstract ${context.sector || 'biotech'} elements in motion.`
  }
}
```

### Layer 3: Data Visuals (React components, fully automated)

Custom TipTap node views that render live data inline:

- **`chartEmbed`** — Renders `<LightweightChart>` from `company_price_history`. Props: companyId, chartType (price, funding_history, market_cap), period.
- **`companyCard`** — Renders company logo, name, market cap, daily change, sector, phase. Live data from `companies` + latest price.
- **`pipelineTable`** — Renders drug pipeline from `pipelines` table. Columns: drug name, indication, phase, status.
- **`competitorTable`** — Side-by-side comparison of companies in same indication/sector.
- **`dataCallout`** — Styled key statistic: large number with label and trend arrow.

### Image Workflow Documentation

```
docs/workflows/image-generation.md

# Image Generation Workflow for Claude Cowork

## Overview
BiotechTube articles are generated with AI image prompts stored in the database.
Images are created manually via ChatGPT or Gemini using these prompts, then uploaded
via the admin editor.

## Steps

1. **Find articles needing images:**
   Query: SELECT id, headline, hero_image_prompt FROM articles
          WHERE hero_image_url IS NULL AND status = 'published'
          ORDER BY published_at DESC

2. **For each article, copy the `hero_image_prompt` field**
   This prompt is pre-formatted for ChatGPT/Gemini image generation.

3. **Generate the image in ChatGPT or Gemini:**
   - Paste the prompt
   - Generate 2-3 variations
   - Pick the one that best fits the article's tone
   - Download at highest resolution

4. **Upload via admin editor:**
   - Go to /admin/articles
   - Open the article
   - Click the hero image area
   - Upload or drag-and-drop the generated image
   - Image auto-crops to 16:9

5. **Quality check:**
   - Image should feel "BiotechTube" — bold, data-visual, abstract biotech
   - No readable text in the image
   - Colors should lean navy/green/white
   - Should work at both large (article page) and small (card thumbnail) sizes

## Brand Style Guide for Images
- Primary: Deep navy (#0f172a) backgrounds
- Accent: Electric green (#059669) highlights
- Secondary: Cool gray (#64748b), white
- Aesthetic: Bloomberg Businessweek meets scientific journal
- Elements: Geometric shapes, data visualization patterns, molecular/organic forms
- Avoid: Stock photo look, literal representations, text in images
- Variety: Each image should feel unique while belonging to the same family
```

---

## 5. Admin Editor & Article Management

### Routes

- `/admin/articles` — Article list with filters and bulk actions
- `/admin/articles/[id]` — TipTap block editor for individual article
- `/admin/articles/[id]/preview` — Full preview as public page

### Article List View (`/admin/articles`)

**Layout:**
- Filter tabs: All | Auto-Published | In Review | Drafts | Archived
- "In Review" tab shows badge count
- Search bar (searches headline, summary, company name)
- Table columns: Status (dot), Type (icon), Headline, Confidence, Published, Edited by
- Sort by: date (default), type, confidence
- Click row → opens editor
- Bulk select → Publish / Archive

### Article Editor (`/admin/articles/[id]`)

**Three-column layout:**

**Left: Block toolbar (narrow)**
- Insert buttons for each block type
- Paragraph, Heading (H2, H3), Image, Pull Quote, Divider
- Company Card, Chart Embed, Pipeline Table, Data Callout, Competitor Table

**Center: Editor canvas**
- TipTap editor with WYSIWYG rendering
- Each block has drag handle (left edge) for reordering
- Click block to edit inline
- Custom blocks render as interactive previews (live data)
- Hero image area at top — click to upload/replace

**Right: Sidebar**
- **Status section:** Draft / In Review / Published / Archived toggle
- **Article info:** Type, style selector (dropdown), reading time (auto), confidence badge
- **SEO:** Title override, description override, slug (editable)
- **Hero Image:**
  - Preview thumbnail (or placeholder)
  - "Copy Image Prompt" button
  - Upload button / drag-drop zone
- **Sources:** Editable list of {name, url, date}. Add/remove buttons.
- **Companies:** Tagged company pills. Search to add more.
- **Edit history:** "Created by AI, Apr 8 · Edited by human, Apr 8"

### Key Editor Features

**Regenerate:** Select any paragraph block → right-click or toolbar button → "Regenerate" → AI rewrites that block using the same article context. Only that block changes.

**Preview:** Button in toolbar opens `/admin/articles/[id]/preview` — renders exactly as the public page will look, including all custom blocks with live data.

**Publish controls:**
- High confidence articles auto-publish but show "Published (auto)" status — editable anytime
- "In Review" articles show "Publish" button prominently
- "Draft" articles show "Submit for Review" and "Publish" buttons

### TipTap Configuration

**Extensions needed:**
- StarterKit (paragraphs, headings, bold, italic, lists, blockquote)
- Link
- Image (with upload handler)
- Placeholder
- DragHandle (for block reordering)
- Custom nodes: CompanyCard, ChartEmbed, PipelineTable, PullQuote, DataCallout (CompetitorTable deferred)

**Custom node views:** Each custom block type gets a React component that renders inside the editor with live data. In the editor, they show an interactive preview. On the public page, they render the full component.

---

## 6. Frontend Display

### Article Page: `/news/[slug]`

Single route serving all article types. Server component with ISR (revalidate: 1800).

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ Nav                                                │
├────────────────────────────────────────────────────┤
│ Breadcrumb: News > {Type}                          │
├────────────────────────────────────────────────────┤
│                                                    │
│ [Category Pill]              5 min read            │
│                                                    │
│ Headline (large, serif or bold sans)               │
│ Subtitle (medium, muted)                           │
│                                                    │
│ By BiotechTube · April 8, 2026    [Share buttons]  │
│                                                    │
├────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────┐ │
│ │           Hero Image / Placeholder             │ │
│ │           (full-width, 16:9)                   │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ ┌──────────────────────┐ ┌──────────────────────┐ │
│ │                      │ │ Sticky Sidebar       │ │
│ │  Article body        │ │ ┌──────────────────┐ │ │
│ │  (block rendering)   │ │ │ Table of Contents│ │ │
│ │                      │ │ └──────────────────┘ │ │
│ │  [paragraph]         │ │                      │ │
│ │  [company card]      │ │ ┌──────────────────┐ │ │
│ │  [paragraph]         │ │ │ Company Card     │ │ │
│ │  [chart embed]       │ │ │ (if single co.)  │ │ │
│ │  [pull quote]        │ │ └──────────────────┘ │ │
│ │  [paragraph]         │ │                      │ │
│ │  [pipeline table]    │ │ ┌──────────────────┐ │ │
│ │                      │ │ │ Newsletter CTA   │ │ │
│ │                      │ │ └──────────────────┘ │ │
│ └──────────────────────┘ └──────────────────────┘ │
│                                                    │
│ ┌────────────────────────────────────────────────┐ │
│ │ Sources                                        │ │
│ │ 1. GlobeNewswire — "Title" — Apr 7, 2026      │ │
│ │ 2. SEC Filing S-1 — Mar 2026                   │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ ┌────────────────────────────────────────────────┐ │
│ │ Related Articles                               │ │
│ │ [card] [card] [card]                           │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ Footer                                             │
└────────────────────────────────────────────────────┘
```

**Responsive:** Sidebar collapses below article on mobile. Hero image uses responsive heights (280px mobile, 480px desktop).

**Company Deep Dive variant:** Adds a key metrics banner below the hero (market cap, price change, pipeline count, total funding). Shows "Sponsored" or "Company Spotlight" badge if `metadata.is_sponsored === true`.

### News Hub: `/news`

Replaces current `/news` page with unified feed.

**Layout:**
- Featured article at top (full-width card with large hero image)
- Filter pills: All | Funding | Clinical Trials | Market | Companies | Roundups | Breaking
- Article cards in a list/grid (image thumbnail, type badge, headline, summary, time ago, reading time)
- Pagination (10 per page)
- Sidebar on desktop: "Trending" articles by view count or recency

### Homepage Integration

**New "Latest Intelligence" section**, positioned near the top of the homepage:

- Horizontal scroll of 4-5 latest published articles as cards
- Each card: hero image (or placeholder), category pill, headline, 1-line summary, time ago
- Intentional mix of article types (not all funding)
- "View all articles ->" link to `/news`

### SEO

**Per-article metadata** via `generateMetadata()`:
- Title: `headline | BiotechTube` (or `seo_title` if set)
- Description: `summary` (or `seo_description` if set)
- OpenGraph: type `article`, image from `hero_image_url` or placeholder
- Twitter: `summary_large_image` card
- Canonical: `https://biotechtube.io/news/{slug}`

**JSON-LD structured data:**
```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "...",
  "datePublished": "...",
  "dateModified": "...",
  "author": { "@type": "Organization", "name": "BiotechTube" },
  "publisher": { "@type": "Organization", "name": "BiotechTube" },
  "description": "...",
  "image": "...",
  "citation": [{ "@type": "CreativeWork", "name": "...", "url": "..." }]
}
```

**Sitemap:** All published articles included with `changeFrequency: "weekly"`, `priority: 0.7`.

### RSS Feed

`/api/feed/rss` — Standard RSS 2.0 feed:
- All published articles, newest first
- Limit 50 items
- Includes: title, link, description (summary), pubDate, category (type)
- Auto-discovery `<link>` tag in site `<head>`

---

## 7. Migration & Backwards Compatibility

### During Development (no disruption)

- Old tables (`funding_articles`, `news_items`, `blog_posts`) remain untouched
- Old routes (`/news`, `/news/funding`, `/news/funding/[slug]`, `/blog`) keep working
- New engine writes only to the new `articles` table
- New routes coexist: `/news/[slug]` serves new articles

### Cutover (after engine is validated)

1. **Migration script:** Convert existing `funding_articles` rows to `articles` table
   - `type: 'funding_deal'`
   - `body:` convert plain text paragraphs to TipTap JSON blocks
   - `confidence: 'high'` (they were already auto-published)
   - `status: 'published'`
   - Preserve slugs and published_at dates

2. **Redirects:** `/news/funding/[slug]` → 301 to `/news/[slug]`

3. **Route swap:** New `/news` page replaces old one (unified feed)

4. **Blog decision:** `/blog` can remain separate or be merged later. Not in scope for today.

5. **Cleanup:** Old tables can be dropped after confirming all data migrated. No rush.

### Cron Update

The existing `generate-articles` cron route gets replaced with the new orchestrator. Old cron route stays as a fallback during testing (different endpoint path).

---

## 8. Cost Analysis

### Per Article

| Component | Cost |
|-----------|------|
| DeepSeek text generation | ~$0.01-0.03 |
| Hero image (manual via ChatGPT/Gemini) | $0.00 |
| Data visuals (rendered from DB) | $0.00 |
| Supabase storage (article row) | negligible |
| **Total per article** | **~$0.03** |

### Daily (5-10 articles)

| Component | Cost |
|-----------|------|
| DeepSeek API | $0.15-0.30 |
| Supabase (well within free/Pro tier) | $0.00 |
| Vercel (cron execution) | $0.00 (Pro plan) |
| **Total per day** | **~$0.30** |

### Monthly

| Component | Cost |
|-----------|------|
| DeepSeek API | ~$5-10 |
| Image generation | $0 (manual) |
| Infrastructure | $0 (existing plans) |
| **Total per month** | **~$5-10** |

---

## 9. What's NOT in V1

These are deferred to future iterations:

- **Premium "Company Spotlight" template** — start with standard format + "Sponsored" label
- **Automated image generation** — pluggable later; manual workflow for now
- **Real-time/event-driven generation** — daily cron is sufficient for 5-10 articles
- **Comment system** — not needed yet
- **Newsletter integration** — articles surface on homepage; dedicated newsletter later
- **Multi-author support** — all articles attributed to "BiotechTube"
- **A/B testing headlines** — future optimization
- **Analytics per article** — future (view counts, read-through rates)
- **Blog migration** — `/blog` stays separate for now
- **`competitorTable` block type** — requires peer grouping logic; defer to Phase C
- **Article view counter / trending by views** — use recency for trending in v1

---

## 10. Implementation Details (Review Fixes)

### DeepSeek Output Format

DeepSeek returns a **simplified intermediate format**, NOT raw TipTap JSON. The `blocks.ts` converter handles structural mapping.

**DeepSeek returns:**
```json
{
  "headline": "...",
  "subtitle": "...",
  "summary": "2-3 sentence summary",
  "sections": [
    { "type": "text", "content": "Opening paragraph..." },
    { "type": "heading", "content": "The Deal", "level": 2 },
    { "type": "text", "content": "More analysis..." },
    { "type": "quote", "content": "A striking pull quote" },
    { "type": "text", "content": "Closing analysis..." },
    { "type": "company_mention", "reason": "primary subject" },
    { "type": "chart_suggestion", "chart_type": "price_history", "period": "6m" }
  ],
  "sources": [{ "name": "GlobeNewswire", "url": "https://..." }],
  "image_topic": "oncology funding, CAR-T therapy"
}
```

**`blocks.ts` converts to TipTap JSON:**
- `text` → `paragraph` node
- `heading` → `heading` node with level attr
- `quote` → `pullQuote` custom node
- `company_mention` → `companyCard` node (injects company_id from context)
- `chart_suggestion` → `chartEmbed` node (injects company_id from context)

This keeps the LLM output simple and reliable. Structural decisions happen in code.

### Breaking News Source Definition

Breaking news articles source from the **existing RSS scraping pipeline** (`scrape-funding` cron). Currently that cron filters RSS items by funding keywords only. The change:

1. `scrape-funding` cron continues to extract funding rounds as before
2. RSS items that are **not** funding-related but **are** biotech-relevant (FDA decisions, partnerships, acquisitions, trial results mentioned in press releases) get flagged in a new `rss_items` table with `processed_for_article = false`
3. The article orchestrator queries `rss_items WHERE processed_for_article = false` for breaking news candidates
4. Each RSS item gets enriched with company data from the DB before article generation
5. After article generation, `processed_for_article` is set to `true`

**New `rss_items` table (Phase A):**

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| title | TEXT | RSS item title |
| url | TEXT UNIQUE | Source URL (dedup key) |
| source_name | TEXT | GlobeNewswire, PRNewswire, etc. |
| summary | TEXT | RSS description/summary |
| published_at | TIMESTAMPTZ | RSS pubDate |
| category | TEXT | `funding`, `fda`, `partnership`, `acquisition`, `trial`, `general` |
| company_names | TEXT[] | Extracted company names |
| processed_for_article | BOOLEAN DEFAULT false | Has an article been generated? |
| scraped_at | TIMESTAMPTZ DEFAULT now() | When we scraped it |

### Image Storage

Hero images uploaded via the admin editor are stored in **Supabase Storage**.

- **Bucket:** `article-images` (public)
- **Path pattern:** `heroes/{article-slug}.{ext}`
- **Public URL:** `{SUPABASE_URL}/storage/v1/object/public/article-images/heroes/{slug}.webp`
- Images auto-converted to WebP on upload for performance
- Max size: 2MB (sufficient for 16:9 editorial images)

### Slug Collision Handling

```typescript
function generateSlug(headline: string, type: string): string {
  const base = slugify(headline, { lower: true, strict: true }).slice(0, 80)
  const dateStr = new Date().toISOString().slice(0, 10) // 2026-04-08

  let slug = `${base}-${dateStr}`

  // Check for collision, append counter if needed
  const existing = await supabase
    .from('articles')
    .select('slug')
    .like('slug', `${slug}%`)

  if (existing.data?.length) {
    slug = `${slug}-${existing.data.length + 1}`
  }

  return slug
}
```

Slugs include the date to reduce collisions and improve SEO signals.

### Admin Auth

The `/admin/articles` routes use the **same auth pattern as existing `/admin/*` routes** in the project. Protected via Supabase auth — only authenticated users with admin role can access. No new auth system needed.

### News Hub Trending

In V1, "Trending" in the News Hub sidebar uses **recency** (latest published articles), not view counts. View tracking is deferred to a future iteration.
