# Техникийн тодорхойлолт (SPEC) — «Виртуал хөрөнгийн 7 хоног» вэб платформ

Хувилбар 1.0 · 2026.10.21 · Энэ баримт нь Claude Code-д зориулсан бүрэн тодорхойлолт. `CLAUDE.md` нь товч дүрмүүдийг агуулна, дэлгэрэнгүйг эндээс уншина.

---

## 0. Зорилго

Монгол хэлээр, тоонд суурилсан виртуал хөрөнгийн (крипто) мэдээллийн вэб платформ. Гурван давхаргатай:

| Давхарга | Шинэчлэгдэх давтамж | Эх |
|---|---|---|
| 1. **Судалгааны контент** — олон улсын жишээ загвар, үзүүлэлт, дата эх сурвалж, Монголын зохицуулалт, СЗХ-ны тоо | Гараар (судалгаа шинэчлэгдэхэд) | `content/research.json` |
| 2. **Амьд дата** — зах зээлийн үзүүлэлт, стейблкойн, DeFi, Fear & Greed, USD/MNT ханш, олон улсын мэдээний урсгал | Цаг тутам, автоматаар | GitHub Actions → GitHub Pages JSON |
| 3. **7 хоногийн тайлан** — автоматаар тооцсон тоо + редакторын дүгнэлт, архивтай, инфографиктай | Даваа бүр | `content/reports/` → EAS Hosting |

Бүх дэд бүтэц **үнэгүй түвшинд** ажиллана. Хэрэглэгчийн компьютер унтарсан ч сайт нээгдэж, дата шинэчлэгдсээр байна.

---

## 1. Архитектур

```
 ┌──────────────── GitHub Actions (үнэгүй, public repo) ─────────────────┐
 │                                                                        │
 │  live-data.yml  (цаг тутам, :07 минутад)                               │
 │    CoinGecko Demo ─┐                                                   │
 │    DefiLlama ──────┤                                                   │
 │    Alternative.me ─┼─► scripts/fetch-live.ts ─► public-data/*.json ────┼──► GitHub Pages
 │    open.er-api ────┤        (Zod-оор шалгана)        │                 │    (CDN, CORS *)
 │    RSS мэдээ ──────┘                                 └─► data-history  │        │
 │                                                        branch (өдөрт 1)│        │
 │  weekly-report.yml (Ням 23:55 UTC = Даваа 07:55 УБ)                    │        │
 │    scripts/build-weekly.ts ─► content/reports/<week>.json + .md        │        │
 │                            ─► Pull Request (редактор шалгана)          │        │
 │                                                                        │        │
 │  deploy.yml (main руу push / PR merge / 1, 15-нд keepalive)            │        │
 │    validate → prepare-build → npx expo export -p web → eas deploy --prod        │
 └───────────────────────────────────────────────┬────────────────────────┘        │
                                                 ▼                                 │
                              EAS Hosting (Cloudflare) https://<нэр>.expo.app      │
                              Статик HTML/JS/зураг + тайлангийн JSON               │
                                                 │                                 │
                                                 ▼                                 │
                              Хэрэглэгчийн браузер ◄──── амьд JSON (10 мин тутам) ─┘
                              (алдаа гарвал → build үеийн fallback snapshot)
```

### Яагаад ийм бүтэц вэ (заавал дагах шийдвэрүүд)

1. **Вэб нь цэвэр статик (`expo.web.output: "static"`).** EAS Hosting-ийн Free төлөвлөгөөнд API route нэг хүсэлтэд **10 CPU-ms**, **10 subrequest**-ийн хязгаартай. RSS задлах, том JSON боловсруулах ажил үүнд багтахгүй. Тиймээс бүх хүнд ажлыг GitHub Actions хийнэ, EAS дээр API route ашиглахгүй. Үр дүнд нь API түлхүүр клиент рүү хэзээ ч гарахгүй.
2. **Амьд датаг EAS руу deploy хийхгүй.** Цаг тутам deploy хийвэл EAS-ийн 1 GB storage, 30 хоногийн deployment retention дүүрнэ. Амьд JSON-ийг GitHub Pages дээр нийтэлнэ (Fastly CDN, `Access-Control-Allow-Origin: *`).
3. **7 хоногийн тайлан нь EAS руу deploy хийгдэнэ** (сард 4–6 удаа). Тайлан бүр статик хуудас болж, SEO-д ээлтэй, мөнхийн холбоостой.
4. **Редакторын хяналт (QA)** — 7 хоногийн ноорог Pull Request хэлбэрээр ирж, редактор GitHub вэб дээр засаад merge хийхэд нийтлэгдэнэ. `AUTO_PUBLISH=true` үед бүрэн автомат горимд шилжинэ.

---

## 2. Үнэгүй түвшний хязгаар ба төсөв

| Үйлчилгээ | Free хязгаар (2026.10 байдлаар) | Бидний хэрэглээ | Тэмдэглэл |
|---|---|---|---|
| EAS Hosting | 100,000 хүсэлт/сар; 1 GB storage; 1M CPU-ms/сар; хүсэлтэд 10 CPU-ms, 10 subrequest; 5 alias; deployment retention 30 хоног; custom domain **байхгүй** | Статик файл. 1 хуудас үзэлт ≈ 8–15 хүсэлт (дахин зочлоход кэшээс бага) → сард ойролцоогоор 7,000–12,000 хуудас үзэлт | Хэтэрвэл Starter ($19/сар + $2 / 1M хүсэлт). URL: `https://<нэр>.expo.app` |
| CoinGecko Demo API | 10,000 дуудлага/сар, 100 дуудлага/минут; арилжааны лиценз **биш**, иш татах заавал | Цаг тутам 3 дуудлага → ≈2,250/сар + 7 хоногт ≈5 | Зар/ивээн тэтгэгч нэмбэл Basic ($35/сар) руу шилжих |
| DefiLlama API | Түлхүүргүй, үнэгүй (`api.llama.fi`, `stablecoins.llama.fi`) | Цаг тутам 4 дуудлага | Pro endpoint (`pro-api.llama.fi`) ашиглахгүй |
| Alternative.me F&G | Үнэгүй, түлхүүргүй, арилжаанд зөвшөөрөгдсөн; иш татах тэмдэглэгээ **датаны яг хажууд** | Цаг тутам 1 | |
| open.er-api.com | Түлхүүргүй, өдөрт 1 удаа шинэчлэгддэг, rate-limit-тэй, иш татах заавал | Цаг тутам 1 (кэштэй) | Монголбанкны албан ханш биш |
| GitHub Actions | Public repo-д стандарт runner үнэгүй | live ≈ 24×1 мин/өдөр, weekly 1, deploy 5–6/сар | Public repo-д 60 хоног идэвхгүй бол scheduled workflow унтардаг → data-history branch-д өдөр бүр commit хийснээр идэвхтэй байна |
| GitHub Pages | Public repo-д үнэгүй; сайт ≤1 GB; ~100 GB/сар (soft) | Хэдэн зуун KB JSON | Free данс дээр private repo-д Pages ажиллахгүй → repo **public** байна |

**Төсвийн хамгаалалт:** `scripts/lib/budget.ts` нь CoinGecko дуудлагыг тоолж лог руу бичнэ. Нэг ажиллалтад 5-аас их дуудлага хийх гэвэл алдаа өгнө.

