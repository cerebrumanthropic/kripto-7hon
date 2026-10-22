# FastAPI: амьд датаг GitHub Pages-тэй ИЖИЛ замаар (live/market.json …) үйлчилнэ — клиентийн
# EXPO_PUBLIC_DATA_BASE_URL-ийг энэ серверийн URL болгоход л хангалттай (src/lib/data-client.ts өөрчлөгдөхгүй).
# ENABLE_SCHEDULER=true бол цаг бүрийн :07-д өөрөө татна (GitHub Actions-ийн live-data.yml-ийн оронд).
# Cloud Run (STATE_BUCKET): instance хүсэлтгүй үед унтдаг тул scheduler-ийн оронд Cloud Scheduler нь
# POST /admin/refresh-ийг дуудна; төлөв bucket-д хадгалагдана (state_sync.py, PROGRESS D66).
import asyncio
import contextlib
import json
import logging
import re
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from kripto_api import config
from kripto_api.config import ServerSettings
from kripto_api.gcs import GcsBucket
from kripto_api.live import LiveConfig, LiveResult, run_live
from kripto_api.state_sync import StateSync

log = logging.getLogger("kripto_api")

CACHE_SECONDS = 300  # клиент 10 мин тутам уншина (src/lib/config.ts LIVE_REFETCH_MS)
RUN_MINUTE = 7  # цагийн эхний ачааллаас зайлсхийх (live-data.yml-тэй ижил)


class Refresher:
    """Нэг зэрэг зөвхөн нэг live ажиллалт (scheduler ба /admin/refresh хуваалцана)."""

    def __init__(self, settings: ServerSettings, sync: StateSync | None = None) -> None:
        self.settings = settings
        self.sync = sync
        self.lock = asyncio.Lock()
        self.last_run: datetime | None = None
        self.last_code: int | None = None
        self.has_history: bool | None = None  # bucket-д өдрийн түүх байсан эсэх (None = татаагүй)

    async def pull(self) -> None:
        if self.sync and not self.sync.pulled:
            self.has_history = await self.sync.pull(datetime.now(UTC))

    async def run(self) -> LiveResult:
        async with self.lock:
            await self.pull()
            # Сервер өөрөө өгөгдлийн эх тул төлөвийг Pages-ээс биш store/ ба DATA_DIR-аас уншина.
            # Bucket хоосон анхны ажиллалтад л SEED_BASE_URL (Pages)-ээс өмнөх түүхийг авна.
            seed = self.settings.seed_base_url if self.sync and self.has_history is False else ""
            cfg = LiveConfig(
                now=datetime.now(UTC),
                out_dir=self.settings.data_dir,
                store_dir=self.settings.store_dir,
                data_base_url=seed,
                api_key=config.coingecko_key(),
                log=log.info,
            )
            result = await run_live(cfg)
            if self.sync:
                await self.sync.push()  # амжилтгүй бол алдаа гарч 500 → Cloud Scheduler дахин оролдоно
                self.has_history = True
            self.last_run, self.last_code = cfg.now, result.code
            return result


def seconds_until_next_run(now: datetime) -> float:
    nxt = now.replace(minute=RUN_MINUTE, second=0, microsecond=0)
    if nxt <= now:
        nxt += timedelta(hours=1)
    return (nxt - now).total_seconds()


async def _schedule(refresher: Refresher) -> None:
    if not (refresher.settings.data_dir / "live" / "market.json").exists():
        await _safe_run(refresher)
    while True:
        await asyncio.sleep(seconds_until_next_run(datetime.now(UTC)))
        await _safe_run(refresher)


async def _safe_run(refresher: Refresher) -> None:
    try:
        await refresher.run()
    except Exception:
        log.exception("[live] ажиллалт унав")  # дараагийн цагт дахин оролдоно; өмнөх файлууд хэвээр


def create_app(settings: ServerSettings | None = None) -> FastAPI:
    settings = settings or ServerSettings.from_env()
    sync = (
        StateSync(GcsBucket(settings.state_bucket), settings.data_dir, settings.store_dir, log.info)
        if settings.state_bucket
        else None
    )
    refresher = Refresher(settings, sync)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        try:
            await refresher.pull()  # cold start: сүүлийн датаг bucket-аас (уншигчдад шууд үйлчилнэ)
        except Exception:
            log.exception("[gcs] pull унав — дараагийн хүсэлтэд дахин оролдоно")
        task = asyncio.create_task(_schedule(refresher)) if settings.scheduler else None
        yield
        if task:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

    app = FastAPI(
        title="Виртуал хөрөнгийн 7 хоног — дата API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url=None,
    )
    app.state.refresher = refresher
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET"], allow_headers=["*"])

    async def serve(rel: str) -> FileResponse:
        file = settings.data_dir / rel
        if not file.is_file() and sync:
            with contextlib.suppress(Exception):
                await sync.fetch(rel)  # хуучин долоо хоногийн архив
        if not file.is_file():
            raise HTTPException(404, f"{rel} одоогоор алга")
        return FileResponse(file, media_type="application/json", headers={"cache-control": f"public, max-age={CACHE_SECONDS}"})

    @app.get("/live/{name}.json", summary="Амьд дата (market, news, status)")
    async def live_json(name: Literal["market", "news", "status"]) -> FileResponse:
        return await serve(f"live/{name}.json")

    @app.get("/history/daily.json", summary="Өдрийн түүх (сүүлийн цэг нь provisional)")
    async def history_json() -> FileResponse:
        return await serve("history/daily.json")

    @app.get("/news/{week}.json", summary="Долоо хоногийн мэдээний архив, жишээ нь 2026-W43")
    async def news_week_json(week: str) -> FileResponse:
        if not re.fullmatch(r"\d{4}-W\d{2}", week):
            raise HTTPException(404, "долоо хоног «2026-W43» хэлбэртэй байх ёстой")
        return await serve(f"news/{week}.json")

    @app.get("/healthz", summary="Төлөв")
    async def healthz() -> dict[str, Any]:
        updated_at = _read_updated_at(settings.data_dir / "live" / "status.json")
        return {
            "ok": updated_at is not None,
            "updatedAt": updated_at,
            "scheduler": settings.scheduler,
            "stateBucket": bool(settings.state_bucket),
            "lastRun": refresher.last_run.isoformat() if refresher.last_run else None,
            "lastExitCode": refresher.last_code,
        }

    @app.post("/admin/refresh", summary="Амьд датаг одоо татах (ADMIN_TOKEN шаардана)")
    async def admin_refresh(authorization: Annotated[str | None, Header()] = None) -> dict[str, Any]:
        token = settings.admin_token
        if not token:
            raise HTTPException(404)  # тохируулаагүй бол endpoint байхгүй мэт
        if not authorization or not secrets.compare_digest(authorization, f"Bearer {token}"):
            raise HTTPException(401, headers={"www-authenticate": "Bearer"})
        if refresher.lock.locked():
            raise HTTPException(409, "ажиллаж байна")
        result = await refresher.run()
        return {"exitCode": result.code, "status": result.status}

    return app


def _read_updated_at(file: Path) -> str | None:
    try:
        value = json.loads(file.read_text(encoding="utf-8")).get("updatedAt")
        return value if isinstance(value, str) else None
    except (OSError, ValueError, AttributeError):
        return None
