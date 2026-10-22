# Cloud Run-ийн диск түр зуурын (instance унтахад устна) тул төлвийг Cloud Storage bucket-д хадгална (PROGRESS D66).
# Bucket дахь зам = локал зам: `public-data/<rel>` ↔ DATA_DIR/<rel>, `store/<rel>` ↔ STORE_DIR/<rel>.
#   pull — cold start бүрд live ажиллалтад хэрэгтэй ≤9 файлыг л татна (жагсаалт хийхгүй, Class B үйлдэл цөөн).
#   push — ажиллалтын дараа агуулга нь өөрчлөгдсөн файлыг л байршуулна (цагт ≈5 Class A, үнэгүй түвшинд багтана).
#   fetch — хуучин долоо хоногийн архивыг хүсэлт ирэхэд bucket-аас татна.
import hashlib
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from kripto_api.gcs import GcsBucket
from kripto_api.state import state_weeks

DATA_PREFIX = "public-data"
STORE_PREFIX = "store"


def _digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class StateSync:
    def __init__(self, bucket: GcsBucket, data_dir: Path, store_dir: Path, log: Callable[[str], None] = print) -> None:
        self.bucket = bucket
        self.roots = {DATA_PREFIX: data_dir, STORE_PREFIX: store_dir}
        self.log = log
        self.pulled = False
        self._known: dict[str, str] = {}  # bucket дахь объект → sha256 (дахин байршуулахгүйн тулд)

    def _local(self, name: str) -> Path:
        prefix, rel = name.split("/", 1)
        return self.roots[prefix] / rel

    @staticmethod
    def needed(now: datetime) -> list[str]:
        weeks = [f"news/{w}.json" for w in state_weeks(now)]
        return [
            *(
                f"{DATA_PREFIX}/{rel}"
                for rel in ["live/market.json", "live/news.json", "live/status.json", "history/daily.json", *weeks]
            ),
            *(f"{STORE_PREFIX}/{rel}" for rel in ["history/daily.json", *weeks]),
        ]

    async def _download(self, name: str) -> bool:
        data = await self.bucket.get(name)
        if data is None:
            return False
        file = self._local(name)
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)
        self._known[name] = _digest(data)
        return True

    async def pull(self, now: datetime) -> bool:
        """Төлвийг татна. Өдрийн түүх bucket-д байгаа эсэхийг буцаана (байхгүй бол анхны ажиллалт)."""
        found = [name for name in self.needed(now) if await self._download(name)]
        self.pulled = True
        self.log(f"[gcs] pull {len(found)} файл: {', '.join(found) or '—'}")
        return f"{STORE_PREFIX}/history/daily.json" in found

    async def push(self) -> list[str]:
        uploaded: list[str] = []
        for prefix, root in self.roots.items():
            if not root.is_dir():
                continue
            for file in sorted(root.rglob("*.json")):
                name = f"{prefix}/{file.relative_to(root).as_posix()}"
                data = file.read_bytes()
                digest = _digest(data)
                if self._known.get(name) == digest:
                    continue
                await self.bucket.put(name, data)
                self._known[name] = digest
                uploaded.append(name)
        self.log(f"[gcs] push {len(uploaded)} файл")
        return uploaded

    async def fetch(self, rel: str) -> bool:
        """DATA_DIR/<rel> локалд байхгүй үед bucket-аас татна."""
        return await self._download(f"{DATA_PREFIX}/{rel}")