---

## 3. Технологийн стек

- **Expo SDK — хамгийн сүүлийн тогтвортой хувилбар** (`npx create-expo-app@latest`), Expo Router, TypeScript strict.
- `expo.web.output: "static"`, `experiments.typedRoutes: true`.
- Дата татах (клиент): `@tanstack/react-query`.
- Схем шалгалт: `zod` (апп ба скрипт хоёр хуваалцана — `src/types/schemas.ts`).
- График: `react-native-svg` дээр **өөрсдөө бичсэн хөнгөн компонентууд** (sparkline, bar, line, gauge, heatmap). Том chart сан нэмэхгүй (bundle жижиг байх ёстой).
- Фонт: Inter (`@expo-google-fonts/inter`) — кирилл үсэг бүрэн.
- PNG экспорт (зөвхөн вэб): `html-to-image` — `.web.tsx` файлд, товч дарахад lazy import.
- Скриптүүд: Node 22 LTS (глобал `fetch`), `tsx`, `fast-xml-parser` (RSS), `gray-matter` (Markdown frontmatter).
- Тест: `vitest` (скрипт ба `src/lib` логик).
- Lint/format: template-ийн ESLint тохиргоо + Prettier.

Шинэ dependency нэмэхдээ `npx expo install <pkg>` ашигла (Expo-гийн хувилбартай тохирох). Нэмэх бүрдээ шалтгааныг `docs/PROGRESS.md`-д нэг мөрөөр тэмдэглэ.

---

## 4. Репозиторийн бүтэц

```
kripto-7hon/
├─ CLAUDE.md                     # Claude Code-ийн дүрэм (товч)
├─ ZAAVAR.md                     # Хэрэглэгчийн алхам алхмаар заавар
├─ docs/
│  ├─ SPEC.md                    # Энэ файл
│  ├─ PROGRESS.md                # Үе шатын явц, шийдвэрүүд (Claude Code хөтөлнө)
│  └─ EDITOR.md                  # Редакторын 7 хоногийн заавар (Үе шат 6)
├─ app.json · eas.json · package.json · tsconfig.json · vitest.config.ts
├─ src/
│  ├─ app/                       # Зөвхөн route-ууд
│  │  ├─ _layout.tsx             # Фонт, QueryClient, толгой/хөл
│  │  ├─ +html.tsx               # <html lang="mn">, meta, OG
│  │  ├─ index.tsx               # Нүүр
│  │  ├─ zah-zeel.tsx            # Зах зээл (амьд)
│  │  ├─ medee.tsx               # Мэдээ
│  │  ├─ tailan/index.tsx        # Тайлангийн архив
│  │  ├─ tailan/[week].tsx       # Нэг тайлан (generateStaticParams)
│  │  ├─ sudalgaa.tsx            # Судалгаа
│  │  ├─ arga-zui.tsx            # Арга зүй, эх сурвалж, анхааруулга
│  │  └─ +not-found.tsx
│  ├─ components/{layout,charts,cards,report,research}/
│  ├─ lib/
│  │  ├─ config.ts               # DATA_BASE_URL, SITE_URL (нийтийн утгууд)
│  │  ├─ format.ts               # Тоо, валют, хувь (монгол нэгж)
│  │  ├─ dates.ts                # УБ цаг, ISO долоо хоног, тасалбар
│  │  ├─ data-client.ts          # Pages → fallback логик
│  │  ├─ i18n-mn.ts              # Бүх UI текст
│  │  └─ classify.ts             # Мэдээний ангилал (скрипт ба апп хуваалцана)
│  ├─ theme/tokens.ts
│  └─ types/schemas.ts           # Zod схемүүд + TS төрлүүд
├─ scripts/
│  ├─ fetch-live.ts
│  ├─ build-weekly.ts
│  ├─ validate-reports.ts
│  ├─ prepare-build.ts
│  ├─ sources/{coingecko,defillama,feargreed,fx,rss}.ts
│  ├─ lib/{http,state,budget,week}.ts
│  └─ __fixtures__/              # API-уудын бодит хариуны жишээ (тестэд)
├─ content/
│  ├─ research.json              # Судалгааны контент (бэлэн)
│  └─ reports/
│     ├─ index.json              # Зөвхөн нийтлэгдсэн тайлангийн жагсаалт
│     ├─ 2026-W43.json           # Автомат тоо
│     └─ 2026-W43.md             # Редакторын текст (frontmatter)
├─ public/                       # favicon, og.png, robots.txt (+ build үед үүсэх файлууд)
└─ .github/workflows/{live-data,weekly-report,deploy,ci}.yml
```

Хэрэв `create-expo-app` template нь `app/`-г root дээр үүсгэвэл template-ийн бүтцийг дага, гэхдээ дээрх логик хуваарилалтыг хадгал.

---

## 5. Өгөгдлийн эх сурвалж (бүгд үнэгүй)

> **Чухал:** Хэрэгжүүлэх үедээ endpoint бүрийг нэг удаа дуудаж, хариуг `scripts/__fixtures__/`-д хадгалж, талбаруудын нэрийг бодит хариугаас баталгаажуул. Zod схем нь шаардлагатай талбарыг л шалгаж, илүү талбарыг зөвшөөрнө (`.passthrough()`).

### 5.1 CoinGecko (Demo түлхүүр)
- Base: `https://api.coingecko.com/api/v3`, header: `x-cg-demo-api-key: $COINGECKO_DEMO_API_KEY`
- `GET /global` → `data.total_market_cap.usd`, `data.total_volume.usd`, `data.market_cap_percentage.btc|eth`, `data.market_cap_change_percentage_24h_usd`, `data.active_cryptocurrencies`
- `GET /coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h,7d&sparkline=false` → `id, symbol, name, current_price, market_cap, market_cap_rank, total_volume, price_change_percentage_24h_in_currency, price_change_percentage_7d_in_currency`
- `GET /search/trending` → `coins[].item.{id,symbol,name,market_cap_rank}`
- Зөвхөн 7 хоногийн тайланд: `GET /coins/{bitcoin|ethereum}/market_chart?vs_currency=usd&days=30&interval=daily`
- Иш татах: «Data provided by CoinGecko» → `https://www.coingecko.com/en/api` (хөл хэсэгт + CoinGecko дата харуулдаг блок бүрт)
- Coin-ийн лого зураг ашиглахгүй (гуравдагч этгээдийн hotlink, хүсэлт нэмэгдэнэ) → симболын өнгөт дугуй тэмдэг.

### 5.2 DefiLlama (түлхүүргүй)
- `https://api.llama.fi/v2/historicalChainTvl` → `[{date, tvl}]` (нийт DeFi TVL; сүүлийн цэг ба 7 хоногийн өмнөх цэг)
- `https://stablecoins.llama.fi/stablecoincharts/all` → `[{date, totalCirculatingUSD:{peggedUSD,…}}]` (нийт = бүх талбарын нийлбэр)
- `https://stablecoins.llama.fi/stablecoins?includePrices=true` → `peggedAssets[]` (`symbol, name, circulating.peggedUSD, circulatingPrevWeek.peggedUSD`) → топ 5
- `https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true` → `total24h, total7d, change_7dover7d`
- Сонголттой (зөвхөн 7 хоногт): `https://api.llama.fi/hacks` — түлхүүргүй 200 буцаавал тухайн 7 хоногийн хакердалтыг жагсаа; үгүй бол алгас.
- Иш татах: «DefiLlama» → `https://defillama.com`

