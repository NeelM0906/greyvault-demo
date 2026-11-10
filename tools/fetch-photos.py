"""Download each listing's Wikimedia Commons photos, write responsive WebP files and content/photos.lock.json (credits)."""
import json, os, re, io, sys, time, urllib.request, urllib.parse
from PIL import Image, ImageOps
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {'User-Agent': 'GreyVaultDemo/2.0 (https://github.com/NeelM0906/greyvault-demo)'}
WIDTHS = [480, 960, 1600]
OUT = os.path.join(ROOT, 'assets/photos')
inv = json.load(open(os.path.join(ROOT, 'content/inventory.json')))['watches']
extra = json.load(open(os.path.join(ROOT, 'content/site-photos.json')))
lock_path = os.path.join(ROOT, 'content/photos.lock.json')
lock = json.load(open(lock_path)) if os.path.exists(lock_path) else {}

def meta(title):
    q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': 'File:' + title, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': max(WIDTHS)})
    d = json.load(urllib.request.urlopen(urllib.request.Request('https://commons.wikimedia.org/w/api.php?' + q, headers=UA), timeout=60))
    pg = next(iter(d['query']['pages'].values()))
    if 'imageinfo' not in pg: sys.exit(f'missing on Commons: {title}')
    ii = pg['imageinfo'][0]; m = ii['extmetadata']
    g = lambda k: re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', m.get(k, {}).get('value', ''))).strip()
    return ii, dict(author=g('Artist') or 'Unknown', license=g('LicenseShortName'), licenseUrl=g('LicenseUrl'), source=ii['descriptionurl'])

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:60]

def process(key, title):
    if key in lock and all(os.path.exists(os.path.join(ROOT, p)) for p in lock[key]['files'].values()): return
    ii, cred = meta(title)
    src = ii.get('thumburl') or ii['url']
    for attempt in range(4):
        try: raw = urllib.request.urlopen(urllib.request.Request(src, headers=UA), timeout=120).read(); break
        except Exception as e: time.sleep(3 * (attempt + 1))
    else: sys.exit(f'download failed: {title}')
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
    files = {}
    for w in WIDTHS:
        if w > im.width and w != WIDTHS[0]: continue
        r = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        rel = f'assets/photos/{key}-{r.width}.webp'
        r.save(os.path.join(ROOT, rel), 'WEBP', quality=78, method=6)
        files[str(r.width)] = rel
    lock[key] = dict(title=title, width=im.width, height=im.height, files=files, **cred)
    json.dump(lock, open(lock_path, 'w'), indent=1, ensure_ascii=False)
    print('ok', key, im.size, cred['license'])

os.makedirs(OUT, exist_ok=True)
jobs = [(f"{w['id']}-{i + 1}", p['file']) for w in inv for i, p in enumerate(w['photos'])] + [(k, v['file']) for k, v in extra.items()]
for k, t in jobs: process(k, t)
keep = {k for k, _ in jobs}
for k in list(lock):
    if k not in keep: del lock[k]
json.dump(lock, open(lock_path, 'w'), indent=1, ensure_ascii=False)
live = {p for v in lock.values() for p in v['files'].values()}
for f in os.listdir(OUT):
    if f'assets/photos/{f}' not in live: os.remove(os.path.join(OUT, f))
print(len(lock), 'photos')
