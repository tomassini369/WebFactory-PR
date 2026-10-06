from __future__ import annotations

import asyncio
import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any

import uvicorn
from graphify import serve as graphify_serve

WEBFACTORY_MCP_URL = os.environ.get("WEBFACTORY_MCP_URL", "https://webfactorypr.com/mcp").strip()
GRAPHIFY_GRAPH_PATH = os.environ.get("GRAPHIFY_GRAPH_PATH", "graphify-out/graph.json").strip()
PORT = int(os.environ.get("PORT", "10000"))


def _bounded_float_env(name: str, default: float, minimum: float, maximum: float) -> float:
    try:
        value = float(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(maximum, value))


AUTH_TIMEOUT_SECONDS = _bounded_float_env("GRAPHIFY_AUTH_TIMEOUT_SECONDS", 12.0, 3.0, 20.0)
AUTH_CACHE_TTL_SECONDS = _bounded_float_env("GRAPHIFY_AUTH_CACHE_TTL_SECONDS", 30.0, 0.0, 60.0)
AUTH_CACHE_MAX_ENTRIES = 256
_AUTH_CACHE: dict[str, float] = {}
_AUTH_CACHE_LOCK = asyncio.Lock()


def _connection_check_sync(authorization: str) -> tuple[bool, int]:
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": "wf_connection", "arguments": {}},
    }
    request = urllib.request.Request(
        WEBFACTORY_MCP_URL,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": authorization,
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "User-Agent": "webfactory-graphify-oauth-proxy/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=AUTH_TIMEOUT_SECONDS) as response:
            if response.status != 200:
                return False, response.status
            raw = response.read(65536)
    except urllib.error.HTTPError as exc:
        return False, exc.code
    except (urllib.error.URLError, TimeoutError, OSError):
        return False, 503

    try:
        envelope = json.loads(raw.decode("utf-8"))
        result = envelope.get("result") or {}
        if result.get("isError"):
            return False, 403
        for part in result.get("content") or []:
            if part.get("type") != "text":
                continue
            connection = json.loads(part.get("text") or "{}")
            scopes = connection.get("scopes") or []
            if connection.get("platform") is True and "webfactory.read" in scopes:
                return True, 200
    except (UnicodeDecodeError, json.JSONDecodeError, TypeError, AttributeError):
        return False, 502
    return False, 403


def _authorization_cache_key(authorization: str) -> str:
    return hashlib.sha256(authorization.encode("utf-8")).hexdigest()


async def _authorized_platform(authorization: str) -> tuple[bool, int]:
    """Validate platform OAuth while avoiding three remote checks per MCP handshake.

    Only successful checks are cached, and only as a SHA-256 digest of the bearer.
    The short TTL covers initialize -> initialized -> tools/call while keeping
    revocation bounded to at most AUTH_CACHE_TTL_SECONDS.
    """

    key = _authorization_cache_key(authorization)
    now = time.monotonic()

    async with _AUTH_CACHE_LOCK:
        expires_at = _AUTH_CACHE.get(key, 0.0)
        if expires_at > now:
            return True, 200
        _AUTH_CACHE.pop(key, None)

    allowed, status = await asyncio.to_thread(_connection_check_sync, authorization)
    if not allowed or AUTH_CACHE_TTL_SECONDS <= 0:
        return allowed, status

    expiry = time.monotonic() + AUTH_CACHE_TTL_SECONDS
    async with _AUTH_CACHE_LOCK:
        current = time.monotonic()
        for stale_key in [cache_key for cache_key, value in _AUTH_CACHE.items() if value <= current]:
            _AUTH_CACHE.pop(stale_key, None)
        _AUTH_CACHE[key] = expiry
        if len(_AUTH_CACHE) > AUTH_CACHE_MAX_ENTRIES:
            overflow = len(_AUTH_CACHE) - AUTH_CACHE_MAX_ENTRIES
            for cache_key, _ in sorted(_AUTH_CACHE.items(), key=lambda item: item[1])[:overflow]:
                _AUTH_CACHE.pop(cache_key, None)

    return True, 200


async def _send_json(send: Any, status: int, value: dict[str, Any]) -> None:
    body = json.dumps(value, separators=(",", ":")).encode("utf-8")
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", b"application/json"),
                (b"cache-control", b"no-store"),
                (b"content-length", str(len(body)).encode("ascii")),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})


class WebFactoryPlatformOAuth:
    """Protect Graphify with the existing WebFactory OAuth connection.

    Only a currently valid WebFactory platform-admin connection with
    webfactory.read may reach the code graph. Tenant/business OAuth grants are
    rejected. A successful platform authorization is cached briefly by bearer
    digest so the three-request MCP handshake does not repeat the same remote
    wf_connection check. The raw bearer is never retained by the cache.
    """

    def __init__(self, app: Any):
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if scope.get("type") == "lifespan":
            await self.app(scope, receive, send)
            return
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path") or ""
        if path == "/health":
            await _send_json(send, 200, {"ok": True, "service": "webfactory-graphify"})
            return
        if path != "/mcp":
            await self.app(scope, receive, send)
            return

        headers = {k.lower(): v for k, v in scope.get("headers") or []}
        raw_auth = headers.get(b"authorization", b"")
        try:
            authorization = raw_auth.decode("utf-8")
        except UnicodeDecodeError:
            authorization = ""

        if (
            not authorization.startswith("Bearer ")
            or len(authorization) < 16
            or len(authorization) > 4096
        ):
            await _send_json(send, 401, {"error": "unauthorized"})
            return

        allowed, status = await _authorized_platform(authorization)
        if not allowed:
            public_status = 503 if status >= 500 else 403
            await _send_json(
                send,
                public_status,
                {"error": "authorization_unavailable" if public_status == 503 else "forbidden"},
            )
            return

        # Graphify itself does not need to see or retain the delegated OAuth token.
        forwarded_scope = dict(scope)
        forwarded_scope["headers"] = [
            (key, value)
            for key, value in scope.get("headers") or []
            if key.lower() != b"authorization"
        ]
        await self.app(forwarded_scope, receive, send)


graphify_app = graphify_serve._build_http_app(
    GRAPHIFY_GRAPH_PATH,
    host="0.0.0.0",
    port=PORT,
    api_key=None,
    path="/mcp",
    json_response=True,
    stateless=True,
)
app = WebFactoryPlatformOAuth(graphify_app)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT, access_log=True)
