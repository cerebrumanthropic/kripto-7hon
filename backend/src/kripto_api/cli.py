# `kripto <команд>` — repo-ийн үндсээс ажиллуулна (npm скриптүүд: `uv run --project backend kripto …`).
#   live      амьд дата → public-data/ (+ store/)          npm run data:live
#   weekly    7 хоногийн тайлангийн ноорог                   npm run report:draft
#   validate  нийтлэгдсэн тайлангуудыг шалгана               npm run validate
#   serve     FastAPI сервер                                 npm run api
#   feeds-probe, fixtures-capture — хөгжүүлэлтийн хэрэгсэл
import argparse
import asyncio
import logging
import sys
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path

from kripto_api import config
from kripto_api.http import error_message
from kripto_api.jsnum import parse_iso


def _now(arg: str | None) -> datetime:
    if not arg:
        return datetime.now(UTC)
    try:
        return parse_iso(arg)
    except ValueError:
        raise SystemExit("--now буруу") from None


def _live(a: argparse.Namespace) -> int:
    from kripto_api.live import LiveConfig, parse_forced, run_live

    cfg = LiveConfig(
        now=_now(a.now),
        out_dir=Path(a.out).resolve(),
        store_dir=Path(a.store).resolve(),
        data_base_url=config.data_base_url(),
        api_key=config.coingecko_key(),
        forced=parse_forced(a.fail),
    )
    try:
        return asyncio.run(run_live(cfg)).code
    except Exception as e:
        print(f"[live] алдаа: {error_message(e)}", file=sys.stderr)
        return 1


def _weekly(a: argparse.Namespace) -> int:
    from kripto_api.dates import week_range
    from kripto_api.weekly_job import WeeklyConfig, default_week, run_weekly

    now = _now(a.now)
    week = a.week or default_week(now)
    week_range(week)  # формат шалгах
    if a.print_week:
        print(week)  # workflow-д PR branch-ийн нэрийг урьдчилан мэдэхэд
        return 0
    cfg = WeeklyConfig(
        week=week,
        now=now,
        store_dir=Path(a.store).resolve(),
        out_dir=Path(a.out).resolve(),
        reports_dir=Path("content", "reports").resolve(),
        data_base_url=config.data_base_url(),
        api_key=config.coingecko_key(),
        dry_run=a.dry_run,
        auto_publish=a.auto_publish,
    )
    try:
        return asyncio.run(run_weekly(cfg))
    except Exception as e:
        print(f"[weekly] алдаа: {error_message(e)}", file=sys.stderr)
        return 1


def _validate(_: argparse.Namespace) -> int:
    from kripto_api.validate import validate_all

    return validate_all(Path("content", "reports"))


def _serve(a: argparse.Namespace) -> int:
    import uvicorn

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    uvicorn.run("kripto_api.api:create_app", factory=True, host=a.host, port=a.port, reload=a.reload)
    return 0


def _feeds_probe(_: argparse.Namespace) -> int:
    from kripto_api.dev import probe_feeds

    asyncio.run(probe_feeds())
    return 0


def _fixtures_capture(a: argparse.Namespace) -> int:
    from kripto_api.dev import capture_fixtures

    asyncio.run(capture_fixtures(Path(a.dir)))
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="kripto", description="Виртуал хөрөнгийн 7 хоног — дата backend")
    sub = p.add_subparsers(dest="command", required=True)

    live = sub.add_parser("live", help="амьд дата татаж public-data/-д бичнэ")
    live.add_argument("--fail", help="эх сурвалжийг хүчээр унагах: coingecko,feargreed (тест)")
    live.add_argument("--now", help="цагийг тогтоох: 2026-10-21T00:07:00Z")
    live.add_argument("--out", default="public-data")
    live.add_argument("--store", default="store")
    live.set_defaults(fn=_live)

    weekly = sub.add_parser("weekly", help="7 хоногийн тайлангийн ноорог")
    weekly.add_argument("--week", help="жишээ нь 2026-W43 (хоосон бол автоматаар)")
    weekly.add_argument("--auto-publish", action="store_true")
    weekly.add_argument("--dry-run", action="store_true")
    weekly.add_argument("--now")
    weekly.add_argument("--print-week", action="store_true")
    weekly.add_argument("--out", default="public-data")
    weekly.add_argument("--store", default="store")
    weekly.set_defaults(fn=_weekly)

    sub.add_parser("validate", help="нийтлэгдсэн тайлангуудыг шалгана").set_defaults(fn=_validate)

    serve = sub.add_parser("serve", help="FastAPI сервер")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)
    serve.add_argument("--reload", action="store_true")
    serve.set_defaults(fn=_serve)

    sub.add_parser("feeds-probe", help="RSS нэр дэвшигчдийг шалгана").set_defaults(fn=_feeds_probe)
    fixtures = sub.add_parser("fixtures-capture", help="API-ийн бодит хариуг fixture болгон хадгална")
    fixtures.add_argument("--dir", default="backend/tests/fixtures")
    fixtures.set_defaults(fn=_fixtures_capture)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    # Windows-ийн консолд кирилл/✓ тэмдэгт
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8")
    config.load_env()
    args = build_parser().parse_args(argv)
    code: int = args.fn(args)
    return code
