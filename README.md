# GreyVault

GreyVault is a website template for independent pre-owned watch dealers, built for the booths and suites of New York's 47th Street. It shows a live inventory with a watchmaker's condition report on every listing and turns visits into inquiries, 24-hour holds, offers, trade-ins and WhatsApp conversations.

The site is static HTML, CSS and JavaScript. Nothing needs to be built or installed to view it: open `index.html` or serve the folder. A zero-dependency Node script regenerates every page when you change the brand or the inventory.

Everything shipped here is demo content. The dealer, team, reviews, listings, prices, address and phone number are fictional, and the watch images are generated illustrations.

## What is in the folder

| Path | Purpose |
|---|---|
| `content/config.json` | Brand, colors, contact, WhatsApp number, hours, team, policies, payment options, reviews, form endpoint. |
| `content/inventory.json` | Every listing: specs, condition report, box and papers, price, availability, provenance, illustration settings. |
| `build.mjs` | Generates all HTML pages, product pages, watch illustrations, `sitemap.xml`, `robots.txt`, `site.webmanifest` and `assets/js/data.js`. |
| `tools/watch-art.mjs` | Draws the SVG watch illustrations from each listing's `art` block. |
| `tools/render-png.py` | Renders social share images (`assets/og/*.png`) and PNG favicons. Optional. |
| `tools/check-links.py` | Fails if any internal link, image, `#anchor`, CSS `url()` or sitemap entry is broken. |
| `tools/verify.py` | Browser test: screenshots, console errors, overflow, accessibility scan and every conversion path. |
| `tools/lighthouse.mjs` | Lighthouse on five pages, mobile and desktop. Writes `verification/lighthouse/summary.md`. Optional. |
| `assets/css/site.css` | All styles. Design tokens sit at the top. See `DESIGN.md`. |
| `assets/js/site.js` | Watchlist, inquiry dialog, form validation and delivery, inventory filters, gallery zoom, sticky bar. |
| `assets/fonts/` | Self-hosted Cormorant Garamond and Inter, both under the SIL Open Font License 1.1. License texts ship beside the files as `OFL-cormorant.txt` and `OFL-inter.txt`. No font CDN at runtime. |

Pages: `index.html`, `inventory.html`, `product/<id>.html` (one per listing), `sell.html`, `authenticity.html`, `about.html`, `visit.html`, `faq.html`, `legal.html`, `saved.html`, `404.html`.

## Preview the site

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. Opening `index.html` from disk also works, except for features that browsers block on `file://` URLs in some setups.

## Rebrand for a client

1. Edit `content/config.json`. Change `brand`, `colors`, `contact`, `hours`, `team`, `policies`, `payments` and `reviews`. Set `site.url` to the live domain so canonical URLs, Open Graph tags and the sitemap point at it.
2. Set `site.demo` to `false` to remove the demo notice bar.
3. Replace `content/inventory.json` with the dealer's listings. The fields are described in the next section.
4. Regenerate the site:

	```bash
	node build.mjs
	```

5. Optional: regenerate the share images and PNG icons. This step needs Python Playwright and a Chromium or Chrome binary.

	```bash
	pip install playwright && python3 -m playwright install chromium
	python3 tools/render-png.py
	```

6. Replace the illustrations with photographs. Put photos at the same paths (`assets/watches/<id>-front.svg` and so on), or change the `img()` helper in `build.mjs` to point at `.jpg` files. Replace `assets/img/team-*.svg` with portraits. The pages already say that live listings use the dealer's own photographs, so remove that line in `build.mjs` once real photos are in.
7. Have counsel review `legal.html`. The text is a starting point, not legal advice.

To hide every price at once, set `pricing.mode` to `"request"`. To hide one price, set that listing's `priceOnRequest` to `true`. Hidden prices are not written anywhere in the HTML, the JSON-LD or the runtime data.

## Inventory content model

Each entry in `content/inventory.json` under `watches`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | URL slug and product page file name. Unique. |
| `brand`, `family`, `model`, `ref`, `year` | string, number | `family` drives the model filter and related pieces. |
| `featured` | boolean | Featured pieces sort first and appear on the home page. |
| `added` | `YYYY-MM-DD` | Drives "Newest listed" and "New this month". |
| `availability` | `available`, `on-hold`, `incoming`, `sold` | Sold pieces stay listed as proof of sales and link to a sourcing request. |
| `condition` | `unworn`, `excellent`, `very-good`, `good` | Grade definitions live in `CONDITIONS` in `build.mjs`. |
| `polished` | boolean | Always disclosed on the listing. |
| `price` | number (USD) | |
| `priceOnRequest` | boolean | Shows "Price on request" and omits the price from structured data. |
| `set` | `{ box, papers, papersDate, extras[] }` | Drives the box and papers filter and "What's included". |
| `specs` | object | `caseSize`, `material`, `dial`, `bezel`, `bracelet`, `movement`, `powerReserve`, `water`. |
| `report` | object | `case`, `bracelet`, `dial`, `crystal`, `rate`, `amplitude`, `service`. Written by the watchmaker. |
| `provenance` | string | Ownership history. |
| `art` | object | Illustration settings. Ignored once real photos replace the SVGs. |

