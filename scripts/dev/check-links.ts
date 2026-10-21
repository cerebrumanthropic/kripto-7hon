// research.json-ийн бүх гадаад холбоосыг шалгана (SPEC §12 Үе шат 1: «Судалгаа хуудсанд бүх холбоос ажиллана»).
// Ажиллуулах: npx tsx scripts/dev/check-links.ts
import { readFileSync } from 'node:fs';
import path from 'node:path';

const raw = readFileSync(path.join(process.cwd(), 'content', 'research.json'), 'utf8');
const urls = [...new Set([...raw.matchAll(/"(?:url|sourceUrl|verifyUrl)":\s*"(https:[^"]+)"/g)].map((m) => m[1]))];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36';

async function check(url: string): Promise<[string, string]> {
  for (const method of ['HEAD', 'GET'] as const) {
    try {
      const res = await fetch(url, { method, redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
      if (res.ok || method === 'GET') return [url, String(res.status)];
    } catch (e) {
      if (method === 'GET') return [url, `ERR ${(e as Error).cause ?? (e as Error).message}`];
    }
  }
  return [url, '?'];
}

async function main() {
  const results: Array<[string, string]> = [];
  for (let i = 0; i < urls.length; i += 8) {
    results.push(...(await Promise.all(urls.slice(i, i + 8).map(check))));
  }
  const bad = results.filter(([, s]) => !/^2\d\d$/.test(s));
  console.log(`checked ${results.length}, ok ${results.length - bad.length}, not-ok ${bad.length}`);
  for (const [u, s] of bad) console.log(`${s}\t${u}`);
}

main();
