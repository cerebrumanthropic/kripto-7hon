# PROGRESS — «Виртуал хөрөнгийн 7 хоног»

Явц, шийдвэр, нээлттэй асуултын бүртгэл. Шинэ бичлэг дээрээ нэмэгдэнэ.

## Төлөв

| # | Үе шат | Төлөв |
|---|---|---|
| 0 | SPEC унших, зөрчил тодруулах | ✅ 2026.10.21 |
| 1 | Суурь ба UI (жишээ датагаар) | ✅ 2026.10.21 — хүлээн авсан |
| 2 | Дата скриптүүд | ✅ 2026.10.21 — хүлээн авсан |
| 3 | GitHub + Pages + клиент холболт | ✅ 2026.10.21 — хүлээн авсан |
| 4 | 7 хоногийн тайлан | ✅ 2026.10.21 — хэрэглэгчийн хүлээн авалтыг хүлээж байна |
| 5 | EAS Hosting deploy | ⏳ Зөвшөөрөл хүлээж байна |
| 6 | QA ба баримт | — |

## 2026.10.21 — Үе шат 4: 7 хоногийн тайлан

### Хийсэн
- `scripts/build-weekly.ts` (`npm run report:draft -- [--week] [--auto-publish] [--dry-run] [--now] [--print-week]`):
  - Татах эх сурвалж: CoinGecko 4 дуудлага (global, markets топ 100, BTC/ETH 30 хоног), DefiLlama (TVL, стейблкойн, DEX, hacks), F&G (`limit=8`), ханш.
  - Trending-ийг Pages-ийн `live/market.json`-оос авдаг. Ингэснээр CoinGecko-гийн нэг дуудлага хэмнэнэ.
  - `<week>.json`-ийг дарж бичнэ. `<week>.md`-г зөвхөн байхгүй үед үүсгэнэ (draft эсвэл `--auto-publish` бол published).
- `scripts/lib/sentences.ts`: SPEC §7.3.5-ын дүрэмд суурилсан монгол өгүүлбэрүүд.
  - «хувиар», «ам.доллар/ам.долларт» гэж үгээр бичнэ. 0.05%-иас бага өөрчлөлтийг «бараг өөрчлөгдөөгүй» гэнэ.
  - SPEC-ийн бүх жишээг тестээр баталгаажуулсан.
- `scripts/lib/weekly.ts`: нийт үнэлгээний 7 хоногийн өөрчлөлт (түүх эсвэл топ 100-ын тооцоо), өсөлт/бууралт, heatmap (стейблкойнгүй), F&G 7 хоног, ангилал бүрээс тэнцвэртэй 15 мэдээ (Монгол мэдээ эхэнд).
- `scripts/validate-reports.ts` (`npm run validate`): SPEC §7.4-ийн бүх дүрэм. `|%| > 60` бол анхааруулга.
- `prepare-build.ts`: өмнөх `public/reports/`-ийг цэвэрлэнэ. Хавтас байхгүй үед үүсгэнэ.
- Тайлангийн хуудас (SPEC §8.5 дараалал): инфографик → товч мэдээ → дэлгэрэнгүй → арга зүй → өмнөх/дараах.
  - **Инфографик** 1080×1350. Цайвар/бараан хувилбартай, сайтын theme-ээс хамааралгүй өөрийн палитртай. Контейнерт `transform: scale()`-ээр багасна.
  - **PNG татах**: `html-to-image`-ийг товч дарахад lazy import хийнэ (тусдаа 16 KB chunk, entry bundle-д ороогүй). `document.fonts.ready`-г хүлээнэ.
  - **Хэвлэх/PDF**: `window.print()`. Print CSS толгой, хөл, товчнуудыг нууна.
  - **Текст хуулах**: `buildShareText`, тесттэй.
- `.github/workflows/weekly-report.yml` (Ням 23:55 UTC + гараар):
  1. `--print-week` → долоо хоног.
  2. Хэрэв `report/<week>` branch байвал түүн дэх редакторын `.md`-г авна (дүрэм 6).
  3. `report:draft` → `validate`.
  4. `peter-evans/create-pull-request@v8`-оор PR үүсгэнэ (body = `.github/report-qa.md`, SPEC §13.1). Эсвэл `AUTO_PUBLISH` үед main руу шууд commit.
  - `dry_run` гэсэн гараар өгөх сонголттой.
- D9-ийн дагуу W42 жишээ тайланг `content/`-оос хассан. Тестийн fixture болгон `scripts/__fixtures__/reports/`-д хадгалсан. `content/reports/.gitkeep`.

