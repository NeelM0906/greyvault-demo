import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const lighthouse = process.env.LIGHTHOUSE || 'lighthouse';
const port = process.env.PORT || '8473';
const base = `http://127.0.0.1:${port}`;
const pages = ['index.html', 'inventory.html', 'product/rolex-submariner-126610ln-2021.html', 'sell.html', 'visit.html'];
const cats = ['performance', 'accessibility', 'best-practices', 'seo'];
const out = `${root}verification/lighthouse/`;
mkdirSync(out, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));

const rows = [];
try {
  for (const preset of ['mobile', 'desktop']) {
    for (const p of pages) {
      const file = `${out}${p.replace(/\.html$/, '').replace(/\//g, '__')}--${preset}.json`;
      const args = [`${base}/${p}`, '--quiet', '--output=json', `--output-path=${file}`, `--only-categories=${cats.join(',')}`, '--chrome-flags=--headless=new --no-sandbox'];
      if (preset === 'desktop') args.push('--preset=desktop');
      execFileSync(lighthouse, args, { stdio: 'inherit' });
      const r = JSON.parse(readFileSync(file, 'utf8'));
      rows.push({ page: p, preset, ...Object.fromEntries(cats.map(c => [c, Math.round(r.categories[c].score * 100)])) });
    }
  }
} finally {
  server.kill();
}
console.table(rows);
writeFileSync(`${out}summary.json`, JSON.stringify(rows, null, 2));
const md = ['| Page | Preset | ' + cats.join(' | ') + ' |', '|' + '---|'.repeat(cats.length + 2), ...rows.map(r => `| ${r.page} | ${r.preset} | ${cats.map(c => r[c]).join(' | ')} |`)];
writeFileSync(`${out}summary.md`, md.join('\n') + '\n');
