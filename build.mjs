import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as art from './tools/watch-art.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const cfg = read('content/config.json');
const { watches } = read('content/inventory.json');
const write = (rel, data) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
};

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = n => `$${n.toLocaleString('en-US')}`;
const B = cfg.brand;
const K = cfg.contact;
const P = cfg.policies;
const abs = p => `${cfg.site.url.replace(/\/$/, '')}/${p.replace(/^\//, '').replace(/index\.html$/, '')}`;

const CONDITIONS = {
  unworn: { label: 'Unworn', desc: 'Never worn. Factory stickers or seals where applicable. No marks under a 10x loupe.' },
  excellent: { label: 'Excellent', desc: 'Light hairlines visible only under a loupe or at an angle. No dings, no dial or hand flaws.' },
  'very-good': { label: 'Very good', desc: 'Light desk-diving marks from careful wear. Nothing that affects function or the dial.' },
  good: { label: 'Good', desc: 'Visible wear, softened edges or polish. Fully functional. Priced to reflect condition.' },
};
const AVAIL = {
  available: { label: 'Available', schema: 'InStock' },
  'on-hold': { label: 'On hold', schema: 'LimitedAvailability' },
  incoming: { label: 'Arriving soon', schema: 'PreOrder' },
  sold: { label: 'Sold', schema: 'SoldOut' },
};
const SET = {
  full: 'Box and papers',
  papers: 'Papers only',
  box: 'Box only',
  none: 'Watch only',
};
const setKey = w => (w.set.box && w.set.papers ? 'full' : w.set.papers ? 'papers' : w.set.box ? 'box' : 'none');
const isPOR = w => cfg.pricing.mode === 'request' || w.priceOnRequest;
const priceLabel = w => (isPOR(w) ? cfg.pricing.requestLabel : money(w.price));
const title = w => `${w.brand} ${w.model}`;
const refLine = w => `Ref. ${w.ref} · ${w.year}`;
const productPath = w => `product/${w.id}.html`;
const img = (w, view) => `assets/watches/${w.id}-${view}.svg`;
const waHref = text => `https://wa.me/${K.whatsapp}?text=${encodeURIComponent(text)}`;
const waWatch = w => waHref(`Hello ${B.name}, I'm interested in the ${w.brand} ${w.model.replace(/"/g, '')}, ref. ${w.ref} (${w.year}), listing ${w.id}. Is it available?`);
const waGeneral = waHref(`Hello ${B.name}, I have a question.`);
const byBrand = watches.reduce((m, w) => ((m[w.brand] ||= []).push(w), m), {});
const brands = Object.keys(byBrand);
const initials = n => n.split(' ').map(s => s[0]).join('');

const ICON = {
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 14.96L2 22l5.2-1.5A9.93 9.93 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.08.89.9-3-.2-.31a8.2 8.2 0 1 1 6.86 3.75Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.22-.08-.39-.12-.55.13-.16.24-.63.8-.78.96-.14.16-.28.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.42l-.75-1.82c-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.17 3.68c1.55.67 2.16.73 2.94.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.11-.22-.17-.47-.29Z"/></svg>',
  save: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" fill="var(--save-fill, none)" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M4 12h15m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.4"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M3 8h18M3 16h18" stroke="currentColor" stroke-width="1.4"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.4"/></svg>',
  zoom: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m16 16 4.5 4.5M8 11h6M11 8v6" stroke="currentColor" stroke-width="1.4"/></svg>',
  shield: '<svg viewBox="0 0 32 32" aria-hidden="true" class="ic-lg"><path d="M16 3.5 5.5 7.5v7.8c0 6.4 4.5 11.4 10.5 13.2 6-1.8 10.5-6.8 10.5-13.2V7.5z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="m11.5 16 3.2 3.2 6-6.4" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  loupe: '<svg viewBox="0 0 32 32" aria-hidden="true" class="ic-lg"><circle cx="13.5" cy="13.5" r="8.5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="13.5" cy="13.5" r="4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="m20 20 7 7" stroke="currentColor" stroke-width="1.2"/></svg>',
  calendar: '<svg viewBox="0 0 32 32" aria-hidden="true" class="ic-lg"><rect x="5" y="7" width="22" height="20" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5 12.5h22M11 4v6M21 4v6" stroke="currentColor" stroke-width="1.2"/><path d="m12 19.5 3 3 5.5-6" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  parcel: '<svg viewBox="0 0 32 32" aria-hidden="true" class="ic-lg"><path d="M4.5 10 16 4.5 27.5 10v12L16 27.5 4.5 22z M4.5 10 16 15.5 27.5 10M16 15.5v12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
};

const NAV = [
  ['inventory.html', 'Inventory'],
  ['sell.html', 'Sell or trade'],
  ['authenticity.html', 'Authenticity'],
  ['about.html', 'About'],
  ['visit.html', 'Visit'],
];

const TRUST = [
  { icon: 'loupe', title: 'Opened by a watchmaker', body: 'Every movement inspected, measured and documented before listing.' },
  { icon: 'shield', title: `${P.warrantyYears}-year warranty`, body: 'Covers the movement and its function. Serviced in house, not outsourced.' },
  { icon: 'calendar', title: `${P.returnDays}-day returns`, body: 'Returned in the condition it left, for a full refund.' },
  { icon: 'parcel', title: 'Insured overnight', body: 'Free in the US. Signature required, insured door to door.' },
];

function fmtTime(t) {
  const [hh, mm] = t.split(':').map(Number);
  const ap = hh >= 12 ? 'pm' : 'am';
  const h = hh % 12 || 12;
  return mm ? `${h}:${String(mm).padStart(2, '0')} ${ap}` : `${h} ${ap}`;
}
function hoursRows() {
  return cfg.hours
    .map(h => `<tr data-day="${h.day}"><th scope="row">${h.day}</th><td>${h.open ? `${fmtTime(h.open)} to ${fmtTime(h.close)}` : esc(h.note)}</td></tr>`)
    .join('');
}

function localBusinessLD() {
  const dayMap = { Monday: 'Mo', Tuesday: 'Tu', Wednesday: 'We', Thursday: 'Th', Friday: 'Fr', Saturday: 'Sa', Sunday: 'Su' };
  return {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: B.name,
    legalName: B.legalName,
    description: B.description,
    url: abs(''),
    telephone: K.phoneHref,
    email: K.email,
    image: abs('assets/og/site.png'),
    priceRange: '$$$$',
    address: { '@type': 'PostalAddress', streetAddress: K.street, addressLocality: K.city, addressRegion: K.region, postalCode: K.postal, addressCountry: K.country },
    geo: { '@type': 'GeoCoordinates', latitude: K.lat, longitude: K.lng },
    openingHours: cfg.hours.filter(h => h.open).map(h => `${dayMap[h.day]} ${h.open}-${h.close}`),
    sameAs: [`https://www.instagram.com/${B.instagram}/`],
  };
}

