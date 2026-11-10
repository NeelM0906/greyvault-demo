"""End-to-end check of the built site in a real browser.

Serves the folder, then for every page: full-page screenshots at 375/768/1280/1920,
console errors, failed requests, horizontal overflow, JSON-LD parse, optional axe-core scan.
Then drives the conversion paths: filters, search, sort, watchlist, inquiry, hold, offer,
WhatsApp deep links, gallery zoom, sticky bar, sell/trade with photos, appointment rules, alerts.

Usage: python3 tools/verify.py [--chrome PATH] [--axe PATH/axe.min.js] [--skip-shots]
Writes screenshots/ and verification/report.md + report.json. Exit 1 on any failure.
"""
import argparse, functools, http.server, json, pathlib, socketserver, threading, datetime as dt
from urllib.parse import unquote
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'screenshots'
OUT = ROOT / 'verification'
WIDTHS_ALL = [375, 1280]
WIDTHS_KEY = [768, 1920]

ap = argparse.ArgumentParser()
ap.add_argument('--chrome')
ap.add_argument('--axe')
ap.add_argument('--skip-shots', action='store_true')
ap.add_argument('--port', type=int, default=8472)
args = ap.parse_args()

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', args.port), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{args.port}/'

pages = sorted(str(p.relative_to(ROOT)) for p in ROOT.glob('*.html')) + sorted(str(p.relative_to(ROOT)) for p in ROOT.glob('product/*.html'))
key_pages = [p for p in pages if not p.startswith('product/')] + ['product/rolex-gmt-master-ii-16710.html', 'product/patek-nautilus-5711-1a-010.html']
results = {'pages': {}, 'tests': [], 'axe': {}}
fails = []

def check(name, ok, detail=''):
    results['tests'].append({'name': name, 'ok': bool(ok), 'detail': detail})
    if not ok: fails.append(f'{name}: {detail}')

def watch(page, sink):
    page.on('console', lambda m: m.type in ('error', 'warning') and sink.append(f'console.{m.type}: {m.text}'))
    page.on('pageerror', lambda e: sink.append(f'pageerror: {e}'))
    page.on('requestfailed', lambda r: sink.append(f'requestfailed: {r.url}'))
    page.on('response', lambda r: r.status >= 400 and r.url.startswith(BASE) and sink.append(f'http {r.status}: {r.url}'))

