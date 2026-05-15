# Regroup the Main Menu: Mega-Menu with Subcategories

## Problem
- "Sectors" dropdown lists ~30 items in a single vertical column → falls below the viewport, last items invisible.
- "Disciplines" dropdown lists ~20 items, same issue.
- Single flat lists offer no scent or hierarchy.

## Solution
Turn both dropdowns into **multi-column mega-menus**, where children are organized into 4–5 short, themed subgroups. Each group has a bold header and 5–7 links underneath. The whole panel fits in the viewport without scrolling.

### Sectors (4 groups)
- **Tech & Digital** — AI, AdTech, Crypto & Web3, Cybersecurity, Enterprise SaaS, Fintech, Startups & Venture
- **Consumer & Lifestyle** — Beauty, Cannabis, CPG, Fashion, Food & Beverage, Hospitality, Luxury, Retail & eCommerce, Travel
- **Industry & Infrastructure** — Automotive & Mobility, Defense, Energy, Real Estate
- **Regulated & Public** — Education, Entertainment & Media, Financial Services, Gambling & iGaming, Healthcare, Health Tech, Legal, Politics & Government, Public Affairs, Sports

### Disciplines (4 groups)
- **AI & Search** — AI Communications, GEO, SEO
- **Earned & Influence** — Earned Media, Influencer Marketing, Media Training, Podcast PR, Analyst Relations
- **Marketing & Content** — B2B Marketing, Content Marketing, Digital Marketing, Paid Media, Social Media, Event & Experiential
- **Corporate & Strategic** — Crisis Communications, Executive & Founder Branding, Government Relations & Lobbying, Internal Communications, Investor Relations, Reputation Management

## Technical changes

1. **`src/lib/site-nav.shared.ts`** — extend `NavItem` so `menu` items can hold `groups: { label: string; children: LeafLink[] }[]` instead of (or in addition to) a flat `children` array. Replace the Sectors and Disciplines entries with the grouped structure above. Keep the existing leaf shapes so links stay typed.

2. **`src/components/site/SiteHeader.tsx`** —
   - Desktop: when a menu item has `groups`, render a wide panel (e.g. `w-[720px]`, `grid-cols-4`, anchored right for the rightmost menu so it doesn't overflow). Each column = group label (uppercase, brand-blue, smaller) + its leaf links. Cap panel height at `max-h-[70vh]` with `overflow-y-auto` as a safety net.
   - Mobile drawer: render groups as collapsible sub-sections inside the existing accordion (group label as a small uppercase header, links underneath). No second-level toggle needed — just visual grouping inside the already-open submenu.
   - Keep the existing flat `children` path for any menu that doesn't define `groups` (forward-compatible).

3. No data/DB changes. No route changes. Pure presentation.

## Out of scope
- Removing menu items (everything stays accessible).
- Top-level reorder beyond what's already there.
- Visual redesign of header chrome.