### 5.3 Alternative.me — Fear & Greed
- `https://api.alternative.me/fng/?limit=31` → `data[].{value, value_classification, timestamp}`
- Монгол шошго: Extreme Fear → «Хэт айдас», Fear → «Айдас», Neutral → «Төвийг сахисан», Greed → «Шунал», Extreme Greed → «Хэт шунал»
- Иш татах: виджетийн **яг доор** «Эх сурвалж: Alternative.me» → `https://alternative.me/crypto/fear-and-greed-index/`

### 5.4 Ханш — open.er-api.com
- `https://open.er-api.com/v6/latest/USD` → `rates.MNT`, `time_last_update_utc`
- Иш татах (яг энэ текст, хуудсан дээр): `<a href="https://www.exchangerate-api.com">Rates By Exchange Rate API</a>`
- UI дээр «Лавлах ханш (Монголбанкны албан ханш биш)» гэж тэмдэглэ. Редактор 7 хоногийн тайланд Монголбанкны албан ханшийг гараар оруулж болно (`mongolbank_usd_mnt`).

### 5.5 Мэдээ — RSS
Нэр дэвшигч жагсаалт. Үе шат 2-т тус бүрийг GitHub Actions болон локал орчноос шалгаж, 200 буцаахгүй эсвэл бот хаадаг эх сурвалжийг хас, үр дүнг `docs/PROGRESS.md`-д тэмдэглэ:

| Эх сурвалж | RSS URL (шалгах) |
|---|---|
| CoinDesk | `https://www.coindesk.com/arc/outboundfeeds/rss/` |
| Cointelegraph | `https://cointelegraph.com/rss` |
| Decrypt | `https://decrypt.co/feed` |
| The Block | `https://www.theblock.co/rss.xml` |
| Bitcoin Magazine | `https://bitcoinmagazine.com/.rss/full/` |
| CryptoSlate | `https://cryptoslate.com/feed/` |
| U.S. SEC (албан) | `https://www.sec.gov/news/pressreleases.rss` — SEC нь холбоо барих имэйлтэй User-Agent шаарддаг (`CONTACT_EMAIL` хувьсагч) |
| Монгол (шалгах) | Montsame, Ikon.mn зэрэг RSS байгаа эсэхийг шалга; байвал «крипто, виртуал хөрөнгө, биткойн, блокчэйн, СЗХ, ВХҮҮ» түлхүүр үгээр шүү |

Дүрэм:
- `User-Agent: kripto-7hon-bot/1.0 (+$SITE_URL; $CONTACT_EMAIL)`, timeout 15 сек.
- **Зөвхөн гарчиг, эх сурвалжийн нэр, огноо, холбоос** хадгална. Тайлбар (description), зураг, бүрэн текст хадгалахгүй, харуулахгүй (зохиогчийн эрх).
- Гарчгийг англиар нь үлдээнэ. Албан бус орчуулгын endpoint (Google Translate-ийн нууц API г.м.) ашиглахгүй. Монгол тайлбарыг редактор 7 хоногийн тайланд бичнэ.
- Давхардал арилгах: URL-ийг canonical болгох (utm_* хасах) + гарчгийг жижиг үсэг, цэг таслалгүй болгоод үгийн Jaccard ≥ 0.8 бол давхардал.
- Ангилал (`src/lib/classify.ts`, гарчгийн түлхүүр үгээр, том жижиг үсэг үл хамаарна):
  - `regulation` «Зохицуулалт»: SEC, CFTC, regulat, law, bill, act, MiCA, FATF, ban, licen, court, lawsuit, sanction, tax
  - `etf` «ETF/Сан»: ETF, ETP, fund flow, BlackRock, IBIT, Grayscale, inflow, outflow
  - `security` «Аюулгүй байдал»: hack, exploit, drain, stolen, phishing, breach, attack, scam
  - `macro` «Макро»: Fed, FOMC, CPI, inflation, rate cut, rate hike, Treasury, dollar, recession, tariff
  - `stablecoin` «Стейблкойн»: stablecoin, USDT, USDC, Tether, Circle
  - `defi` «DeFi»: DeFi, DEX, TVL, Uniswap, Aave, lending
  - `mining` «Олборлолт»: mining, miner, hashrate, halving
  - `market` «Зах зээл»: дээрхэд орохгүй бол
  - `isMongolia`: Mongolia, Mongolian, Ulaanbaatar эсвэл монгол эх сурвалж
- Амьд `news.json` = сүүлийн 7 хоногийн хамгийн шинэ 60 мэдээ.

### 5.6 Гараар оруулах дата (үнэгүй API байхгүй)
- Спот ETF-ийн 7 хоногийн цэвэр урсгал → Farside Investors (`https://farside.co.uk`) эсвэл SoSoValue (`https://sosovalue.com`)
- ETP сангийн урсгал → CoinShares Fund Flows (`https://coinshares.com/insights/research-data/`)
- Монголын мэдээ, СЗХ-ны шийдвэр, ВХҮҮ-ийн жагсаалт → `https://www.frc.mn`, `https://license.frc.mn/`
- Эдгээрийг редактор 7 хоногийн `.md` файлын frontmatter-д эх сурвалжийн холбоостой оруулна.

### 5.7 Хориглох
- Binance, Bybit, OKX зэрэг биржийн futures API-г GitHub Actions-оос дуудахгүй (АНУ-ын runner IP-г газарзүйн хувьд хаадаг, HTTP 451/403).
- Farside, CoinShares зэрэг сайтын HTML-ийг scrape хийхгүй.
- Төлбөртэй endpoint, түлхүүрийг клиент код руу оруулахгүй.

---

## 6. Өгөгдлийн схем (`src/types/schemas.ts`, Zod)

Бүх JSON `schemaVersion: 1` талбартай. Мөнгөн дүн USD-ээр, хувь нь хувиар (4.2 = 4.2%). Огноо ISO 8601 UTC.