function layout({ file, title: t, description, body, jsonld = [], og = 'assets/og/site.png', nav, bodyClass = '', ogType = 'website' }) {
  const r = file === '404.html' ? cfg.site.basePath : '../'.repeat(file.split('/').length - 1);
  const fullTitle = file === 'index.html' ? `${B.name} · ${B.tagline}` : `${t} · ${B.name}`;
  const c = cfg.colors;
  const navHtml = NAV.map(([href, label]) => `<li><a href="${r}${href}"${nav === href ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
  const ld = jsonld.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!doctype html>
<html lang="${cfg.site.lang}" data-root="${r}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${abs(file)}">
<meta name="theme-color" content="${c.ink}">
<meta property="og:site_name" content="${esc(B.name)}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(file)}">
<meta property="og:image" content="${abs(og)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${r}assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${r}assets/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${r}assets/img/apple-touch-icon.png">
<link rel="manifest" href="${r}site.webmanifest">
<link rel="preload" href="${r}assets/fonts/cormorant.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${r}assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${r}assets/css/site.css">
<style>:root{--ink:${c.ink};--ivory:${c.ivory};--paper:${c.paper};--line:${c.line};--muted:${c.muted};--steel:${c.steel};--accent:${c.accent}}</style>
<script src="${r}assets/js/data.js" defer></script>
<script src="${r}assets/js/site.js" defer></script>
${ld}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
${cfg.site.demo ? `<aside class="demo-note" aria-label="Demo notice">Template demo. Listings, people and prices are fictional. <a href="${r}legal.html#demo">About this demo</a></aside>` : ''}
<header class="site-header">
  <div class="wrap header-row">
    <a class="wordmark" href="${r}index.html" aria-label="${esc(B.name)} home"><span class="wm-name">${esc(B.name)}</span><span class="wm-sub">47th Street · New York</span></a>
    <nav class="primary-nav" id="primary-nav" aria-label="Primary"><ul>${navHtml}</ul></nav>
    <div class="header-actions">
      <a class="hdr-icon" href="${r}saved.html" aria-label="Saved watches">${ICON.save}<span class="saved-count" data-saved-count hidden>0</span></a>
      <a class="hdr-icon hdr-wa" href="${waGeneral}" target="_blank" rel="noopener" aria-label="Message us on WhatsApp">${ICON.wa}</a>
      <button class="btn btn-sm hdr-inquire" type="button" data-inquire>Inquire</button>
      <button class="hdr-icon menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Menu">${ICON.menu}</button>
    </div>
  </div>
</header>
<main id="main" tabindex="-1">
${body}
</main>
${footer(r)}
${inquiryDialog(r)}
</body>
</html>`;
}

function footer(r) {
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="f-brand">
      <p class="wordmark wordmark-light"><span class="wm-name">${esc(B.name)}</span><span class="wm-sub">Since ${B.founded}</span></p>
      <p class="f-blurb">${esc(B.description)}</p>
      <address>${esc(K.street)}<br>${esc(K.city)}, ${K.region} ${K.postal}<br><a href="tel:${K.phoneHref}">${esc(K.phone)}</a><br><a href="mailto:${K.email}">${esc(K.email)}</a></address>
    </div>
    <div><h2 class="f-h">Inventory</h2><ul>${brands.map(b => `<li><a href="${r}inventory.html?brand=${encodeURIComponent(b)}">${esc(b)}</a></li>`).join('')}<li><a href="${r}inventory.html">All watches</a></li></ul></div>
    <div><h2 class="f-h">Dealer</h2><ul><li><a href="${r}sell.html">Sell or trade</a></li><li><a href="${r}authenticity.html">Authenticity</a></li><li><a href="${r}about.html">About and team</a></li><li><a href="${r}visit.html">Visit the booth</a></li><li><a href="${r}faq.html">FAQ</a></li></ul></div>
    <div><h2 class="f-h">Hours</h2><table class="f-hours"><tbody>${hoursRows()}</tbody></table></div>
  </div>
  <div class="wrap footer-base">
    <p>© <span data-copyright-year>2026</span> ${esc(B.legalName)}. Independent dealer. Not affiliated with any brand shown. Brand names are trademarks of their owners.</p>
    <p><a href="${r}legal.html">Terms, warranty and privacy</a> · <a href="${r}sitemap.xml">Sitemap</a></p>
  </div>
</footer>`;
}

function inquiryDialog(r) {
  return `<dialog class="inquiry" id="inquiry-dialog" aria-labelledby="inq-title">
  <div class="inq-inner">
    <button class="inq-close" type="button" data-close aria-label="Close">${ICON.close}</button>
    <div data-form-body>
      <p class="eyebrow">Private inquiry</p>
      <h2 id="inq-title" class="inq-title">Ask about a watch</h2>
      <div class="inq-watch" data-inq-watch hidden><img alt="" width="72" height="72" data-inq-img><div><p class="inq-w-title" data-inq-name></p><p class="inq-w-ref" data-inq-ref></p></div></div>
      <form data-form="inquiry" novalidate>
        <input type="hidden" name="watchId">
        <fieldset class="intent"><legend>What would you like to do?</legend>
          <label><input type="radio" name="intent" value="question" checked><span>Ask a question</span></label>
          <label><input type="radio" name="intent" value="hold"><span>Hold it for ${P.holdHours} hours</span></label>
          <label><input type="radio" name="intent" value="viewing"><span>See it at the booth</span></label>
          <label><input type="radio" name="intent" value="offer"><span>Make an offer</span></label>
        </fieldset>
        <div class="field-row">
          <div class="field"><label for="inq-name">Name</label><input id="inq-name" name="name" autocomplete="name" required><p class="err" data-err-for="name"></p></div>
          <div class="field"><label for="inq-email">Email</label><input id="inq-email" name="email" type="email" autocomplete="email"><p class="err" data-err-for="email"></p></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="inq-phone">Phone or WhatsApp <span class="opt">if no email</span></label><input id="inq-phone" name="phone" type="tel" autocomplete="tel"><p class="err" data-err-for="phone"></p></div>
          <div class="field"><label for="inq-pref">Reply by</label><select id="inq-pref" name="preferred"><option>Email</option><option>Phone call</option><option>WhatsApp</option><option>Text message</option></select></div>
        </div>
        <div class="field" data-offer-field hidden><label for="inq-offer">Your offer (USD)</label><input id="inq-offer" name="offer" inputmode="numeric" placeholder="e.g. 13,500"><p class="err" data-err-for="offer"></p></div>
        <div class="field"><label for="inq-msg">Message <span class="opt">optional</span></label><textarea id="inq-msg" name="message" rows="3"></textarea></div>
        <button class="btn btn-block" type="submit">Send inquiry</button>
        <p class="fine">A named person replies, usually within two business hours. We never share your details. <a href="${r}legal.html#privacy">Privacy</a></p>
      </form>
    </div>
    <div class="success" data-success hidden tabindex="-1"></div>
    <p class="inq-alt">Prefer chat? <a data-inq-wa href="${waGeneral}" target="_blank" rel="noopener">${ICON.wa} WhatsApp ${esc(B.name)}</a></p>
  </div>
</dialog>`;
}

function card(w, r, { lazy = true, h = 'h3' } = {}) {
  const a = AVAIL[w.availability];
  const facts = [w.specs.caseSize, CONDITIONS[w.condition].label, SET[setKey(w)]];
  return `<article class="card" data-card data-id="${w.id}" data-brand="${esc(w.brand)}" data-family="${esc(w.family)}" data-price="${isPOR(w) ? '' : w.price}" data-cond="${w.condition}" data-set="${setKey(w)}" data-avail="${w.availability}" data-year="${w.year}" data-added="${w.added}" data-featured="${w.featured ? 1 : 0}" data-search="${esc(`${w.brand} ${w.family} ${w.model} ${w.ref} ${w.year} ${w.specs.dial} ${w.specs.material}`.toLowerCase())}">
  <div class="card-media"><img src="${r}${img(w, 'front')}" alt="${esc(`${title(w)} ${w.ref}, illustration`)}" width="400" height="400"${lazy ? ' loading="lazy"' : ''} decoding="async">${w.availability !== 'available' ? `<span class="tag tag-${w.availability}">${a.label}</span>` : ''}
    <button class="save-btn" type="button" data-save="${w.id}" aria-pressed="false" aria-label="Save ${esc(title(w))}">${ICON.save}</button></div>
  <div class="card-body">
    <p class="card-brand">${esc(w.brand)}</p>
    <${h} class="card-title"><a class="stretch" href="${r}${productPath(w)}">${esc(w.model)}</a></${h}>
    <p class="card-ref">${esc(refLine(w))}</p>
    <p class="card-facts">${facts.map(esc).join('<span aria-hidden="true"> · </span>')}</p>
    <div class="card-foot">
      <p class="card-price${isPOR(w) ? ' por' : ''}">${w.availability === 'sold' ? 'Sold' : esc(priceLabel(w))}</p>
      <div class="card-actions">${w.availability === 'sold'
        ? `<a class="link-sm" href="${r}inventory.html?family=${encodeURIComponent(w.family)}">Find similar</a>`
        : `<button class="link-sm" type="button" data-inquire="${w.id}">Inquire</button><a class="link-sm wa" href="${waWatch(w)}" target="_blank" rel="noopener" aria-label="WhatsApp about ${esc(title(w))}">${ICON.wa}<span>WhatsApp</span></a>`}</div>
    </div>
  </div>
</article>`;
}

const sortFeatured = list => [...list].sort((a, b) => (a.availability === 'sold') - (b.availability === 'sold') || b.featured - a.featured || b.added.localeCompare(a.added));

function mapSvg() {
  return `<svg class="map" viewBox="0 0 640 400" role="img" aria-labelledby="map-t map-d"><title id="map-t">Map of the Diamond District</title><desc id="map-d">${esc(B.name)} is at ${esc(K.street)}, on West 47th Street between Fifth and Sixth Avenue.</desc>
  <rect width="640" height="400" fill="#E9E4DB"/>
  <g fill="#DED8CD"><rect x="0" y="0" width="104" height="90"/><rect x="138" y="0" width="362" height="90"/><rect x="534" y="0" width="106" height="90"/><rect x="0" y="122" width="104" height="60"/><rect x="138" y="122" width="362" height="60"/><rect x="534" y="122" width="106" height="60"/><rect x="0" y="216" width="104" height="58"/><rect x="138" y="216" width="362" height="58"/><rect x="534" y="216" width="106" height="58"/><rect x="0" y="306" width="104" height="94"/><rect x="138" y="306" width="362" height="94"/><rect x="534" y="306" width="106" height="94"/></g>
  <rect x="138" y="182" width="362" height="34" fill="#121212" opacity=".07"/>
  <g font-family="Inter, Arial, sans-serif" font-size="12" letter-spacing="1.5" fill="#5C5852">
    <text x="548" y="111">W 48TH ST</text><text x="548" y="204">W 47TH ST</text><text x="548" y="295">W 46TH ST</text>
    <text transform="translate(126 386) rotate(-90)">FIFTH AVE</text><text transform="translate(522 386) rotate(-90)">SIXTH AVE</text>
  </g>
  <text x="319" y="250" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="16" fill="#5C5852">Diamond District</text>
  <g transform="translate(276 182)"><circle r="18" fill="#121212" opacity=".12"/><circle r="8" fill="#121212"/><circle r="3" fill="#F7F5F1"/></g>
  <g font-family="Inter, Arial, sans-serif"><rect x="176" y="134" width="200" height="30" fill="#121212"/><text x="276" y="154" text-anchor="middle" font-size="12" letter-spacing="1.2" fill="#F7F5F1">${esc(B.name.toUpperCase())} · BOOTH 12</text></g>
</svg>`;
}

function trustStrip(dark = false) {
  return `<section class="trust${dark ? ' trust-dark' : ''}" aria-label="Our guarantees"><ul class="wrap trust-grid">${TRUST.map(t => `<li>${ICON[t.icon]}<div><p class="trust-t">${esc(t.title)}</p><p class="trust-b">${esc(t.body)}</p></div></li>`).join('')}</ul></section>`;
}

const AUTH_STEPS = [
  ['Source', 'We buy from owners and collectors we can identify. Every seller shows ID and signs a statement of ownership. Serials are checked against stolen-watch registries before we pay.'],
  ['Open', 'A watchmaker removes the case back and inspects the movement, calibre number, rotor, bridges and engravings against manufacturer references for that serial range.'],
  ['Measure', 'Timegrapher readings in six positions: rate, amplitude and beat error. Water resistance pressure tested. Results go on the listing, not in a drawer.'],
  ['Inspect', 'Case, bezel, dial, hands, crystal and bracelet checked under 10x magnification for aftermarket parts, refinished dials and relumed hands. Any polishing is disclosed.'],
  ['Document', 'Condition report written and signed by the inspecting watchmaker. Photographs of every flaw we find. You see exactly what we saw.'],
  ['Guarantee', `Every watch ships with our lifetime authenticity guarantee and a ${P.warrantyYears}-year mechanical warranty, transferable to the next owner.`],
];

const FAQ = [
  ['Are your watches authentic?', 'Yes. Every piece is opened and inspected by our watchmaker before it is listed, and every sale carries a lifetime authenticity guarantee. If any watch we sold is ever shown not to be genuine, we refund the full purchase price.'],
  ['What does “grey market” mean?', 'Grey market means the watch is sold by an independent dealer, not an authorized retailer. The watches are genuine. It is how most pre-owned and hard-to-find references are bought. Manufacturer warranties carry over where still active.'],
  ['Why do some watches say “Price on request”?', 'Prices on a few high-demand references move week to week. We would rather give you a firm, current number by message than show a stale one. Ask and we answer the same day.'],
  ['Can I hold a watch?', `Yes. Use “Hold ${P.holdHours} hours” on any listing. A hold is free and gives you time to see it or arrange payment. After ${P.holdHours} hours it is released unless you ask us to extend.`],
  ['Do you accept trade-ins?', 'Yes. Put any watch you own toward a piece on the site. Send photos through the Sell or trade form and we quote within one business day.'],
  ['How do I pay?', 'Bank wire is preferred and has no fee. We also accept certified checks, cash in person, cards up to $15,000 with a 3% fee, and financing through a lending partner subject to approval.'],
  ['How does shipping work?', `${P.insuredShipping} ${P.international}`],
  ['What is your return policy?', `You have ${P.returnDays} days from delivery to return a watch in the same condition it left us, with all included items and the security tag intact, for a full refund.`],
  ['What does the warranty cover?', `${P.warrantyYears} years on the movement and its function. It excludes crystals, straps, water damage after delivery and accidental damage. Warranty work is done in house.`],
  ['Can I visit?', `Yes. We are at ${K.street}, ${K.city}. Walk-ins are welcome during opening hours. Book an appointment if you want a specific watch ready and a private table.`],
];

const pages = [];
const page = (file, nav, title, description, body, extra = {}) => pages.push({ file, nav, title, description, body, ...extra });

function home() {
  const r = '';
  const hero = watches.find(w => w.id === 'rolex-gmt-master-ii-126710blro-2023') || watches[0];
  const featured = sortFeatured(watches.filter(w => w.featured && w.id !== hero.id && w.availability !== 'sold')).slice(0, 4);
  const latest = [...watches].filter(w => w.availability !== 'sold' && w !== hero && !featured.includes(w)).sort((a, b) => b.added.localeCompare(a.added)).slice(0, 4);
  const rv = cfg.reviews;
  page('index.html', null, 'Home', `${B.tagline} ${B.description}`, `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy reveal">
      <p class="eyebrow">Independent dealer · Est. ${B.founded}</p>
      <h1>Pre-owned Rolex, Audemars Piguet and Patek Philippe. <em>Inspected on 47th Street.</em></h1>
      <p class="lede">Every watch is opened, measured and documented by a watchmaker before it is listed. Prices are shown. Flaws are disclosed. A named person answers your message.</p>
      <div class="cta-row"><a class="btn" href="inventory.html">View ${watches.filter(w => w.availability !== 'sold').length} watches</a><a class="btn btn-ghost" href="sell.html">Sell or trade</a></div>
    </div>
    <figure class="hero-piece">
      <a href="${productPath(hero)}" class="hero-link" tabindex="-1" aria-hidden="true"><img src="${img(hero, 'front')}" alt="" width="400" height="400" fetchpriority="high"></a>
      <figcaption><span class="hp-label">Just in</span><span class="hp-name">${esc(title(hero))}</span><span class="hp-meta">${esc(refLine(hero))} · ${esc(CONDITIONS[hero.condition].label)} · ${esc(priceLabel(hero))}</span><a class="hp-cta" href="${productPath(hero)}">View the condition report ${ICON.arrow}</a></figcaption>
    </figure>
  </div>
</section>
${trustStrip()}
<section class="section">
  <div class="wrap">
    <div class="section-head reveal"><div><p class="eyebrow">Selected pieces</p><h2>Worth a closer look</h2></div><a class="link-arrow" href="inventory.html">All inventory ${ICON.arrow}</a></div>
    <div class="grid grid-4">${featured.map(w => card(w, r)).join('')}</div>
  </div>
</section>
<section class="section section-paper">
  <div class="wrap split">
    <div class="reveal">
      <p class="eyebrow">How we authenticate</p>
      <h2>Six checks before a watch is listed</h2>
      <p class="lede-sm">The street's reputation for fakes, swapped parts and polished cases is earned by a few. We answer it with a process you can read, and a report signed by the person who did the work.</p>
      <a class="link-arrow" href="authenticity.html">Read the full process ${ICON.arrow}</a>
    </div>
    <ol class="steps reveal">${AUTH_STEPS.map(([t, b], i) => `<li><span class="step-n">${String(i + 1).padStart(2, '0')}</span><div><p class="step-t">${t}</p><p class="step-b">${esc(b)}</p></div></li>`).join('')}</ol>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head reveal"><div><p class="eyebrow">Recently listed</p><h2>New this month</h2></div><a class="link-arrow" href="inventory.html?sort=newest">Newest first ${ICON.arrow}</a></div>
    <div class="grid grid-4">${latest.map(w => card(w, r)).join('')}</div>
  </div>
</section>
<section class="section section-ink">
  <div class="wrap">
    <p class="eyebrow eyebrow-light">Shop by maker</p>
    <ul class="brand-shelf">${brands.map(b => `<li><a href="inventory.html?brand=${encodeURIComponent(b)}"><span class="bs-name">${esc(b)}</span><span class="bs-count">${byBrand[b].filter(w => w.availability !== 'sold').length} available</span></a></li>`).join('')}</ul>
  </div>
</section>
<section class="section">
  <div class="wrap split split-even">
    <div class="door reveal">
      <p class="eyebrow">Sell or trade</p>
      <h2>Your watch, a fair number, one visit</h2>
      <p>Send a few photos and the reference. We reply within one business day with a firm offer to buy outright, or a trade value toward anything here. Payment by same-day wire.</p>
      <a class="btn" href="sell.html">Get an offer</a>
    </div>
    <div class="reviews reveal">
      <p class="eyebrow">${rv.rating} out of 5 · ${rv.count} ${esc(rv.source)} reviews <span class="demo-chip">demo</span></p>
      ${rv.items.map(q => `<blockquote><p>“${esc(q.quote)}”</p><footer>${esc(q.author)} · ${esc(q.piece)}</footer></blockquote>`).join('')}
    </div>
  </div>
</section>
<section class="section section-paper">
  <div class="wrap">
    <div class="section-head reveal"><div><p class="eyebrow">The people</p><h2>You will deal with one of us</h2></div><a class="link-arrow" href="about.html">About ${esc(B.name)} ${ICON.arrow}</a></div>
    <ul class="team team-compact">${cfg.team.map(p => `<li class="reveal"><img src="assets/img/team-${initials(p.name).toLowerCase()}.svg" alt="Portrait placeholder for ${esc(p.name)}" width="300" height="360" loading="lazy"><p class="tm-name">${esc(p.name)}</p><p class="tm-role">${esc(p.role)} · since ${p.since}</p></li>`).join('')}</ul>
  </div>
</section>
<section class="section">
  <div class="wrap split split-even visit-block">
    <div class="reveal">
      <p class="eyebrow">Visit</p>
      <h2>Booth 12, West 47th Street</h2>
      <p>${esc(K.directions)}</p>
      <table class="hours" data-hours><tbody>${hoursRows()}</tbody></table>
      <div class="cta-row"><a class="btn" href="visit.html#appointment">Book a private viewing</a><a class="btn btn-ghost" href="${K.mapUrl}" target="_blank" rel="noopener">Directions</a></div>
    </div>
    <div class="reveal">${mapSvg()}</div>
  </div>
</section>`, { jsonld: [localBusinessLD(), { '@context': 'https://schema.org', '@type': 'WebSite', name: B.name, url: abs('') }] });
}

function inventory() {
  const r = '';
  const families = brands.map(b => [b, [...new Set(byBrand[b].map(w => w.family))]]);
  const priceSteps = [5000, 10000, 15000, 25000, 50000, 100000];
  const sorted = sortFeatured(watches);
  const check = (name, value, label, count) => `<label class="chk"><input type="checkbox" name="${name}" value="${esc(value)}"><span>${esc(label)}</span>${count != null ? `<span class="cnt">${count}</span>` : ''}</label>`;
  page('inventory.html', 'inventory.html', 'Inventory', `Pre-owned Rolex, Audemars Piguet, Patek Philippe, Omega, Cartier and Tudor. ${watches.length} watches, each with a watchmaker's condition report.`, `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Inventory</p>
    <h1>Every watch, with its condition report</h1>
    <p class="lede-sm">Filter by maker, model, budget and what comes with it. Prices are shown unless a reference moves daily. Ask about anything not listed and we will source it.</p>
  </div>
</section>
<section class="wrap inv">
  <div class="inv-bar">
    <label class="search"><span class="sr-only">Search inventory</span>${ICON.search}<input type="search" name="q" placeholder="Search model, reference or year" data-filter-input="q" autocomplete="off"></label>
    <button class="btn btn-ghost btn-sm filter-toggle" type="button" aria-expanded="false" aria-controls="filters">Filters <span data-active-count></span></button>
    <label class="sort"><span>Sort</span><select data-filter-input="sort">
      <option value="featured">Featured</option><option value="newest">Newest listed</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option><option value="year-desc">Year, newest</option><option value="year-asc">Year, oldest</option>
    </select></label>
  </div>
  <div class="inv-layout">
    <aside class="filters" id="filters" aria-label="Filters">
      <form data-filters>
        <fieldset><legend>Maker</legend>${brands.map(b => check('brand', b, b, byBrand[b].length)).join('')}</fieldset>
        <fieldset><legend>Model</legend><label class="sr-only" for="f-family">Model family</label><select id="f-family" name="family"><option value="">All models</option>${families.map(([b, fs]) => `<optgroup label="${esc(b)}">${fs.map(f => `<option value="${esc(f)}" data-brand="${esc(b)}">${esc(f)}</option>`).join('')}</optgroup>`).join('')}</select></fieldset>
        <fieldset><legend>Price</legend><div class="price-row">
          <label><span class="sr-only">Minimum price</span><select name="min"><option value="">No min</option>${priceSteps.map(p => `<option value="${p}">${money(p)}</option>`).join('')}</select></label><span aria-hidden="true">to</span>
          <label><span class="sr-only">Maximum price</span><select name="max"><option value="">No max</option>${priceSteps.map(p => `<option value="${p}">${money(p)}</option>`).join('')}</select></label></div>
          <p class="fine" data-por-note hidden></p></fieldset>
        <fieldset><legend>Condition</legend>${Object.entries(CONDITIONS).map(([k, c]) => check('cond', k, c.label, watches.filter(w => w.condition === k).length)).join('')}<a class="fine-link" href="authenticity.html#grading">How we grade</a></fieldset>
        <fieldset><legend>Box and papers</legend>${Object.entries(SET).map(([k, l]) => check('set', k, l, watches.filter(w => setKey(w) === k).length)).join('')}</fieldset>
        <fieldset><legend>Availability</legend>${Object.entries(AVAIL).map(([k, a]) => check('avail', k, a.label, watches.filter(w => w.availability === k).length)).join('')}</fieldset>
        <button class="link-sm clear" type="reset">Clear all filters</button>
      </form>
    </aside>
    <div class="inv-results">
      <p class="inv-count" role="status" aria-live="polite" data-result-count>${watches.length} watches</p>
      <h2 class="sr-only">Results</h2>
      <div class="grid grid-3" data-grid>${sorted.map(w => card(w, r)).join('')}</div>
      <div class="empty" data-empty hidden><h2>Nothing matches yet</h2><p>Clear a filter, or tell us what you are after below. We source most references within two weeks.</p><button class="btn btn-ghost" type="button" data-clear>Clear filters</button></div>
    </div>
  </div>
</section>
<section class="section section-paper" id="source">
  <div class="wrap split split-even">
    <div><p class="eyebrow">Sourcing and alerts</p><h2>Not here yet? We will find it.</h2><p>Tell us the reference and budget. We will message you when one arrives, before it is listed. No newsletter, one message per match.</p></div>
    <form class="stack-form" data-form="alert" novalidate>
      <input type="hidden" name="kind" value="sourcing">
      <div class="field-row"><div class="field"><label for="al-model">Watch or reference</label><input id="al-model" name="model" required placeholder="e.g. Rolex 126500LN" data-source-model><p class="err" data-err-for="model"></p></div>
      <div class="field"><label for="al-budget">Budget <span class="opt">optional</span></label><input id="al-budget" name="budget" inputmode="numeric" placeholder="USD"></div></div>
      <div class="field"><label for="al-email">Email</label><input id="al-email" name="email" type="email" required autocomplete="email"><p class="err" data-err-for="email"></p></div>
      <button class="btn" type="submit">Notify me</button>
      <div class="success" data-success hidden tabindex="-1"></div>
    </form>
  </div>
</section>`, {
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: `${B.name} inventory`, itemListElement: sorted.map((w, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(productPath(w)), name: title(w) })) }],
  });
}

function product(w) {
  const r = '../';
  const c = CONDITIONS[w.condition];
  const a = AVAIL[w.availability];
  const sold = w.availability === 'sold';
  const views = [['front', 'Front'], ['dial', 'Dial'], ['back', 'Case back'], ...(art.boxAndPapers(w) ? [['set', 'Box and papers']] : [])];
  const altFor = label => `${title(w)} ${w.ref}, ${label.toLowerCase()} view, illustration`;
  const related = sortFeatured(watches.filter(x => x.id !== w.id && x.availability !== 'sold'))
    .map(x => [x, (x.family === w.family) * 3 + (x.brand === w.brand) * 2 + (Math.abs((x.price || 0) - (w.price || 0)) < 15000)])
    .sort((p, q) => q[1] - p[1]).slice(0, 4).map(([x]) => x);
  const specRows = [
    ['Maker', w.brand], ['Model', w.model], ['Reference', w.ref], ['Year', w.year], ['Case', `${w.specs.caseSize}, ${w.specs.material}`],
    ['Dial', w.specs.dial], ['Bezel', w.specs.bezel], ['Bracelet', w.specs.bracelet], ['Movement', w.specs.movement], ['Power reserve', w.specs.powerReserve], ['Water resistance', w.specs.water],
  ];
  const report = [['Case', w.report.case], ['Bracelet or strap', w.report.bracelet], ['Dial and hands', w.report.dial], ['Crystal', w.report.crystal], ['Service', w.report.service]];
  const included = [w.set.box && 'Original box', w.set.papers && `Original papers${w.set.papersDate ? `, dated ${w.set.papersDate}` : ''}`, ...w.set.extras, `${B.name} condition report, signed`, `${P.warrantyYears}-year ${B.name} warranty card`].filter(Boolean);
  const notIncluded = [!w.set.box && 'original box', !w.set.papers && 'original papers'].filter(Boolean);
  const grades = Object.entries(CONDITIONS);
  const gradeIdx = grades.findIndex(([k]) => k === w.condition);
  const advisor = cfg.team[2].name.split(' ')[0];
  const ld = [{
    '@context': 'https://schema.org', '@type': 'Product', name: `${title(w)} ${w.ref}`, sku: w.id, mpn: w.ref,
    brand: { '@type': 'Brand', name: w.brand }, image: [abs(`assets/og/${w.id}.png`)],
    description: `${w.year} ${title(w)}, reference ${w.ref}. ${c.label} condition. ${SET[setKey(w)]}. ${w.provenance}`,
    model: w.model, productionDate: String(w.year),
    ...(isPOR(w) ? {} : { offers: { '@type': 'Offer', url: abs(productPath(w)), priceCurrency: cfg.site.currency, price: w.price, availability: `https://schema.org/${a.schema}`, itemCondition: 'https://schema.org/UsedCondition', seller: { '@type': 'Organization', name: B.name } } }),
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('') },
      { '@type': 'ListItem', position: 2, name: 'Inventory', item: abs('inventory.html') },
      { '@type': 'ListItem', position: 3, name: title(w), item: abs(productPath(w)) },
    ],
  }];
  const statusNote = { 'on-hold': '. Held for a client. Inquire to be next in line.', incoming: '. Inquire to reserve a first look.', sold: '. Ask us to source another.' }[w.availability] || '';
  page(productPath(w), 'inventory.html', `${title(w)} ${w.ref} (${w.year})`, `${w.year} ${title(w)} ref. ${w.ref}. ${c.label} condition, ${SET[setKey(w)].toLowerCase()}. ${isPOR(w) ? 'Price on request' : money(w.price)}. Watchmaker condition report, ${P.warrantyYears}-year warranty.`, `
<nav class="wrap crumbs" aria-label="Breadcrumb"><ol><li><a href="${r}index.html">Home</a></li><li><a href="${r}inventory.html">Inventory</a></li><li><a href="${r}inventory.html?brand=${encodeURIComponent(w.brand)}">${esc(w.brand)}</a></li><li aria-current="page">${esc(w.model)}</li></ol></nav>
<section class="wrap pdp" data-product="${w.id}">
  <div class="gallery" data-gallery>
    <div class="g-main" data-zoom-wrap><img src="${r}${img(w, 'front')}" alt="${esc(altFor('Front'))}" width="400" height="400" data-g-img fetchpriority="high">
      <button class="g-zoom" type="button" data-zoom aria-pressed="false">${ICON.zoom}<span>Zoom</span></button></div>
    <ul class="g-thumbs" aria-label="Views">${views.map(([v, label], i) => `<li><button type="button" data-view="${r}${img(w, v)}" data-alt="${esc(altFor(label))}" aria-pressed="${i === 0}" aria-label="Show ${label.toLowerCase()} view"><img src="${r}${img(w, v)}" alt="" width="96" height="96" loading="lazy"></button></li>`).join('')}</ul>
    <p class="fine">Illustrations for this demo. Live listings use the dealer's own photographs of this exact watch.</p>
  </div>
  <div class="pdp-info">
    <p class="eyebrow">${esc(w.brand)} · ${esc(w.family)}</p>
    <h1 class="pdp-title">${esc(w.model)}</h1>
    <p class="pdp-ref">${esc(refLine(w))}</p>
    <p class="pdp-price${isPOR(w) && !sold ? ' por' : ''}">${sold ? 'Sold' : esc(priceLabel(w))}</p>
    ${isPOR(w) && !sold ? '<p class="fine">Current price by message, same day. This reference moves weekly.</p>' : ''}
    <p class="status status-${w.availability}"><span class="dot" aria-hidden="true"></span>${a.label}${statusNote}</p>
    <ul class="pdp-facts">
      <li><span>Condition</span><a href="#condition">${c.label}</a></li>
      <li><span>Included</span><a href="#included">${SET[setKey(w)]}</a></li>
      <li><span>Polished</span><span>${w.polished ? 'Yes, disclosed' : 'Never'}</span></li>
      <li><span>Timekeeping</span><span>${esc(w.report.rate)}</span></li>
    </ul>
    <div class="pdp-cta" data-main-cta>
      ${sold
        ? `<a class="btn btn-block" href="${r}inventory.html?source=${encodeURIComponent(`${w.brand} ${w.ref}`)}#source">Ask us to source one</a>`
        : `<button class="btn btn-block" type="button" data-inquire="${w.id}">Inquire</button>
      <div class="cta-pair"><button class="btn btn-ghost" type="button" data-inquire="${w.id}" data-intent="hold">Hold ${P.holdHours} hours</button><a class="btn btn-ghost btn-wa" href="${waWatch(w)}" target="_blank" rel="noopener">${ICON.wa}WhatsApp</a></div>`}
      <button class="save-inline" type="button" data-save="${w.id}" aria-pressed="false">${ICON.save}<span data-save-label>Save to watchlist</span></button>
    </div>
    <ul class="pdp-trust">${TRUST.map(t => `<li>${ICON[t.icon]}<span>${esc(t.title)}</span></li>`).join('')}</ul>
    <p class="pdp-contact">Questions? Call <a href="tel:${K.phoneHref}">${esc(K.phone)}</a> or visit Booth 12 and ask for ${esc(advisor)}.</p>
  </div>
</section>
<nav class="wrap pdp-toc" aria-label="On this page"><a href="#specs">Specifications</a><a href="#condition">Condition report</a><a href="#included">What's included</a><a href="#provenance">Provenance</a><a href="#guarantee">Guarantee</a><a href="#shipping">Shipping and returns</a><a href="#payment">Payment</a></nav>
<div class="wrap pdp-sections">
  <section id="specs" class="pdp-sec"><h2>Specifications</h2><table class="spec"><tbody>${specRows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></section>
  <section id="condition" class="pdp-sec"><h2>Condition report</h2>
    <p class="sr-only">Grade ${gradeIdx + 1} of ${grades.length}, where 1 is best.</p>
    <ol class="grade" aria-hidden="true">${grades.map(([k, g]) => `<li class="${k === w.condition ? 'on' : ''}">${g.label}</li>`).join('')}</ol>
    <p class="grade-desc"><strong>${c.label}.</strong> ${esc(c.desc)}</p>
    <dl class="report">${report.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}<div><dt>Polishing</dt><dd>${w.polished ? 'Polished. See case notes above.' : 'Never polished. Factory finishing intact.'}</dd></div></dl>
    <div class="timing"><div><p class="t-k">Rate</p><p class="t-v">${esc(w.report.rate)}</p></div><div><p class="t-k">Amplitude</p><p class="t-v">${esc(w.report.amplitude)}</p></div><div><p class="t-k">Inspected by</p><p class="t-v">${esc(cfg.team[1].name)}</p></div></div>
    <p class="fine">Timegrapher average across six positions, measured at full wind. <a href="${r}authenticity.html#grading">How we grade</a></p>
  </section>
  <section id="included" class="pdp-sec"><h2>What's included</h2><ul class="ticks">${included.map(i => `<li>${esc(i)}</li>`).join('')}</ul>${notIncluded.length ? `<p class="fine">Not included: ${notIncluded.join(' and ')}. Priced accordingly.</p>` : ''}</section>
  <section id="provenance" class="pdp-sec"><h2>Provenance</h2><p>${esc(w.provenance)}</p><p class="fine">Seller identity verified and serial checked against stolen-watch registries before purchase. Records kept on file.</p></section>
  <section id="guarantee" class="pdp-sec"><h2>Authenticity guarantee</h2><p>This watch was opened and inspected in house. If it is ever shown not to be genuine, or to contain parts we did not disclose, we refund the full purchase price. No time limit. The guarantee transfers with the watch.</p><a class="link-arrow" href="${r}authenticity.html">Our six-step process ${ICON.arrow}</a></section>
  <section id="shipping" class="pdp-sec"><h2>Shipping and returns</h2><p>${esc(P.insuredShipping)} ${esc(P.international)}</p><p>${P.returnDays}-day returns from delivery, in the condition it left us, for a full refund. ${P.warrantyYears}-year mechanical warranty, serviced in house.</p></section>
  <section id="payment" class="pdp-sec pdp-sec-wide"><h2>Payment options</h2><dl class="pay">${cfg.payments.map(p => `<div><dt>${esc(p.name)}</dt><dd>${esc(p.note)}</dd></div>`).join('')}</dl>
    ${!isPOR(w) && !sold ? `<p class="fine">Illustration only: ${money(w.price)} over 12 months at 9.99% APR is about ${money(Math.round((w.price * (0.0999 / 12)) / (1 - Math.pow(1 + 0.0999 / 12, -12))))} a month, subject to approval.</p>` : ''}</section>
</div>
<section class="wrap pdp-doors">
  <div class="door-card"><p class="eyebrow">Trade-in</p><h2>Put your watch toward this one</h2><p>Send photos of what you own. We quote a trade value within one business day.</p><a class="btn btn-ghost" href="${r}sell.html?toward=${encodeURIComponent(w.id)}">Get a trade value</a></div>
  <div class="door-card"><p class="eyebrow">Price alert</p><h2>Hear first if the price changes</h2>
    <form class="inline-form" data-form="alert" novalidate><input type="hidden" name="kind" value="price"><input type="hidden" name="watchId" value="${w.id}">
      <div class="field"><label for="pa-email">Email</label><div class="inline-row"><input id="pa-email" name="email" type="email" required autocomplete="email"><button class="btn" type="submit">Alert me</button></div><p class="err" data-err-for="email"></p></div>
      <div class="success" data-success hidden tabindex="-1"></div></form>
    <p class="fine">One message if the price drops or it sells. Nothing else.</p></div>
</section>
<section class="section"><div class="wrap"><div class="section-head"><div><p class="eyebrow">You may also consider</p><h2>Related pieces</h2></div><a class="link-arrow" href="${r}inventory.html">All inventory ${ICON.arrow}</a></div><div class="grid grid-4">${related.map(x => card(x, r)).join('')}</div></div></section>
${sold ? '' : `<div class="sticky-cta" data-sticky aria-hidden="true" inert><div class="wrap sticky-row"><img src="${r}${img(w, 'front')}" alt="" width="44" height="44"><div class="s-meta"><p class="s-name">${esc(w.model)}</p><p class="s-price">${esc(priceLabel(w))}</p></div><button class="btn btn-sm" type="button" data-inquire="${w.id}">Inquire</button><a class="btn btn-sm btn-ghost btn-wa" href="${waWatch(w)}" target="_blank" rel="noopener" aria-label="WhatsApp about this watch">${ICON.wa}<span>WhatsApp</span></a></div></div>`}`, { jsonld: ld, og: `assets/og/${w.id}.png`, ogType: 'product', bodyClass: sold ? '' : 'has-sticky' });
}

