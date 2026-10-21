// `npm run validate` — status: published тайлан бүрийг шалгана (SPEC §7.4). Алдаа → exit 1 (deploy зогсоно).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { WeeklyAutoSchema, type WeeklyAuto } from '../src/types/schemas';

import { parseEditorial } from './lib/reports';
import { validateReport } from './lib/validate';

const dir = path.join(process.cwd(), 'content', 'reports');
let errorCount = 0;
let checked = 0;

for (const file of readdirSync(dir).filter((f) => /^\d{4}-W\d{2}\.md$/.test(f)).sort()) {
  const week = file.replace(/\.md$/, '');
  let editorial;
  try {
    editorial = parseEditorial(readFileSync(path.join(dir, file), 'utf8')).editorial;
  } catch (e) {
    console.error(`✗ ${week}: frontmatter схемд тэнцээгүй — ${(e as Error).message.split('\n')[0]}`);
    errorCount++;
    continue;
  }
  if (editorial.status !== 'published') {
    console.log(`– ${week}: draft (алгасав)`);
    continue;
  }
  checked++;
  const jsonFile = path.join(dir, `${week}.json`);
  let auto: WeeklyAuto | null = null;
  if (existsSync(jsonFile)) {
    const parsed = WeeklyAutoSchema.safeParse(JSON.parse(readFileSync(jsonFile, 'utf8')));
    auto = parsed.success ? parsed.data : null;
  }
  const { errors, warnings } = validateReport(editorial, auto);
  for (const w of warnings) console.warn(`⚠ ${week}: ${w}`);
  for (const e of errors) console.error(`✗ ${week}: ${e}`);
  if (errors.length === 0) console.log(`✓ ${week}`);
  errorCount += errors.length;
}

console.log(`[validate] нийтлэгдсэн ${checked}, алдаа ${errorCount}`);
process.exit(errorCount > 0 ? 1 : 0);
