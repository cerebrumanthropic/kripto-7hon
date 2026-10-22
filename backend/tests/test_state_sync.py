# Cloud Storage-д төлөв хадгалах (state_sync.py) — санах ойн хуурамч bucket-аар.
import asyncio
import json
from pathlib import Path
from urllib.parse import unquote

import httpx
import pytest
from fastapi.testclient import TestClient

from kripto_api import api
from kripto_api.config import ServerSettings
from kripto_api.gcs import GcsBucket
from kripto_api.jsnum import parse_iso
from kripto_api.live import LiveConfig, LiveResult
from kripto_api.state_sync import StateSync

NOW = parse_iso("2026-10-21T05:07:00Z")  # 2026-W43, өмнөх нь W42


class FakeGcs:
    def __init__(self, objects: dict[str, bytes] | None = None) -> None:
        self.objects = dict(objects or {})
        self.uploads: list[str] = []
        self.gets = 0

    def handler(self, req: httpx.Request) -> httpx.Response:
        assert req.headers["authorization"] == "Bearer test-token"
        path = req.url.path
        if req.method == "GET" and path.startswith("/storage/v1/b/bkt/o/"):
            self.gets += 1
            name = unquote(req.url.raw_path.decode().split("/o/", 1)[1].split("?", 1)[0])
            return httpx.Response(200, content=self.objects[name]) if name in self.objects else httpx.Response(404)
        if req.method == "POST" and path == "/upload/storage/v1/b/bkt/o":
            name = req.url.params["name"]
            self.objects[name] = req.content
            self.uploads.append(name)
            return httpx.Response(200, json={"name": name})
        return httpx.Response(400)

    def bucket(self) -> GcsBucket:
        return GcsBucket("bkt", transport=httpx.MockTransport(self.handler))


@pytest.fixture(autouse=True)
def token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GCS_ACCESS_TOKEN", "test-token")


def test_pull_push_only_needed_and_changed(tmp_path: Path) -> None:
    gcs = FakeGcs(
        {
            "public-data/live/market.json": b'{"m":1}',
            "public-data/news/2026-W43.json": b'{"w":43}',
            "public-data/news/2026-W30.json": b'{"w":30}',
            "store/history/daily.json": b'{"h":1}',
        }
    )
    data, store = tmp_path / "data", tmp_path / "store"
    sync = StateSync(gcs.bucket(), data, store, log=lambda _: None)

    assert asyncio.run(sync.pull(NOW)) is True
    assert (data / "live/market.json").read_bytes() == b'{"m":1}'
    assert (store / "history/daily.json").read_bytes() == b'{"h":1}'
    assert not (data / "news/2026-W30.json").exists()  # хуучин долоо хоногийг татахгүй
    assert gcs.gets == len(StateSync.needed(NOW)) == 9

    assert asyncio.run(sync.push()) == []  # өөрчлөлтгүй → байршуулахгүй

    (data / "live/market.json").write_bytes(b'{"m":2}')
    (data / "live/news.json").parent.mkdir(parents=True, exist_ok=True)
    (data / "live/news.json").write_bytes(b'{"n":1}')
    assert asyncio.run(sync.push()) == ["public-data/live/market.json", "public-data/live/news.json"]
    assert gcs.objects["public-data/live/market.json"] == b'{"m":2}'

    assert asyncio.run(sync.fetch("news/2026-W30.json")) is True
    assert (data / "news/2026-W30.json").read_bytes() == b'{"w":30}'
    assert asyncio.run(sync.fetch("news/2020-W01.json")) is False


def test_empty_bucket_reports_no_history(tmp_path: Path) -> None:
    sync = StateSync(FakeGcs().bucket(), tmp_path / "d", tmp_path / "s", log=lambda _: None)
    assert asyncio.run(sync.pull(NOW)) is False


def test_cloud_run_flow_seeds_once_then_persists(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    gcs = FakeGcs()
    monkeypatch.setattr(api, "GcsBucket", lambda name: gcs.bucket())
    seen: list[str] = []

    async def fake_run(cfg: LiveConfig) -> LiveResult:
        seen.append(cfg.data_base_url)
        for root, rel, body in [
            (cfg.out_dir, "live/market.json", {"run": len(seen)}),
            (cfg.store_dir, "history/daily.json", {"points": len(seen)}),
        ]:
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            (root / rel).write_text(json.dumps(body), encoding="utf-8")
        return LiveResult(0, {"updatedAt": "x"})

    monkeypatch.setattr(api, "run_live", fake_run)

    def settings(instance: str) -> ServerSettings:  # instance бүр шинэ (хоосон) түр диск
        return ServerSettings(
            data_dir=tmp_path / instance / "data",
            store_dir=tmp_path / instance / "store",
            scheduler=False,
            admin_token="secret",
            cors_origins=["*"],
            state_bucket="bkt",
            seed_base_url="https://pages.example/kripto",
        )

    auth = {"authorization": "Bearer secret"}
    with TestClient(api.create_app(settings("a"))) as c:
        assert c.get("/live/market.json").status_code == 404  # bucket хоосон
        assert c.post("/admin/refresh", headers=auth).status_code == 200
        assert c.get("/healthz").json()["stateBucket"] is True
    assert seen == ["https://pages.example/kripto"]  # анхны ажиллалт Pages-ээс түүхээ авна
    assert {"public-data/live/market.json", "store/history/daily.json"} <= set(gcs.objects)

    # Унтаад сэрсэн шинэ instance: bucket-аас уншиж шууд үйлчилнэ, дахин seed хийхгүй
    with TestClient(api.create_app(settings("b"))) as c:
        assert c.get("/live/market.json").json() == {"run": 1}
        assert c.post("/admin/refresh", headers=auth).status_code == 200
        assert c.get("/live/market.json").json() == {"run": 2}
    assert seen[1] == ""
    assert json.loads(gcs.objects["public-data/live/market.json"]) == {"run": 2}