```ts
// Эх сурвалжийн төлөв (UI-д «хоцорсон» тэмдэг харуулахад)
type SourceStatus = { id: string; ok: boolean; fetchedAt: string; stale?: boolean; error?: string };

// public-data/live/market.json
type LiveMarket = {
  schemaVersion: 1;
  updatedAt: string;
  sources: SourceStatus[];
  global: {
    totalMarketCapUsd: number; totalVolume24hUsd: number; marketCapChange24hPct: number;
    btcDominancePct: number; ethDominancePct: number; activeCryptocurrencies: number;
  } | null;
  coins: Array<{                       // топ 50
    id: string; symbol: string; name: string; rank: number;
    priceUsd: number; priceMnt: number | null;
    change24hPct: number | null; change7dPct: number | null;
    marketCapUsd: number; volume24hUsd: number; isStablecoin: boolean;
  }>;
  trending: Array<{ id: string; symbol: string; name: string; rank: number | null }>;
  fearGreed: {
    value: number; labelEn: string; labelMn: string; timestamp: string;
    history: Array<{ date: string; value: number }>;   // 30 хоног
  } | null;
  stablecoins: {
    totalUsd: number; change7dPct: number | null;
    top: Array<{ symbol: string; name: string; circulatingUsd: number; change7dPct: number | null }>;
  } | null;
  defi: { tvlUsd: number; change7dPct: number | null; dexVolume24hUsd: number | null; dexVolume7dUsd: number | null } | null;
  fx: { usdMnt: number; source: "exchangerate-api"; asOf: string } | null;
};

// public-data/live/news.json
type NewsTag = "regulation" | "etf" | "security" | "macro" | "stablecoin" | "defi" | "mining" | "market";
type NewsItem = {
  id: string;            // canonical URL-ийн sha1-ийн эхний 12 тэмдэгт
  title: string; url: string; source: string; sourceUrl: string;
  publishedAt: string; tags: NewsTag[]; isMongolia: boolean;
};
type NewsFeed = { schemaVersion: 1; updatedAt: string; sources: SourceStatus[]; items: NewsItem[] };

// public-data/history/daily.json (мөн data-history branch-д нөөцлөнө)
type DailyPoint = {
  date: string;          // "2026-10-20" (UTC өдөр, тухайн өдрийн хаалтад ойр утга)
  totalMarketCapUsd: number | null; totalVolume24hUsd: number | null;
  btcDominancePct: number | null; btcUsd: number | null; ethUsd: number | null;
  stablecoinsUsd: number | null; defiTvlUsd: number | null; fearGreed: number | null; usdMnt: number | null;
};
type DailyHistory = { schemaVersion: 1; points: DailyPoint[] };

// public-data/news/<YYYY-Www>.json — 7 хоногийн мэдээний архив
type NewsWeekArchive = { schemaVersion: 1; week: string; items: NewsItem[] };

// public-data/live/status.json
type LiveStatus = { schemaVersion: 1; updatedAt: string; sources: SourceStatus[]; coingeckoCallsThisRun: number };

// content/reports/<week>.json — автомат хэсэг
type CoinMove = { symbol: string; name: string; priceUsd: number; change7dPct: number; marketCapUsd: number };
type WeeklyAuto = {
  schemaVersion: 1;
  week: string;                    // "2026-W43"
  periodStart: string;             // "2026-10-19" (Даваа)
  periodEnd: string;               // "2026-10-25" (Ням)
  cutoffUtc: string;               // "2026-10-25T23:59:59Z"
  fetchedAt: string;               // бодит татсан цаг
  global: {
    totalMarketCapUsd: number; totalMarketCapUsd7dAgo: number | null; change7dPct: number | null;
    change7dMethod: "history" | "top100-estimate" | null;
    btcDominancePct: number; btcDominancePct7dAgo: number | null;
    ethDominancePct: number; totalVolume24hUsd: number;
  };
  majors: Array<{
    symbol: "BTC" | "ETH"; priceUsd: number; priceMnt: number | null;
    change7dPct: number; change30dPct: number | null;
    chart30d: Array<{ date: string; priceUsd: number }>;
  }>;
  topGainers: CoinMove[]; topLosers: CoinMove[];   // топ 100-аас, стейблкойнгүй, тус бүр 5
  heatmapTop20: CoinMove[];
  stablecoins: { totalUsd: number; change7dPct: number | null; top: Array<{ symbol: string; circulatingUsd: number; change7dPct: number | null }> };
  defi: { tvlUsd: number; change7dPct: number | null; dexVolume7dUsd: number | null; dexChange7dPct: number | null };
  fearGreed: { value: number; labelMn: string; value7dAgo: number | null; series7d: Array<{ date: string; value: number }> };
  fx: { usdMnt: number; source: string; asOf: string } | null;
  trending: Array<{ symbol: string; name: string }>;
  newsCandidates: NewsItem[];      // 7 хоногийн архиваас 15 мэдээ (ангилал бүрээс тэнцвэртэй)
  hacks: Array<{ name: string; date: string; amountUsd: number | null; url?: string }> | null;
  suggestedSentences: string[];    // автомат монгол өгүүлбэрүүд
  sources: SourceStatus[];
};
```

### 6.1 Редакторын файл `content/reports/<week>.md`