function sell() {
  page('sell.html', 'sell.html', 'Sell or trade your watch', 'Sell or trade your Rolex, Audemars Piguet, Patek Philippe or other luxury watch. Firm offer within one business day, same-day wire.', `
<section class="page-head"><div class="wrap narrow">
  <p class="eyebrow">Sell or trade</p><h1>A firm offer within one business day</h1>
  <p class="lede-sm">Send the reference, a few photos and what comes with it. We reply with one number to buy outright and one to trade toward any piece in our inventory. No obligation.</p>
</div></section>
<section class="wrap split sell-split">
  <ol class="steps steps-plain">
    <li><span class="step-n">01</span><div><p class="step-t">Tell us about it</p><p class="step-b">Reference, year, box and papers, condition. Photos of the dial, case back and clasp help us quote accurately.</p></div></li>
    <li><span class="step-n">02</span><div><p class="step-t">Get two numbers</p><p class="step-b">An outright purchase price and a trade value. Trade values run higher because the watch stays with us.</p></div></li>
    <li><span class="step-n">03</span><div><p class="step-t">Bring it in or ship it</p><p class="step-b">Visit the booth or ship with our prepaid, fully insured label. The watchmaker confirms condition in front of you or on video.</p></div></li>
    <li><span class="step-n">04</span><div><p class="step-t">Get paid the same day</p><p class="step-b">Wire, certified check or a trade toward your next watch. We pay off any outstanding finance directly.</p></div></li>
  </ol>
  <form class="panel-form" data-form="sell" novalidate>
    <h2 class="form-title">Your watch</h2>
    <div class="toward" data-toward hidden><p class="fine">Trading toward</p><p class="toward-name" data-toward-name></p><input type="hidden" name="toward"></div>
    <fieldset class="intent"><legend>I want to</legend>
      <label><input type="radio" name="intent" value="sell" checked><span>Sell outright</span></label>
      <label><input type="radio" name="intent" value="trade"><span>Trade toward a piece</span></label>
      <label><input type="radio" name="intent" value="consign"><span>Consign</span></label>
    </fieldset>
    <div class="field-row"><div class="field"><label for="s-brand">Maker</label><select id="s-brand" name="brand" required><option value="">Choose</option>${[...brands, 'Other'].map(b => `<option>${esc(b)}</option>`).join('')}</select><p class="err" data-err-for="brand"></p></div>
    <div class="field"><label for="s-model">Model</label><input id="s-model" name="model" required placeholder="e.g. Submariner Date"><p class="err" data-err-for="model"></p></div></div>
    <div class="field-row"><div class="field"><label for="s-ref">Reference <span class="opt">optional</span></label><input id="s-ref" name="watchRef" placeholder="e.g. 126610LN"></div>
    <div class="field"><label for="s-year">Year <span class="opt">optional</span></label><input id="s-year" name="year" inputmode="numeric" pattern="(19|20)[0-9]{2}" placeholder="e.g. 2021"><p class="err" data-err-for="year"></p></div></div>
    <div class="field-row"><div class="field"><label for="s-set">Box and papers</label><select id="s-set" name="set"><option>Box and papers</option><option>Papers only</option><option>Box only</option><option>Watch only</option></select></div>
    <div class="field"><label for="s-cond">Condition</label><select id="s-cond" name="condition"><option>Unworn</option><option selected>Worn with care</option><option>Visible wear</option><option>Needs service</option></select></div></div>
    <div class="field"><label for="s-photos">Photos <span class="opt">up to 6, optional</span></label><input id="s-photos" name="photos" type="file" accept="image/*" multiple data-photos><div class="thumbs" data-photo-preview></div><p class="err" data-err-for="photos"></p></div>
    <div class="field"><label for="s-ask">Asking price <span class="opt">optional</span></label><input id="s-ask" name="asking" inputmode="numeric" placeholder="USD"></div>
    <div class="field-row"><div class="field"><label for="s-name">Name</label><input id="s-name" name="name" required autocomplete="name"><p class="err" data-err-for="name"></p></div>
    <div class="field"><label for="s-email">Email</label><input id="s-email" name="email" type="email" required autocomplete="email"><p class="err" data-err-for="email"></p></div></div>
    <div class="field"><label for="s-phone">Phone or WhatsApp <span class="opt">optional</span></label><input id="s-phone" name="phone" type="tel" autocomplete="tel"></div>
    <button class="btn btn-block" type="submit">Request my offer</button>
    <p class="fine">Your photos stay private and are only seen by our buying team. <a href="legal.html#privacy">Privacy</a></p>
    <div class="success" data-success hidden tabindex="-1"></div>
  </form>
</section>
<section class="section section-paper"><div class="wrap"><p class="eyebrow">What we buy</p><h2>Most luxury references, any condition</h2>
<ul class="buy-list">${['Rolex: sport and dress references, vintage included', 'Audemars Piguet: Royal Oak, Offshore, Code 11.59', 'Patek Philippe: Nautilus, Aquanaut, Calatrava, complications', 'Omega, Cartier, Tudor, Vacheron Constantin, Jaeger-LeCoultre, IWC', 'Watches without box or papers, with ID and proof of ownership', 'Watches that need service. We price the service in, openly'].map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></section>`);
}

