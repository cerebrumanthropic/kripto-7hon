# CLAUDE.md — «Виртуал хөрөнгийн 7 хоног» вэб платформ

Монгол хэлээр, тоонд суурилсан виртуал хөрөнгийн мэдээллийн вэб: судалгааны контент + цаг тутам шинэчлэгддэг амьд дата ба олон улсын мэдээ + Даваа бүрийн 7 хоногийн тайлан (инфографиктай). **Бүх дэд бүтэц үнэгүй түвшинд.**

**Дэлгэрэнгүй тодорхойлолт: `docs/SPEC.md` — ажил эхлэхээсээ өмнө бүтнээр нь унш.** Явц ба шийдвэрүүдийг `docs/PROGRESS.md`-д хөтөл (байхгүй бол үүсгэ).

## Архитектур (товч)
- **Вэб:** Expo (хамгийн сүүлийн SDK) + Expo Router + TypeScript, `expo.web.output: "static"` → `npx expo export -p web` → `eas deploy --prod` → EAS Hosting (`https://<нэр>.expo.app`).
- **Дата backend:** Python 3.12 + FastAPI, `backend/` (uv). Дэлгэрэнгүй: `backend/README.md`.
- **Амьд дата:** GitHub Actions цаг тутам `kripto live` (`backend/src/kripto_api/live.py`) ажиллуулж JSON-ийг **GitHub Pages**-д нийтэлнэ. FastAPI (`kripto serve`) мөн ижил замаар үйлчилж чадна (заавал биш). Клиент Pages-аас 10 минут тутам уншина; алдаа гарвал build үеийн fallback.
- **7 хоногийн тайлан:** Ням 23:55 UTC-д `kripto weekly` ноорог үүсгэж PR нээнэ → редактор засаад merge → `deploy.yml` EAS руу deploy.
- **Түүх:** `data-history` branch (өдөрт 1 commit) + Pages дээрх хувилбар.

## Үл зөрчих дүрэм
1. Төлбөртэй үйлчилгээ/түвшин нэмэхгүй. EAS Free: 100k хүсэлт/сар, хүсэлтэд 10 CPU-ms, 10 subrequest, 1 GB → **API route (`+api.ts`) ашиглахгүй**, хүнд ажил бүгд GitHub Actions-д. FastAPI серверийг хостлох бол зөвхөн үнэгүй түвшинд.
2. Нууц түлхүүр (`COINGECKO_DEMO_API_KEY`, `EXPO_TOKEN`) зөвхөн GitHub Secrets ба `.env.local`-д. `EXPO_PUBLIC_` угтвартай хувьсагчид нууц хэзээ ч бүү оруул. `.env.local`-ийн агуулгыг бүү хэвлэ, бүү commit хий.
3. Дата эх сурвалж зөвхөн SPEC §5-д заасан үнэгүй API-ууд. Binance/Bybit/OKX futures API-г Actions-оос дуудахгүй (АНУ-ын IP хаадаг). HTML scrape хийхгүй.
4. Мэдээ: зөвхөн гарчиг + эх сурвалж + огноо + холбоос. Тайлбар, зураг, бүрэн текст хуулахгүй.
5. Иш татах заавал: CoinGecko, DefiLlama, Alternative.me (виджетийн яг хажууд), «Rates By Exchange Rate API» (яг энэ холбоосын текст).
6. `content/reports/*.md` (редакторын текст)-ийг скрипт **хэзээ ч дарж бичихгүй**.
7. UI бүх текст монгол кирилл, `src/lib/i18n-mn.ts`-д. Хөрөнгө оруулалтын зөвлөгөө өгөх үг хэллэггүй; анхааруулга хуудас бүрд.
8. Эх сурвалж бүтэлгүйтэхэд сайт эвдрэхгүй: өмнөх утга + «хоцорсон» тэмдэг.
9. Хэрэглэгчийн гараар хийх алхмуудыг (SPEC §11: GitHub тохиргоо, Secrets, `eas login`, анхны deploy, EXPO_TOKEN) өөрөө хийх гэж бүү оролд — юу хийхийг тодорхой бичээд хүлээ.
10. Нэг удаад нэг үе шат (SPEC §12). Үе шат дуусахад: typecheck + test + `npx expo export -p web` ногоон, PROGRESS.md шинэчлэгдсэн, англи commit мессеж. Дараагийн үе шатыг хэрэглэгчээр зөвшөөрүүл.

## Командууд (Үе шат 1-ийн дараа `package.json`-д байх ёстой)
| Команд | Үйлдэл |
|---|---|
| `npx expo start --web` | Локал хөгжүүлэлт |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | vitest |
| `npm run data:live` | Амьд дата татаж `public-data/`-д бичнэ (`.env.local`-аас түлхүүр; Python) |
| `npm run report:draft -- --week 2026-W43 [--dry-run] [--auto-publish]` | 7 хоногийн ноорог |
| `npm run validate` | Нийтлэгдсэн тайлангуудыг шалгана |
| `npm run test:backend` | Python backend: pytest + ruff + mypy |
| `npm run api` | FastAPI сервер (`backend/README.md`) |
| `npm run prebuild:web` | Тайлан, fallback, sitemap бэлтгэнэ |
| `npx expo export -p web` | `dist/` үүсгэнэ |
| `eas deploy --prod` | EAS Hosting руу (анхных нь хэрэглэгч өөрөө) |

## Хэв маяг
- TypeScript strict; Zod схем `src/types/schemas.ts`-д. Backend нь түүний Pydantic хуулбар `backend/src/kripto_api/schemas.py`-г ашиглана — схем (мөн `classify`) өөрчилбөл хоёуланг нь хамт өөрчил.
- Python: 3.12, `ruff` + `mypy` (`disallow_untyped_defs`), хамаарлыг `uv add`-аар нэмнэ.
- Хамаарал нэмэхдээ `npx expo install`; том chart сан биш, `react-native-svg` дээр өөрсдийн хөнгөн компонент.
- Тоо/огноог зөвхөн `src/lib/format.ts`, `src/lib/dates.ts`-ээр (цагийн бүс `Asia/Ulaanbaatar`; «$2.45 их наяд», «+4.2%», «−3.1%», «2026.10.21 14:07 (УБ)»).
- Дизайн: `frontend-design` skill-ийг ашиглаж нэгдмэл, санаатай харагдах байдал сонго; template-ийн default төрхөөр бүү үлдээ. Expo-гийн албан ёсны skill-үүд (`expo` plugin) суусан бол Expo Router, EAS Hosting-ийн асуудалд тэдгээрийг ашигла.
- Судалгааны контентын цорын ганц эх: `content/research.json` (засварлахдаа схемийг нь бүү эвдэ).