### Шалгалт
- `npm run typecheck` ✅ · `npm test` ✅ 23 файл / 162 тест · `npm run validate` ✅ · `npx expo export -p web` ✅ (тайлан 0 ба 2 байхад аль алинд).
- Локалд `COINGECKO_DEMO_API_KEY` байхгүй тул бодит ажиллалтыг GitHub Actions дээр хийсэн:
  - [Dry-run](https://github.com/cerebrumanthropic/kripto-7hon/actions/runs/39571912329) `--week 2026-W43 --dry-run` ✅: CoinGecko 4 дуудлага, 15 мэдээ, 8 монгол өгүүлбэр. Жишээ: «Биткойн 7 хоногт 0.3 хувиар буурч, 83,267 ам.долларт хүрлээ.»
  - [Жинхэнэ ажиллалт](https://github.com/cerebrumanthropic/kripto-7hon/actions/runs/39572060978) ✅ → [PR #1](https://github.com/cerebrumanthropic/kripto-7hon/pull/1) «Тайлан 2026-W43 — ноорог» (QA жагсаалттай).
- PR-ийн файлуудыг локал руу татаж, туршилтын редакторын текстээр (ETF урсгал, мэдээ, Монгол, хуанли) бөглөөд `published` болгосон:
  - `validate` ✅.
  - `/tailan/2026-W43` хуудас ба архив зөв. Өмнөх/дараах навигаци ажилласан.
  - Статик HTML-д гарчиг ба OG title орсон.
- PNG-ийн шалгалт:
  - Хоёр тайлангийн PNG хоёулаа **1080×1350** (≈270 KB).
  - Пикселээр шалгахад толгойн шугам x=48→1031, гарчиг/контент 1080 хүрээнд байна. Кирилл фонт зөв.
  - Цайвар ба бараан хувилбарыг хөтөч дээр нүдээр харсан.
- 360px: тайлангийн хуудсанд хэвтээ гүйлгээгүй, инфографик 328×410 болж багассан.
- Туршилтын дараа цэвэрлэсэн: PR #1-ийг тайлбартай хааж, `report/2026-W43` branch-ийг устгасан. Локал W43 файлуудыг устгасан. Бодит W43 ноорог Ням 23:55 UTC-д шинээр үүснэ.
- Олдож засагдсан алдаанууд:
  - KPI-ийн «$2.41 их наяд» таслагдаж байсан: вэбд `adjustsFontSizeToFit` ажилладаггүй тул тоо/нэгжийг тусад нь харуулдаг болгосон.
  - Хуанлийн 2×2 grid мөр шилжиж хүрээнээс гарч байсан.
  - Урт гарчиг 44px-д «…» болж таслагдаж байсан: уртаас нь хамааруулан 44/38/32px сонгодог болгосон.
  - «Bitcoin Treasury» компанийн нэр «Макро» гэж ангилагдаж байсан.

### Шалгаагүй / анхаарах
- Хэвлэх харилцах цонхыг (print dialog) автоматаар нээж шалгаагүй. Print CSS-ийг кодоор нэмсэн.
- Clipboard руу хуулахыг хөтчийн зөвшөөрлөөс болж автоматаар ажиллуулаагүй. Текстийн агуулгыг unit тестээр шалгасан.
- `AUTO_PUBLISH=true` горимын deploy job-ийг Үе шат 5-д `deploy.yml`-тэй хамт нэмнэ (D4: `ref: main`).
- **Variables тохируулагдаагүй** (`gh variable list` хоосон): `DATA_BASE_URL` байхгүй тул weekly болон live ажиллалт Pages-ийн өмнөх төлөв, trending-ийг уншиж чадахгүй байна (`market=empty`). `CONTACT_EMAIL` байхгүй тул SEC алгасагдана.
- Dev server-т файл засах бүрд «Requiring unknown module» эсвэл loader-ийн давтан fetch түр гардаг. Хуудсыг дахин ачаалахад засагддаг. Production export-д энэ асуудал гараагүй.

### Техникийн шийдвэрүүд (Үе шат 4)
| # | Шийдвэр |
|---|---|
| D37 | `WeeklyAuto`-д сонголттой `stablecoins.series30d`, `defi.series30d` нэмсэн (SPEC §6-аас өргөтгөл; инфографикийн sparkline-д, SPEC §8.8.5). Хуучин JSON нийцтэй хэвээр. |
| D38 | build-weekly: заавал байх эх сурвалж CoinGecko, TVL, стейблкойн, F&G (унавал exit 1 → GitHub имэйл). DEX, ханш, hacks сонголттой. |
| D39 | Нийт үнэлгээний 7 хоногийн өмнөх утга = түүхийн `min(тасалбар, одоо) − 7 хоног` өдрийн цэг (provisional биш). Байхгүй бол топ 100-ын тооцоо. |
| D40 | `create-pull-request` нь branch-ийг main-аас дахин бүтээдэг. Тиймээс workflow нь ажиллахаас өмнө PR branch-ийн `.md`-г авч, редакторын засварыг хадгална (CLAUDE.md дүрэм 6). |
| D41 | Инфографикийн гарчиг ≤72 тэмдэгт бол 44px, ≤92 бол 38px, бусад үед 32px (120 тэмдэгт 2 мөрт багтана). |
| D42 | Хуанлийг товч мэдээнд нэг удаа харуулна (дэлгэрэнгүй хэсэгт давхардуулаагүй). |
| D43 | `classify`: «bitcoin/crypto/corporate treasury» гэсэн хэллэгийг «Макро»-оос хассан. |
| D44 | `html-to-image`-ийг `npx expo install`-ээр суулгасан (SPEC §3). |

## 2026.10.21 — Үе шат 3: GitHub + Pages + клиент холболт

### Хийсэн
- Repo: https://github.com/cerebrumanthropic/kripto-7hon (public, default `main`).
  - Хэрэглэгчийн зөвшөөрлөөр `gh repo create`-ээр үүсгэсэн.
  - GitHub CLI 2.102.1-ийг хэрэглэгчийн хүсэлтээр winget-ээр суулгасан. Нэвтрэлтийг (`gh auth login`) хэрэглэгч өөрөө хийсэн.
  - Push хийхээс өмнө бүх commit-ийг шалгасан: `.env*` файл, токен, жинхэнэ `CG-` түлхүүр байхгүй. Ганц таарсан мөр нь ZAAVAR.md дахь `CG-xxxx…` загвар.
- `data-history` orphan branch (SPEC §10.5): `history/daily.json` (хоосон), `news/.gitkeep`, README.
- `.github/workflows/live-data.yml` (SPEC §10.1): цаг бүрийн :07 + гараар ажиллуулах боломжтой.
  - Алхмууд: checkout main + `data-history`→`store/` → Node 24 → `npm ci --ignore-scripts` → `npm run data:live` → store өөрчлөгдсөн бол `github-actions[bot]`-аар commit → `configure-pages` → `upload-pages-artifact` (`public-data`) → `deploy-pages`.
  - `timeout-minutes: 10`, `concurrency: live-data`.
- `.env` (commit-д орсон, ЗӨВХӨН нийтийн утга): `EXPO_PUBLIC_DATA_BASE_URL=https://cerebrumanthropic.github.io/kripto-7hon`.

### Шалгалт
- Гараар ажиллуулсан run [39568455658](https://github.com/cerebrumanthropic/kripto-7hon/actions/runs/39568455658) ✅ 51 сек.
  - CoinGecko Demo түлхүүрээр 3 дуудлага хийж, 50 coin авсан. Үе шат 2-т шалгаж чадаагүй хэсэг баталгаажсан.
  - 14 эх сурвалжаас 13 ✓. SEC нь `CONTACT_EMAIL`-гүй тул зориуд алгасагдсан.
  - `data-history`-д `eb22230 data: daily snapshot 2026-10-21` commit үүссэн.
- **RSS-ийг GitHub Actions-оос шалгасан үр дүн:** CoinDesk, Cointelegraph, Decrypt, The Block, Bitcoin Magazine, CryptoSlate, Ikon.mn бүгд ✓. Бот хаалт илрээгүй.
- Pages: `live/market.json`, `live/news.json`, `live/status.json`, `history/daily.json`, `news/2026-W43.json` бүгд `HTTP 200`, `Access-Control-Allow-Origin: *`, `Cache-Control: max-age=600`.
- Локал сайт (`npx expo start --web`): Pages-ээс `live/market.json`, `live/news.json`-ийг уншиж, origin = live, туз гараагүй.
  - Нүүр хуудсанд BTC $83,040, нийт $2.80 их наяд харагдсан.
  - Зах зээлийн хуудсанд бодит топ 20 харагдсан. Figure Heloc ($1.02) стейблкойн гэж андуурагдаагүй.

### Хэрэглэгчийн тохиргооны төлөв (SPEC §11)
| Тохиргоо | Төлөв |
|---|---|
| Pages Source = GitHub Actions | ✅ |
| Secret `COINGECKO_DEMO_API_KEY` | ✅ |
| Workflow permissions | Анхдагч «read» хэвээр. `live-data.yml` эрхээ тодорхой заадаг тул ажилласан. «Allow Actions to create and approve PRs» ✅ |
| Variable `DATA_BASE_URL` | ❌ **тохируулаагүй** — үгүй бол цаг тутмын ажиллалт төлвөө зөвхөн өдрийн store-оос уншиж, «өмнөх утга» fallback ажиллахгүй |
| Variable `CONTACT_EMAIL` | ❌ тохируулаагүй — SEC feed алгасагдана |
| Variable `AUTO_PUBLISH` | ❌ тохируулаагүй — Үе шат 4-т хэрэгтэй (`false`) |
| `SITE_URL`, `EXPO_TOKEN` | Үе шат 4–5 |

### Нээлттэй асуулт 10 — үлдсэн хэсэг
- GitHub-ийн баримт: «In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days.» «Идэвх»-д юу тооцогдохыг тодорхойлоогүй. `data-history`-д өдөр бүр хийх bot commit-ийг идэвх гэж тооцно гэж найдаж байна, баталгаагүй. Унтарвал ZAAVAR-ийн «Enable workflow» алхмаар сэргээнэ. Үе шат 6-д API-аар өөрийгөө идэвхжүүлэх keepalive-ийг судална.
- Scheduled ажил ачаалал ихтэй үед саатаж эсвэл алгасагдаж болно (баримтад бий). UI-ийн 3 цагийн «хоцорсон» туз үүнийг харуулна.
- Run-ий анхааруулга: `ubuntu-latest` нь 2026.10.19-өөс Ubuntu 26 руу шилжиж байна. Одоохондоо нөлөөгүй.

### Техникийн шийдвэрүүд (Үе шат 3)
| # | Шийдвэр |
|---|---|
| D32 | Action-ууд: `checkout@v7`, `setup-node@v7`, `configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5` (GitHub releases API, 2026.10.21). Node 24 (D11). |
| D33 | Workflow бүр `permissions`-ээ тодорхой заана. Ингэснээр repo-ийн анхдагч workflow permission-ээс хамаарахгүй. |
| D34 | `npm ci --ignore-scripts`: скриптэд суулгалтын script хэрэггүй. Хурдан бөгөөд supply-chain эрсдэл бага. Actions дээр ажилласан. |
| D35 | `.env`-ийг repo-д оруулсан: зөвхөн `EXPO_PUBLIC_DATA_BASE_URL` (нийтийн). Нууц түлхүүр `.env.local`/Secrets-д үлдэнэ (CLAUDE.md дүрэм 2). |
| D36 | `data-history`-ийг git worktree-ээр orphan болгон үүсгэсэн. Main-ийн ажлын хавтас хөндөгдөөгүй. |

## 2026.10.21 — Үе шат 2: Дата скриптүүд

### Хийсэн
- `scripts/lib/`:
  - `http`: 15 сек timeout, 2 удаа давтах, exponential backoff, 429-д 60 сек хүлээх, UA.
  - `budget`: CoinGecko ≤5 дуудлага/ажиллалт.
  - `state`: Pages → store → локал → хоосон.
  - `history`: өдрийн хаалтын цэг, provisional.
  - `assemble`: market.json нэгтгэх, stale fallback.
  - `stablecoins`: стейблкойн илрүүлэлт.
- `scripts/sources/`: `coingecko`, `defillama`, `feargreed`, `fx`, `rss`, `feeds`. Бүгд Zod `looseObject`-оор (passthrough) шалгана.
- `scripts/fetch-live.ts` (`npm run data:live`) гаргадаг файлууд:
  - `public-data/live/{market,news,status}.json`
  - `public-data/history/daily.json` (өнөөдрийн provisional цэгтэй)
  - `public-data/news/<week>.json`
  - store/-д зөвхөн өдрийн цэг өөрчлөгдсөн үед бичнэ.
  - Сонголт: `--fail id,...` (эх сурвалжийг хүчээр унагах), `--now`, `--out`, `--store`.
- `scripts/__fixtures__/`: 11 endpoint-ийн бодит хариу (2026.10.21, хэмжээг багасгасан). `npm run fixtures:capture` дахин авна.
- UI: эх сурвалж тус бүрийн «Хоцорсон эх сурвалж (өмнөх утгаар): X (огноо)» туз (CLAUDE.md дүрэм 8). Утгагүй үед KPI-ийн өөрчлөлтийг нуудаг. CoinGecko-гийн дата байхгүй бол хүснэгтийн оронд мессеж гаргана.

### Шалгалт
- `npm run typecheck` ✅ · `npm test` ✅ 19 файл / 136 тест · `npx expo export -p web` ✅.
- `npm run data:live` (локал, түлхүүргүй): схемд тэнцсэн 6 файл (`market`, `news`, `status`, `daily`, `news/2026-W43`, `news/2026-W42`), exit 0.
  - 14 эх сурвалжаас 12 ✓. CoinGecko нь `COINGECKO_DEMO_API_KEY`-гүй, SEC нь `CONTACT_EMAIL`-гүй тул ✗.
  - 131 шинэ мэдээ ирсэн, давхардлын дараа 60 харагдана.
- Хүчээр унагах (`--fail feargreed,fx,coindesk`): бусад нь ажиллаж, унасан 3 нь өмнөх утга + `stale:true` + өмнөх `fetchedAt`-тай гарсан. Өдрийн цэг рүү хоцорсон утга ороогүй (`null`).
- Бүх зах зээлийн эх сурвалж унахад exit 1 өгч, store/-д бичихгүй.
- Хоёр дахь ажиллалт төлвийг store/ ба локал гаралтаас ачаалсан, store өөрчлөгдөөгүй.
- Хөтөч дээр бодит гаралтыг fallback болгон харуулахад нүүр ба мэдээний хуудас (60 мэдээ, холбоос `noopener noreferrer`) зөв ажилласан.

### RSS шалгалт (локал сүлжээ, 2026.10.21; GitHub Actions-оос Үе шат 3-т дахин шалгана)
| Эх сурвалж | URL | Үр дүн | 7 хоногт | Шийдвэр |
|---|---|---|---|---|
| CoinDesk | `coindesk.com/arc/outboundfeeds/rss/` | ✓ RSS | 25 | ✅ |
| Cointelegraph | `cointelegraph.com/rss` | ✓ | 30 | ✅ |
| Decrypt | `decrypt.co/feed` | ✓ | 38 | ✅ |
| The Block | `theblock.co/rss.xml` | ✓ | 18 | ✅ |
| Bitcoin Magazine | `bitcoinmagazine.com/.rss/full/` | ✓ | 10 | ✅ |
| CryptoSlate | `cryptoslate.com/feed/` | ✓ | 10 | ✅ |
| U.S. SEC | `sec.gov/news/pressreleases.rss` | ✓ (имэйлгүй UA-д ч хариулсан) | 4 (крипто 0) | ✅ `CONTACT_EMAIL`-тэй үед л; зөвхөн крипто гарчиг (D24) |
| МОНЦАМЭ | `montsame.mn/mn/rss`, `/rss` | ✗ HTTP 403 | — | ❌ |
| Ikon.mn | `ikon.mn/rss` | ✓ RSS, ерөнхий мэдээ | 30 (крипто 0) | ✅ түлхүүр үгээр шүүнэ |
| GoGo.mn | `gogo.mn/rss` | ✗ 404 | — | ❌ |
| News.mn | `news.mn/feed/` | ✗ RSS биш (HTML хуудас) | — | ❌ |
| Өнөөдөр | `unuudur.mn/feed` | ✗ 404 | — | ❌ |
| Eguur.mn | `eguur.mn/feed/` | ✗ timeout | — | ❌ |
| Bloomberg TV Mongolia | `bloombergtv.mn/feed/` | ✗ 404 | — | ❌ |

### Нээлттэй асуулт 10-ын хэсэгчилсэн хариу
- CoinGecko Demo: 10,000 дуудлага/сар, 100 дуудлага/мин, иш татах заавал (coingecko.com/en/api/pricing, 2026.10.21). Хамгийн хямд төлбөртэй нь Basic $35/сар. SPEC-тэй таарч байна. Бидний хэрэглээ: 3 дуудлага × 24 × 31 ≈ 2,232/сар.
- EAS Free-ийн хязгаар ба Actions-ийн 60 хоногийн дүрмийг Үе шат 3 ба 5-д шалгана.

### Шалгаагүй (хэрэглэгчийн алхам шаардлагатай)
- CoinGecko-г Demo түлхүүртэйгээр бодитоор дуудаагүй. Задлагчийг бодит хариуны fixture-ээр шалгасан. Fixture-ийг түлхүүргүй нийтийн endpoint-оос авсан бөгөөд талбарууд нь ижил. `.env.local`-д `COINGECKO_DEMO_API_KEY=...` нэмээд `npm run data:live` ажиллуулбал баталгаажна.
- SEC feed-ийг `CONTACT_EMAIL`-тэй ажиллуулаагүй.

### Техникийн шийдвэрүүд (Үе шат 2)
| # | Шийдвэр |
|---|---|
| D23 | `SourceStatus.id`-ууд: `coingecko`, `defillama-tvl`, `defillama-stablecoins`, `defillama-dexs`, `feargreed`, `fx` + feed бүрийн id. DefiLlama-г 3 хуваасан тул DEX унахад TVL шинэ хэвээр үлдэнэ. «Бүх зах зээлийн эх сурвалж унасан» = эхний 6 бүгд. |
| D24 | SEC-ийн feed нь ерөнхий сэдэвтэй тул зөвхөн крипто түлхүүр үгтэй гарчгийг авна (`cryptoOnly`). SEC-ийн fair-access дүрмийн дагуу `CONTACT_EMAIL`-гүй бол дуудахгүй. |
| D25 | Монгол эх сурвалж: одоогоор зөвхөн Ikon.mn (крипто түлхүүр үгээр шүүнэ; ихэнх долоо хоногт 0 гэж тооцно). Монгол мэдээг редактор тайланд гараар нэмнэ (SPEC §5.6). `classify`-д кирилл язгуур нэмсэн (`сзх`, `хууль`, `луйв` г.м.; JS-ийн `\b` кириллд ажилладаггүй тул дэд мөрөөр таарна). |
| D26 | Өдрийн цэг: шинэ UTC өдрийн анхны ажиллалт өмнөх өдрийн цэгийг бичнэ (00:07 ажиллаагүй байсан ч дараагийнх нь бичнэ). 06:00 UTC хүртэл `null` талбарыг нөхөж болно. Цэгт зөвхөн энэ ажиллалтад шинээр татсан утга орно (хоцорсон → `null`). |
| D27 | Мэдээний архивыг `publishedAt`-ийн ISO долоо хоногоор (UTC) хуваарилна. Төлөв нь одоогийн ба өмнөх долоо хоногийг ачаалж, архив бүрд 500 мэдээний хязгаартай. Анх бүртгэгдсэн хувилбар үлдэнэ. D5-ыг хэрэгжүүлсэн: store/ дахь хуучин долоо хоногуудыг Pages-д дахин нийтэлнэ. |
| D28 | Fixture-ийг багасгасан: TVL ба стейблкойны цуваа 40 цэг, стейблкойны жагсаалт топ 12, trending 7. RSS-ийн тест нийлэг XML ашигладаг тул бодит мэдээний текст repo-д хадгалагдахгүй. Feed-ийн `description`/`content`-ийг задлахгүй (`stopNodes`). |
| D29 | `public-data/` JSON-ийг шахсан (minified), `store/`-ийг уншихад хялбар (pretty) хадгална, ингэснээр git diff ойлгомжтой. |
| D30 | CoinGecko-г дараалан 3 удаа дууддаг. Coins = топ 50 (SPEC §6), trending ≤7. |
| D31 | `fast-xml-parser` v5-ийг `npm install -D`-ээр суулгасан (зөвхөн скрипт, клиент bundle-д орохгүй). |

## 2026.10.21 — Үе шат 1: Суурь ба UI

### Хийсэн
- Expo SDK 58-ийн template-ээр (`create-expo-app@latest`, `src/app`) суурийг үүсгэсэн. `web.output: "static"`, typedRoutes, React Compiler идэвхтэй.
- `src/lib`: `format` (USD/MNT компакт, үнэ, %, ▲▼), `dates` (УБ +8, ISO долоо хоног UTC, монгол дэс тооны нөхцөл «дугаар/дүгээр», харьцангуй цаг, хоцролт), `classify` (мэдээний ангилал), `data-client` (Pages → fallback → sample, react-query 10 мин), `i18n-mn` (бүх UI текст), `news-filter`, `coins`, `report-view`, `markdown-blocks`, `meta`, `config`.
- `src/types/schemas.ts`: SPEC §6-ийн бүх Zod схем + `Editorial`, `MergedReport`, `ReportIndex`. `src/types/research.ts`: research.json-ийн схем.
- Theme (`src/theme/tokens.ts`), толгой (≥1024px хэвтээ цэс, <1024px hamburger, идэвхтэй хуудас тодруулсан, гараар ашиглах боломжтой), хөл (иш татах + анхааруулга + Арга зүй), «skip to content».
- `react-native-svg` дээрх графикууд: sparkline, шугам (индексжүүлсэн олон цуврал), F&G gauge, хэвтээ bar, heatmap.
- 7 хуудас + 404: `/`, `/zah-zeel`, `/medee`, `/tailan`, `/tailan/[week]`, `/sudalgaa`, `/arga-zui`. Хуудас бүр `generateMetadata`-аар title/description/OG-тэй, `<html lang="mn">`.
- Жишээ дата: `public/fallback/{market,news,daily}.sample.json`, `content/reports/2026-W42.{json,md}` (`npm run samples` дахин үүсгэнэ; бүх мэдээний гарчиг «[Жишээ]» угтвартай, холбоос нь эх сурвалжийн нүүр хуудас руу).
- `scripts/prepare-build.ts` (`npm run prebuild:web`): тайлан нэгтгэх, `index.json`, fallback snapshot, sitemap/robots. Үе шат 4-т validate ба `--include-drafts`-ийн preview-тэй хамт өргөтгөнө.

### Шалгалт (бүгд ногоон)
- `npm run typecheck` ✅ · `npm test` ✅ 11 файл / 77 тест · `npx expo export -p web` ✅ (10 статик route, 6 loader).
- `npx expo start --web`: бүх 7 хуудас + 404 нээгдсэн. 360px ба 1440px өргөнд `scrollWidth` = viewport (хэвтээ гүйлгээгүй), 360px-д hamburger ажилласан. Light/dark горимыг хоёуланг нь харсан.
- Судалгааны 74 гадаад холбоос (`npm run check:links` + хөтөч): 66 нь шууд 2xx. Үлдсэн 8 нь скриптэд 403/429 эсвэл redirect loop өгсөн (бот хамгаалалт: CoinShares Medium, FATF, Messari, Grayscale, Dune, VanEck) боловч бодит хөтөч дээр бүгд нээгдсэн.
- `dist/`: `CG-` олдоогүй. `sudalgaa.html`-ийн 105 гадаад холбоос бүгд `target="_blank" rel="noopener noreferrer"`-тэй.

### Мэдэгдэж буй сул тал / дараа анхаарах
- Статик HTML нь мобайл өргөн ба цайвар горимоор үүсдэг. Hydration-ий дараа бодит өргөн/горимд шилждэг тул desktop/dark хэрэглэгчид анхны ачаалалд богино шилжилт харагдана. Үе шат 6-д CSS media query-д суурилсан шийдлийг судална.
- `entry` bundle ≈1.1 MB (React Native Web + router + zod + react-query). Lighthouse-ийн зорилтын (≥90) төлөө Үе шат 6-д оновчлол хийнэ (жишээ нь клиентэд `zod/mini`).
- `tailan/[week]`-ийн `generateStaticParams` клиент bundle-аас хасагддаггүй тул `content-*.js` (4 KB) chunk нийтлэгдэнэ. Клиент дээр хэзээ ч ажиллахгүй, нууц агуулаагүй.
- Инфографик, PNG татах, хэвлэх, «Текст хуулах» нь Үе шат 4-т (тайлангийн хуудсанд түр тэмдэглэгээ бий).
- Жишээ W42 тайлангийн тоонууд дотооддоо бүрэн нийцээгүй (жишээ нь ETH-ийн 7 хоногийн %-ийг majors ба heatmap-д өөр утгаар харуулж байна). Бодит дата биш тул засаагүй.

### Техникийн шийдвэрүүд (Үе шат 1)
| # | Шийдвэр |
|---|---|
| D13 | D3-ыг SDK 58-ийн **data loader**-оор (`export async function loader` + `useLoaderData`) хэрэгжүүлсэн. Build үед ажиллаж, өгөгдлийг HTML/JSON-д шингээнэ. Файл уншдаг `src/lib/server/content.ts`-ийг зөвхөн loader дотроос динамик `import()`-оор дуудна. Ингэснээр клиент bundle-д `fs` орохгүй. |
| D14 | `generateMetadata` (SDK 58) ашиглаж metadata-г статик HTML-д оруулсан (`<Head>`-ийг ашиглаагүй). `+html.tsx`-д `useServerDocumentContext` заавал (SDK 58). `ScrollViewStyleReset`-ийг ашиглаагүй: body өөрөө гүйлгэгдэнэ. |
| D15 | Өнгө: SPEC-ийн `#16A34A`/`#DC2626` нь цагаан дээр жижиг текстэд AA хангахгүй (3.3:1). Тиймээс график/bar-д SPEC-ийн өнгийг, текстэд `#15803D`/`#B91C1C`-ийг (light) ашиглана. Heatmap-ийн өнгийг ≤60% тунгалагшуулсан тул текст үргэлж үндсэн өнгөөрөө уншигдана. |
| D16 | Дизайны чиглэл (D12): «санхүүгийн сонины ledger» — цаасан дэвсгэр `#F6F4EF`, бэх хар текст, Монгол хөх брэнд `#2457C5`, алтан accent `#A8741F`-ийг зөвхөн шошго/тэмдэгт. 1px шугам, сүүдэргүй. «ВХ» монограмм лого. Inter + tabular-nums. |
| D17 | `Link asChild` + функц хэлбэрийн `style` нь вэбд алга болдог (expo-router Slot). Цэс болон картанд статик style ашигласан. |
| D18 | Asia/Ulaanbaatar-ийг тогтмол +8 офсетоор тооцно (2017 оноос хойш зуны цаггүй). Intl-ийн цагийн бүсийн өгөгдлөөс хамаарахгүй. |
| D19 | Coin-ийн лого ашиглаагүй (SPEC §5.1): симболын өнгөт дугуй (BTC/ETH брэнд өнгө, стейблкойн ногоон). |
| D20 | `topByRank`: топ 20-ийг эхлээд зах зээлийн үнэлгээний эрэмбээр тасалж, дараа нь тэр дотроо эрэмбэлнэ. Ингэснээр баганаар эрэмбэлэхэд топ 20-аас гадуурх хөрөнгө орж ирэхгүй. Хөтөч дээр шалгахдаа энэ алдааг олж засав. |
| D21 | TS 6 нь `types`-ийг анхдагчаар хоосон болгодог тул `tsconfig.json`-д `"types": ["node"]`, `extends: "expo/tsconfig.base.json"` (vitest/vite `.json` өргөтгөлгүй замыг танихгүй). |
| D22 | `npx expo start` нь `CI=1` үед файл ажиглахгүй тул локалд CI-гүйгээр ажиллуулна. |

## 2026.10.21 — Үе шат 0: эхлэлийн шалгалт

Уншсан: `CLAUDE.md`, `docs/SPEC.md` (v1.0), `content/research.json` (54 KB, `schemaVersion: 1`). `ZAAVAR.md`-г энэ удаа хянаагүй.

### Анхны төлөв
- Хавтас git repo биш. `package.json` болон Expo төсөл одоогоор алга.
- `research.json`-ийн дээд түвшний түлхүүрүүд: `meta`, `summary`, `keyFindings`, `internationalExamples` (9, бүгд `verified2026: true`), `regulators` (4), `additionalReferences.groups` (8), `metricsMatrix` (6 нийтлэгч × 14 мөр), `coreMetrics`, `differentiatingMetrics`, `sectionOrder`, `headlineFormula`, `designPractices`, `dataSources` (16, үүнээс 4 нь `usedByPlatform: true`), `weeklyTemplate`, `productionSchedule` (8), `mongolia` (`legal`, `vasps` 12, `stats` 2023–2025 × 6 мөр, `marketShare2023`, `dataAvailability`, `links`), `glossary` (14), `caveats`, `sources` (42). Бүх `url` нь `https://`-ээр эхэлдэг. `additionalReferences` дахь зарим нэрийн `url` нь `null` (схемд зөвшөөрсөн).

### SPEC-ийн нээлттэй асуултууд
1. `content/reports/index.json`-ийг одоо `build-weekly` (ноорог үүсгэх үед) гаргаж байна. Харин редактор merge хийхэд `status`/`headline` өөрчлөгддөг. → D1
2. `public/fallback/*.sample.json` нь repo-д байх ёстой (§4, §7.5.2), гэтэл §7.5.4 `public/fallback/`-ийг бүхэлд нь gitignore-д оруулж байна. → D2
3. Тайлангийн хуудас runtime-д fetch хийвэл статик HTML-д текст орохгүй. → D3, D13
4. AUTO_PUBLISH горимд дуудагдсан `deploy.yml` хуучин SHA-г checkout хийнэ. → D4
5. Pages артефакт цаг бүр солигдох тул өмнөх 7 хоногуудын мэдээний архив алга болно. → D5
6. `productionSchedule` ↔ `production_schedule`. → D6
7. Нэр томьёо: «Шунал» ↔ «шунахай», «ETF/Сан» ↔ «БАС». → D7
8. Нүүрний N, M. → D8
9. Үе шат 1-д published тайлангүй үеийн `/tailan/[week]`. → D9
10. Хуучирсан байж болзошгүй: Node 22 → D11. CoinGecko Demo-гийн хязгаар, EAS Free-ийн хязгаар ба retention, scheduled workflow-ийн 60 хоногийн дүрмийг Үе шат 2 ба 5-д эх сурвалжаас нь шалгана (**нээлттэй**).
11. `frontend-design` skill байхгүй. → D12, D16

## Шийдвэрүүд (Үе шат 0)

2026.10.21-нд хэрэглэгч 1–9-р асуултын саналыг зөвшөөрсөн.

| # | Шийдвэр |
|---|---|
| D1 | `content/reports/index.json`-ийг build-ийн бүтээгдэхүүн болгоно. `prepare-build.ts` үүнийг `status: published` бүхий `.md` + `<week>.json`-оос дахин үүсгэнэ, `.gitignore`-д орно. `build-weekly.ts` index бичихгүй. `generateStaticParams` нь `prepare-build`-ийн дараа уншина. |
| D2 | `.gitignore`: `public/fallback/*` + `!public/fallback/*.sample.json`. Sample файлууд repo-д үлдэнэ. |
| D3 | Тайлангийн хуудас өгөгдлөө build үед import хийнэ (статик HTML-д текст орно). Runtime-д fetch хийхгүй. `public/reports/<week>.json` нь зөвхөн PNG/хуваалцах зорилгоор нэмэлтээр үлдэж болно. |
| D4 | AUTO_PUBLISH-ээр дуудагдах `deploy.yml`-ийн checkout-д `ref: main` заана. |
| D5 | Pages артефакт цаг бүр бүхэлдээ солигддог тул `fetch-live.ts` нь өмнөх 7 хоногуудын `news/<week>.json`-ийг `store/`-оос (data-history) хуулж артефактад дахин оруулна. Pages = store-ийн толь + сүүлийн амьд файлууд. |
| D6 | Кодонд `research.json`-ийн жинхэнэ түлхүүр `productionSchedule`-ийг ашиглана (SPEC-ийн `production_schedule` нь бичгийн алдаа). |
| D7 | Нэр томьёо `research.json → glossary`-г дагана: «Айдас ба шунахайн индекс»; F&G шошго «Хэт айдас / Айдас / Төвийг сахисан / Шунахай / Хэт шунахай». ETF-ийг UI-д «ETF» гэж үлдээж, анх гарах газар/нэр томьёонд «биржийн арилжаалагддаг сан (БАС)» тайлбартай. Мэдээний ангилал «ETF/Сан». |
| D8 | Нүүрний N = `internationalExamples.length` (9), M = `dataSources.length` (16). |
| D9 | Үе шат 1-д `content/reports/2026-W42.{json,md}` жишээ тайланг (`status: published`, «ЖИШЭЭ ДАТА» тэмдэгтэй) оруулж `/tailan/[week]`-ийг шалгана. Үе шат 4-т бодит тайлангаар солих эсвэл устгана. |
| D10 | ISO долоо хоногийг UTC-ээр тооцно (тасалбар Ням 23:59:59 UTC). Харуулах огноо `Asia/Ulaanbaatar`. |
| D11 | Expo SDK 58 (`expo@58.0.16`, `npm view` 2026.10.21). Локал Node v24.15.0. Workflow-д Node 24 LTS-ийг ашиглана (SPEC-д 22 гэснийг шинэчлэв). |
| D12 | `frontend-design` skill орчинд байхгүй тул дизайны чиглэлийг гараар тогтоож энд тэмдэглэнэ (→ D16). |

## Dependency бүртгэл

Template-ээс ирсэн (Expo SDK 58): expo, expo-router, react 19.3, react-native 0.88, react-native-web гэх мэт.

| Пакет | Төрөл | Шалтгаан |
|---|---|---|
| `@tanstack/react-query` | app | Амьд датаг 10 мин тутам дахин уншиж кэшлэх (SPEC §3) |
| `zod` 4 | app+scripts | Схем шалгалт, апп ба скрипт хуваалцана (SPEC §3) |
| `react-native-svg` | app | Хөнгөн графикууд (SPEC §3) |
| `@expo-google-fonts/inter` | app | Кирилл үсэгтэй Inter фонт (SPEC §3) |
| `vitest` | dev | Тест (SPEC §3) |
| `tsx` | dev | Скрипт ажиллуулах (SPEC §3) |
| `prettier` | dev | Формат (SPEC §3) |
| `gray-matter` | dev | Тайлангийн `.md` frontmatter (SPEC §3) |
| `@types/node` 24 | dev | Скрипт ба build-ийн Node төрөл (TS 6, D21) |
| `fast-xml-parser` 5 | dev | RSS/Atom задлах (SPEC §3, D31) |
| `html-to-image` 1.11 | app (lazy) | Инфографикийн PNG экспорт, зөвхөн вэб, товч дарахад ачаална (SPEC §3, D44) |
