// `npm run prebuild:web` — `expo export`-ийн өмнө (SPEC §7.5, PROGRESS D1).
// 1) published тайлан бүрийг public/reports/<week>.json болгож нэгтгэнэ
// 2) content/reports/index.json-ийг .md-ийн төлөвөөс дахин үүсгэнэ
// 3) DATA_BASE_URL байвал амьд JSON-ийг public/fallback/-д хадгална (үгүй бол sample ашиглагдана)
// 4) sitemap.xml, robots.txt
// Сонголт: --include-drafts (зөвхөн preview, SPEC §10.4)
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { WeeklyAutoSchema, type ReportIndexEntry } from '../src/types/schemas';

import { indexEntry, mergeReport, sortIndex } from './lib/reports';

// expo export-ийн адилаар нийтийн утгыг .env-ээс уншина (CI-д env/vars давуу эрхтэй — loadEnvFile дарж бичихгүй)
for (const f of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(f);
  } catch {}
}

const ROOT = process.cwd();
const includeDrafts = process.argv.includes('--include-drafts');
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? 'https://vaspfrcweekly.expo.app').replace(/\/+$/, '');
const DATA_BASE_URL = (process.env.EXPO_PUBLIC_DATA_BASE_URL ?? process.env.DATA_BASE_URL ?? '').replace(/\/+$/, '');

const rel = (...p: string[]) => path.join(ROOT, ...p);

function writeJson(file: string, data: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function buildReports(): ReportIndexEntry[] {
  const dir = rel('content', 'reports');
  const entries: ReportIndexEntry[] = [];
  // Нийтлэлээс буцаасан/устгасан тайлан үлдэхгүйн тулд өмнөх build-ийн гаралтыг цэвэрлэнэ
  rmSync(rel('public', 'reports'), { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const file of readdirSync(dir).filter((f) => /^\d{4}-W\d{2}\.md$/.test(f))) {
    const week = file.replace(/\.md$/, '');
    const jsonFile = path.join(dir, `${week}.json`);
    if (!existsSync(jsonFile)) throw new Error(`${week}.json олдсонгүй (.md байгаа)`);
    const auto = WeeklyAutoSchema.parse(JSON.parse(readFileSync(jsonFile, 'utf8')));
    const merged = mergeReport(auto, readFileSync(path.join(dir, file), 'utf8'));
    if (merged.editorial.status !== 'published' && !includeDrafts) continue;
    writeJson(rel('public', 'reports', `${week}.json`), merged);
    entries.push(indexEntry(merged));
  }
  const index = sortIndex(entries);
  writeJson(path.join(dir, 'index.json'), index);
  console.log(`reports: ${index.length} (${index.map((e) => e.week).join(', ') || '—'})`);
  return index;
}

async function snapshotLive() {
  if (!DATA_BASE_URL) {
    console.log('fallback: DATA_BASE_URL хоосон — sample ашиглагдана');
    return;
  }
  const targets = [
    ['live/market.json', 'market.json'],
    ['live/news.json', 'news.json'],
    ['history/daily.json', 'daily.json'],
  ] as const;
  for (const [src, dest] of targets) {
    try {
      const res = await fetch(`${DATA_BASE_URL}/${src}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeJson(rel('public', 'fallback', dest), await res.json());
      console.log(`fallback: ${dest} ✓`);
    } catch (e) {
      const msg = `fallback: ${DATA_BASE_URL}/${src} татаж чадсангүй (${(e as Error).message}) — sample ашиглагдана. DATA_BASE_URL зөв эсэхийг шалгана уу.`;
      // GitHub Actions-ийн annotation — буруу DATA_BASE_URL run-ий хуудсанд шууд харагдана
      console.warn(process.env.GITHUB_ACTIONS ? `::warning title=DATA_BASE_URL::${msg}` : msg);
    }
  }
}

function writeSeo(index: ReportIndexEntry[]) {
  const pages = ['/', '/zah-zeel', '/medee', '/tailan', '/sudalgaa', '/arga-zui', ...index.map((e) => `/tailan/${e.week}`)];
  const urls = pages.map((p) => `  <url><loc>${SITE_URL}${p === '/' ? '/' : p}</loc></url>`).join('\n');
  writeFileSync(
    rel('public', 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  writeFileSync(rel('public', 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  console.log(`seo: sitemap ${pages.length} хуудас`);
}

async function main() {
  const index = buildReports();
  await snapshotLive();
  writeSeo(index);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
