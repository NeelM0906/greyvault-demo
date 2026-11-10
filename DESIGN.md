# GreyVault design tokens

The tokens below live at the top of `assets/css/site.css`. Brand colors are also injected per page from `content/config.json`, so a rebrand changes only the config.

## Color

| Token | Value | Use |
|---|---|---|
| `--ink` | `#121212` | Text, primary buttons, dark sections, footer. 17.2:1 on ivory. |
| `--ivory` | `#F7F5F1` | Page background, text on ink. |
| `--paper` | `#EFEBE4` | Tinted sections, image wells, form panels. |
| `--line` | `#DCD6CC` | Hairlines and borders. Decorative only. |
| `--muted` | `#5C5852` | Secondary text. 6.5:1 on ivory, 6.0:1 on paper. |
| `--steel` | `#8A929B` | Brushed-steel accent for decorative marks only (2.9:1). Never for text. |
| `--accent` | `#3E4A57` | Focus rings, hover, italic headline accent. 8.3:1 on ivory. |
| `--on-ink-muted` | `#ABA59B` | Secondary text on ink. 7.6:1 on `#121212`. |
| `--ok`, `--warn` | `#2F6B4F`, `#8A5A1C` | Availability dots. Always paired with a text label. |

WhatsApp icons use `#1F7A4D` rather than the brand's neon green, to stay quiet.

## Type

| Role | Family | Size | Notes |
|---|---|---|---|
| Display (h1) | Cormorant Garamond 400 | `clamp(2.5rem, 5.4vw, 4.75rem)` | Line height 1.06, tracking -0.01em, lining numerals. |
| Section (h2) | Cormorant Garamond 400 | `clamp(2rem, 3.4vw, 3rem)` | |
| Card title | Cormorant Garamond 400 | 1.45rem, 1.15rem under 640px | |
| Body | Inter 400 | 16px, 15px under 640px, 17px over 1700px | Line height 1.6. |
| Eyebrow and labels | Inter 600 | 0.66 to 0.78rem | Uppercase, tracking 0.12 to 0.18em. |
| Prices | Inter 500 to 600 | | Tabular numerals. "Price on request" sets in italic display. |

Fonts are self-hosted WOFF2 variable files with `font-display: swap`. Fallbacks are Garamond and Times for display, and the system UI stack for text.

## Space and layout

| Token | Value |
|---|---|
| `--s1` to `--s9` | 4, 8, 12, 16, 24, 32, 48, 72, 112 px |
| `--gutter` | `clamp(20px, 4vw, 48px)` |
| `--max` | 1320px, 1480px over 1700px |
| Section padding | `clamp(64px, 8vw, 120px)` |
| `--radius` | 2px |

Breakpoints: 640px (phone), 980px (tablet, menu collapses, filters become a toggle panel), 1180px (small laptop, three-column cards), 1700px (large desktop).

## Motion

| Token | Value | Use |
|---|---|---|
| `--ease` | `cubic-bezier(.2, .7, .2, 1)` | All transitions. |
| `--slow` | 900ms | Hover color, borders, link arrows. |
| Reveal | 1.1s fade and 14px rise | Sections entering the viewport, once. |
| Image hover | 1.4s scale to 1.04 | Cards and hero. |

`prefers-reduced-motion: reduce` removes all of it and shows content immediately.

## Rules the template keeps

- No popups, marquees, countdowns, autoplay media or chat widgets.
- One primary action per view. Inquire is solid ink. Hold and WhatsApp are outlined.
- Every listing shows condition grade, polish status, box and papers, timekeeping and who inspected it.
- Status is never color alone. Every dot and tag carries a word.
- Focus is always visible: a 2px accent outline offset by 3px.
