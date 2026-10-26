# PROGRESS — «Виртуал хөрөнгийн 7 хоног»

Явц, шийдвэр, нээлттэй асуултын бүртгэл. Шинэ бичлэг дээрээ нэмэгдэнэ.

## Төлөв

| # | Үе шат | Төлөв |
|---|---|---|
| 0 | SPEC унших, зөрчил тодруулах | ✅ 2026.10.21 |
| 1 | Суурь ба UI (жишээ датагаар) | ✅ 2026.10.21 — хүлээн авсан |
| 2 | Дата скриптүүд | ✅ 2026.10.21 — хүлээн авсан |
| 3 | GitHub + Pages + клиент холболт | ✅ 2026.10.21 — хүлээн авсан |
| 4 | 7 хоногийн тайлан | ✅ 2026.10.21 — хүлээн авсан |
| 5 | EAS Hosting deploy | ✅ 2026.10.21 — хүлээн авсан |
| 6 | QA ба баримт | ✅ 2026.10.21 — хүлээн авсан |
| + | Дизайны сайжруулалт (брэнд, бараан хөх тууз) | ✅ 2026.10.21 — хүлээн авсан (хэрэглэгч одоогийн хурдыг хангалттай гэж үзсэн) |
| + | Backend-ийг Python/FastAPI руу шилжүүлэх | 🟡 2026.10.22 — `fastapi-backend` branch, хэрэглэгчийн хяналт хүлээж байна |

## 2026.10.22 — Backend-ийг Python/FastAPI руу шилжүүлэв

Хэрэглэгчийн хүсэлт: «вэб аппын backend-ийг FastAPI болгох».

