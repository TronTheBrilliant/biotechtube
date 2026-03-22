# Navigation Redesign — Sidebar → Top Bar with Mega-Menus

## Summary

Replace the current sidebar navigation with a clean white top bar featuring mega-menu dropdowns. Fix broken mobile navigation. Add a pricing page.

## Desktop Navigation

Top bar using `var(--color-bg-primary)` background (white in light mode, dark in dark mode), 56px height, sticky at top (`position: sticky; top: 0`), full-width, `z-index: 50`. Bottom border using `var(--color-border-subtle)`.

**Breakpoint:** Desktop nav at `min-width: 768px` (md). Below 768px → mobile nav.

**Layout:** Logo (left) → 4 mega-menu triggers (center-left) → Search + Pricing + Sign in (right)

**Mega-menu triggers:** Data, Discover, News, Company

**Interaction:**
- Hover opens dropdown panel after 200ms delay (prevents accidental triggers)
- Mouse-leave closes after 150ms grace period (allows moving mouse to panel)
- Only one panel open at a time
- Click on any link navigates and closes panel
- Escape key closes any open panel
- Close on route change (via `usePathname`)
- Keyboard: Enter/Space on trigger toggles panel, Tab navigates within panel, Escape closes

### Menu Contents

**Data** (rich panel with featured sidebar):
- Left: Companies (🏢, "14,000+ tracked"), Pipeline (🧪, "Drug tracker"), Funding (💰, "Rounds & deals"), Markets (📊, "Stock data")
- Right featured: Top countries — 🇺🇸 USA, 🇬🇧 UK, 🇳🇴 Norway, 🇸🇪 Sweden

**Discover** (rich panel with featured sidebar):
- Left: Therapeutic Areas (🧬, "21 disease areas"), Drugs (💊, "Clinical pipeline"), People (👤, "Executives & leaders"), Investors (🏦, "VC & portfolio data")
- Right featured: Popular — 🎯 Oncology, 🛡️ Immunotherapy, 🧠 Neuroscience, 💎 Rare Diseases

**News** (small popover, no featured sidebar):
- Latest News (📰), Events (📅)

**Company** (small popover, no featured sidebar):
- About (📋), Pricing (💎)

### Mega-Menu Panel Styling

**Rich panels (Data, Discover):** Full-width of nav content area (max-width matches page content). Two-column layout — links grid on left (~70%), featured sidebar on right (~30%) with `var(--color-bg-secondary)` background. Panel has `z-index: 40`, `box-shadow: 0 8px 24px rgba(0,0,0,0.08)`, bottom border, fade-in transition (150ms opacity).

**Small popovers (News, Company):** ~200px wide, positioned below the trigger, same shadow and transition. Simple list of items.

All panels use theme CSS variables for colors so dark mode works automatically.

### Right-side elements
- Search bar: pill with `var(--color-bg-secondary)` background, `var(--color-border-subtle)` border, "Search..." placeholder and ⌘K badge. Clicking opens existing SearchOverlay.
- "Pricing" text link
- "Sign in" green button (`var(--color-accent)` background, links to /login)

## Mobile Navigation

Top bar: 48px height, same sticky/z-index behavior as desktop.

Logo left, search icon + hamburger icon right.

**Hamburger opens full-screen overlay:**
- Overlay: `position: fixed; inset: 0; z-index: 50`. Background uses `var(--color-bg-primary)`.
- Body scroll locked (`overflow: hidden` on body while open)

**Overlay contents:**
1. Header with logo + ✕ close button
2. Search bar at top
3. Accordion sections: Data, Discover, News, Company
   - Tap header to expand/collapse
   - Only one section open at a time (opening one auto-closes the other)
   - Expanded shows items with emoji + label
   - Chevron rotates on toggle (CSS transition)
4. Plain links below accordions: About, Pricing
5. Sign in green CTA at bottom

**Menu container scrolls** via `overflow-y: auto` on the content area (below the header).

**Close via:** ✕ button, link navigation (route change), or Escape key.

## Content Offset

`.page-content` gets `padding-top: 56px` on desktop, `padding-top: 48px` on mobile (below 768px), to account for the sticky top bar. This replaces the old `margin-left` rules.

## Pricing Page (`/pricing`)

### Hero
"Simple, transparent pricing" heading. Subtitle about biotech intelligence.

### Three Tiers (card layout, horizontal on desktop, stacked on mobile)

**Free (Explorer):**
- Browse all companies, pipeline data, markets
- Basic company profiles
- Limited to 10 results per search
- CTA: "Get started" → /signup

**Pro ($49/mo) — highlighted/recommended:**
- Unlimited search & data access
- Full company reports with AI analysis
- Watchlist with alerts
- Export data (CSV)
- Priority access to new features
- CTA: "Get started" → /signup

**Enterprise (Custom):**
- Everything in Pro
- API access
- Custom reports & datasets
- Dedicated account manager
- Team seats
- CTA: "Contact us" → mailto or form

### For Companies Section (below tiers)

Two side-by-side cards:

**Claim your profile (Free):**
- Verify ownership, update company info, respond to investor inquiries
- CTA → existing /claim flow

**Promoted listing ($299/mo):**
- Featured placement in search results, therapeutic area pages, country pages
- Highlighted card with "Sponsored" badge
- CTA: "Contact us"

All CTAs are aspirational — no payment integration. Links go to signup or contact.

## Files

**Create:**
- `components/Nav.tsx` — Full rewrite. Top bar + mega-menus + mobile accordion.
- `app/pricing/page.tsx` — Pricing page with Nav + Footer.

**Modify:**
- `app/globals.css` — Remove all sidebar CSS (margin-left rules, `[data-sidebar]` selectors, `.sidebar-icon-btn` styles, `.sidebar-tooltip` styles). Replace with `.page-content { padding-top: 56px }` and `@media (max-width: 767px) { .page-content { padding-top: 48px } }`.
- `app/layout.tsx` — Remove the sidebar localStorage `<script>` from `<head>` and the `data-sidebar` attribute setup.

**No changes needed to individual pages.** They already import `<Nav />` and use `page-content` class — the CSS change handles layout automatically.

## No New Dependencies

Uses existing: lucide-react, next/link, next/image, usePathname, useState, useEffect, useRef, useCallback.
