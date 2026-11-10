"""Check every internal href/src, #fragment, CSS url() and sitemap entry resolves to a real file.

Usage: python3 tools/check-links.py   (exit code 1 on any broken reference)
"""
import json, pathlib, re, sys
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

ROOT = pathlib.Path(__file__).resolve().parent.parent
cfg = json.loads((ROOT / 'content/config.json').read_text())
SKIP_DIRS = {'screenshots', 'tools', 'content', 'node_modules', 'verification'}

class Collect(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.ids = [], set()
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.add(a['id'])
        for k in ('href', 'src', 'data-view'):
            if a.get(k): self.refs.append((tag, k, a[k]))

def parse(path):
    c = Collect(); c.feed(path.read_text()); return c

pages = [p for p in ROOT.rglob('*.html') if not (set(p.relative_to(ROOT).parts) & SKIP_DIRS)]
parsed = {p: parse(p) for p in pages}
broken, external, checked = [], set(), 0

def resolve(page, url):
    parts = urlsplit(url)
    if parts.scheme or url.startswith('//'): return None, None
    if parts.path.startswith('/'):
        base = cfg['site']['basePath']
        target = ROOT / unquote(parts.path[len(base):] if parts.path.startswith(base) else parts.path.lstrip('/'))
    elif parts.path:
        target = (page.parent / unquote(parts.path)).resolve()
    else:
        target = page
    return target, parts.fragment

for page, c in parsed.items():
    for tag, attr, url in c.refs:
        if url.startswith(('mailto:', 'tel:')): continue
        if url.startswith(('http://', 'https://')):
            external.add(urlsplit(url).netloc); continue
        target, frag = resolve(page, url)
        checked += 1
        if target is None: continue
        if target.is_dir(): target = target / 'index.html'
        if not target.exists():
            broken.append(f'{page.relative_to(ROOT)}: <{tag} {attr}="{url}"> missing file'); continue
        if frag and target.suffix == '.html':
            ids = parsed.get(target, parse(target)).ids if target in parsed else parse(target).ids
            if frag not in ids: broken.append(f'{page.relative_to(ROOT)}: {url} missing #{frag}')

for css in ROOT.glob('assets/css/*.css'):
    for url in re.findall(r'url\(([^)]+)\)', css.read_text()):
        url = url.strip('\'"')
        if url.startswith('data:'): continue
        checked += 1
        if not (css.parent / url).resolve().exists(): broken.append(f'{css.name}: url({url}) missing')

site = cfg['site']['url'].rstrip('/') + '/'
for loc in re.findall(r'<loc>([^<]+)</loc>', (ROOT / 'sitemap.xml').read_text()):
    rel = loc[len(site):] or 'index.html'
    checked += 1
    if not (ROOT / rel).exists(): broken.append(f'sitemap: {loc} has no file')

print(f'{len(pages)} pages, {checked} internal references checked, {len(broken)} broken')
print('external hosts linked (not fetched):', ', '.join(sorted(external)))
for b in broken: print('BROKEN', b)
sys.exit(1 if broken else 0)