function authenticity() {
  page('authenticity.html', 'authenticity.html', 'How we authenticate', 'Our six-step authentication process: sourcing checks, movement inspection, timegrapher readings, condition grading and a lifetime authenticity guarantee.', `
<section class="page-head"><div class="wrap narrow"><p class="eyebrow">Authenticity</p><h1>What happens before a watch is listed</h1><p class="lede-sm">Buyers on 47th Street worry about counterfeits, mixed parts, refinished dials and over-polished cases. These are the checks we do so you do not have to.</p></div></section>
<section class="wrap block"><ol class="steps steps-wide">${AUTH_STEPS.map(([t, b], i) => `<li class="reveal"><span class="step-n">${String(i + 1).padStart(2, '0')}</span><div><p class="step-t">${t}</p><p class="step-b">${esc(b)}</p></div></li>`).join('')}</ol></section>
<section class="section section-paper" id="grading"><div class="wrap">
  <p class="eyebrow">Condition grading</p><h2>Four grades, used consistently</h2>
  <p class="lede-sm">Every listing states its grade and the specific flaws behind it. Polishing is always disclosed separately.</p>
  <dl class="grading">${Object.values(CONDITIONS).map(c => `<div><dt>${c.label}</dt><dd>${esc(c.desc)}</dd></div>`).join('')}</dl>
</div></section>
<section class="section"><div class="wrap split split-even">
  <div><p class="eyebrow">What we refuse</p><h2>Watches we will not sell</h2><ul class="ticks ticks-x">
    <li>Any watch with aftermarket parts we cannot fully disclose</li><li>Refinished or redialed watches presented as original</li><li>Watches without a verifiable owner</li><li>Serials that appear on any stolen-watch registry</li><li>Cases polished past the point of original geometry</li></ul></div>
  <div><p class="eyebrow">The guarantee</p><h2>Lifetime authenticity. ${P.warrantyYears}&#8209;year mechanical warranty.</h2>
    <p>If any watch we sold is ever shown not to be genuine, or to contain parts we did not disclose, we refund the full purchase price. No time limit, and it transfers with the watch.</p>
    <p>Want a second opinion? We welcome inspection by any independent watchmaker or the manufacturer before or after purchase, and we will hold the watch while you arrange it.</p>
    <a class="btn btn-ghost" href="visit.html#appointment">Inspect a watch in person</a></div>
</div></section>
${trustStrip(true)}`);
}