`art` fields: `case` (`round`, `octagon`, `cushion`, `square`), `metal` (`steel`, `white`, `yellow`, `rose`), `bezel` (`dive`, `gmt`, `fluted`, `smooth`, `tachy`), `bezelColors`, `bezelMetal`, `dial` (hex color), `texture` (`gloss`, `matte`, `sunburst`, `tapisserie`, `grid`, `horizontal`, `waves`), `markers` (`baton`, `dive`, `explorer`, `arabic`, `roman`), `hands` (`baton`, `mercedes`, `dauphine`, `sword`, `snowflake`), `complication` (`none`, `date`, `daydate`, `gmt`, `chrono3`), `bracelet` (`oyster`, `jubilee`, `president`, `integrated`, `rivet`, `leather`, `rubber`), plus optional `caseScale`, `crownGuards`, `pushers`, `subdial`, `gmtHand`, `strap`, `markerColor`, `handColor`, `innerRing`, `thinBezel`.

## Connect the forms

All six forms (inquiry, hold, offer, sell or trade, appointment, price and sourcing alerts) go through one function, `send()` in `assets/js/site.js`.

- If `forms.endpoint` in `content/config.json` is empty, submissions are saved in the visitor's browser under the `localStorage` key `gv:leads`. This is the demo behavior. Nothing reaches the dealer.
- If `forms.endpoint` is set, each submission is sent as a JSON `POST` to that URL. A non-2xx response shows an error and keeps the form filled in.

Every payload has `type` (`inquiry`, `sell`, `appointment` or `alert`), a reference code `ref`, `createdAt`, `page`, and the form fields. Inquiries carry `watchId` and `intent` (`question`, `hold`, `viewing` or `offer`).

Endpoints that accept JSON without extra code include Formspree, Basin, Getform, a Netlify Function, a Vercel Function, a Zapier or Make webhook, or the dealer's CRM. Example for Formspree:

```json
"forms": { "endpoint": "https://formspree.io/f/your-form-id", "storageKey": "gv:leads" }
```

Run `node build.mjs` after changing the endpoint. Photos on the sell form are sent as file names only. To upload the files themselves, change `send()` to send the `FormData` object as `multipart/form-data` to an endpoint that accepts files.

WhatsApp buttons are plain `https://wa.me/<number>?text=...` links prefilled with the model, reference, year and listing id. They need no setup beyond `contact.whatsapp` in the config.

## Deploy

The publish directory is the repository root. There is no build command on the host. Run `node build.mjs` locally and commit the output.

**Netlify.** Drag the folder onto app.netlify.com/drop, or connect the repository with the build command empty and the publish directory set to `.`. Netlify serves `404.html` for missing pages.

**Vercel.** Import the repository, choose the "Other" framework preset, leave the build command empty and set the output directory to `.`.

**GitHub Pages.** Push to a repository, then open **Settings**, **Pages**, and deploy from the branch root. If the site lives under a sub-path such as `/greyvault/`, set `site.basePath` to `"/greyvault/"` and rebuild, so the 404 page finds its assets. All other links are relative and work under any path.

Before going live, set `site.url`, `site.demo`, the contact details and the form endpoint, rebuild, then run the checks below.

## Check the site

```bash
python3 tools/check-links.py
pip install playwright
python3 tools/verify.py --chrome /path/to/chrome --axe /path/to/axe.min.js
```

Lighthouse is optional. It serves the folder itself on port 8473:

```bash
npm install lighthouse
LIGHTHOUSE=node_modules/.bin/lighthouse node tools/lighthouse.mjs
```

`verify.py` writes full-page screenshots to `screenshots/<width>/` and a pass or fail table to `verification/report.md`. `--axe` is optional. Get `axe.min.js` with `npm install axe-core`.

## What the template deliberately leaves out

There are no popups, newsletter interstitials, countdown timers, scrolling banners or auto-opening chat widgets. The only dialog opens when a visitor presses **Inquire**. There is no cart or checkout, because buyers at this price point inquire, hold, and pay by wire or in person. Add a payment link per listing if the dealer wants card checkout.