```markdown
---
week: 2026-W43
status: draft            # draft | published — зөвхөн published нь сайтад гарна
headline: ""             # ≤120 тэмдэгт. Томьёо: тоо + чиглэл + шалтгаан
summary: ""              # 1–2 өгүүлбэр (OG description, нүүр хуудасны карт)
takeaways:               # яг 3, тоо агуулсан
  - ""
  - ""
  - ""
etf:
  btc_net_flow_usd: null # 7 хоногийн цэвэр урсгал, жишээ нь -1470000000
  eth_net_flow_usd: null
  source_name: "Farside Investors"
  source_url: "https://farside.co.uk"
coinshares:
  weekly_flow_usd: null
  url: ""
mongolbank_usd_mnt: null # Монголбанкны албан ханш (заавал биш)
news_picks: []           # newsCandidates-аас сонгосон 3–5 URL
mongolia: []             # - text: "..."  url: "..."
regulation: []           # - text: "..."  url: "..."
calendar: []             # - date: "2026-10-28"  event: "FOMC хүүгийн шийдвэр"
author: ""
corrections: []          # - date: "2026-10-27"  text: "..."
---

Редакторын чөлөөт тайлбар (заавал биш). Зөвхөн догол мөр, `-` жагсаалт, `###` дэд гарчиг дэмжинэ.
```

`build-weekly.ts` нь `.md` файлыг **зөвхөн байхгүй үед** үүсгэнэ — редакторын бичсэнийг хэзээ ч дарж бичихгүй. Үүсгэхдээ доод хэсэгт `<!-- auto-suggestions -->` коммент дотор `suggestedSentences`-ийг санал болгон оруулна (сайтад харагдахгүй).

### 6.2 Клиентэд очих нэгтгэсэн тайлан `public/reports/<week>.json`
`prepare-build.ts` нь `{ auto: WeeklyAuto, editorial: <frontmatter>, body: Block[], publishedAt }` хэлбэрээр нэгтгэнэ. `Block = {type:"p"|"li"|"h3", text}` — Markdown-ийг build үед энгийн блок болгож хувиргана (runtime-д markdown сан хэрэггүй).

`content/reports/index.json` (зөвхөн published): `[{ week, periodStart, periodEnd, headline, summary, btcChange7dPct, totalMarketCapUsd, fearGreed, publishedAt }]` — шинэ нь эхэндээ.

---

## 7. Скриптүүдийн үйлдэл

> **2026.10.22-аас (PROGRESS D59):** §7.1–7.4 нь Python дээр хэрэгжинэ: `backend/src/kripto_api/` — `state.py`, `live.py`, `weekly_job.py`, `validate.py`. Командууд хэвээр (`npm run data:live` → `kripto live` г.м.), Zod-ийн оронд Pydantic (`schemas.py`). Доорх `scripts/*.ts` нэрс нь анхны тодорхойлолтын нэр. §7.5 (`prepare-build.ts`) TS хэвээр.

### 7.1 Төлөв (state) — `scripts/lib/state.ts`
- Төлөв = `history/daily.json` + `news/<week>.json`.
- **Ачаалах дараалал:** (1) GitHub Pages дээрх нийтлэгдсэн хувилбар (`$DATA_BASE_URL/...`) → (2) `store/` (data-history branch-ийн checkout) → (3) хоосон.
- **Хадгалах:** Pages руу ажиллалт бүрд нийтэлнэ. `store/` руу **UTC өдөрт нэг удаа** commit хийнэ (git-ийн хэмжээ хэт томрохоос сэргийлж).
- Өдрийн цэг: шинэ UTC өдрийн анхны ажиллалт (00:07 UTC) нь одоогийн утгыг **өмнөх өдрийн** хаалтын цэг болгон бичнэ. Тухайн өдрийн явцын утгыг Pages-ийн хувилбарт `provisional: true` гэж түр нэмж болно, store-д хадгалахгүй.

### 7.2 `scripts/fetch-live.ts` (`npm run data:live`)
1. Төлөв ачаална; өмнөх `live/market.json`-ийг Pages-аас татна (эх сурвалж бүтэлгүйтвэл түүний өмнөх утгыг ашиглахад).
2. Эх сурвалж бүрийг тусад нь ажиллуулна (`Promise.allSettled`): timeout 15 сек, 2 удаа давтан оролдох (exponential backoff); 429 бол 60 сек хүлээгээд 1 удаа. Бүтэлгүйтвэл өмнөх утгыг `stale: true`-тэй үлдээнэ.
3. `market.json`, `news.json`, `status.json`, `history/daily.json`, `news/<week>.json`-ийг `public-data/`-д бичнэ. Бүгдийг Zod-оор шалгана.
4. CoinGecko-гийн 1 ажиллалтын дуудлага ≤5 (budget guard).
5. Гарах код: зарим эх сурвалж бүтэлгүйтсэн ч 0. Бүх зах зээлийн эх сурвалж бүтэлгүйтсэн эсвэл схем алдаатай бол 1 (GitHub имэйлээр мэдэгдэнэ).
6. Стейблкойн илрүүлэх: DefiLlama-гийн стейблкойн симболын жагсаалт ∪ үндсэн жагсаалт (usdt, usdc, dai, usde, fdusd, pyusd, tusd, usds, usdd, rlusd) ∪ үнэ 0.97–1.03 бөгөөд нэр нь «usd» агуулсан.
7. `priceMnt = priceUsd × usdMnt`.

### 7.3 `scripts/build-weekly.ts` (`npm run report:draft -- [--week 2026-W43] [--auto-publish] [--dry-run]`)
1. Долоо хоног: аргумент байхгүй бол `isoWeek(now − 12 цаг)` (Ням 23:55-д эсвэл Даваа өглөө хоцорч ажиллавал ч зөв 7 хоногийг сонгоно).
2. Шинээр татна: CoinGecko (`/global`, `/coins/markets`, BTC/ETH `market_chart` 30 хоног), DefiLlama, F&G (`limit=8`), ханш, (сонголттой) hacks.
3. Нийт зах зээлийн үнэлгээний 7 хоногийн өөрчлөлт: түүхэнд 7 хоногийн өмнөх цэг байвал `history`; үгүй бол `top100-estimate` = Σ(mcap / (1 + 7d%/100)) топ 100-аар — UI дээр «топ 100-аар тооцоолсон» гэж тэмдэглэнэ.
4. `newsCandidates`: 7 хоногийн архиваас ангилал бүрээс тэнцвэртэйгээр 15 мэдээ.
5. `suggestedSentences` (дүрэмд суурилсан монгол өгүүлбэр), жишээ:
   - «Биткойн 7 хоногт 4.2 хувиар өсөж, 68,450 ам.долларт хүрлээ.» / «…4.2 хувиар буурч, … ам.долларт хүрлээ.»
   - «Криптогийн нийт зах зээлийн үнэлгээ 2.45 их наяд ам.доллар болж, 7 хоногт 3.1 хувиар нэмэгдлээ.»
   - «Биткойны давамгайлал 57.8 хувь боллоо (өмнөх 7 хоногт 57.1 хувь).»
   - «Стейблкойны нийт нийлүүлэлт 312.4 тэрбум ам.доллар, 7 хоногт 0.8 хувиар өслөө.»
   - «DeFi-д түгжигдсэн нийт хөрөнгө (TVL) 118.2 тэрбум ам.доллар байна.»
   - «Айдас ба шунахайн индекс 34 (Айдас) байна, өмнөх 7 хоногт 52 байсан.»
   - «Топ 100-аас хамгийн их өссөн нь XYZ (+38.5%).»
   (Тоонууд нь зөвхөн жишээ. Өгүүлбэр дотор «%», «$» тэмдэгт залгавар залгахгүй байхын тулд «хувиар», «ам.доллар/ам.долларт» гэж үгээр бичнэ — монгол залгаврын алдаанаас сэргийлнэ. Өсөлт/бууралтын үйл үг: өсөж/буурч, нэмэгдлээ/буурлаа; 0.05%-иас бага өөрчлөлтийг «бараг өөрчлөгдөөгүй» гэнэ. Тестээр баталгаажуул.)
6. Гаралт: `content/reports/<week>.json` (дарж бичнэ), `content/reports/<week>.md` (байхгүй үед л), `content/reports/index.json`-ийг дахин үүсгэнэ.
7. `--auto-publish`: `.md`-д `status: published`, headline = эхний санал болгосон өгүүлбэр, takeaways = дараагийн 3 өгүүлбэр.

### 7.4 `scripts/validate-reports.ts` (`npm run validate`)
`status: published` файл бүрд:
- headline 1–120 тэмдэгт, summary хоосон биш, takeaways яг 3 бөгөөд хоосон биш;
- харгалзах `<week>.json` байгаа, схемд тэнцэнэ;
- Логик шалгалт: давамгайлал 0–100, үнэ > 0, F&G 0–100, `|7 хоногийн %| > 60` бол **анхааруулга** (алдаа биш);
- ETF урсгал оруулсан бол `source_url` заавал;
- Холбоосууд `https://`-ээр эхэлнэ.
Алдаа байвал exit 1 → deploy зогсоно.

### 7.5 `scripts/prepare-build.ts` (`npm run prebuild:web`, `expo export`-ийн өмнө)
1. Published тайлан бүрийг нэгтгээд `public/reports/<week>.json` болгоно.
2. `$DATA_BASE_URL/live/market.json`, `news.json`-ийг татаж `public/fallback/`-д хадгална (татаж чадахгүй бол repo-д байгаа `public/fallback/*.sample.json`-ийг ашиглана).
3. `public/sitemap.xml`, `public/robots.txt`-ийг `SITE_URL`-аар үүсгэнэ.
4. `public/reports/`, `public/fallback/`, `sitemap.xml` нь `.gitignore`-д (build-ийн бүтээгдэхүүн).

---

## 8. Хуудас ба UI

Бүх хуудас: монгол (кирилл) текст, `<html lang="mn">`, хуудас бүр өөрийн `<Head>` title/description-тэй. Хөл хэсэгт: иш татах мөрүүд (CoinGecko, DefiLlama, Alternative.me, Exchange Rate API), «Энэ нь хөрөнгө оруулалтын зөвлөгөө биш» анхааруулга, «Арга зүй» холбоос.

**Толгой (навигаци):** Лого/нэр «ВХ 7 хоног» · Нүүр · Зах зээл · Мэдээ · Тайлан · Судалгаа · Арга зүй. ≥1024px-д хэвтээ цэс, <1024px-д hamburger. Идэвхтэй хуудсыг тодруулна. Гар (keyboard) ашиглах боломжтой.

**Амьд датаны төлөв:** «Сүүлд шинэчилсэн: 2026.10.21 14:07 (УБ)». `updatedAt` 3 цагаас хуучин бол шар туз: «Өгөгдөл хоцорч байж болзошгүй». Fallback ашиглаж байвал саарал туз: «Түр хадгалсан өгөгдөл харуулж байна».

### 8.1 Нүүр `/`
1. Hero: «Виртуал хөрөнгийн 7 хоног» + нэг өгүүлбэр тайлбар.
2. Амьд KPI мөр (8 карт, том тоо + жижиг ▲▼ %): Нийт зах зээлийн үнэлгээ · BTC (USD ба ₮) · ETH · BTC давамгайлал · Айдас ба шунахайн индекс · Стейблкойны нийлүүлэлт · DeFi TVL · USD/MNT.
3. Сүүлийн 7 хоногийн тайлангийн карт: долоо хоногийн шошго, headline, 3 takeaway, «Тайлан унших →».
4. Сүүлийн 8 мэдээ (ангиллын шошготой).
5. Судалгааны товч: «Олон улсын N жишээ, M дата эх сурвалж, Монголын зохицуулалт» (N, M-ийг `research.json`-оос тоолно) → `/sudalgaa`.

### 8.2 Зах зээл `/zah-zeel`
- Топ 20 хүснэгт: #, Нэр, Үнэ ($), Үнэ (₮), 24 цаг %, 7 хоног %, Зах зээлийн үнэлгээ, Хэмжээ (24ц). Мобайлд: Нэр, Үнэ, 7 хоног % л харагдана, бусдыг «дэлгэрэнгүй» дарж нээнэ. Баганаар эрэмбэлэх.
- Өсөлт/бууралтын топ 5 (хэвтээ bar), Trending жагсаалт.
- Айдас ба шунахайн индексийн хэмжигч (gauge) + 30 хоногийн шугам.
- Стейблкойн (нийт + топ 5), DeFi TVL, DEX хэмжээ — түүхэн sparkline (`history/daily.json`).

### 8.3 Мэдээ `/medee`
- Шүүлтүүр: ангилал (chip), эх сурвалж, «Зөвхөн Монгол», хайлт (гарчгаар).
- Мөр бүр: гарчиг (гадагш холбоос, `target=_blank rel="noopener noreferrer"`), эх сурвалж, «2 цагийн өмнө» маягийн харьцангуй цаг, ангиллын шошго.
- Дээр нь: «Гарчгийг эх хэлээр нь харуулж байна. Мэдээний бүрэн эх нь тухайн хэвлэлд хамаарна.»

### 8.4 Тайлангийн архив `/tailan`
Карт жагсаалт (шинэ нь дээрээ): «2026 оны 43 дугаар долоо хоног · 10.19–10.25», headline, BTC 7 хоногийн %, F&G.

### 8.5 Нэг тайлан `/tailan/[week]` (`generateStaticParams` ← `content/reports/index.json`)
Дараалал:
1. **Инфографик** (доорх 8.8), «PNG татах» товч, «Хэвлэх / PDF» товч (`window.print()`, print CSS).
2. **Товч мэдээ** (400–600 үг): headline → 3 гол санаа → «Зах зээл тоогоор» хүснэгт (6–8 мөр, өмнөх 7 хоногтой харьцуулсан ▲▼) → Монгол → Ирэх 7 хоногт → эх сурвалж. «Текст хуулах» товч — Facebook/Telegram-д наах цэвэр текст хувилбар (холбоостой).
3. **Дэлгэрэнгүй хэсгүүд:** Зах зээлийн тойм (BTC/ETH 30 хоногийн шугам, топ 20 heatmap) · Хөрөнгийн урсгал (ETF — гараар, стейблкойн) · DeFi · Сэтгэл зүй (F&G 7 хоног) · Зохицуулалт · Монгол · Сонгосон мэдээ · Хуанли · Редакторын тайлбар · Залруулга.
4. **Арга зүй ба эх сурвалж:** дата тус бүрийн «…-ны байдлаар» огноо (Glassnode-ийн жишгээр), эх сурвалжийн холбоос, анхааруулга.
5. Өмнөх/дараах 7 хоногийн навигаци.

### 8.6 Судалгаа `/sudalgaa` (← `content/research.json`)
Табууд эсвэл anchor бүхий хэсгүүд:
1. Олон улсын жишээ (шалгаж баталгаажуулсан 9) — хүснэгт/карт, холбоостой.
2. Зохицуулагчдын статистик (4).
3. Нэмэлт лавлах жагсаалт («2026 оны идэвхийг шалгаагүй» тэмдэгтэй).
4. Үзүүлэлтийн давтамжийн матриц (✔/○/–).
5. Дизайны шилдэг туршлага.
6. Дата эх сурвалж ба API (үнэгүй/төлбөртэй, лиценз).
7. Монгол: эрх зүйн орчин, СЗХ-ны тоо (2023–2025, зөрүүний тайлбартай), бүртгэлтэй ВХҮҮ (баталгаажуулах сануулгатай), 2023 оны зах зээлийн хувь.
8. Нэр томьёо (Монгол–Англи).
9. Эх сурвалжийн бүрэн жагсаалт.
Дээд талд: «Судалгааг 2026.10.21-ний байдлаар нэгтгэсэн.»

### 8.7 Арга зүй `/arga-zui`
Дата тасалбар (Ням 23:59 UTC = Даваа 07:59 УБ), нийтлэх цаг (Даваа 12:00 УБ), тооцооллын арга (7 хоногийн %, топ 100 тооцоолол, стейблкойн илрүүлэлт), эх сурвалж ба лиценз, QA процесс, залруулгын бодлого, анхааруулга. `research.json`-ийн `production_schedule`-ийг харуулна.

### 8.8 Инфографик (тайлангийн гол визуал)
- Логик хэмжээ **1080×1350** (4:5, нийгмийн сүлжээнд), контейнерт тааруулж CSS `transform: scale()`-ээр жижигрүүлнэ. PNG-г үргэлж 1080×1350-аар экспортлоно (`document.fonts.ready`-г хүлээж).
- Дээрээс доош:
  1. Толгой: лого · «ВИРТУАЛ ХӨРӨНГИЙН 7 ХОНОГ» · «2026 · 43 дугаар 7 хоног» · «Дата тасалбар: 2026.10.25 23:59 UTC»
  2. Headline (2 мөрөөс хэтрэхгүй)
  3. 4 KPI карт: Нийт зах зээлийн үнэлгээ · BTC үнэ · BTC давамгайлал · Айдас ба шунахай (gauge)
  4. ETF урсгал (гараар оруулсан бол) эсвэл BTC 30 хоногийн шугам
  5. Хоёр багана: зүүн — Топ 5 өсөлт/бууралт; баруун — Стейблкойн + DeFi TVL (sparkline)
  6. Монгол блок: BTC (₮), USD/MNT, Монгол мэдээ 1–2 мөр
  7. Ирэх 7 хоног: 3–4 үйл явдал
  8. Хөл: эх сурвалжууд · «Хөрөнгө оруулалтын зөвлөгөө биш» · сайтын URL
- Цайвар (default) ба бараан хувилбар.

---

## 9. Дизайны систем

- **Өнгө (tokens):** эерэг `#16A34A`, сөрөг `#DC2626`, саармаг `#64748B`; BTC `#F7931A`, ETH `#627EEA`, стейблкойн `#26A17B`; брэнд үндсэн өнгийг `frontend-design` skill-ээр нэг чиглэл сонгож тогтоо (template-ийн default-оор бүү үлдээ). Цайвар/бараан горим (`useColorScheme`).
- **Чиглэлийг өнгөөр бус тэмдгээр ч** илэрхийл: ▲ / ▼, «+» / «−» (U+2212). Контраст WCAG AA.
- **Фонт:** Inter 400/500/600/700; тоонд `fontVariant: ['tabular-nums']`.
- **Хэмжээ:** container max-width 1200px; breakpoint: <600 (1 багана), 600–1023 (2), ≥1024 (3–4).
- **Тоо форматлах (`src/lib/format.ts`, тесттэй):**
  - `usdCompact(2.45e12)` → «$2.45 их наяд»; `9.53e10` → «$95.3 тэрбум»; `1.2e9` → «$1.20 тэрбум»; `3.4e8` → «$340 сая»; `<1e6` → «$123,456»
  - `mntCompact(2.451e11)` → «245.1 тэрбум ₮»
  - `price`: ≥1000 → «$68,450»; ≥1 → «$2.47»; <1 → 4 тоон оронтой «$0.1234»
  - `pct(4.234)` → «+4.2%»; `pct(-3.1)` → «−3.1%»
  - Мянгатыг таслал, бутархайг цэгээр.
- **Огноо (`src/lib/dates.ts`, тесттэй):** цагийн бүс `Asia/Ulaanbaatar`. «2026.10.21», «2026.10.21 14:07 (УБ)», «2026 оны 43 дугаар долоо хоног (10.19–10.25)». ISO долоо хоног: 2026-W43 = 2026.10.19–10.25.
- **UI текст** бүгд `src/lib/i18n-mn.ts`-д (хуудсанд hardcode хийхгүй).
- **Нэр томьёо:** `research.json` → `glossary`-тэй нийцүүл (ВХҮҮ, нийт зах зээлийн үнэлгээ, биткойны давамгайлал, стейблкойн, TVL, айдас ба шунахайн индекс…).

---

## 10. GitHub Actions workflow-ууд

Action-уудын **хамгийн сүүлийн major хувилбарыг** шалгаж ашигла (`actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`, `expo/expo-github-action`, `peter-evans/create-pull-request`). Бүх workflow-д `timeout-minutes`, `concurrency` заавал.

### 10.1 `live-data.yml`
```yaml
name: live-data
on:
  schedule: [{ cron: "7 * * * *" }]      # цаг бүрийн 7 дахь минут (цагийн эхний ачааллаас зайлсхийх)
  workflow_dispatch: {}
permissions: { contents: write, pages: write, id-token: write }
concurrency: { group: live-data, cancel-in-progress: false }
jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    environment: { name: github-pages }
    steps:
      # 1) main-ийг checkout; 2) data-history branch-ийг path: store руу checkout
      # 3) setup-node (22, npm cache); npm ci
      # 4) npm run data:live  (env: COINGECKO_DEMO_API_KEY, CONTACT_EMAIL, SITE_URL, DATA_BASE_URL)
      # 5) store өөрчлөгдсөн бол (өдөрт 1) github-actions[bot]-аар commit + push
      # 6) configure-pages → upload-pages-artifact (path: public-data) → deploy-pages
```

### 10.2 `weekly-report.yml`
```yaml
name: weekly-report
on:
  schedule: [{ cron: "55 23 * * 0" }]    # Ням 23:55 UTC = Даваа 07:55 УБ
  workflow_dispatch:
    inputs: { week: { description: "Жишээ нь 2026-W43 (хоосон бол автоматаар)", required: false } }
permissions: { contents: write, pull-requests: write }
concurrency: { group: weekly-report, cancel-in-progress: false }
jobs:
  draft:
    # checkout + store → npm ci → npm run report:draft -- [--week] [--auto-publish if vars.AUTO_PUBLISH == 'true']
    # AUTO_PUBLISH != 'true': peter-evans/create-pull-request
    #   branch: report/<week>, title: "Тайлан <week> — ноорог", body: QA шалгах жагсаалт (§13.1)
    # AUTO_PUBLISH == 'true': main руу шууд commit
  deploy:
    needs: draft
    if: vars.AUTO_PUBLISH == 'true'
    uses: ./.github/workflows/deploy.yml   # GITHUB_TOKEN-оор хийсэн push бусад workflow-г өдөөдөггүй тул шууд дуудна
    secrets: inherit
```
Тэмдэглэл: PR-ийг хүн merge хийхэд үүсэх push нь `deploy.yml`-ийг өдөөнө.

### 10.3 `deploy.yml`
```yaml
name: deploy
on:
  push:
    branches: [main]
    paths: ["src/**", "content/**", "public/**", "package.json", "package-lock.json", "app.json", "scripts/**"]
  workflow_call: {}
  workflow_dispatch: {}
  schedule: [{ cron: "0 3 1,15 * *" }]   # keepalive: Free-ийн 30 хоногийн deployment retention-д найдахгүй байх
concurrency: { group: deploy-prod, cancel-in-progress: false }
jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      # checkout → setup-node 22 → npm ci
      # npm run typecheck && npm test && npm run validate
      # npm run prebuild:web          (env: SITE_URL, DATA_BASE_URL)
      # npx expo export --platform web
      # expo/expo-github-action (eas-version: latest, token: ${{ secrets.EXPO_TOKEN }})
      # eas deploy --prod  (CI-д interactive асуулт гаргахгүй байх flag-уудыг `eas deploy --help`-ээс шалга)
```

### 10.4 `ci.yml`
Pull request бүрд: `npm ci` → typecheck → test → validate → `npx expo export -p web`.

**Урьдчилан харах (preview):** `report/*` branch-ийн PR дээр `eas deploy` (**`--prod`-гүй**, preview URL) хийж, URL-ийг PR-д comment болгон бичнэ — редактор нийтлэхээсээ өмнө инфографикийг харна. Анхаар: `GITHUB_TOKEN`-оор нээгдсэн PR нь `pull_request` workflow-г өдөөдөггүй; редактор PR дээр анхны засвараа commit хийхэд л CI ба preview ажиллана. Preview-д `draft` тайланг ч харуулахын тулд `prepare-build.ts`-д `--include-drafts` flag нэм (зөвхөн preview-д).

### 10.5 Нэг удаагийн бэлтгэл (Claude Code локалаар хийнэ)
- `data-history` orphan branch: `history/daily.json` (`{"schemaVersion":1,"points":[]}`), `news/.gitkeep` → push.
- Хэрэглэгчийн гараар хийх тохиргоог (§11) Claude Code хийх гэж оролдохгүй — хэрэглэгчээс хүснэ.

---

## 11. Хэрэглэгчийн гараар хийх тохиргоо (Claude Code хийхгүй, хүснэ)

| Хаана | Юу |
|---|---|
| GitHub → repo → Settings → Pages | Source: **GitHub Actions** |
| GitHub → Settings → Actions → General | Workflow permissions: **Read and write**; ✅ **Allow GitHub Actions to create and approve pull requests** |
| GitHub → Settings → Secrets and variables → Actions → Secrets | `COINGECKO_DEMO_API_KEY`, `EXPO_TOKEN` |
| … → Variables | `SITE_URL` (`https://<нэр>.expo.app`), `DATA_BASE_URL` (`https://<user>.github.io/<repo>`), `CONTACT_EMAIL`, `AUTO_PUBLISH` (`false`) |
| Терминал (хэрэглэгч өөрөө) | `npx eas-cli@latest login`, анхны `eas deploy --prod` (subdomain сонгох) |
| expo.dev → Account settings → Access tokens | `EXPO_TOKEN` үүсгэх |
| Локал `.env.local` (gitignore) | `COINGECKO_DEMO_API_KEY=...` |

Нийтийн утга (`DATA_BASE_URL`, `SITE_URL`) клиентэд `EXPO_PUBLIC_DATA_BASE_URL`, `EXPO_PUBLIC_SITE_URL` нэрээр build үед орно (нууц биш). Нууц түлхүүр **хэзээ ч** `EXPO_PUBLIC_` угтвартай байхгүй.

---

## 12. Хэрэгжүүлэх үе шатууд ба хүлээн авах шалгуур

Үе шат бүрийн төгсгөлд: typecheck + test + `npx expo export -p web` амжилттай, `docs/PROGRESS.md` шинэчлэгдсэн, нэг commit (англи мессеж). Дараагийн үе шатыг хэрэглэгч зөвшөөрсний дараа эхэлнэ.

| # | Үе шат | Хүлээн авах шалгуур |
|---|---|---|
| 1 | **Суурь ба UI (жишээ датагаар)** — Expo төсөл, theme, толгой/хөл, бүх 7 хуудас, `research.json`-оос Судалгаа хуудас, `public/fallback/*.sample.json`, `format.ts`/`dates.ts` тесттэй | `npx expo start --web`-д бүх хуудас нээгдэнэ; 360px ба 1440px өргөнд эвдрэлгүй; Судалгаа хуудсанд бүх холбоос ажиллана; тест ногоон |
| 2 | **Дата скриптүүд** — `scripts/sources/*`, `fetch-live.ts`, state, budget, fixtures, RSS шалгалт | `npm run data:live` локалаар `public-data/`-д схемд тэнцсэн 4+ файл үүсгэнэ; нэг эх сурвалжийг хүчээр унагахад бусад нь ажиллана; RSS-ийн шалгалтын үр дүн PROGRESS.md-д |
| 3 | **GitHub + Pages + клиент холболт** — repo, `data-history` branch, `live-data.yml`, `data-client.ts` (Pages → fallback), стейл туз | Actions-аас гараар ажиллуулахад Pages URL дээр JSON гарна (`curl -I`-д `access-control-allow-origin: *`); локал сайт Pages-ийн датаг харуулна |
| 4 | **7 хоногийн тайлан** — `build-weekly.ts`, `.md` загвар, `validate-reports.ts`, `prepare-build.ts`, тайлангийн хуудас, инфографик, PNG, хэвлэх, текст хуулах, `weekly-report.yml` | `npm run report:draft -- --week 2026-W43 --dry-run` ажиллана; жишээ тайланг published болгоход хуудас, инфографик, PNG (1080×1350) зөв |
| 5 | **EAS Hosting deploy** — `eas init`, `deploy.yml`, `ci.yml` (PR preview-тэй), keepalive | Хэрэглэгч анхны deploy хийсний дараа Actions-аас deploy амжилттай; `https://<нэр>.expo.app` бүх хуудастай нээгдэнэ; тест PR дээр preview URL comment-оор ирнэ |
| 6 | **QA ба баримт** — Lighthouse (гүйцэтгэл/хүртээмж ≥90 зорилт), `docs/EDITOR.md`, README, og.png, sitemap | Шалгах жагсаалт (§13) бүгд ✅ |

---

## 13. Шалгах жагсаалт

### 13.1 7 хоног бүрийн редакторын QA (PR-ийн body-д автоматаар оруулна)
- [ ] Headline: тоо + чиглэл + шалтгаан, ≤120 тэмдэгт
- [ ] 3 гол санаа тус бүр тоотой
- [ ] Тоонуудыг 2 эх сурвалжаар тулгасан (CoinGecko ↔ CoinMarketCap, ±1%)
- [ ] ETF урсгалыг Farside/SoSoValue-оос оруулж, холбоосыг өгсөн
- [ ] ▲▼ тэмдэг, % тэмдэг, нэгж (тэрбум/их наяд, $/₮) зөв
- [ ] Долоо хоногийн дугаар, огноо зөв
- [ ] Монгол хэсэг (СЗХ-ны мэдээ, ханш) шинэчлэгдсэн
- [ ] Ирэх 7 хоногийн хуанли
- [ ] Монгол үг үсэг, нэр томьёо тууштай
- [ ] `status: published` болгосон

### 13.2 Техникийн
- [ ] Клиент bundle-д нууц түлхүүр байхгүй (`dist/`-д `grep -r "CG-"` хоосон)
- [ ] Бүх гадаад холбоос `rel="noopener noreferrer"`
- [ ] Иш татах мөрүүд (CoinGecko, DefiLlama, Alternative.me виджетийн хажууд, Exchange Rate API) харагдана
- [ ] Мэдээнд зөвхөн гарчиг/эх сурвалж/огноо/холбоос
- [ ] Pages унтарсан үед fallback ажиллана (DATA_BASE_URL-ийг буруу болгож шалга)
- [ ] 360px мобайлд хэвтээ гүйлгээгүй
- [ ] Lighthouse: Performance, Accessibility, SEO ≥ 90 (зорилт)

---

## 14. Дүрэм ба хориг (товчоор)

1. Төлбөртэй үйлчилгээ, төлбөртэй түвшин нэмэхгүй. Хязгаар (§2)-аас хэтрэх шийдэл санал болговол эхлээд хэрэглэгчээс асуу.
2. Нууц түлхүүр зөвхөн GitHub Secrets ба `.env.local`-д. Клиент кодонд, commit-д, лог-д хэзээ ч гарахгүй.
3. `expo.web.output` = `"static"`. API route (`+api.ts`) нэмэхгүй (EAS Free-ийн 10 CPU-ms хязгаар).
4. Редакторын `.md` файлыг скрипт дарж бичихгүй.
5. Мэдээний бүрэн текст, тайлбар, зураг хуулахгүй. Гуравдагч этгээдийн лого, брэнд дүрс ашиглахгүй.
6. «Худалдаж ав/зар» гэх мэт хөрөнгө оруулалтын зөвлөгөө өгөх үг хэллэггүй. Анхааруулга хуудас бүрд.
7. Эх сурвалж бүтэлгүйтэхэд сайт эвдрэхгүй — өмнөх утга + «хоцорсон» тэмдэг.
8. Бүх тооцооллын функц тесттэй (`format`, `dates`, долоо хоног, %-ийн өөрчлөлт, стейблкойн илрүүлэлт, давхардал, ангилал, монгол залгавар).
9. Commit мессеж англиар, богино. Нэг үе шат = нэг буюу цөөн commit.
10. Тодорхойгүй зүйл гарвал энэ SPEC-ийг дага; SPEC-д байхгүй бол хамгийн энгийн, үнэгүй шийдлийг сонгоод `docs/PROGRESS.md`-д шалтгааныг бич.
