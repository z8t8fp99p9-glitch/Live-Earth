"""Strict URL and bounded HTTP helpers for the Global Collector."""
from __future__ import annotations

from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import (
    HTTPRedirectHandler,
    HTTPSHandler,
    Request,
    build_opener,
)
import ipaddress
import socket
import ssl
import time
from typing import Iterable

from .errors import FeedFetchError, GlobalCollectorError

DEFAULT_TIMEOUT_SECONDS = 18
DEFAULT_MAX_FEED_BYTES = 4 * 1024 * 1024
DEFAULT_RETRIES = 2
USER_AGENT = "LIVE-EARTH-Global-Collector/0.1 (+https://github.com/z8t8fp99p9-glitch/Live-Earth)"


def _host(url: str) -> str:
    try:
        parsed = urlsplit(str(url))
        host = (parsed.hostname or "").lower().rstrip(".")
        if parsed.scheme.lower() != "https" or not host:
            raise GlobalCollectorError("Only absolute HTTPS URLs are accepted.")
        if parsed.username or parsed.password:
            raise GlobalCollectorError("URLs containing user credentials are rejected.")
        if parsed.port not in (None, 443):
            raise GlobalCollectorError("Non-standard HTTPS ports are rejected.")
        try:
            ipaddress.ip_address(host)
        except ValueError:
            pass
        else:
            raise GlobalCollectorError("Literal IP-address URLs are rejected.")
        return host
    except ValueError as exc:
        raise GlobalCollectorError(f"Invalid source URL: {exc}") from exc


def host_matches(host: str, domains: Iterable[str]) -> bool:
    host = str(host or "").lower().rstrip(".")
    return any(
        host == str(domain).lower().rstrip(".")
        or host.endswith("." + str(domain).lower().rstrip("."))
        for domain in domains
    )


def validate_https_url(url: str, allowed_domains: Iterable[str]) -> str:
    host = _host(url)
    if not host_matches(host, allowed_domains):
        raise GlobalCollectorError(
            f"Host '{host}' is not within the source's approved host boundary."
        )
    return host


class _ApprovedRedirectHandler(HTTPRedirectHandler):
    def __init__(self, allowed_domains: tuple[str, ...]):
        super().__init__()
        self.allowed_domains = allowed_domains

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        try:
            validate_https_url(newurl, self.allowed_domains)
        except GlobalCollectorError as exc:
            raise FeedFetchError(
                "Source redirect attempted to leave the approved HTTPS host family."
            ) from exc
        return super().redirect_request(req, fp, code, msg, headers, newurl)


@dataclass(frozen=True)
class FetchResult:
    requested_url: str
    final_url: str
    content_type: str
    payload: bytes
    attempts: int


def _public_dns_only(host: str) -> None:
    """Reject a registered hostname if it resolves to a non-public address."""
    try:
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except OSError as exc:
        raise FeedFetchError(f"DNS lookup failed for approved source host '{host}'.") from exc

    if not addresses:
        raise FeedFetchError(f"DNS returned no addresses for '{host}'.")

    for address in addresses:
        ip_text = address[4][0]
        ip = ipaddress.ip_address(ip_text)
        if (
            ip.is_private or ip.is_loopback or ip.is_link_local
            or ip.is_reserved or ip.is_multicast or ip.is_unspecified
        ):
            raise FeedFetchError(
                f"Source host '{host}' resolved to a non-public network address."
            )


def fetch_bounded(
    url: str,
    *,
    allowed_domains: Iterable[str],
    max_bytes: int = DEFAULT_MAX_FEED_BYTES,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    retries: int = DEFAULT_RETRIES,
) -> FetchResult:
    domains = tuple(sorted({str(x).lower().rstrip(".") for x in allowed_domains if x}))
    host = validate_https_url(url, domains)
    if not (1024 <= int(max_bytes) <= 12 * 1024 * 1024):
        raise FeedFetchError("Configured feed byte limit is outside the safe 1 KiB–12 MiB range.")
    if not (3 <= int(timeout_seconds) <= 45):
        raise FeedFetchError("Configured network timeout is outside the safe 3–45 second range.")
    if not (0 <= int(retries) <= 3):
        raise FeedFetchError("Configured retry count is outside the safe 0–3 range.")

    _public_dns_only(host)
    context = ssl.create_default_context()
    opener = build_opener(
        HTTPSHandler(context=context),
        _ApprovedRedirectHandler(domains),
    )
    last_error = None

    for attempt in range(1, int(retries) + 2):
        request = Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": (
                    "application/atom+xml, application/rss+xml, application/xml, "
                    "text/xml, application/rdf+xml;q=0.9, */*;q=0.5"
                ),
                "Accept-Encoding": "identity",
            },
            method="GET",
        )
        try:
            with opener.open(request, timeout=int(timeout_seconds)) as response:
                final_url = response.geturl()
                validate_https_url(final_url, domains)
                payload = response.read(int(max_bytes) + 1)
                if len(payload) > int(max_bytes):
                    raise FeedFetchError("Feed response exceeded its configured byte limit.")
                if not payload:
                    raise FeedFetchError("Feed response was empty.")
                content_type = response.headers.get("Content-Type", "")
                return FetchResult(
                    requested_url=url,
                    final_url=final_url,
                    content_type=content_type,
                    payload=payload,
                    attempts=attempt,
                )
        except HTTPError as exc:
            last_error = exc
            if exc.code not in (408, 425, 429, 500, 502, 503, 504):
                break
        except (URLError, TimeoutError, OSError, FeedFetchError) as exc:
            last_error = exc
            if isinstance(exc, FeedFetchError):
                break
        if attempt <= int(retries):
            time.sleep((1, 3, 6)[attempt - 1])

    detail = type(last_error).__name__ if last_error else "unknown error"
    raise FeedFetchError(
        f"Approved feed could not be fetched after bounded retries ({detail})."
    ) from last_error