def settle(page):
    page.evaluate("""async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 500) { window.scrollTo({top: y, behavior: 'instant'}); await new Promise(r => setTimeout(r, 120)); } window.scrollTo({top: 0, behavior: 'instant'}); await Promise.race([Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))), new Promise(r => setTimeout(r, 4000))]); }""")
    page.wait_for_timeout(1500)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.chrome) if args.chrome else p.chromium.launch()
    axe_src = pathlib.Path(args.axe).read_text() if args.axe else None

    for path in pages:
        widths = WIDTHS_ALL + (WIDTHS_KEY if path in key_pages else [])
        rec = results['pages'].setdefault(path, {'errors': [], 'overflow': [], 'jsonld': 0})
        for w in widths:
            ctx = browser.new_context(viewport={'width': w, 'height': 900})
            page = ctx.new_page()
            watch(page, rec['errors'])
            page.goto(BASE + path, wait_until='networkidle')
            settle(page)
            print('shot', path, w, flush=True)
            sw = page.evaluate('document.documentElement.scrollWidth')
            if sw > w: rec['overflow'].append(f'{w}px viewport scrolls to {sw}px')
            if w == 1280:
                blocks = page.eval_on_selector_all('script[type="application/ld+json"]', 'els => els.map(e => e.textContent)')
                for b in blocks: json.loads(b)
                rec['jsonld'] = len(blocks)
                rec['title'] = page.title()
                rec['description'] = page.get_attribute('meta[name="description"]', 'content')
                rec['og'] = page.get_attribute('meta[property="og:image"]', 'content')
            if axe_src and path in key_pages and w in (375, 1280):
                page.add_script_tag(content=axe_src)
                v = page.evaluate("async () => (await axe.run(document, { runOnly: ['wcag2a','wcag2aa','wcag21aa','best-practice'] })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }))")
                results['axe'][f'{path}@{w}'] = v
            if not args.skip_shots:
                out = SHOTS / str(w) / (path.replace('/', '__'))
                out = out.with_suffix('.png')
                out.parent.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(out), full_page=True)
            ctx.close()
        check(f'page {path}: no console errors, failed requests or 4xx', not rec['errors'], '; '.join(rec['errors'][:3]))
        check(f'page {path}: no horizontal overflow', not rec['overflow'], '; '.join(rec['overflow']))

    ctx = browser.new_context(viewport={'width': 1280, 'height': 900})
    page = ctx.new_page()
    errs = []
    watch(page, errs)
    visible_cards = lambda: page.eval_on_selector_all('[data-grid] [data-card]:not([hidden])', 'els => els.map(e => ({ brand: e.dataset.brand, price: e.dataset.price, id: e.dataset.id, family: e.dataset.family }))')

    page.goto(BASE + 'index.html'); page.wait_for_timeout(3000)
    check('no popup, dialog or overlay opens on its own after 3s', page.evaluate("document.querySelectorAll('dialog[open]').length") == 0)
    check('no marquee or countdown elements', page.evaluate("document.querySelectorAll('marquee,[class*=marquee],[class*=countdown],[class*=ticker]').length") == 0)
    page.keyboard.press('Tab')
    check('first Tab focuses the skip link', page.evaluate("document.activeElement.classList.contains('skip')"))

    page.goto(BASE + 'inventory.html?brand=Rolex')
    cards = visible_cards()
    check('filter by brand from URL', len(cards) == 12 and all(c['brand'] == 'Rolex' for c in cards), f'{len(cards)} cards')
    check('result count announces filtered total', page.text_content('[data-result-count]') == '12 watches', page.text_content('[data-result-count]'))
    check('model options limited to chosen maker', page.evaluate("[...document.querySelectorAll('#f-family option[data-brand]')].every(o => o.disabled === (o.dataset.brand !== 'Rolex'))"))
    page.select_option('#f-family', 'Daytona')
    cards = visible_cards()
    check('filter by model family', len(cards) == 3 and all(c['family'] == 'Daytona' for c in cards), f'{len(cards)}')
    page.goto(BASE + 'inventory.html')
    page.fill('[data-filter-input="q"]', '1661'); page.wait_for_timeout(300)
    ids = [c['id'] for c in visible_cards()]
    check('search by reference', sorted(ids) == ['rolex-submariner-16610', 'rolex-submariner-16613-blue'], str(ids))
    check('search writes to URL', 'q=1661' in page.url, page.url)
    page.fill('[data-filter-input="q"]', 'zzzz-no-match'); page.wait_for_timeout(300)
    check('empty state shows when nothing matches', page.is_visible('[data-empty]') and not visible_cards())
    page.click('[data-clear]'); page.wait_for_timeout(200)
    check('clear filters restores all', len(visible_cards()) == 23, str(len(visible_cards())))
    page.select_option('select[name="min"]', '10000'); page.select_option('select[name="max"]', '25000')
    prices = [int(c['price']) for c in visible_cards()]
    check('price range filter', prices and all(10000 <= x <= 25000 for x in prices), str(prices))
    check('price filter explains hidden price-on-request pieces', page.is_visible('[data-por-note]'), page.inner_text('[data-por-note]'))
    page.click('button[type="reset"]'); page.wait_for_timeout(200)
    page.select_option('[data-filter-input="sort"]', 'price-asc')
    prices = [int(c['price']) for c in visible_cards() if c['price']]
    check('sort price low to high', prices == sorted(prices), str(prices[:6]))
    page.check('input[name="cond"][value="unworn"]'); page.check('input[name="set"][value="full"]')
    cards = visible_cards()
    check('condition + box/papers filters combine', len(cards) == 2, str(len(cards)))
    page.check('input[name="avail"][value="available"]')
    check('availability filter', [c['id'] for c in visible_cards()] == ['tudor-black-bay-54-m79000n', 'rolex-daytona-126500ln'], str(visible_cards()))
    check('filter state in URL', all(s in page.url for s in ['cond=unworn', 'set=full', 'avail=available', 'sort=price-asc']), page.url)

    page.goto(BASE + 'inventory.html')
    first = page.locator('[data-grid] [data-card] [data-save]').first
    sid = first.get_attribute('data-save')
    first.click()
    check('save toggles pressed state', first.get_attribute('aria-pressed') == 'true')
    check('header watchlist count updates', page.inner_text('[data-saved-count]') == '1')
    page.goto(BASE + 'saved.html')
    shown = page.eval_on_selector_all('[data-saved-grid] [data-card]', "els => els.filter(e => getComputedStyle(e).display !== 'none').map(e => e.dataset.id)")
    check('watchlist page shows saved watch', shown == [sid], str(shown))
    check('watchlist empty state hidden when items saved', not page.is_visible('[data-saved-empty]'))
    wa = page.get_attribute('[data-wa-saved]', 'href')
    check('watchlist WhatsApp link lists saved refs', 'wa.me/12125550147' in wa and '126500LN' in unquote(wa), unquote(wa)[:120])

    pdp = 'product/rolex-submariner-16610.html'
    page.goto(BASE + pdp)
    wa = page.get_attribute('.pdp-cta .btn-wa', 'href')
    check('WhatsApp deep link prefilled with reference', wa.startswith('https://wa.me/12125550147?text=') and '16610' in unquote(wa), unquote(wa))
    page.click('.pdp-cta [data-intent="hold"]')
    check('hold button opens dialog with hold intent', page.is_visible('#inquiry-dialog') and page.is_checked('#inquiry-dialog input[value="hold"]'))
    page.click('#inquiry-dialog button[type="submit"]')
    check('inquiry validates required name', page.get_attribute('#inq-name', 'aria-invalid') == 'true')
    check('inquiry requires email or phone', 'email or a phone' in page.text_content('#inquiry-dialog [data-err-for="email"]'), page.text_content('#inquiry-dialog [data-err-for="email"]'))
    page.fill('#inq-name', 'Test Buyer'); page.fill('#inq-email', 'not-an-email')
    page.click('#inquiry-dialog button[type="submit"]')
    check('inquiry rejects invalid email', 'valid email' in page.text_content('#inquiry-dialog [data-err-for="email"]'))
    page.fill('#inq-email', 'buyer@example.com')
    page.click('#inquiry-dialog button[type="submit"]'); page.wait_for_timeout(200)
    check('inquiry success state shown', page.is_visible('#inquiry-dialog [data-success]') and 'Inquiry received' in page.inner_text('#inquiry-dialog [data-success]'))
    leads = page.evaluate("JSON.parse(localStorage.getItem('gv:leads'))")
    check('inquiry stored with watch and intent', leads and leads[-1]['type'] == 'inquiry' and leads[-1]['watchId'] == 'rolex-submariner-16610' and leads[-1]['intent'] == 'hold', json.dumps(leads[-1] if leads else None)[:200])
    page.keyboard.press('Escape')
    check('Escape closes the dialog', not page.is_visible('#inquiry-dialog'))
    page.click('.pdp-cta > [data-inquire]')
    page.check('#inquiry-dialog input[value="offer"]', force=True)
    check('offer intent reveals offer field', page.is_visible('#inq-offer'))
    page.fill('#inq-name', 'A'); page.fill('#inq-phone', '212 555 0100'); page.fill('#inq-offer', 'lots')
    page.click('#inquiry-dialog button[type="submit"]')
    check('offer must be a number', page.get_attribute('#inq-offer', 'aria-invalid') == 'true')
    page.fill('#inq-offer', '13,500'); page.click('#inquiry-dialog button[type="submit"]'); page.wait_for_timeout(200)
    check('phone-only inquiry with offer succeeds', page.is_visible('#inquiry-dialog [data-success]'))
    page.click('#inquiry-dialog [data-success] [data-close]')
    check('close button in success closes dialog', not page.is_visible('#inquiry-dialog'))

    page.click('.g-thumbs li:nth-child(2) [data-view]'); page.wait_for_timeout(400)
    check('gallery thumbnail switches photo', page.get_attribute('[data-g-img]', 'src').endswith('-2-480.webp'))
    page.click('[data-lightbox-open]'); page.wait_for_timeout(200)
    check('full-screen viewer opens with large photo', page.evaluate("document.querySelector('[data-lightbox]').open") and '-2-' in page.get_attribute('[data-lb-img]', 'src'))
    page.keyboard.press('ArrowRight'); page.wait_for_timeout(100)
    check('viewer steps to next photo', '-3-' in page.get_attribute('[data-lb-img]', 'src'))
    page.keyboard.press('Escape'); page.wait_for_timeout(100)
    page.click('[data-zoom]')
    check('zoom toggles', 'is-zoomed' in page.get_attribute('[data-zoom-wrap]', 'class') and page.get_attribute('[data-zoom]', 'aria-pressed') == 'true')
    page.click('[data-zoom]')
    page.evaluate('window.scrollTo(0, 1600)'); page.wait_for_timeout(500)
    check('sticky inquire bar appears after main CTA scrolls away', 'is-on' in page.get_attribute('[data-sticky]', 'class') and page.get_attribute('[data-sticky]', 'inert') is None)
    page.evaluate('window.scrollTo(0, 0)'); page.wait_for_timeout(500)
    check('sticky bar hidden and inert at top', 'is-on' not in page.get_attribute('[data-sticky]', 'class') and page.get_attribute('[data-sticky]', 'inert') is not None)
    mctx = browser.new_context(viewport={'width': 375, 'height': 800}); mp = mctx.new_page()
    mp.goto(BASE + 'product/rolex-submariner-16610.html'); mp.wait_for_timeout(300)
    mp.evaluate("window.scrollTo({top: 3000, behavior: 'instant'})"); mp.wait_for_timeout(300)
    jumped_down = 'is-on' in mp.get_attribute('[data-sticky]', 'class')
    mp.evaluate("window.scrollTo({top: 0, behavior: 'instant'})"); mp.wait_for_timeout(300)
    check('mobile sticky bar follows jumps past a below-the-fold CTA', jumped_down and 'is-on' not in mp.get_attribute('[data-sticky]', 'class'))
    mctx.close()
    page.fill('#pa-email', 'alerts@example.com'); page.click('form[data-form="alert"] button[type="submit"]'); page.wait_for_timeout(200)
    check('price alert stores and confirms', page.is_visible('form[data-form="alert"] [data-success]') and page.evaluate("JSON.parse(localStorage.getItem('gv:leads')).at(-1).kind") == 'price')
    check('trade-in link targets this watch', page.get_attribute('a[href*="sell.html?toward="]', 'href').endswith('toward=rolex-submariner-16610'))

    page.goto(BASE + 'sell.html?toward=ap-royal-oak-15202st')
    check('sell form shows trade-toward watch', page.is_visible('[data-toward]') and 'Royal Oak' in page.inner_text('[data-toward-name]') and page.is_checked('input[value="trade"]'))
    page.click('form[data-form="sell"] button[type="submit"]')
    check('sell form flags missing required fields', page.evaluate("document.querySelectorAll('form[data-form=sell] [aria-invalid=true]').length") >= 4)
    png = OUT / 'fixture.png'; OUT.mkdir(exist_ok=True)
    png.write_bytes(bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cf00000301010018dd8db40000000049454e44ae426082'))
    page.set_input_files('#s-photos', [str(png), str(png)])
    check('photo previews render', page.evaluate("document.querySelectorAll('[data-photo-preview] img').length") == 2)
    page.select_option('#s-brand', 'Rolex'); page.fill('#s-model', 'Datejust 41'); page.fill('#s-year', '1850')
    page.fill('#s-name', 'Seller'); page.fill('#s-email', 'seller@example.com')
    page.click('form[data-form="sell"] button[type="submit"]')
    check('sell form rejects bad year', page.get_attribute('#s-year', 'aria-invalid') == 'true')
    page.fill('#s-year', '2019'); page.fill('#s-ref', '126334'); page.click('form[data-form="sell"] button[type="submit"]'); page.wait_for_timeout(200)
    lead = page.evaluate("JSON.parse(localStorage.getItem('gv:leads')).at(-1)")
    check('sell lead stored with photos and trade target', lead['type'] == 'sell' and lead['toward'] == 'ap-royal-oak-15202st' and len(lead.get('photos', [])) == 2, json.dumps(lead)[:200])
    check('sell lead keeps its own reference code and the watch reference separately', lead['ref'].startswith('GV-') and lead.get('watchRef') == '126334', f"{lead['ref']} {lead.get('watchRef')}")
    check('sell success replaces form', page.is_visible('form[data-form="sell"] [data-success]') and not page.is_visible('#s-model'))

    page.goto(BASE + 'visit.html')
    today = dt.date.today()
    sat = today + dt.timedelta(days=(5 - today.weekday()) % 7 or 7)
    mon = today + dt.timedelta(days=(0 - today.weekday()) % 7 or 7)
    page.fill('#ap-date', sat.isoformat()); page.select_option('#ap-time', '11:00'); page.fill('#ap-name', 'V'); page.fill('#ap-email', 'v@example.com')
    page.click('form[data-form="appointment"] button[type="submit"]')
    check('appointment rejects closed day (Saturday)', 'closed on Saturday' in page.inner_text('[data-err-for="date"]'), page.inner_text('[data-err-for="date"]'))
    page.fill('#ap-date', (today - dt.timedelta(days=2)).isoformat()); page.click('form[data-form="appointment"] button[type="submit"]')
    check('appointment rejects past date', 'future' in page.inner_text('[data-err-for="date"]'))
    page.fill('#ap-date', mon.isoformat()); page.click('form[data-form="appointment"] button[type="submit"]'); page.wait_for_timeout(200)
    check('appointment success', page.is_visible('form[data-form="appointment"] [data-success]'))
    check("today's hours highlighted", page.evaluate("document.querySelectorAll('[data-hours] tr.today').length") == 1)

    page.goto(BASE + 'inventory.html?source=Rolex%2016523#source')
    check('sold listing prefills sourcing request', page.input_value('#al-model') == 'Rolex 16523')
    page.goto(BASE + 'product/rolex-daytona-16523.html')
    check('sold listing hides buy actions and offers sourcing', page.locator('.pdp-cta [data-inquire]').count() == 0 and page.is_visible('a[href*="#source"]'))
    check('functional run had no console errors', not errs, '; '.join(errs[:3]))
    ctx.close()

    m = browser.new_context(viewport={'width': 375, 'height': 812}, reduced_motion='reduce')
    page = m.new_page()
    page.goto(BASE + 'inventory.html')
    check('mobile filters hidden until toggled', not page.is_visible('#filters'))
    page.click('.filter-toggle')
    check('mobile filter toggle opens panel', page.is_visible('#filters') and page.get_attribute('.filter-toggle', 'aria-expanded') == 'true')
    page.click('.menu-toggle')
    check('mobile menu opens', page.is_visible('#primary-nav a[href="sell.html"]'))
    page.goto(BASE + 'index.html')
    check('reduced motion shows reveal content immediately', page.evaluate("[...document.querySelectorAll('.reveal')].every(e => getComputedStyle(e).opacity === '1')"))
    page.goto(BASE + 'does-not-exist/deep/page.html')
    m.close()

    nf = browser.new_context(viewport={'width': 1280, 'height': 900})
    page = nf.new_page(); e404 = []; watch(page, e404)
    page.goto(BASE + '404.html')
    check('404 page loads its assets via basePath', not e404 and page.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(247, 245, 241)', '; '.join(e404))
    nf.close()
    browser.close()
srv.shutdown()

axe_total = {}
for k, vs in results['axe'].items():
    for v in vs: axe_total.setdefault(v['id'], []).append(f"{k} ({v['impact']}, {v['nodes']} nodes, e.g. {v['sample']})")
if args.axe:
    check('axe-core: no WCAG 2.1 A/AA or best-practice violations on key pages', not axe_total, '; '.join(f'{k}: {v[0]}' for k, v in axe_total.items()))

OUT.mkdir(exist_ok=True)
(OUT / 'report.json').write_text(json.dumps(results, indent=1))
passed = sum(t['ok'] for t in results['tests'])
lines = [f'# Verification report', '', f'Run: {dt.datetime.now().strftime("%Y-%m-%d %H:%M")} local time. Browser: Chromium via Playwright.', '',
         f'**{passed} of {len(results["tests"])} checks passed.**', '', '| Check | Result | Detail |', '|---|---|---|']
lines += [f"| {t['name']} | {'pass' if t['ok'] else 'FAIL'} | {t['detail'].replace('|', '/')[:160]} |" for t in results['tests']]
shots = sorted(SHOTS.rglob('*.png')) if SHOTS.exists() else []
lines += ['', f'Screenshots: {len(shots)} full-page PNGs in `screenshots/<width>/`.']
(OUT / 'report.md').write_text('\n'.join(lines) + '\n')
print(f'{passed}/{len(results["tests"])} checks passed, {len(shots)} screenshots')
for f in fails: print('FAIL', f)
raise SystemExit(1 if fails else 0)