### Хийсэн
- **`backend/` (Python 3.12, uv):** `scripts/`-ийн дата хэсгийг (fetch-live, build-weekly, validate-reports, lib/*, sources/*, dev/probe-feeds, dev/capture-fixtures) `kripto_api` пакет руу шилжүүлэв. TS файлуудыг устгав.
- **CLI `kripto`:** `live`, `weekly`, `validate`, `serve`, `feeds-probe`, `fixtures-capture`. Туг (flag) нь TS-тэй ижил.
  - `npm run data:live`, `report:draft`, `validate`, `feeds:probe`, `fixtures:capture` нэрс хэвээр бөгөөд `uv run --project backend kripto …`-г дуудна.
  - Шинэ: `npm run api`, `npm run test:backend`.
- **FastAPI (`kripto serve`):**
  - `/live/{market,news,status}.json`, `/history/daily.json`, `/news/<week>.json` — GitHub Pages-тэй ижил зам. CORS, `max-age=300`, ETag.
  - `/healthz`; `POST /admin/refresh` (Bearer `ADMIN_TOKEN`).
  - Сонголттой scheduler (`ENABLE_SCHEDULER`, цаг бүрийн :07).
- **Workflow:**
  - `live-data.yml`, `weekly-report.yml`: Node-ийн оронд `astral-sh/setup-uv@v10` + `kripto`.
  - `build-web` action: pytest + ruff + mypy, `kripto validate`.
- **Fixture:** `scripts/__fixtures__/*.json` (API) → `backend/tests/fixtures/`. `scripts/__fixtures__/reports/` хэвээр (TS `reports.test.ts` ба Python validate тест хоёул ашиглана).
- **RSS:** Bitcoin Magazine-ийн `/.rss/full/` нь `/feed` руу 301 болсон. httpx-д Cloudflare challenge (403) буцаадаг тул шууд `https://bitcoinmagazine.com/feed` болгов.

### Шалгалт
- **Паритет:** TS (устгахаас өмнө) ба Python-ыг ижил оролтоор ажиллуулж JSON-ийг гүнзгий харьцуулсан — **0 зөрүү**. Оролт:
  - fixture: `buildMarket` (бүгд амжилттай / CoinGecko+F&G унасан), `dailyValues`, `applyDailyClose`, `buildWeekly` (түүхтэй / түүхгүй, fx null), `.md` загвар (draft / auto-publish);
  - **7 бодит RSS feed (167 мөр)**: `parseFeed`, `toNewsItems`, архив, `latestNews`, ангилал;
  - мөн `canonicalUrl` (10 тохиолдол), ISO долоо хоног.
- `npm run test:backend` ✅ pytest 83 тест (TS-ийн бүх backend тестийг шилжүүлж, live/API-ийн интеграцийн тест нэмэв) · ruff · mypy.
- `npm run typecheck` ✅ · `npm test` ✅ 14 файл / 86 тест (үлдсэн web тестүүд).
- `npm run data:live` (бодит API, `DATA_BASE_URL` = production Pages):
  - Төлөвийн 5 файлыг Pages-ээс уншиж Pydantic-д тэнцсэн (TS-ийн гаргасан файлтай нийцтэй), exit 0.
  - Локалд түлхүүргүй тул CoinGecko ба SEC нь «өмнөх утга (stale)».
  - `feeds:probe`: идэвхтэй 8 feed бүгд ✓.
- `kripto serve` + curl: бүх зам 200, буруу долоо хоног 404, `/admin/refresh` токенгүй 401, `/docs` 200.
- `npm run validate` ✅ (нийтлэгдсэн 0). `report:draft --dry-run` түлхүүргүй үед TS-ийн адил алдаа өгч, exit 1.

### Шалгаагүй / хэрэглэгчийн алхам
- GitHub Actions дээр ажиллуулаагүй (push хийгээгүй). PR нээсний дараа `ci.yml`, merge-ийн дараа `live-data` (workflow_dispatch) ба `weekly-report` (`dry_run: true`)-ийг гараар нэг удаа ажиллуулж шалгах.
- `report:draft`-ийг бодит CoinGecko түлхүүртэйгээр ажиллуулаагүй (локалд `.env.local` байхгүй). Логик нь fixture-ийн паритетаар шалгагдсан.
- FastAPI-г хаана ч хостлоогүй. Одоогийн урсгал (Actions → Pages) хэвээр тул хостлох шаардлагагүй.

### Техникийн шийдвэрүүд (backend)
| # | Шийдвэр |
|---|---|
| D59 | Дата backend нь Python 3.12 + FastAPI (`backend/`, uv, `uv.lock`). Гаралтын JSON нь TS хувилбартай яг ижил тул аппын код ба Zod схем өөрчлөгдөхгүй. Web build хэрэгсэл (`prepare-build`, `paint-first`, `fix-static-index`, `lib/reports.ts`, `dev/make-samples`, `dev/check-links`) TS хэвээр — `expo export`-тэй нягт холбоотой. |
| D66 | FastAPI backend-ийг **Google Cloud Run + Cloud Scheduler + Cloud Storage** (үнэгүй түвшин, us-central1) дээр байршуулна (хэрэглэгчийн сонголт). GitHub-ийн scheduled workflow 3–5 цаг хоцорч байсан тул. Instance унтдаг (min 0, max 1) тул Cloud Scheduler цаг бүрийн :07-д `POST /admin/refresh` (Bearer `ADMIN_TOKEN`)-ийг дуудна. Татлага хүсэлтийн дотор ажиллана. Диск түр зуурын тул төлвийг `STATE_BUCKET`-д хадгална (`state_sync.py`): cold start бүрд зөвхөн хэрэгтэй ≤9 файлыг татна, ажиллалтын дараа агуулга өөрчлөгдсөн файлыг л байршуулна (sha256), хуучин долоо хоногийн архивыг хүсэлт ирэхэд татна. Ингэснээр Cloud Storage-ийн үнэгүй үйлдлийн хязгаарт багтана. Bucket хоосон анхны ажиллалтад `SEED_BASE_URL` (GitHub Pages)-ээс өмнөх түүхийг нэг удаа уншина. GCS-д google-cloud SDK биш httpx + metadata токен ашигласан (image жижиг, шинэ хамааралгүй). Нууцууд Secret Manager-т. Байршуулалт: `backend/deploy/cloudrun.sh` (Cloud Shell, idempotent), заавар `docs/CLOUD_RUN.md`. |
| D60 | FastAPI нь Pages-тэй ижил замаар (`/live/market.json` …) үйлчилнэ. Ингэснээр `EXPO_PUBLIC_DATA_BASE_URL`-ийг солиход л клиент шилжинэ. Серверийн горимд төлөвийг Pages-ээс биш `STORE_DIR`/`DATA_DIR`-аас уншина. `ENABLE_SCHEDULER=true` бол `live-data.yml`-ийг унтраах (давхар ажиллалтаас сэргийлж). Үнэгүй дүрмийн дагуу серверийг заавал биш гэж үлдээв. |
| D61 | Дотооддоо өгөгдлийг dict-ээр дамжуулж, хил дээр Pydantic (`parse`/`safe_parse`, `exclude_unset`)-аар шалгана. Ингэснээр Zod-ийн `.optional()` (түлхүүр байхгүй, null биш) яг хадгалагдана. `Num = int \| float` нь бүхэл тоог «1.0» болгохгүй. `write_json` нь бүхэл float-ыг int болгож `JSON.stringify`-тэй ижил гаралт өгнө. Файлыг түр файлаар дамжуулж (atomic) бичнэ — сервер хагас файл уншихгүй. |
| D62 | `jsnum.py`: `toFixed` (Decimal, ROUND_HALF_UP — JS-ийн дүрэм), `Math.round`, `toPrecision`, `toISOString`-ийг дуурайна. Python-ы `round()`/`format()` нь тэнцүү зайд банкны дугуйлалт хийдэг тул монгол өгүүлбэр ба тоо зөрөхөөс сэргийлэв. |
| D63 | RSS-ийг `lxml` (`resolve_entities=False`, `no_network=True`, `recover=True`)-ээр задална: XXE-гүй, эвдэрхий feed-ийг уншина. Feed-ийг bytes-ээр өгч XML-ийн encoding зарлалыг хүндэтгэнэ. Regex-ийн word boundary-г JS-ийн адил ASCII (`re.A`) болгож, кирилл хэсгийг тусад нь `re.I`-ээр таарна (`classify.py`, `isCryptoTitle`). `canonicalUrl` нь WHATWG URL-ийн percent-encode багцыг дуурайна. |
| D64 | `classify.py` ба `schemas.py` нь апп дахь TS (`src/lib/classify.ts`, `src/types/schemas.ts`)-ийн хуулбар (апп ч ашигладаг). Өөрчлөхдөө хоёуланг нь хамт засах — CLAUDE.md-д тэмдэглэв. |

## 2026.10.21 — Дизайны сайжруулалт

Хэрэглэгчийн хүсэлт: «UX/UI загварыг анхаарал татахуйц болгох; нүүрний "ВХ 7 хоног"-ийг "Виртуал хөрөнгийн үйлчилгээ үзүүлэгчийн хэлтэс", доор нь "7 хоногийн мэдээ" болгох.»

### Хийсэн
- **Брэнд (D53, D55):**
  - Толгой ба хөлд хэлтсийн нэр, доор нь алтан өнгөөр «7 хоногийн мэдээ» гэж бичнэ (`BrandLockup`). Мобайлд нэр 2 мөрт орно.
  - «ВХ» монограммыг өсөх 3 баганатай тэмдгээр (`BrandMark`) сольсон. Толгой, хөл, инфографикт ашиглана. favicon, icon, og.png-ийг `make-brand-images.ps1`-ээр дахин үүсгэсэн.
- **Бараан хөх тууз (D54):** Толгой, хуудасны гарчгийн хэсэг, хөл нь `ink` палитртай бараан хөх тууз болсон.
  - Hero-д хөх/алтан туяа бий. Анх бүдэг торон дэвсгэртэй байсныг хурдны улмаас хассан (D57).
  - Туузын дотор бүх бүрэлдэхүүн `ThemeScope`-оор `ink` палитрыг авна. SSR ба клиентэд ижил тул hydration mismatch гарахгүй.
- **Нүүр хуудас:**
  - «● Амьд дата» шошго (долгилох цэг, `prefers-reduced-motion` үед зогсоно).
  - Том гарчиг, «7 хоног» хэсэг нь алтан өнгөтэй.
  - «Тайлан унших» (алтан) ба «Зах зээл харах» товч.
  - 8 KPI карт туузны дотор байрлана. Мобайлд 2 баганатай (D56).
- **KPI карт:**
  - Тоо том, нэгж нь жижиг («$2.80 их наяд»).
  - Өөрчлөлтийг өнгөт pill-ээр харуулна (▲▼ хэвээр).
  - BTC давамгайлалд хувийн шугам, айдас/шунахайн индекст улаан→ногоон шугам дээр тэмдэг нэмсэн.
- **Бусад элементүүд:**
  - «Тайлан алга» хоосон төлөв нь нийтлэх цагийг заасан тасархай хүрээтэй карт болсон.
  - Судалгааны товчид том тоо (9 жишээ, 16 эх сурвалж) гаргасан.
  - Мэдээ нь сүүдэртэй картад багтсан.
  - Хэсгийн гарчгийн өмнө алтан зураас нэмсэн.
  - Тайлангийн картын дээд хүрээ алтан болсон.
  - Hover үед карт бага зэрэг дээш хөдөлнө (`data-lift`, CSS).
- **CSS (`+html.tsx`):**
  - `theme-color`.
  - Туузан дээрх focus outline алтан өнгөтэй.
  - Хэвлэхэд тууз цагаан, текст хар болно (`[data-band]`).
  - `scroll-margin-top` 96px (толгой өндөрссөн).

### Шалгалт
- Typecheck ✅ · 162 тест ✅ · `expo export` ✅. Entry bundle 1,107,576 → 1,108,038 байт (+0.5 KB).
- Локал build (gzip-тэй статик сервер), Lighthouse 13.5.0 mobile: `/`, `/zah-zeel`, `/medee`, `/tailan`, `/sudalgaa` бүгд **A11y 100**.
- 360px ба 320px: хэвтээ гүйлгээгүй. Олдсон алдааг зассан: USD/MNT картын «Rates By Exchange Rate API» холбоос 2 баганат картаас 8px гарч байсан тул `Attribution`-ийн холбоосыг мөр шилжүүлдэг болгосон.
- Хөтөч дээр нүдээр шалгасан хуудсууд:
  - 1280px (iframe-ээр): нүүр, зах зээл, судалгаа.
  - 360px: нүүр.
  - Dark горим: нүүр, мэдээ.
  - Жишээ W42 тайлан: түр хуулж харсан, дараа нь устгасан.

### Production Lighthouse (deploy-ийн дараа)
Дизайныг deploy хийсний дараа (`89c29e7`) FCP огцом удааширсан:
- Давтан ажиллалтад нүүр 53–56, мэдээ 49–55, судалгаа 57–58 оноо авч, FCP 4.3–8.3 сек болсон.
- Шалтгаан: шинэ дизайны анхны frame удаан зурагдсан. Энэ хооронд CDN-ээс хурдан ирсэн defer скриптүүд анхны агуулга дэлгэцэнд гарахаас өмнө ажиллаж эхэлсэн. Lighthouse (Lantern) бүх JS-ийг (≈450 KB) render-blocking гэж тооцсон.

Засвар (D57, D58):
- `c43ec0f`: paint-first loader, торон дэвсгэрийг хассан.
- `c74e76c`: hook-уудыг `useSyncExternalStore`-оор сольсон.

| Хуудас | Үе шат 6 (хуучин дизайн, 1 ажиллалт) | Засварын өмнө (3 ажиллалт) | Засварын дараа (3 ажиллалт) | Дараа: FCP · TBT |
|---|---|---|---|---|
| `/` | 93 | 85 / 53 / 56 | 91 / 86 / 86 | 1.3–1.6 сек · 360–530 ms |
| `/zah-zeel` | 89 | 90 / 62 / 57 | 88 / 84 / 86 | 1.5–1.6 сек · 450–590 ms |
| `/medee` | 93 | 55 / 54 / 49 | 88 / 88 / 85 | 1.4–1.6 сек · 450–540 ms |
| `/tailan` | 94 | 89 / 61 / 61 | 98 / 89 / 87 | 1.3–1.4 сек · 160–490 ms |
| `/sudalgaa` | 88 | 57 / 58 / 57 | 91 / 90 / 90 | 1.4–1.6 сек · 360–390 ms |
| `/arga-zui` | 96 | 87 / 58 / 60 | 92 / 87 / 87 | 1.2–1.4 сек · 360–500 ms |

- A11y, Best Practices, SEO бүх хуудсанд 100. CLS 0.
- FCP хуучин түвшиндээ буцсан. Судалгааны хуудас хуучнаас сайжирсан (88 → 90–91).
- **Үлдсэн зөрүү:** нүүр, зах зээл, мэдээ, арга зүйн медиан 86–88. Хуучин нэг удаагийн хэмжилтээс 3–9 оноо бага. Шалтгаан нь TBT (хуучин 230–410 ms → одоо 360–590 ms): шинэ дизайны hydration-д илүү олон бүрэлдэхүүн ажилладаг. Ажиллалт хоорондын зөрүү их (жишээ нь тайлан 87–98).
- Нэг удаагийн EAS алдаа гарсан: «deployment service is temporarily overloaded». Failed job-ийг дахин ажиллуулахад амжилттай болсон.

### Шалгаагүй / анхаарах
- Локал статик сервер дээрх Lighthouse-ийн FCP (≈4 сек) production-той харьцуулах боломжгүй. Скрипт анхны paint-аас өмнө ирдэг тул ялгаатай. Хуучин хувилбарыг локалд build хийх оролдлого loader-ийн алдаагаар бүтэлгүйтсэн. Шалтгааныг тогтоогоогүй.
- Локалд Inter фонт 100ms дотор ачаалагдаж `optional`-оор хэрэглэгдэх үед мэдээний хуудсанд CLS 0.116 гарсан. Production-д (фонт удаан ачаалагддаг) CLS 0.
- Сайтын нэр (`<title>`, OG title «Виртуал хөрөнгийн 7 хоног», хуудасны гарчигт «· ВХ 7 хоног»), og.png-ийн текст, инфографикийн «ВИРТУАЛ ХӨРӨНГИЙН 7 ХОНОГ»-ийг өөрчлөөгүй. Зөвхөн толгой ба хөлийн брэндийг сольсон.
- Хэвлэх CSS-ийг кодоор нэмсэн. Хэвлэх цонхыг нээж шалгаагүй.

### Техникийн шийдвэрүүд (дизайн)
| # | Шийдвэр |
|---|---|
| D53 | Толгой/хөлийн брэнд: «Виртуал хөрөнгийн үйлчилгээ үзүүлэгчийн хэлтэс» + «7 хоногийн мэдээ» (хэрэглэгчийн шийдвэр). SPEC §8-ын «ВХ 7 хоног» логог орлоно. `t.site.org`, `t.site.edition`. |
| D54 | Толгой, хуудасны гарчиг, хөлийг бараан хөх `ink` тууз болгосон (`Band` + `ThemeScope`). Карт нь тунгалаг цагаан давхарга. Текстийн тодрол туузны хамгийн цайвар хэсэгт ч ≥4.5:1 (Lighthouse A11y 100). |
| D55 | «ВХ» монограммыг өсөх 3 баганатай `BrandMark`-аар сольсон (вэб, инфографик, favicon/icon/og). |
| D56 | Нүүрний KPI мобайлд 2 баганатай. Тоо ба нэгжийг салгаж, 24px-ээр харуулна (2 баганат картад багтаахын тулд). |
| D57 | **Paint-first:** `expo export`-ийн дараа `scripts/paint-first.ts` нь `<script defer>`-ийг жижиг loader-оор солино. Loader нь `first-contentful-paint` ажиглагдсаны дараа ижил скриптүүдийг `async=false`-оор ижил дарааллаар оруулна. Fallback: rAF + 400ms ба 2.5 сек. `<head>`-ийн preload хэвээр тул татан авалт эрт эхэлнэ. `build-web` action ба `export:web`-д `fix-static-index`-ээс өмнө ажиллана. Hero-ийн торон `repeating-linear-gradient`-ийг хассан (анхны frame ≈60ms). `content-visibility: auto`-г туршсан: хурдад ялгаагүй, судалгааны хуудсанд axe target-size алдаа (A11y 96) өгсөн тул хэрэглээгүй. |
| D58 | `useTheme`/`useLayout`/`useHydrated` нь `useSyncExternalStore` ашиглана. Server snapshot нь `'light'`, `'mobile'`, `false`. Hydration-д статик HTML-тэй ижил утга өгч, клиентийн утга өөр үед л дахин render хийнэ. Клиент навигацид шинэ бүрэлдэхүүн шууд зөв горим/өргөнөөр зурагдана (өмнө нь мобайл/цайвар → шилжилт). `Layout`-аас `width`-ийг хассан (хэрэглэгддэггүй байсан). |
| D65 | Фонт: Inter → **Nunito** (үндсэн текст, цэс, товч, тоо; 400/600/700/800) ба **Comfortaa** (гарчиг h1–h3, hero, лого; 400/600/700), хэрэглэгчийн шийдвэр. `@expo-google-fonts/*`-ийн TTF нь бүтэн тул latin, cyrillic, cyrillic-ext (Ө ө Ү ү) бүгд байгааг GlyphTypeface-ээр шалгасан. Hydration-ий дараа `loadAsync`-оор ачаална (D50), харин `display: swap` — `optional` үед анхны айлчлалд фонт бараг харагдахгүй. Инфографик Nunito-гоор (2 мөрийн гарчгийн тооцоо). og/favicon-ийг шинэ фонтоор дахин үүсгэсэн. Production Lighthouse (`7446d8d`, 2 ажиллалт): нүүр 96/94, зах зээл 96/95, мэдээ 94/95, судалгаа 96/97; TBT 180–230 ms (фонт жижиг: 109–129 KB vs Inter 335 KB); swap-ийн CLS 0.05–0.09 (<0.1). A11y/BP/SEO 100. |
| D67 | Google Cloud-д төлбөрийн данс холбох боломжгүй байсан тул Cloud Run (D66)-ийг хойшлуулж, GitHub Actions → Pages урсгалыг хэвээр үлдээв (хэрэглэгчийн шийдвэр). `live-data` нь цагт 1 биш 3 удаа (`7,27,47 * * * *`) товлогдсон: GitHub scheduled ажлыг алгасах үед ч дата ≈1 цагаас хэтэрч хоцрохгүй байх магадлал өндөр. Public repo-д Actions үнэгүй; CoinGecko ≈6,700/10,000 дуудлага/сар; store/ commit өдөрт 1 хэвээр. |
| D68 | Мэдээ ба судалгаанд «зураг» оронд **өөрсдийн SVG дүрс** (`src/components/ui/icons.tsx`): мэдээний мөр бүрд ангиллын өнгөт дүрс (8 ангилал + Монгол мэдээнд туг), судалгааны хэсгийн гарчиг, агуулга, картууд ба нүүрний хэсгийн гарчигт дүрс. Мэдээний сайтын зураг, гуравдагч этгээдийн лого ашиглахгүй (CLAUDE.md дүрэм 4, SPEC §5.6, §13) тул хэрэглэгчийн «холбогдох зураг» хүсэлтийг ингэж хэрэгжүүлсэн. Дүрс чимэг (`aria-hidden`), цайвар/бараан горимд тус тусын өнгөтэй. |
| D69 | Фонт: Nunito/Comfortaa (D65) → **Helvetica** (хэрэглэгчийн шийдвэр). Helvetica арилжааны лицензтэй тул сайтад суулгахгүй: `"Helvetica Neue", Helvetica, Arial, "Segoe UI", system-ui` stack — Apple-д Helvetica, Windows/Android-д Arial (ижил хэмжээстэй). Arial, Segoe UI-д Ө ө Ү ү байгааг шалгасан. Нэг family + `fontWeight` (`font()` helper). Вэб фонт ачаалахгүй (≈830 KB хэмнэлт, swap-ийн CLS алга). og.png-ийг Arial-аар дахин үүсгэсэн. |
| D70 | Мэдээг сэтгүүлийн бүтэцтэй болгосон (хэрэглэгчийн жишээ: iToim). Төвд онцлох мэдээ, зүүн талд 2 карт, баруун талд «Сүүлийн мэдээ» жагсаалт жижиг нүүр зурагтай; мобайлд дараалан. Нүүр зураг = ангиллын өнгөт градиент + дүрс + эх сурвалжийн нэр (хэвлэлийн зураг биш, дүрэм 4). Нүүрэнд hero-ийн дараах эхний блок; /medee-д шүүлтгүй үед эхний 8 мэдээ, үлдсэн нь жагсаалтад (`src/components/cards/news-magazine.tsx`). |
| D71 | Нүүрний hero-ийн баруун талд хэрэглэгчийн өгсөн «Multi-language-voicbot» хөдөлгөөнт зураг (desktop-д л). Эх GIF 47.7 MB байсныг ffmpeg-ээр 480px animated WebP (3.9 MB, тунгалаг дэвсгэртэй) + reduced-motion-д 32 KB хөдөлгөөнгүй кадр болгосон. Hydration-ий дараа render хийдэг тул мобайл ба анхны paint-д татагдахгүй. |
| D72 | Нүүрний KPI хэсэгт «Өгөгдөл хоцорч байж болзошгүй» (3 цагаас хуучин) тузыг харуулахгүй (хэрэглэгчийн шийдвэр, SPEC §8-аас зөрүү). «Сүүлд шинэчилсэн» цаг ба эх сурвалж тус бүрийн хоцролтын туз хэвээр; /zah-zeel, /medee-д ерөнхий туз хэвээр. |

## 2026.10.21 — Үе шат 6: QA ба баримт

### Хийсэн
- **Lighthouse-ийн засварууд** (`900b050`, `f9ef658`):
  - CLS: `/`, `/zah-zeel`, `/medee` хуудсууд build үеийн fallback snapshot-ийг loader-оор авч, react-query-д `placeholderData` болгон өгдөг (D49). Ингэснээр статик HTML-д бодит тоо орж, hydration-ий дараа хуудас үсрэхгүй. Snapshot харагдаж байх үед `LiveStatus` нь туз гаргахгүй (`pending`).
  - Мэдээний «N минутын өмнө»-г hydration-ий дараа л харуулна (өмнө нь огноо). Статик HTML ба клиентийн текст ижил байна.
  - Фонт: Inter-ийг hydration-ий дараа `loadAsync` + `display: optional`-оор ачаална (D50).
  - Хүртээмж: ARIA role (`listitem`, `button`, `aria-expanded`), логоны давхар нэр, жижиг холбоосны дарах талбай (`paddingVertical: 3`), өнгөний тодрол (D51).
- **Брэнд зураг** (`0a49510`): `public/og.png` (1200×630), `assets/images/favicon.png` (48), `assets/images/icon.png` (1024). `scripts/dev/make-brand-images.ps1`-ээр Inter фонтоор үүсгэнэ (D52).
- **Баримт:** `README.md` (архитектур, командууд, GitHub тохиргоо, засвар үйлчилгээ), `docs/EDITOR.md` (техникийн бус редакторын заавар: долоо хоногийн хуваарь, PR дээр ноорог засах, QA, нийтлэх, PNG/хэвлэх, залруулга, асуудал шийдэх).
- sitemap.xml ба robots.txt-ийг Үе шат 1-ээс `prepare-build` гаргадаг. Production дээр 200 (Үе шат 5).

### Lighthouse (mobile, lighthouse 13.5.0, production)
| Хуудас | Өмнө: Perf / A11y / BP / SEO | Дараа: Perf / A11y / BP / SEO | Дараа: CLS · TBT |
|---|---|---|---|
| `/` | 87 / 90 / 96 / 100 | **93** / 100 / 100 / 100 | 0.030 · 308 ms |
| `/zah-zeel` | 72 / 80 / 96 / 100 | **89** / 100 / 100 / 100 | 0.035 · 414 ms |
| `/medee` | 72 / 91 / 96 / 100 (CLS 0.706) | **93** / 100 / 100 / 100 | 0.035 · 290 ms |
| `/tailan` | 96 / 88 / 100 / 100 | **94** / 100 / 100 / 100 | 0 · 274 ms |
| `/sudalgaa` | 93 / 77 / 100 / 100 | **88** / 100 / 100 / 100 | 0 · 271 ms |
| `/arga-zui` | 96 / 83 / 100 / 100 | **96** / 100 / 100 / 100 | 0 · 234 ms |

- A11y, Best Practices, SEO бүх хуудсанд 100.
- **Performance ≥90 зорилт `/zah-zeel` ба `/sudalgaa`-д хангагдаагүй.** Давтан хэмжихэд zah-zeel 82–89, sudalgaa 86–88. Шалтгаан:
  - React Native Web-ийн hydration-ий TBT (330–450 ms). Entry bundle 1.1 MB (React Native Web + router + zod + react-query).
  - sudalgaa-гийн HTML том (448 KB, шахсанаар 32 KB).
- Туршсан боловч буцаасан: `useFonts` + `optional` нь статик HTML-д 4 TTF preload (≈630 KB) нэмж, Chrome анхны дүрслэлийг хүлээлгэсэн (LCP 8–9 сек). → D50.

### SPEC §13.2 техникийн шалгалт
| # | Шалгалт | Үр дүн |
|---|---|---|
| 1 | Клиент bundle/HTML-д нууц түлхүүр байхгүй | ✅ `dist/`-д `CG-` алга |
| 2 | Гадаад холбоос `rel="noopener noreferrer"` | ✅ 222 холбоос бүгд |
| 3 | Иш татах (CoinGecko, DefiLlama, Alternative.me, ExchangeRate-API) + анхааруулга | ✅ 6 хуудас бүгд |
| 4 | Мэдээнд зөвхөн гарчиг, эх сурвалж, огноо, холбоос, шошго | ✅ |
| 5 | Pages унасан үед fallback | ✅ `EXPO_PUBLIC_DATA_BASE_URL=https://pages-down.invalid/…`-ээр build хийж локал сервер дээр шалгасан: саарал «Түр хадгалсан өгөгдөл» туз, build үеийн бодит дата харагдсан |
| 6 | 360px-д хэвтээ гүйлгээгүй | ✅ Production-ийн `/`, `/zah-zeel`, `/medee`, `/tailan`, `/sudalgaa`, `/arga-zui`, 404 бүгд `scrollWidth = 360` |
| 7 | Lighthouse ≥90 | ⚠️ 4/6 хуудас. zah-zeel 89, sudalgaa 88 (дээрх хүснэгт) |

- Typecheck ✅ · 162 тест ✅ · `expo export` ✅. Push бүрийн deploy run ногоон.

### Мэдэгдэж буй сул тал / анхаарах
- Дээрх хоёр хуудасны Performance 90-ээс бага. Цаашид сайжруулах бол: клиентэд `zod/mini`, судалгааны хэсгүүдийг хуваах, коин хүснэгтийг hydration-ий дараа зурах.
- Dark горимтой хэрэглэгчид: `+html.tsx` нь дэвсгэрийг media query-ээр бараан болгодог. Контент нь hydration хүртэл цайвар өнгөөр харагдана (Үе шат 1-ийн тэмдэглэл, засаагүй).
- EAS хадгалах сан: deploy бүр ≈9 MB. Production deployment устахгүй тул ≈1–1.5 жилд 1 GB-д хүрнэ. README-д хянах ба `eas deploy:delete` заавар бий (Нээлттэй асуулт 10-ын үлдэгдэл).
- Scheduled workflow-ийн 60 хоногийн дүрэм: API-аар өөрийгөө идэвхжүүлэх keepalive хийгээгүй. `data-history`-ийн өдөр бүрийн commit-д найдаж, унтарвал сэргээх заавар README-д бий.
- Хуучин хоосон EAS төсөл `@cerebrumanthropic/kripto-7hon`-ийг expo.dev-ээс устгаж болно.
- Хэвлэх харилцах цонх ба clipboard-ийг автоматаар шалгаагүй (Үе шат 4). `AUTO_PUBLISH=true` гинжийг ажиллуулж шалгаагүй (Үе шат 5).

### Техникийн шийдвэрүүд (Үе шат 6)
| # | Шийдвэр |
|---|---|
| D49 | Амьд дата бүхий хуудсууд build үеийн snapshot-ийг (`readFallback`) loader-оор авч, `useMarket`/`useNews`/`useHistory`-д `placeholderData` болгон өгнө. Pages-ийн хариу ирэхэд солигдоно. |
| D50 | Inter-ийг `RootLayout`-ийн `useEffect` дотор `loadAsync`-оор, `FontDisplay.OPTIONAL`-тай ачаална. `useFonts` нь preload нэмж анхны дүрслэлийг хаадаг. Анхны ачаалалд fallback фонт харагдаж болно, дараагийн хуудсанд кэшээс Inter. |
| D51 | Цайвар горимын accent `#A8741F` → `#8A5D12` (AA 4.5:1). BTC/ETH/стейблкойн тэмдэгт дээр бараан текст `#14161B`. D16-г шинэчилнэ. |
| D52 | og/favicon/icon-ийг `scripts/dev/make-brand-images.ps1` (System.Drawing + Inter) үүсгэнэ. Файл UTF-8 BOM-тэй байх ёстой (PowerShell 5.1 кирилл). Жин бүрийг тусдаа `PrivateFontCollection`-д ачаална. |

## 2026.10.21 — Үе шат 5: EAS Hosting deploy

### Хийсэн
- **Сайт:** https://vaspfrcweekly.expo.app (EAS төсөл [@cerebrumanthropic/vaspfrcweekly](https://expo.dev/accounts/cerebrumanthropic/projects/vaspfrcweekly)).
  - Анхны төсөл `kripto-7hon` дээрх анхны deploy-ийн оролдлого Terminal-ийн асуулт дээр зогссон. Гэвч энэ оролдлого `kripto-7hon.expo.app` хаягийг тэр төсөлд бүртгэсэн бөгөөд хаягийг `eas deploy`-ээр солих боломжгүй («Globally unique prefix tied to your project»).
  - Хэрэглэгч `vaspfrcweekly` нэрийг сонгосон тул шинэ төсөл үүсгэж (`slug: vaspfrcweekly`), анхны production deploy-г `--non-interactive --dev-domain vaspfrcweekly`-ээр хийсэн.
  - Хуучин хоосон төсөл `@cerebrumanthropic/kripto-7hon` дансанд үлдсэн. Хэрэглэгч хүсвэл expo.dev-ээс устгана.
- `eas.json` (хамгийн бага агуулгатай).
- `.github/actions/build-web` (composite): `npm ci` → нийтийн env (vars хоосон бол тохируулахгүй, тэгвэл `.env`-ийн утга ашиглагдана) → typecheck → test → validate → prepare-build → `expo export` → `fix-static-index`.
- `deploy.yml`:
  - Өдөөгч: main руу push (paths), `workflow_call`, гараар, cron `0 3 1,15 * *` (keepalive).
  - Үргэлж `ref: main`-ийг checkout хийнэ (D4). `expo/expo-github-action@v9` ашиглан `eas deploy --prod --non-interactive` хийнэ.
- `ci.yml`: PR бүрд build-web ажиллана. `report/*` PR дээр draft-ийг оруулан `eas deploy --json` хийж, `.url`-ийг PR-д comment болгоно (`gh pr comment --edit-last --create-if-none`).
- `weekly-report.yml`: `AUTO_PUBLISH=true` үед `uses: ./.github/workflows/deploy.yml` (`secrets: inherit`).
- `scripts/fix-static-index.ts`: EAS нь `/tailan`-ийг `tailan.html`-ээс хайдаг. Тиймээс `dist/<dir>/index.html` бүрийн хажууд `<dir>.html` хуулбар үүсгэнэ.
- `prepare-build` нь `.env`/`.env.local`-ийг уншдаг болсон. Ингэснээр локал fallback snapshot бодит Pages датаг авна.
- Анхдагч `SITE_URL` → `https://vaspfrcweekly.expo.app` (`.env`, config, prepare-build, bot UA).

### Шалгалт
- Анхны production deploy (локал, non-interactive) ✅.
- Push → [deploy run 39602842548](https://github.com/cerebrumanthropic/kripto-7hon/actions/runs/39602842548) ✅ 2 мин 10 сек.
  - Production дээр `/`, `/tailan`, `/tailan/`, `/zah-zeel`, `/medee`, `/sudalgaa`, `/arga-zui`, `/sitemap.xml`, `/robots.txt` бүгд 200.
  - sitemap нь шинэ хаягтай. `lang="mn"`. OG url зөв. HTML-д `CG-` алга.
- Туршилтын [PR #2](https://github.com/cerebrumanthropic/kripto-7hon/pull/2) (`report/2026-W42`, draft) → [ci run 39603247750](https://github.com/cerebrumanthropic/kripto-7hon/actions/runs/39603247750) ✅.
  - Preview URL comment-оор ирсэн.
  - Preview хуудсанд draft тайлан «НООРОГ» тэмдэгтэй харагдсан. Production дээр тэр тайлан 404 (draft production-д гараагүй).
  - Туршилтын дараа PR-ийг хааж, branch-ийг устгасан.
- Typecheck ✅ · 162 тест ✅.

### Нээлттэй асуулт 10 — EAS (expo.dev/pricing, 2026.10.21)
- Free хязгаар: 100k хүсэлт/сар, 1M CPU-ms, 1 GB, 10 CPU-ms/хүсэлт, 10 subrequest, 5 alias, custom domain байхгүй, deployment retention 30 хоног. SPEC-тэй таарч байна. Starter нь $19/сар.
- Зөвхөн production биш, alias оноогоогүй deployment л 30 хоногийн дараа устдаг. Keepalive cron-ийг SPEC-ийн дагуу үлдээсэн.
- Production deployment-ууд устахгүй хуримтлагдаж магадгүй (deploy бүр ≈ хэдэн MB). 1 GB хүрэхээс өмнө `eas deploy:delete`-ээр цэвэрлэх шаардлагатай эсэхийг Үе шат 6-д шалгана.

### Шалгаагүй / анхаарах
- `AUTO_PUBLISH=true` үеийн `weekly-report → deploy` гинжийг ажиллуулж шалгаагүй (AUTO_PUBLISH=false). YAML бүтэц нь шалгагдсан.
- Keepalive cron-ийн анхны ажиллалт 11.01 03:00 UTC-д болно.
- Дээрх асуудал засагдахаас өмнө инфографик статик HTML-д ороогүй (хэмжигдсэний дараа клиент дээр зурагддаг). Энэ нь хүлээгдэж байсан үр дүн.

### Техникийн шийдвэрүүд (Үе шат 5)
| # | Шийдвэр |
|---|---|
| D45 | Production хаяг `vaspfrcweekly.expo.app` (хэрэглэгчийн сонголт). EAS төслийн slug `vaspfrcweekly`. Repo-ийн нэр `kripto-7hon` хэвээр. |
| D46 | Нийтийн env-ийг vars хоосон бол тохируулахгүй. Хоосон утга нь `.env`-ийг дарж бичихээс сэргийлнэ. |
| D47 | `src/app/tailan.tsx` болгож зөөхөд Expo-гийн loader гаралт `tailan/[week]`-тэй зөрчилдсөн (EISDIR). Тиймээс route-ийг хэвээр үлдээж, export-ийн дараа `fix-static-index` ажиллуулдаг. |
| D48 | Build workflow-д `npm ci`-г scripts-тэй ажиллуулна (Expo-гийн export-д). live/weekly-д `--ignore-scripts` хэвээр. |

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
| `@expo-google-fonts/nunito`, `@expo-google-fonts/comfortaa` | app | Nunito (текст) ба Comfortaa (гарчиг) — SIL OFL, бүтэн TTF (кирилл + Ө Ү). Inter-ийг сольсон (D59) |
| `vitest` | dev | Тест (SPEC §3) |
| `tsx` | dev | Скрипт ажиллуулах (SPEC §3) |
| `prettier` | dev | Формат (SPEC §3) |
| `gray-matter` | dev | Тайлангийн `.md` frontmatter (SPEC §3) |
| `@types/node` 24 | dev | Скрипт ба build-ийн Node төрөл (TS 6, D21) |
| ~~`fast-xml-parser` 5~~ | — | 2026.10.22 хасав — RSS-ийг Python backend (`lxml`) задална (D63) |
| `html-to-image` 1.11 | app (lazy) | Инфографикийн PNG экспорт, зөвхөн вэб, товч дарахад ачаална (SPEC §3, D44) |

### Python backend (`backend/pyproject.toml`, D59)
| Пакет | Төрөл | Шалтгаан |
|---|---|---|
| `fastapi`, `uvicorn` | app | HTTP API (D60) |
| `httpx` | app | Async HTTP клиент (давтан оролдлого, timeout — SPEC §7.2.2) |
| `pydantic` 2 | app | Схем шалгалт (Zod-ийн хуулбар, D61) |
| `lxml` | app | RSS/Atom задлах (D63) |
| `pyyaml` | app | Тайлангийн `.md` frontmatter |
| `python-dotenv` | app | `.env.local` (локал түлхүүр) |
| `pytest`, `ruff`, `mypy`, `types-pyyaml`, `lxml-stubs` | dev | Тест, lint/формат, төрөл |
