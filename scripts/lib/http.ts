// HTTP клиент (SPEC §7.2.2): timeout 15 сек, сүлжээ/5xx алдаанд 2 удаа давтан оролдох
// (exponential backoff), 429 бол 60 сек хүлээгээд 1 удаа. Бусад 4xx-д давтахгүй.

export class HttpError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`HTTP ${status} ${new URL(url).host}${new URL(url).pathname}`);
  }
}

export type HttpOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  rateLimitWaitMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** `kripto-7hon-bot/1.0 (+SITE_URL; CONTACT_EMAIL)` — CONTACT_EMAIL байхгүй бол зөвхөн URL. */
export function userAgent(env: Record<string, string | undefined> = process.env): string {
  const site = env.SITE_URL || env.EXPO_PUBLIC_SITE_URL || 'https://vaspfrcweekly.expo.app';
  const contact = env.CONTACT_EMAIL ? `; ${env.CONTACT_EMAIL}` : '';
  return `kripto-7hon-bot/1.0 (+${site}${contact})`;
}

async function request(url: string, opts: HttpOptions, accept: string): Promise<Response> {
  const {
    headers = {},
    timeoutMs = 15_000,
    retries = 2,
    backoffMs = 1_000,
    rateLimitWaitMs = 60_000,
    fetchImpl = fetch,
    sleep = realSleep,
  } = opts;

  let rateLimited = false;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, {
        headers: { 'user-agent': userAgent(), accept, ...headers },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
      });
      if (res.ok) return res;
      if (res.status === 429 && !rateLimited) {
        rateLimited = true;
        await sleep(rateLimitWaitMs);
        attempt--; // 429-ийн хүлээлт давтан оролдлогын тоонд орохгүй, гэхдээ ганц удаа
        continue;
      }
      const err = new HttpError(url, res.status);
      if (res.status < 500) throw err; // 4xx — давтахгүй
      lastError = err;
    } catch (e) {
      if (e instanceof HttpError && e.status < 500) throw e;
      lastError = e;
    }
    if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function getJson<T = unknown>(url: string, opts: HttpOptions = {}): Promise<T> {
  const res = await request(url, opts, 'application/json');
  return (await res.json()) as T;
}

export async function getText(url: string, opts: HttpOptions = {}): Promise<string> {
  const res = await request(url, opts, 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8');
  return res.text();
}

/** Алдааны мессежийг лог/status-д ойлгомжтой, нууцгүй болгоно (URL-ийн query хасна). */
export function errorMessage(e: unknown): string {
  if (e instanceof HttpError) return e.message;
  if (e instanceof Error) {
    if (e.name === 'TimeoutError') return 'timeout';
    const cause = (e as Error & { cause?: { code?: string } }).cause;
    return cause?.code ? `${e.message} (${cause.code})` : e.message;
  }
  return String(e);
}
