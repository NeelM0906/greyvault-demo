"""Render raster assets that social cards and icons need: OG images and PNG favicons.

Run after `node build.mjs`. Requires: pip install playwright, and a Chromium or Chrome.
Usage: python3 tools/render-png.py [--chrome /usr/bin/google-chrome]
"""
import argparse, base64, html, json, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
cfg = json.loads((ROOT / 'content/config.json').read_text())
og = json.loads((ROOT / 'assets/og/manifest.json').read_text())
C = cfg['colors']
data_uri = (lambda path, mime: f"data:{mime};base64,{base64.b64encode((ROOT / path).read_bytes()).decode()}")
FONT_D = data_uri('assets/fonts/cormorant.woff2', 'font/woff2')
FONT_T = data_uri('assets/fonts/inter.woff2', 'font/woff2')

def card(eyebrow, title, line, img):
    return f"""<!doctype html><html><head><style>
@font-face {{ font-family: D; src: url({FONT_D}); }}
@font-face {{ font-family: T; src: url({FONT_T}); }}
body {{ margin:0; width:1200px; height:630px; background: radial-gradient(90% 120% at 78% 50%, #2A2C2F 0%, {C['ink']} 62%); color:{C['ivory']}; display:grid; grid-template-columns: 1fr 520px; align-items:center; font-family:T; overflow:hidden; }}
.copy {{ padding: 0 0 0 80px; }}
.wm {{ font-family:D; font-size:34px; letter-spacing:.04em; margin-bottom:56px; }}
.eb {{ font-size:15px; letter-spacing:.22em; text-transform:uppercase; color:#ABA59B; margin-bottom:18px; }}
h1 {{ font-family:D; font-weight:400; font-size:68px; line-height:1.02; margin:0 0 22px; }}
.ln {{ font-size:20px; color:#ABA59B; }}
img {{ width:520px; height:630px; object-fit:cover; }}
</style></head><body><div class="copy"><div class="wm">{html.escape(cfg['brand']['name'])}</div><div class="eb">{html.escape(eyebrow)}</div><h1>{html.escape(title)}</h1><div class="ln">{html.escape(line)}</div></div><img src="{data_uri(img, 'image/webp')}"></body></html>"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--chrome', default=None)
    a = ap.parse_args()
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=a.chrome) if a.chrome else p.chromium.launch()
        pg = b.new_page(viewport={'width': 1200, 'height': 630})
        jobs = [('site', '47th Street · New York', cfg['brand']['name'], cfg['brand']['tagline'], og['site']['img'])]
        jobs += [(x['id'], x['brand'], x['model'], x['line'], x['img']) for x in og['products']]
        for name, eb, t, line, img in jobs:
            pg.set_content(card(eb, t, line, img), wait_until='load')
            pg.evaluate('document.fonts.ready')
            pg.screenshot(path=str(ROOT / f'assets/og/{name}.png'))
        fav = data_uri('assets/img/favicon.svg', 'image/svg+xml')
        for size, out in [(32, 'favicon-32.png'), (180, 'apple-touch-icon.png')]:
            pg.set_viewport_size({'width': size, 'height': size})
            pg.set_content(f'<body style="margin:0"><img src="{fav}" width="{size}" height="{size}" style="display:block">', wait_until='load')
            pg.screenshot(path=str(ROOT / 'assets/img' / out), omit_background=True)
        b.close()
    print(f'rendered {len(jobs)} og images and 2 icons')

if __name__ == '__main__':
    main()
