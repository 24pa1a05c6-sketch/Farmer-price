# KisanSetu — Hybrid Design System Specification

## 1. Visual Synthesis & Design Philosophy
KisanSetu merges two distinct visual references into a single cohesive agricultural intelligence experience:
- **Reference A (Cinematic Editorial Hero & Carousel)**: Full-viewport Indian agricultural landscape photography (`16:9` Andhra Pradesh paddy terraces at sunrise), tuned dark gradient overlay for WCAG AAA text legibility, oversized condensed uppercase display typography (`Oswald` / `Syne` / `Inter`), floating glass crop-price cards on the right rail, circular navigation controls, and numbered slide progress indicator (`01 — 06`).
- **Reference B (Warm Luxury Glassmorphism & Ivory Surfaces)**: Warm ivory (`#F7F4EC`) and soft stone-beige (`#E9E0D2`) canvas surfaces, translucent frosted glass panels (`backdrop-filter: blur(16px)`), subtle champagne/bronze border highlights (`#B68A57`), soft ambient elevation shadows, and calm, high-contrast data hierarchy for farmer readability.

---

## 2. Color Tokens

| Token Name | Hex Value | CSS Variable | Usage |
| :--- | :--- | :--- | :--- |
| **Deep Forest** | `#10271F` | `--color-deep-forest` | Hero overlays, primary dark surfaces, sidebar background, primary headings |
| **Forest Green** | `#163B2B` | `--color-forest` | Primary CTA buttons, active states, primary chart strokes, key badges |
| **Fresh Leaf** | `#79A86B` | `--color-leaf` | Positive price trends, secondary chart series, verified status indicators |
| **Muted Sage** | `#C8D5C0` | `--color-sage` | Subtle borders, secondary pills, soft dividers, hover highlights |
| **Warm Ivory** | `#F7F4EC` | `--color-ivory` | Primary light background surface across landing sections and dashboard |
| **Warm Beige** | `#E9E0D2` | `--color-beige` | Secondary surface cards, table headers, input backgrounds, filter bars |
| **Champagne Bronze** | `#B68A57` | `--color-bronze` | Best Market #1 rank accent, active indicator bars, subtle luxury borders |
| **Main Text** | `#202820` | `--color-text-main` | Primary body copy, rupee values, table cell text (Contrast > 12:1 on Ivory) |
| **Muted Text** | `#72796F` | `--color-text-muted` | Timestamps, unit labels (`₹/Quintal`), metadata captions |
| **Semantic Warning** | `#D97706` | `--color-warning` | Stale data warnings (>7 days old), high transport expense alerts |
| **Semantic Danger** | `#DC2626` | `--color-danger` | Validation errors, negative net earnings alerts |

---

## 3. Typography & Bilingual Support (English & Telugu)

- **Display / Hero Headlines**: `'Oswald', 'Anton', sans-serif` — Condensed, uppercase, bold (`700`), tracking `-0.02em`, line-height `0.95`. Used for `"YOUR HARVEST. YOUR MARKET. YOUR CHOICE."` and card titles in the Reference A carousel.
- **UI & Analytical Body**: `'Plus Jakarta Sans', 'Inter', sans-serif` — Clean geometric sans-serif with `font-variant-numeric: tabular-nums` for rupee prices (`₹2,480/qtl`), quantities, and net earnings comparisons.
- **Telugu Script (`తెలుగు`)**: `'Noto Sans Telugu', sans-serif` — Loaded via Google Fonts with adjusted line-height (`1.65`) and letter-spacing (`0em`) so Telugu script never clips vertically in buttons, badges, or table headers.

---

## 4. Component Patterns

### 4.1 Translucent Glass Panels (Reference B)
- **Light Glass Card**: `background: rgba(247, 244, 236, 0.78); backdrop-filter: blur(16px); border: 1px solid rgba(182, 138, 87, 0.22); box-shadow: 0 20px 50px rgba(16, 39, 31, 0.06);`
- **Dark Hero Floating Card (Reference A)**: `background: rgba(16, 39, 31, 0.65); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.18);`

### 4.2 Data Freshness & Source Badges
Every price record displays an explicit provenance pill:
- `OFFICIAL AGMARKNET` (`#163B2B` background, `#F7F4EC` text) — Sourced from Data.gov.in / AGMARKNET.
- `ADMIN VERIFIED` (`#79A86B` tint) — Manually verified APMC market yard entry.
- `DEMO SAMPLE` (`#B68A57` tint) — Labeled demonstration record for offline/evaluation testing.
- `STALE (>7d)` (`#D97706` tint) — Observation older than 7 days; triggers comparison warning in Best Market Finder.

---

## 5. Motion & Accessibility Rules
1. **Staggered Hero Reveal**: 80ms stagger on hero title words and floating crop cards (`cubic-bezier(0.22, 1, 0.36, 1)`).
2. **Carousel Physics**: Smooth horizontal scroll with keyboard arrow support (`ArrowLeft`, `ArrowRight`), active card scale (`1.03`), and synchronized slide counter (`01` to `06`).
3. **Reduced Motion**: `@media (prefers-reduced-motion: reduce)` disables parallax and transforms while preserving instant opacity state changes.
4. **Responsive Breakpoints**:
   - Mobile (`< 640px`): Single-column cards, bottom/drawer navigation, touch-friendly `44px` minimum tap targets.
   - Tablet (`640px – 1024px`): Collapsible sidebar, 2-column market comparison grid.
   - Desktop (`> 1024px`): Fixed `260px` forest-green/ivory sidebar, split-screen Best Market Finder & Recharts analytics.
