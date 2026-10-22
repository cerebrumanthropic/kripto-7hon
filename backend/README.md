# backend — дата backend (Python 3.12 + FastAPI)

Амьд дата татах, 7 хоногийн тайлангийн ноорог үүсгэх, тайлан шалгах ажлыг хийдэг. Мөн тэр датаг HTTP-ээр үйлчилнэ.
Өмнө нь `scripts/*.ts` (Node) байсан. Гаралтын JSON нь TS хувилбартай яг ижил тул апп (`src/lib/data-client.ts`) өөрчлөгдөөгүй.

## Суулгах

[uv](https://docs.astral.sh/uv/) хэрэгтэй. Python-ыг uv өөрөө татна.

```bash
cd backend && uv sync        # .venv үүсгэнэ (dev хамаарал орно)
```

Командуудыг **repo-ийн үндсээс** ажиллуулна (`public-data/`, `store/`, `content/reports/` нь үндэснээс харьцангуй):

| npm | Шууд | Үйлдэл |
|---|---|---|
| `npm run data:live` | `uv run --project backend kripto live [--fail id,..] [--now ISO] [--out DIR] [--store DIR]` | Амьд дата → `public-data/` (+ өдрийн цэг `store/`) |
| `npm run report:draft -- --week 2026-W43` | `… kripto weekly [--week] [--dry-run] [--auto-publish] [--print-week]` | 7 хоногийн ноорог → `content/reports/` |
| `npm run validate` | `… kripto validate` | Нийтлэгдсэн тайлангуудыг шалгана (алдаа → exit 1) |
| `npm run api` | `… kripto serve [--host] [--port] [--reload]` | FastAPI сервер (доорх) |
| `npm run feeds:probe` · `npm run fixtures:capture` | `… kripto feeds-probe` · `fixtures-capture` | RSS шалгах · API fixture шинэчлэх |
| `npm run test:backend` | `cd backend && uv run pytest` (+ ruff, mypy) | Тест ба шалгалт |

Нууц түлхүүрийг repo-ийн үндэс дэх `.env.local`-д хадгална. Энэ файл git-д орохгүй (`COINGECKO_DEMO_API_KEY`, `CONTACT_EMAIL`).

## FastAPI сервер

GitHub Pages-тэй **ижил замаар** үйлчилнэ. Тиймээс аппын `EXPO_PUBLIC_DATA_BASE_URL`-ийг серверийн URL болгоход хангалттай.

| Зам | Агуулга |
|---|---|
| `GET /live/market.json` · `/live/news.json` · `/live/status.json` | Амьд дата (CORS, `cache-control: max-age=300`, ETag) |
| `GET /history/daily.json` | Өдрийн түүх |
| `GET /news/{2026-W43}.json` | Долоо хоногийн мэдээний архив |
| `GET /healthz` | Сүүлийн шинэчлэлийн цаг, scheduler-ийн төлөв |
| `POST /admin/refresh` | Одоо татах. `Authorization: Bearer $ADMIN_TOKEN` шаардана. Токен тохируулаагүй бол endpoint байхгүй. |
| `GET /docs` | OpenAPI |

| Орчны хувьсагч | Өгөгдмөл | |
|---|---|---|
| `DATA_DIR` · `STORE_DIR` | `public-data` · `store` | Гаралт ба өдрийн түүхийн хавтас |
| `ENABLE_SCHEDULER` | `false` | `true` бол цаг бүрийн :07-д өөрөө татна. Тэгвэл `live-data.yml`-ийг унтраах хэрэгтэй. |
| `ADMIN_TOKEN` | — | `/admin/refresh`-ийн токен |
| `CORS_ORIGINS` | `*` | Таслалаар тусгаарлана |
| `COINGECKO_DEMO_API_KEY` · `CONTACT_EMAIL` · `SITE_URL` | — | Эх сурвалжуудад |

Серверийн горимд өмнөх төлөвийг GitHub Pages-ээс уншихгүй. Төлөвийг `STORE_DIR` ба `DATA_DIR`-аас уншина (сервер өөрөө өгөгдлийн эх).
Серверийг заавал ажиллуулах шаардлагагүй. Одоогийн GitHub Actions → Pages урсгал (`kripto live`) хэвээр ажиллана. Хостинг сонговол **зөвхөн үнэгүй түвшинд** (CLAUDE.md дүрэм 1).

## Бүтэц

```
src/kripto_api/
  cli.py          kripto <команд>
  api.py          FastAPI апп + scheduler
  live.py         амьд дата (SPEC §7.2)        weekly_job.py  7 хоногийн ноорог (SPEC §7.3)
  state.py        Pages → store/ → локал         validate.py    тайлангийн шалгалт (SPEC §7.4)
  assemble.py     market.json, stale утга        weekly.py      WeeklyAuto (цэвэр функц)
  history.py      өдрийн цэг                     sentences.py   монгол өгүүлбэр (SPEC §7.3.5)
  schemas.py      Pydantic ↔ src/types/schemas.ts (Zod) — хоёуланг нь хамт өөрчил
  classify.py     ↔ src/lib/classify.ts           jsnum.py       JS-тэй ижил toFixed/toISOString
  sources/        coingecko, defillama, feargreed, fx, rss, feeds
tests/            pytest; fixtures/ = API-ийн бодит хариу
```

`schemas.py` ба `classify.py` нь апп дахь TypeScript хувилбарын хуулбар. Тиймээс талбар эсвэл дүрэм өөрчилбөл хоёр талыг хамт өөрчил.
