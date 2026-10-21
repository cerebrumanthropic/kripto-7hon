// `expo export`-ийн дараа: EAS Hosting нь `/tailan`-ийг `tailan.html`-ээс хайдаг тул
// `dist/<dir>/index.html` бүрийн хажууд `dist/<dir>.html` хуулбар үүсгэнэ (байхгүй бол).
// `src/app/tailan.tsx` болгож зөөвөл loader-ийн гаралт `tailan/[week]`-тэй зөрчилддөг (EISDIR) — PROGRESS D47.
import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');

function walk(dir: string, created: string[]) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!statSync(full).isDirectory() || name.startsWith('_')) continue;
    const index = path.join(full, 'index.html');
    const sibling = `${full}.html`;
    if (existsSync(index) && !existsSync(sibling)) {
      copyFileSync(index, sibling);
      created.push(path.relative(dist, sibling));
    }
    walk(full, created);
  }
}

const created: string[] = [];
walk(dist, created);
console.log(`[fix-static-index] ${created.length ? created.join(', ') : 'өөрчлөлтгүй'}`);
