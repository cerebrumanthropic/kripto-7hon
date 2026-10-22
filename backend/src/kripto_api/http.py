# HTTP клиент (SPEC §7.2.2): timeout 15 сек, сүлжээ/5xx алдаанд 2 удаа давтан оролдох
# (exponential backoff), 429 бол 60 сек хүлээгээд 1 удаа. Бусад 4xx-д давтахгүй.
import asyncio
import os
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass, field, replace
from typing import Any
from urllib.parse import urlsplit

import httpx

ACCEPT_JSON = "application/json"
ACCEPT_FEED = "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8"


class HttpError(Exception):
    def __init__(self, url: str, status: int) -> None:
        u = urlsplit(url)
        super().__init__(f"HTTP {status} {u.netloc}{u.path}")
        self.url = url
        self.status = status


@dataclass(frozen=True)
class HttpOptions:
    headers: Mapping[str, str] = field(default_factory=dict)
    timeout_s: float = 15
    retries: int = 2
    backoff_s: float = 1
    rate_limit_wait_s: float = 60
    transport: httpx.AsyncBaseTransport | None = None  # тестэд httpx.MockTransport
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep

    def with_(self, **changes: Any) -> "HttpOptions":
        return replace(self, **changes)


def user_agent(env: Mapping[str, str] = os.environ) -> str:
    """`kripto-7hon-bot/1.0 (+SITE_URL; CONTACT_EMAIL)` — CONTACT_EMAIL байхгүй бол зөвхөн URL."""
    site = env.get("SITE_URL") or env.get("EXPO_PUBLIC_SITE_URL") or "https://vaspfrcweekly.expo.app"
    contact = f"; {env['CONTACT_EMAIL']}" if env.get("CONTACT_EMAIL") else ""
    return f"kripto-7hon-bot/1.0 (+{site}{contact})"


async def _request(url: str, opts: HttpOptions, accept: str) -> httpx.Response:
    headers = {"user-agent": user_agent(), "accept": accept, **opts.headers}
    rate_limited = False
    last_error: Exception | None = None
    attempt = 0
    async with httpx.AsyncClient(transport=opts.transport, timeout=opts.timeout_s, follow_redirects=True) as client:
        while attempt <= opts.retries:
            try:
                res = await client.get(url, headers=headers)
                if res.is_success:
                    return res
                if res.status_code == 429 and not rate_limited:
                    # 429-ийн хүлээлт давтан оролдлогын тоонд орохгүй, гэхдээ ганц удаа
                    rate_limited = True
                    await opts.sleep(opts.rate_limit_wait_s)
                    continue
                err = HttpError(url, res.status_code)
                if res.status_code < 500:
                    raise err  # 4xx — давтахгүй
                last_error = err
            except httpx.TransportError as e:
                last_error = e
            if attempt < opts.retries:
                await opts.sleep(opts.backoff_s * 2**attempt)
            attempt += 1
    raise last_error or RuntimeError(f"request failed: {url}")


async def get_json(url: str, opts: HttpOptions | None = None) -> Any:
    res = await _request(url, opts or HttpOptions(), ACCEPT_JSON)
    return res.json()


async def get_bytes(url: str, opts: HttpOptions | None = None) -> bytes:
    """Feed-д: XML задлагч нь баримтын encoding зарлалыг өөрөө уншина."""
    res = await _request(url, opts or HttpOptions(), ACCEPT_FEED)
    return res.content


def error_message(e: BaseException) -> str:
    """Алдааны мессежийг лог/status-д ойлгомжтой, нууцгүй болгоно (URL-ийн query хасна)."""
    if isinstance(e, HttpError):
        return str(e)
    if isinstance(e, httpx.TimeoutException):
        return "timeout"
    if isinstance(e, httpx.TransportError):
        return f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
    return str(e) or type(e).__name__
