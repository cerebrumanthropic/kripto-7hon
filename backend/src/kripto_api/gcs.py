# Google Cloud Storage-ийн JSON API (httpx-ээр, google-cloud SDK-гүй — image ба cold start жижиг).
# Cloud Run дээр токеныг metadata серверээс авна; локал туршилтад GCS_ACCESS_TOKEN (жишээ нь
# `gcloud auth print-access-token`). Тестэд `transport`-оор httpx.MockTransport өгнө.
import os
import time
from dataclasses import dataclass, field
from urllib.parse import quote

import httpx

API = "https://storage.googleapis.com"
METADATA_TOKEN = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"


@dataclass
class GcsBucket:
    name: str
    transport: httpx.AsyncBaseTransport | None = None
    timeout_s: float = 20
    _token: str | None = field(default=None, repr=False)
    _token_expiry: float = 0

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=self.transport, timeout=self.timeout_s)

    async def _auth(self, client: httpx.AsyncClient) -> dict[str, str]:
        if static := os.environ.get("GCS_ACCESS_TOKEN"):
            return {"authorization": f"Bearer {static}"}
        if not self._token or time.monotonic() > self._token_expiry:
            r = await client.get(METADATA_TOKEN, headers={"metadata-flavor": "Google"})
            r.raise_for_status()
            body = r.json()
            self._token = str(body["access_token"])
            self._token_expiry = time.monotonic() + float(body.get("expires_in", 300)) - 60
        return {"authorization": f"Bearer {self._token}"}

    async def get(self, name: str) -> bytes | None:
        """Объектын агуулга; байхгүй бол None."""
        async with self._client() as c:
            r = await c.get(
                f"{API}/storage/v1/b/{self.name}/o/{quote(name, safe='')}", params={"alt": "media"}, headers=await self._auth(c)
            )
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.content

    async def put(self, name: str, data: bytes, content_type: str = "application/json") -> None:
        async with self._client() as c:
            r = await c.post(
                f"{API}/upload/storage/v1/b/{self.name}/o",
                params={"uploadType": "media", "name": name},
                content=data,
                headers={**await self._auth(c), "content-type": content_type},
            )
            r.raise_for_status()
