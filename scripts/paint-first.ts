// `expo export`-ийн дараа: `dist/**/*.html`-ийн defer скриптийг paint-first loader-оор солино (PROGRESS D57).
// `fix-static-index`-ээс өмнө ажиллана (хуулбарууд нь аль хэдийн өөрчлөгдсөн HTML-ээс үүснэ).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { paintFirst } from './lib/paint-first';

const dist = path.resolve(process.argv[2] ?? 'dist');

function walk(dir: string, changed: string[]) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!name.startsWith('_')) walk(full, changed);
    } else if (name.endsWith('.html')) {
      const html = readFileSync(full, 'utf8');
      const out = paintFirst(html);
      if (out !== html) {
        writeFileSync(full, out);
        changed.push(path.relative(dist, full));
      }
    }
  }
}

const changed: string[] = [];
walk(dist, changed);
console.log(`[paint-first] ${changed.length} HTML`);
