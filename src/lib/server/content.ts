// Build үед (Node) контент унших. ЗӨВХӨН route-ийн `loader` / `generateStaticParams` дотроос
// динамик import-оор дуудна — тэгснээр клиент bundle-д fs орохгүй (PROGRESS D3).
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ResearchSchema, type Research } from '@/types/research';
import {
  MergedReportSchema,
  ReportIndexSchema,
  type MergedReport,
  type ReportIndexEntry,
} from '@/types/schemas';

const root = () => process.cwd();

export async function readResearch(): Promise<Research> {
  const raw = await readFile(path.join(root(), 'content', 'research.json'), 'utf8');
  return ResearchSchema.parse(JSON.parse(raw));
}

/** content/reports/index.json (prepare-build үүсгэнэ). Байхгүй бол хоосон. */
export async function readReportIndex(): Promise<ReportIndexEntry[]> {
  try {
    const raw = await readFile(path.join(root(), 'content', 'reports', 'index.json'), 'utf8');
    return ReportIndexSchema.parse(JSON.parse(raw));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

export async function readReport(week: string): Promise<MergedReport | null> {
  if (!/^\d{4}-W\d{2}$/.test(week)) return null;
  try {
    const raw = await readFile(path.join(root(), 'public', 'reports', `${week}.json`), 'utf8');
    return MergedReportSchema.parse(JSON.parse(raw));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}
