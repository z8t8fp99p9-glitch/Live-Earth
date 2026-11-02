"""Normalize collected entries without editing, approving or persisting story content."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit, urlunsplit
import hashlib
import re
from typing import Any

from .errors import GlobalCollectorError


TRACKING_PARAMETERS = {
    "fbclid", "gclid", "mc_cid", "mc_eid"
}


def canonical_url(value: str) -> str:
    try:
        p = urlsplit(str(value).strip())
        if p.scheme.lower() != "https" or not p.hostname or p.username or p.password:
            raise ValueError("not a safe HTTPS article URL")
        host = p.hostname.lower().rstrip(".")
        port = f":{p.port}" if p.port and p.port != 443 else ""
        path = p.path or "/"
        query_parts = []
        for part in p.query.split("&") if p.query else []:
            key = part.split("=", 1)[0].lower()
            if key.startswith("utm_") or key in TRACKING_PARAMETERS:
                continue
            query_parts.append(part)
        query = "&".join(query_parts)
        return urlunsplit(("https", host + port, path, query, ""))
    except (TypeError, ValueError) as exc:
        raise GlobalCollectorError(f"Story URL failed canonical validation: {exc}") from exc


def stable_story_id(view_id: str, source_id: str, canonical: str) -> str:
    material = f"{view_id}|{source_id}|{canonical}"
    return hashlib.sha256(material.encode("utf-8")).hexdigest()[:32]


def normalize_entry(
    entry: dict[str, Any],
    *,
    view_id: str,
    source: dict[str, Any],
    policy: dict[str, Any],
    feed_url: str,
    job_id: str,
    collected_at: str,
    request_window_hours: int,
) -> dict[str, Any] | None:
    canonical = canonical_url(entry["url"])
    allowed_article_domains = policy.get("articleDomains", [])
    from .security import _host, host_matches
    if not host_matches(_host(canonical), allowed_article_domains):
        return None

    published_at = entry.get("publishedAt")
    if published_at:
        try:
            parsed = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            cutoff = datetime.now(timezone.utc) - timedelta(hours=int(request_window_hours))
            if parsed.astimezone(timezone.utc) < cutoff:
                return None
        except ValueError:
            published_at = None

    source_id = source["sourceId"]
    story_id = stable_story_id(view_id, source_id, canonical)
    candidates = []
    for item in entry.get("mediaCandidates", []):
        try:
            candidate_url = canonical_url(item.get("url", ""))
        except GlobalCollectorError:
            continue
        candidates.append({
            "candidateId": hashlib.sha256(
                f"{story_id}|{candidate_url}".encode("utf-8")
            ).hexdigest()[:24],
            "url": candidate_url,
            "caption": item.get("caption", ""),
            "credit": item.get("credit", ""),
            "rightsNotice": item.get("rightsNotice", ""),
            "mediaType": item.get("mediaType", ""),
            "discoveredFrom": item.get("discoveredFrom", "feed-media-metadata"),
            "approvalStatus": "PENDING_GLOBAL_CHECKER",
        })

    # This object is deliberately shaped for Global Checker.evaluate_text().
    # The summary is a transient candidate. It is NOT permission to store or publish.
    return {
        "id": story_id,
        "story_id": story_id,
        "viewId": view_id,
        "sourceId": source_id,
        "sourceName": source["sourceName"],
        "sourceUrl": feed_url,
        "sourceWebsiteUrl": source.get("websiteUrl", ""),
        "sourcePolicyRef": source.get("checkerPolicyRef", ""),
        "policyVersion": policy.get("policyVersion", ""),
        "feedEntryId": entry.get("feedEntryId", ""),
        "url": canonical,
        "title": entry.get("title", ""),
        "summary": entry.get("summary", ""),
        "author": entry.get("author", ""),
        "publishedAt": published_at,
        "retrievedAt": collected_at,
        "collectedAt": collected_at,
        "jobId": job_id,
        "mediaCandidates": candidates,
        "checkerStatus": "PENDING",
        "persistenceStatus": "NOT_PERSISTED",
        "editorialStatus": "NOT_STARTED",
    }