function about() {
  page('about.html', 'about.html', 'About and team', `${B.name} is an independent watch dealer on West 47th Street, New York, since ${B.founded}. Meet the people who buy, inspect and sell every watch.`, `
<section class="page-head"><div class="wrap narrow"><p class="eyebrow">About</p><h1>A family booth that grew up</h1>
<p class="lede-sm">${esc(B.name)} started in ${B.founded} as a single case at the end of an exchange on West 47th Street. We still sit on the street, and we still answer our own phone. What changed is the process: every watch is now opened, measured and documented before you ever see it.</p></div></section>
<section class="wrap block"><ul class="team">${cfg.team.map(p => `<li class="reveal"><img src="assets/img/team-${initials(p.name).toLowerCase()}.svg" alt="Portrait placeholder for ${esc(p.name)}" width="300" height="360" loading="lazy"><p class="tm-name">${esc(p.name)}</p><p class="tm-role">${esc(p.role)} · since ${p.since}</p><p class="tm-bio">${esc(p.bio)}</p></li>`).join('')}</ul></section>
<section class="section section-paper"><div class="wrap values">
  ${[['Prices on the page', 'Most dealers make you ask. We list prices on everything except the few references that move weekly, and we answer those the same day.'], ['Flaws on the page', 'Each listing has a signed condition report with timegrapher readings. If it was polished, we say so.'], ['People, not a chat widget', 'A named person replies to every inquiry, usually within two business hours. You can also just walk in.']].map(([t, b]) => `<div class="reveal"><h2 class="h3">${t}</h2><p>${b}</p></div>`).join('')}
</div></section>
<section class="section"><div class="wrap split split-even"><div><p class="eyebrow">Follow along</p><h2>New arrivals land on Instagram first</h2><p>Wrist shots, unboxings and the occasional story from the street. <a href="https://www.instagram.com/${B.instagram}/" target="_blank" rel="noopener">@${esc(B.instagram)}</a></p></div><div class="cta-row cta-end"><a class="btn" href="inventory.html">Browse inventory</a><a class="btn btn-ghost" href="visit.html">Visit the booth</a></div></div></section>`);
}

