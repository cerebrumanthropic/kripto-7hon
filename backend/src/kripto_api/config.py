# Орчны хувьсагч (SPEC §11). Нууц түлхүүр зөвхөн GitHub Secrets ба .env.local-д (CLAUDE.md дүрэм 2).
# Замууд нь ажиллуулж буй хавтас (repo-ийн үндэс)-аас харьцангуй — TS скриптүүдтэй ижил.
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def load_env() -> None:
    """Локалд .env.local; CI-д env/secrets давуу эрхтэй (дарж бичихгүй)."""
    load_dotenv(".env.local", override=False)


def _trim_slash(s: str) -> str:
    return s.rstrip("/")


def data_base_url() -> str:
    """Өмнөх төлөвийг уншин GitHub Pages-ийн үндэс (хоосон бол store/ ба локал гаралт)."""
    return _trim_slash(os.environ.get("DATA_BASE_URL") or os.environ.get("EXPO_PUBLIC_DATA_BASE_URL") or "")


def coingecko_key() -> str | None:
    return os.environ.get("COINGECKO_DEMO_API_KEY") or None


def _flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class ServerSettings:
    """FastAPI сервер (`kripto serve`)."""

    data_dir: Path
    store_dir: Path
    scheduler: bool
    admin_token: str | None
    cors_origins: list[str]
    # Cloud Run: төлвийг энэ bucket-д хадгална (хоосон бол зөвхөн локал диск) — PROGRESS D60
    state_bucket: str | None = None
    # Bucket хоосон (анхны ажиллалт) үед өмнөх төлвийг эндээс (GitHub Pages) нэг удаа уншина
    seed_base_url: str = ""

    @classmethod
    def from_env(cls) -> "ServerSettings":
        origins = os.environ.get("CORS_ORIGINS", "*")
        return cls(
            data_dir=Path(os.environ.get("DATA_DIR", "public-data")).resolve(),
            store_dir=Path(os.environ.get("STORE_DIR", "store")).resolve(),
            scheduler=_flag("ENABLE_SCHEDULER"),
            admin_token=os.environ.get("ADMIN_TOKEN") or None,
            cors_origins=[o.strip() for o in origins.split(",") if o.strip()],
            state_bucket=os.environ.get("STATE_BUCKET") or None,
            seed_base_url=_trim_slash(os.environ.get("SEED_BASE_URL", "")),
        )
