# Виртуал хөрөнгийн 7 хоног

Монгол хэлээр, тоонд суурилсан виртуал хөрөнгийн (крипто) мэдээллийн вэб: судалгааны контент, цаг тутам шинэчлэгддэг амьд дата ба олон улсын мэдээ, Даваа бүрийн 7 хоногийн тайлан (инфографиктай). **Бүх дэд бүтэц үнэгүй түвшинд.**

- 🌐 Сайт: **https://vaspfrcweekly.expo.app**
- 📡 Амьд дата (GitHub Pages): https://cerebrumanthropic.github.io/kripto-7hon/live/market.json
- ✍️ Редакторын заавар: [docs/EDITOR.md](docs/EDITOR.md)
- 📐 Техникийн тодорхойлолт: [docs/SPEC.md](docs/SPEC.md) · Явц ба шийдвэрүүд: [docs/PROGRESS.md](docs/PROGRESS.md)

> Энэ нь хөрөнгө оруулалтын зөвлөгөө биш. Зөвхөн мэдээллийн зориулалттай.

## Архитектур

```
GitHub Actions ─┬─ live-data.yml (цаг бүр :07)  → scripts/fetch-live.ts → public-data/ → GitHub Pages (JSON, CORS *)
                │                                  └─ data-history branch (өдөрт 1 commit)
                ├─ weekly-report.yml (Ням 23:55 UTC) → scripts/build-weekly.ts → Pull Request (редактор) 
                ├─ deploy.yml (main руу push / 1, 15-нд keepalive) → expo export → EAS Hosting
                └─ ci.yml (PR) → шалгалт; report/* PR → preview deploy + comment
Хөтөч ← EAS Hosting (статик HTML) ← амьд JSON-ийг Pages-ээс 10 мин тутам (алдаа гарвал build үеийн fallback)
```

- **Вэб:** Expo SDK 58 + Expo Router, `web.output: "static"`, data loaders. API route байхгүй (EAS Free-ийн 10 CPU-ms хязгаар).
- **Дата:** CoinGecko Demo (≤5 дуудлага/ажиллалт), DefiLlama, Alternative.me, open.er-api.com, RSS (CoinDesk, Cointelegraph, Decrypt, The Block, Bitcoin Magazine, CryptoSlate, SEC, Ikon.mn).
- **Тайлан:** `content/reports/<week>.json` (автомат) + `<week>.md` (редакторын текст, скрипт хэзээ ч дарж бичихгүй).

## Хавтасны бүтэц

```
src/app/            route-ууд (/, /zah-zeel, /medee, /tailan, /tailan/[week], /sudalgaa, /arga-zui)
src/components/     layout, charts (react-native-svg), cards, report (инфографик), research
src/lib/            format, dates, i18n-mn, classify, data-client, report-view, share-text, server/content
src/types/          Zod схемүүд (апп ба скрипт хуваалцана)
scripts/            fetch-live, build-weekly, validate-reports, prepare-build, sources/*, lib/*
scripts/__fixtures__/ API-ийн бодит хариуны жишээ (тестэд)
content/            research.json (судалгаа), reports/ (7 хоногийн тайлан)
docs/               SPEC, PROGRESS, EDITOR
```

## Командууд

| Команд | Үйлдэл |
|---|---|
| `npm install` | Хамаарлууд (Node 24) |
| `npx expo start --web` | Локал хөгжүүлэлт |
| `npm run typecheck` · `npm test` | TypeScript · vitest |
| `npm run data:live` | Амьд дата татаж `public-data/`-д бичнэ (`--fail id` — эх сурвалжийг хүчээр унагах) |
| `npm run report:draft -- --week 2026-W43 [--dry-run] [--auto-publish]` | 7 хоногийн ноорог |
| `npm run validate` | Нийтлэгдсэн тайлангуудыг шалгана |
| `npm run export:web` | prepare-build → `expo export` → `dist/` |
| `npm run check:links` · `npm run feeds:probe` · `npm run fixtures:capture` | Судалгааны холбоос · RSS · API fixture шалгах |

Локалд CoinGecko ашиглахын тулд `.env.local` (git-д орохгүй) файлд `COINGECKO_DEMO_API_KEY=CG-…` бичнэ. Нийтийн утга (`EXPO_PUBLIC_*`) нь `.env`-д байна. Нууц түлхүүрийг **хэзээ ч** `EXPO_PUBLIC_` угтвартай болгохгүй.

## GitHub тохиргоо

| Төрөл | Нэр | Утга |
|---|---|---|
| Secret | `COINGECKO_DEMO_API_KEY` | CoinGecko Demo түлхүүр |
| Secret | `EXPO_TOKEN` | expo.dev → Access tokens |
| Variable | `DATA_BASE_URL` | `https://cerebrumanthropic.github.io/kripto-7hon` (repo-ийн нэрээр тогтоно) |
| Variable | `SITE_URL` | `https://vaspfrcweekly.expo.app` |
| Variable | `CONTACT_EMAIL` | SEC-ийн RSS-д шаардлагатай холбоо барих имэйл |
| Variable | `AUTO_PUBLISH` | `false` (PR горим) / `true` (бүрэн автомат) |

Pages: **Settings → Pages → Source: GitHub Actions**.

## Засвар үйлчилгээ

- **Scheduled workflow унтарвал:** Public repo 60 хоног идэвхгүй бол GitHub хуваарьт ажлыг унтраадаг. `data-history`-д өдөр бүр commit хийгддэг. Унтарсан тохиолдолд **Actions → live-data → Enable workflow** дарна.
- **EAS хадгалах сан (Free 1 GB):** Production deployment-ууд устахгүй хуримтлагддаг. Нэг deploy ≈ 9 MB, сард 6–8 удаа → ≈1–1.5 жилд 1 GB-д хүрнэ. Хэрэглээг expo.dev → Hosting хэсгээс хянана. Хуучныг `npx eas-cli deploy:delete <id>`-ээр устгана.
- **CoinGecko квот:** Сард ≈2,300 / 10,000 дуудлага. Developer Dashboard-оос хянана.
- **RSS эх сурвалж ажиллахаа больсон бол:** `npm run feeds:probe` ажиллуулаад `scripts/sources/feeds.ts`-ийг засна.

## Иш татах

Data provided by [CoinGecko](https://www.coingecko.com/en/api) · [DefiLlama](https://defillama.com) · [Alternative.me](https://alternative.me/crypto/fear-and-greed-index/) · [Rates By Exchange Rate API](https://www.exchangerate-api.com). Мэдээний хувьд зөвхөн гарчиг, эх сурвалж, огноо, холбоосыг харуулдаг. Бүрэн эх нь тухайн хэвлэлд хамаарна.
