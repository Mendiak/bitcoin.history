# Bitcoin History

Interactive archive of Bitcoin's price history, paired with the events that shaped it. Built with D3.js, bilingual (ES/EN), and updated automatically every day.

[![Live demo](https://img.shields.io/badge/demo-bitcoin--history.vercel.app-f7931a?style=flat-square)](https://bitcoin-history.vercel.app/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![D3.js](https://img.shields.io/badge/D3.js-7-F9A03C?style=flat-square&logo=d3&logoColor=white)](https://d3js.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Lighthouse](https://img.shields.io/badge/Lighthouse-100%20accessibility-2ea44f?style=flat-square)](#accessibility--seo)
[![Data](https://img.shields.io/badge/data-updated%20daily-f7931a?style=flat-square)](#data)

![Bitcoin History screenshot](https://github.com/Mendiak/bitcoin.history/blob/main/public/assets/images/screenshot.png?raw=true)

---

## Why this project

Most Bitcoin charts answer *"how much was it worth?"*. This one tries to answer *"what happened, and what changed afterwards?"*. Every milestone is dated, categorised, sourced and measured against the price series itself.

- **5,900+ daily closes** from July 2010 to today.
- **56 historical events** with bilingual descriptions and sources.
- **Measured impact**: each event shows the price change at +30, +90 and +365 days.

## Features

- **Interactive D3 chart** with logarithmic scale by default, so the whole history is readable at a glance.
- **Brush-to-zoom** on the context chart and a reset control.
- **Category filters** (Technology, Market, Adoption, Regulation, Security, Halving) that update chart markers and timeline together.
- **Timeline as an archive**: grouped by year with sticky year labels, compact rows and live marker highlighting on hover.
- **Event modals** with a long-form explanation, sources, and a price-impact summary with a sparkline.
- **Market cycles** overlaid as bull/bear bands, with legend.
- **Live price** in the stats strip (Coinbase → Kraken → CoinGecko fallbacks).
- **Bilingual** Spanish/English, including dates, chart axes and number formatting.
- **Light and dark themes**, following system preference with manual override.
- **Dataset transparency**: visible data cutoff date and a link to the raw JSON.
- **Accessibility**: keyboard-accessible timeline, focus states, ARIA labelling of the chart, `prefers-reduced-motion` respected.
- **SEO**: canonical URLs, Open Graph/Twitter cards, `robots.txt`, `sitemap.xml`, `llms.txt`, and JSON-LD (`WebSite`, `WebPage`, `Dataset`, `BreadcrumbList`, `Article`).

## Data

| Dataset | File | Coverage | Source |
| --- | --- | --- | --- |
| Daily BTC/USD close | `public/bitcoin-price-history.json` | 2010-07-17 → today | Kaggle, Bitcoinity, extended with Coinbase candles |
| Events | `public/events.json` | 2008 → 2026 | Curated, with per-event sources |
| Market cycles | `public/market-cycles.json` | 2011 → 2026 | Curated |
| UI copy | `public/translations.json` | — | ES/EN |

A GitHub Actions workflow (`.github/workflows/update-prices.yml`) runs every day at 03:17 UTC and appends the missing daily candles. It commits only when the series changes.

```bash
npm run update:prices            # append missing daily closes
npm run update:prices -- --dry-run
```

Historical closes are UTC-based. The price series is nominal USD, not inflation-adjusted. Event impact figures are descriptive statistics; correlation is not causation.

## Tech stack

- **Vite 5** — build tool and dev server.
- **D3.js 7** — chart, scales, brushes, date formatting.
- **Tailwind CSS 3** — design tokens and layout.
- **Lucide** — icon set, registered once in `src/modules/icons.js`.
- **ES modules**, ESLint and Prettier.

## Run locally

```bash
git clone https://github.com/Mendiak/bitcoin.history.git
cd bitcoin.history
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
npm run lint
```

## Project structure

```
.
├── .github/workflows/
│   └── update-prices.yml      # daily data cron
├── public/
│   ├── bitcoin-price-history.json
│   ├── events.json
│   ├── market-cycles.json
│   ├── translations.json
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── llms.txt
│   └── assets/
├── scripts/
│   └── update-prices.mjs      # Coinbase candles → JSON
├── src/
│   ├── main.js                # chart page entry point
│   ├── halving-main.js        # halving page entry point
│   ├── index.css              # Tailwind + editorial design tokens
│   └── modules/
│       ├── chart.js           # D3 chart, zoom, tooltips
│       ├── ui.js              # timeline, filters, modals, impact
│       ├── stats.js           # ATH, network age, live price
│       ├── i18n.js            # translations + JSON-LD
│       ├── dateLocale.js      # d3 locales (es/en)
│       ├── data.js            # loading + live price sources
│       ├── halving.js         # emission infographic
│       ├── icons.js           # single Lucide registry
│       └── utils.js           # theme, glossary, analytics
├── index.html
├── halving.html
└── vite.config.js
```

## Accessibility & SEO

Audited with Lighthouse and Chrome DevTools against the production build:

| | Accessibility | Best practices | SEO |
| --- | --- | --- | --- |
| Desktop (dark) | 100 | 100 | 100 |
| Desktop (light) | 100 | 100 | 100 |
| Mobile | 100 | 100 | 100 |

Contrast is AA across both themes, the chart exposes an accessible description, headings follow a valid order, and the page has a `main` landmark. Colour is never the only carrier of meaning: categories also have labels and icons.

## License

ISC © Mikel Aramendia. See [LICENSE](LICENSE).

---

Built by [Mikel Aramendia](https://mendiak.github.io/portfolio/).