function visit() {
  const slots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  page('visit.html', 'visit.html', 'Visit and contact', `Visit ${B.name} at ${K.street}, New York. Hours, directions and private appointment booking in the Diamond District.`, `
<section class="page-head"><div class="wrap narrow"><p class="eyebrow">Visit and contact</p><h1>Booth 12, West 47th Street</h1><p class="lede-sm">Walk in during opening hours, or book a private table and we will have the watches you want ready.</p></div></section>
<section class="wrap split split-even visit-split">
  <div>
    ${mapSvg()}
    <div class="contact-grid">
      <div><h2 class="h4">Address</h2><address>${esc(K.street)}<br>${esc(K.suite)}<br>${esc(K.city)}, ${K.region} ${K.postal}</address><a class="link-arrow" href="${K.mapUrl}" target="_blank" rel="noopener">Open in Maps ${ICON.arrow}</a></div>
      <div><h2 class="h4">Direct</h2><p><a href="tel:${K.phoneHref}">${esc(K.phone)}</a><br><a href="mailto:${K.email}">${esc(K.email)}</a><br><a href="${waGeneral}" target="_blank" rel="noopener">WhatsApp</a></p></div>
      <div><h2 class="h4">Getting here</h2><p>${esc(K.directions)}</p></div>
      <div><h2 class="h4">Hours</h2><table class="hours" data-hours><tbody>${hoursRows()}</tbody></table></div>
    </div>
  </div>
  <form class="panel-form" id="appointment" data-form="appointment" novalidate>
    <h2 class="form-title">Book a private viewing</h2>
    <p class="fine">Appointments last about 45 minutes. We confirm by your preferred channel.</p>
    <div class="field-row"><div class="field"><label for="ap-date">Date</label><input id="ap-date" name="date" type="date" required data-appt-date><p class="err" data-err-for="date"></p></div>
    <div class="field"><label for="ap-time">Time</label><select id="ap-time" name="time" required><option value="">Choose</option>${slots.map(s => `<option value="${s}">${fmtTime(s)}</option>`).join('')}</select><p class="err" data-err-for="time"></p></div></div>
    <div class="field"><label for="ap-int">Watches to see <span class="opt">optional</span></label><input id="ap-int" name="interest" placeholder="e.g. Royal Oak 15500, any Daytona" data-appt-interest></div>
    <div class="field-row"><div class="field"><label for="ap-name">Name</label><input id="ap-name" name="name" required autocomplete="name"><p class="err" data-err-for="name"></p></div>
    <div class="field"><label for="ap-email">Email</label><input id="ap-email" name="email" type="email" required autocomplete="email"><p class="err" data-err-for="email"></p></div></div>
    <div class="field"><label for="ap-phone">Phone <span class="opt">optional</span></label><input id="ap-phone" name="phone" type="tel" autocomplete="tel"></div>
    <label class="chk"><input type="checkbox" name="selling" value="yes"><span>I am also bringing a watch to sell or trade</span></label>
    <button class="btn btn-block" type="submit">Request appointment</button>
    <div class="success" data-success hidden tabindex="-1"></div>
  </form>
</section>`, { jsonld: [localBusinessLD()] });
}

