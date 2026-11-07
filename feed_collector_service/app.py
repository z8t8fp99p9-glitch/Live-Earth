"""Small WSGI adapter for the read-only Feed Collector inspection service."""
from __future__ import annotations

from collections import defaultdict, deque
from http import HTTPStatus
from typing import Any
import json
import os
import time

from global_collector.errors import FetchError, ParseError
from .service import discover_site, inspect_article, inspect_feed

MAX_REQUEST_BYTES = 12 * 1024
RATE_LIMIT_REQUESTS = 30
RATE_LIMIT_WINDOW_SECONDS = 60
_REQUESTS: dict[str, deque[float]] = defaultdict(deque)
_LOCK = __import__("threading").Lock()


def _allowed_origins() -> set[str] | None:
    configured = os.environ.get("FEED_COLLECTOR_ALLOWED_ORIGINS", "").strip()
    if configured == "*":
        return None
    return {value.strip() for value in configured.split(",") if value.strip()}


def _response(start_response, status: int, payload: dict[str, Any], origin: str = ""):
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    headers = [
        ("Content-Type", "application/json; charset=utf-8"),
        ("Content-Length", str(len(body))),
        ("Cache-Control", "no-store"),
        ("X-Content-Type-Options", "nosniff"),
        ("Referrer-Policy", "no-referrer"),
    ]
    if origin:
        headers.extend([
            ("Access-Control-Allow-Origin", origin),
            ("Vary", "Origin"),
        ])
    start_response(f"{status} {HTTPStatus(status).phrase}", headers)
    return [body]


def _rate_limited(client: str) -> bool:
    now = time.monotonic()
    with _LOCK:
        recent = _REQUESTS[client]
        while recent and now - recent[0] > RATE_LIMIT_WINDOW_SECONDS:
            recent.popleft()
        if len(recent) >= RATE_LIMIT_REQUESTS:
            return True
        recent.append(now)
        return False


def application(environ, start_response):
    """WSGI entry point. Deploy behind HTTPS; no data is persisted."""
    method = str(environ.get("REQUEST_METHOD", "GET")).upper()
    path = str(environ.get("PATH_INFO", "")).rstrip("/") or "/"
    origin = str(environ.get("HTTP_ORIGIN", "")).strip()
    allowed = _allowed_origins()
    if origin and allowed is not None and origin not in allowed:
        return _response(start_response, 403, {"error": "This app origin is not allowed to use Feed Collector."})
    cors_origin = origin if origin else ""
    if method == "OPTIONS":
        headers = [("Content-Length", "0"), ("Access-Control-Allow-Methods", "POST, OPTIONS"),
                   ("Access-Control-Allow-Headers", "Content-Type"), ("Access-Control-Max-Age", "600"),
                   ("Vary", "Origin")]
        if cors_origin:
            headers.append(("Access-Control-Allow-Origin", cors_origin))
        start_response("204 No Content", headers)
        return [b""]
    if path == "/health" and method == "GET":
        return _response(start_response, 200, {"status": "ok", "service": "LIVE // EARTH Feed Collector", "readOnly": True}, cors_origin)
    routes = {
        "/api/feed-collector/discover": discover_site,
        "/api/feed-collector/inspect-feed": inspect_feed,
        "/api/feed-collector/inspect-article": inspect_article,
    }
    handler = routes.get(path)
    if method != "POST" or handler is None:
        return _response(start_response, 404 if handler is None else 405,
                         {"error": "Unknown Feed Collector endpoint." if handler is None else "Use POST for this endpoint."}, cors_origin)
    client = str(environ.get("REMOTE_ADDR", "unknown"))[:80]
    if _rate_limited(client):
        return _response(start_response, 429, {"error": "Too many inspections in a short period. Please try again shortly."}, cors_origin)
    try:
        length = int(environ.get("CONTENT_LENGTH") or 0)
    except (TypeError, ValueError):
        length = MAX_REQUEST_BYTES + 1
    if length <= 0 or length > MAX_REQUEST_BYTES:
        return _response(start_response, 413, {"error": "Request must contain a small JSON body (maximum 12 KB)."}, cors_origin)
    try:
        raw = environ["wsgi.input"].read(length)
        payload = json.loads(raw.decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("Request body must be a JSON object.")
        result = handler(payload)
        return _response(start_response, 200, result, cors_origin)
    except (ValueError, TypeError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        return _response(start_response, 400, {"error": str(exc)[:300]}, cors_origin)
    except (FetchError, ParseError) as exc:
        return _response(start_response, 422, {"error": str(exc)[:400]}, cors_origin)
    except Exception:
        # Avoid returning internal traces or local filesystem details to clients.
        return _response(start_response, 500, {"error": "Feed Collector could not complete this inspection."}, cors_origin)
