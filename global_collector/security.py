"""Transport safety only. No source rights, content or editorial judgments."""
from __future__ import annotations

from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, HTTPSHandler, Request, build_opener
import ipaddress
import socket
import ssl
import time

from .errors import FetchError

USER_AGENT = "LIVE-EARTH-Global-Collector/1.0 (+https://github.com/z8t8fp99p9-glitch/Live-Earth)"
DEFAULT_TIMEOUT_SECONDS = 20
DEFAULT_MAX_BYTES = 8 * 1024 * 1024
DEFAULT_RETRIES = 2


def _validate_public_https(url: str) -> str:
    try:
        parsed = urlsplit(str(url))
        host = (parsed.hostname or "").lower().rstrip(".")
        if parsed.scheme.lower() != "https" or not host:
            raise FetchError("Only absolute HTTPS source URLs are supported.")
        if parsed.username or parsed.password or parsed.port not in (None, 443):
            raise FetchError("Source URL contains credentials or a non-standard port.")
        try:
            ip = ipaddress.ip_address(host)
        except ValueError:
            ip = None
        if ip is not None:
            if not ip.is_global:
                raise FetchError("Source URL resolves to a non-public address.")
            return host
        answers = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        if not answers:
            raise FetchError("Source hostname returned no network addresses.")
        for answer in answers:
            address = ipaddress.ip_address(answer[4][0])
            if not address.is_global:
                raise FetchError("Source hostname resolves to a non-public network address.")
        return host
    except (ValueError, OSError) as exc:
        if isinstance(exc, FetchError):
            raise
        raise FetchError(f"Source URL could not be validated: {exc}") from exc


class _SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _validate_public_https(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


@dataclass(frozen=True)
class FetchResult:
    requested_url: str
    final_url: str
    status_code: int
    content_type: str
    payload: bytes
    headers: dict[str, str]
    attempts: int


def fetch(url: str, *, timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
          max_bytes: int = DEFAULT_MAX_BYTES, retries: int = DEFAULT_RETRIES) -> FetchResult:
    _validate_public_https(url)
    if not 3 <= int(timeout_seconds) <= 45:
        raise FetchError("Network timeout must be between 3 and 45 seconds.")
    if not 1024 <= int(max_bytes) <= 16 * 1024 * 1024:
        raise FetchError("Response limit must be between 1 KiB and 16 MiB.")
    if not 0 <= int(retries) <= 3:
        raise FetchError("Retry count must be between 0 and 3.")

    opener = build_opener(HTTPSHandler(context=ssl.create_default_context()), _SafeRedirect())
    last_error = None
    for attempt in range(1, int(retries) + 2):
        request = Request(url, headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/atom+xml, application/rss+xml, application/feed+json, application/json, text/html, application/xml, */*;q=0.7",
            "Accept-Encoding": "identity",
        }, method="GET")
        try:
            with opener.open(request, timeout=int(timeout_seconds)) as response:
                final_url = response.geturl()
                _validate_public_https(final_url)
                payload = response.read(int(max_bytes) + 1)
                if len(payload) > int(max_bytes):
                    raise FetchError("Source response exceeded the configured byte limit.")
                if not payload:
                    raise FetchError("Source returned an empty response.")
                headers = {str(k).lower(): str(v) for k, v in response.headers.items()}
                return FetchResult(
                    requested_url=url, final_url=final_url,
                    status_code=int(getattr(response, "status", 200)),
                    content_type=headers.get("content-type", ""),
                    payload=payload, headers=headers, attempts=attempt,
                )
        except HTTPError as exc:
            last_error = exc
            if exc.code not in (408, 425, 429, 500, 502, 503, 504):
                break
        except (URLError, TimeoutError, OSError, FetchError) as exc:
            last_error = exc
            if isinstance(exc, FetchError):
                break
        if attempt <= int(retries):
            time.sleep((1, 3, 6)[attempt - 1])
    detail = type(last_error).__name__ if last_error else "unknown error"
    raise FetchError(f"Could not retrieve source after bounded retries ({detail}).") from last_error
