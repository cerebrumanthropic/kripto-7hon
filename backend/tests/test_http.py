import asyncio

import httpx
import pytest

from kripto_api.budget import BudgetExceededError, CallBudget
from kripto_api.http import HttpError, HttpOptions, error_message, get_json, user_agent


def fake(responses: list[httpx.Response | Exception]) -> tuple[HttpOptions, list[str], list[float]]:
    calls: list[str] = []
    waits: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        nxt = responses.pop(0)
        if isinstance(nxt, Exception):
            raise nxt
        return nxt

    async def sleep(s: float) -> None:
        waits.append(s)

    return HttpOptions(transport=httpx.MockTransport(handler), sleep=sleep, backoff_s=0.001), calls, waits


def run(coro):  # type: ignore[no-untyped-def]
    return asyncio.run(coro)


def test_success() -> None:
    opts, _, _ = fake([httpx.Response(200, json={"a": 1})])
    assert run(get_json("https://x.test/a", opts)) == {"a": 1}


def test_retries_5xx_and_network_errors_twice() -> None:
    opts, calls, _ = fake([httpx.Response(502), httpx.ConnectError("fetch failed"), httpx.Response(200, json={"a": 2})])
    assert run(get_json("https://x.test/a", opts)) == {"a": 2}
    assert len(calls) == 3


def test_gives_up_after_three_attempts() -> None:
    opts, calls, _ = fake([httpx.Response(500), httpx.Response(500), httpx.Response(503)])
    with pytest.raises(HttpError, match="HTTP 503"):
        run(get_json("https://x.test/a", opts))
    assert len(calls) == 3


def test_no_retry_on_4xx() -> None:
    opts, calls, _ = fake([httpx.Response(403)])
    with pytest.raises(HttpError):
        run(get_json("https://x.test/a", opts))
    assert len(calls) == 1


def test_429_waits_60s_once() -> None:
    opts, calls, waits = fake([httpx.Response(429), httpx.Response(200, json={"a": 3})])
    assert run(get_json("https://x.test/a", opts)) == {"a": 3}
    assert waits == [60]
    assert len(calls) == 2


def test_second_429_fails_like_4xx() -> None:
    opts, calls, _ = fake([httpx.Response(429), httpx.Response(429)])
    with pytest.raises(HttpError, match="HTTP 429"):
        run(get_json("https://x.test/a", opts))
    assert len(calls) == 2


def test_user_agent_and_error_message() -> None:
    assert user_agent({"SITE_URL": "https://s.app", "CONTACT_EMAIL": "a@b.c"}) == "kripto-7hon-bot/1.0 (+https://s.app; a@b.c)"
    assert user_agent({}) == "kripto-7hon-bot/1.0 (+https://vaspfrcweekly.expo.app)"
    assert error_message(HttpError("https://api.x.test/p?key=secret", 404)) == "HTTP 404 api.x.test/p"
    assert error_message(httpx.ReadTimeout("x")) == "timeout"


def test_budget() -> None:
    logs: list[str] = []
    b = CallBudget("coingecko", 2, logs.append)
    b.use("global")
    b.use("markets")
    with pytest.raises(BudgetExceededError):
        b.use("trending")
    assert b.used == 2
    assert logs == ["[budget] coingecko 1/2: global", "[budget] coingecko 2/2: markets"]