function faq() {
  page('faq.html', 'faq.html', 'Questions', `Answers on authenticity, grey market, holds, trade-ins, payment, shipping, returns and warranty at ${B.name}.`, `
<section class="page-head"><div class="wrap narrow"><p class="eyebrow">FAQ</p><h1>Straight answers</h1></div></section>
<section class="wrap narrow faq">${FAQ.map(([q, a]) => `<details><summary><h2 class="h4">${esc(q)}</h2></summary><p>${esc(a)}</p></details>`).join('')}
<p class="fine">Something else? <a href="visit.html">Contact us</a> or <button class="link-inline" type="button" data-inquire>send an inquiry</button>.</p></section>`, {
    jsonld: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }],
  });
}

function legal() {
  page('legal.html', null, 'Terms, warranty and privacy', `Terms of sale, warranty, returns and privacy policy for ${B.legalName}.`, `
<section class="page-head"><div class="wrap narrow"><p class="eyebrow">Legal</p><h1>Terms, warranty and privacy</h1><p class="fine">Template text. Have counsel review before launch.</p></div></section>
<section class="wrap narrow prose">
<h2 id="terms">Terms of sale</h2><p>All watches are pre-owned unless described as unworn. ${esc(B.legalName)} is an independent dealer and is not affiliated with or authorized by any manufacturer named on this site. Prices are in US dollars and exclude applicable sales tax. A sale is final once funds clear and the watch is delivered, subject to the return policy below.</p>
<h2 id="warranty">Warranty</h2><p>Every watch carries a ${P.warrantyYears}-year mechanical warranty from the date of delivery covering the movement and its function. It excludes crystals, straps, gaskets after the first year, water damage after delivery, and accidental or impact damage. Warranty service is performed in house. The warranty transfers to a subsequent owner.</p>
<h2 id="authenticity">Authenticity guarantee</h2><p>If any watch sold by us is shown by the manufacturer or a recognized independent authority not to be genuine, or to contain parts not disclosed at sale, we refund the full purchase price on return of the watch. No time limit.</p>
<h2 id="returns">Returns</h2><p>Return any watch within ${P.returnDays} days of delivery in the condition it left us, with all included items and the security tag intact, for a full refund to the original payment method. Return shipping is insured and prepaid by us within the US. Sized bracelets with removed links must include all links.</p>
<h2 id="holds">Holds and offers</h2><p>A hold reserves a watch for ${P.holdHours} hours without payment. Offers are answered within one business day. An accepted offer is held for ${P.holdHours} hours pending payment.</p>
<h2 id="privacy">Privacy</h2><p>We collect the details you send through forms, WhatsApp, email or phone in order to answer you and complete a sale. We do not sell or share personal information with third parties except carriers, payment processors and lenders needed to complete your transaction. Saved watches are stored only in your browser. This site sets no advertising or tracking cookies. To ask for your data to be deleted, email ${esc(K.email)}.</p>
<h2 id="trademarks">Trademarks</h2><p>Rolex, Audemars Piguet, Patek Philippe, Omega, Cartier, Tudor and all model names are trademarks of their respective owners and are used only to describe the watches offered.</p>
<h2 id="demo">About this demo</h2><p>This site is the ${esc(B.name)} template, shown with fictional content. The dealer, team members, reviews, listings, prices, address details and phone number are placeholders. Watch images are generated illustrations, not photographs, and do not depict real inventory. Forms store submissions in your browser only until a form endpoint is configured.</p>
</section>`);
}

function saved() {
  page('saved.html', null, 'Saved watches', `Your saved watches at ${B.name}.`, `
<section class="page-head"><div class="wrap"><p class="eyebrow">Watchlist</p><h1>Saved watches</h1><p class="lede-sm">Saved on this device only. Inquire about several at once, or send the list to us on WhatsApp.</p></div></section>
<section class="wrap saved-wrap">
  <div class="saved-actions" data-saved-actions hidden><button class="btn" type="button" data-inquire-saved>Inquire about all saved</button><a class="btn btn-ghost btn-wa" data-wa-saved href="${waGeneral}" target="_blank" rel="noopener">${ICON.wa}Send list on WhatsApp</a></div>
  <h2 class="sr-only">Your saved watches</h2>
  <div class="grid grid-4" data-saved-grid>${sortFeatured(watches).map(w => card(w, '')).join('')}</div>
  <div class="empty" data-saved-empty><h2>Nothing saved yet</h2><p>Tap the bookmark on any watch to keep it here.</p><a class="btn" href="inventory.html">Browse inventory</a></div>
</section>`, { bodyClass: 'page-saved' });
}

function notFound() {
  page('404.html', null, 'Page not found', 'This page could not be found.', `
<section class="page-head"><div class="wrap narrow"><p class="eyebrow">404</p><h1>That page has moved or sold</h1><p class="lede-sm">Watches come and go quickly. Try the current inventory, or ask us to source what you were looking for.</p><div class="cta-row"><a class="btn" href="${cfg.site.basePath}inventory.html">View inventory</a><a class="btn btn-ghost" href="${cfg.site.basePath}index.html">Home</a></div></div></section>`);
}

function runtimeData() {
  const data = {
    brand: B.name,
    holdHours: P.holdHours,
    whatsapp: K.whatsapp,
    forms: cfg.forms,
    hours: cfg.hours,
    watches: Object.fromEntries(watches.map(w => [w.id, { name: title(w), ref: w.ref, year: w.year, priceLabel: priceLabel(w), img: img(w, 'front'), url: productPath(w), availability: w.availability }])),
  };
  return `window.GV=${JSON.stringify(data)};\n`;
}

function images() {
  for (const w of watches) {
    write(img(w, 'front'), art.front(w));
    write(img(w, 'dial'), art.dialDetail(w));
    write(img(w, 'back'), art.caseback(w));
    const s = art.boxAndPapers(w);
    if (s) write(img(w, 'set'), s);
  }
  cfg.team.forEach((p, i) => write(`assets/img/team-${initials(p.name).toLowerCase()}.svg`, art.monogram(initials(p.name), ['#23272B', '#2B2622', '#1F2A26', '#262330'][i % 4])));
  write('assets/img/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${cfg.colors.ink}"/><circle cx="32" cy="32" r="19" fill="none" stroke="${cfg.colors.ivory}" stroke-width="2.5"/><path d="M32 18v14l9 6" fill="none" stroke="${cfg.colors.ivory}" stroke-width="2.5" stroke-linecap="round"/></svg>`);
}

function seoFiles() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.filter(p => !['404.html', 'saved.html'].includes(p.file)).map(p => `<url><loc>${abs(p.file)}</loc><lastmod>${today}</lastmod></url>`);
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /saved.html\n\nSitemap: ${abs('sitemap.xml')}\n`);
  write('site.webmanifest', JSON.stringify({ name: B.name, short_name: B.name, start_url: './index.html', display: 'browser', background_color: cfg.colors.ivory, theme_color: cfg.colors.ink, icons: [{ src: 'assets/img/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] }, null, 2));
  write('assets/og/manifest.json', JSON.stringify({ site: { title: B.name, line: B.tagline, img: img(watches.find(w => w.featured), 'front') }, products: watches.map(w => ({ id: w.id, brand: w.brand, model: w.model, line: `${refLine(w)} · ${CONDITIONS[w.condition].label} · ${w.availability === 'sold' ? 'Sold' : priceLabel(w)}`, img: img(w, 'front') })) }, null, 1));
}

home();
inventory();
watches.forEach(product);
sell();
authenticity();
about();
visit();
faq();
legal();
saved();
notFound();

fs.rmSync(path.join(ROOT, 'product'), { recursive: true, force: true });
fs.rmSync(path.join(ROOT, 'assets/watches'), { recursive: true, force: true });
images();
for (const p of pages) write(p.file, layout(p));
write('assets/js/data.js', runtimeData());
seoFiles();
console.log(`built ${pages.length} pages from ${watches.length} listings`);
