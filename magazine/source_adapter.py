#!/usr/bin/env python3
"""Read-only multi-view source adapter for the LIVE // EARTH Magazine view.

This foundation deliberately stops before publication. It reads only the two
approved source databases, validates each view's image-rights contract, and
builds a short-lived in-memory SQLite connection using the shared Engine's
single-view input schema. It never fetches the web or writes to source DBs.
"""
from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PROFILE_PATH = Path(__file__).with_name("profile.json")
MAGAZINE_VIEW_ID = "magazine"
MAGAZINE_PUBLISHER_ID = "magazine-publisher"
MAGAZINE_IMAGE_STATUS = "magazine-source-rights-verified"

# Intentionally closed for the first release. A future source needs a specific
# schema adapter and rights verifier before it can be registered here.
SOURCE_REGISTRY: dict[str, dict[str, str]] = {
    "alien-world": {
        "publisher_id": "alien-world-publisher",
        "database_path": ".publisher-data/alien-world/alien-world.sqlite3",
        "image_policy": "alien-world-screened-image",
        "display_name": "Alien World",
    },
    "nature": {
        "publisher_id": "nature-publisher",
        "database_path": ".publisher-data/nature/nature.sqlite3",
        "image_policy": "nature-commons-filepage-verified",
        "display_name": "Nature",
    },
}

ALIEN_IMAGE_STATUS = "nasa-guideline-reviewed-exclusion-screened"
NATURE_IMAGE_STATUS = "nature-commons-filepage-verified"
NATURE_ALLOWED_LICENSES = ("public domain", "cc0", "cc by", "cc by-sa")
ENGINE_STORY_COLUMNS = (
    "story_id", "title", "url", "summary", "source_name", "source_url",
    "published_at", "retrieved_at", "image_url", "image_local_path",
    "image_caption", "image_credit", "image_source_url",
    "image_rights_status", "image_rights_note", "view_id",
)


class MagazineAdapterError(RuntimeError):
    """Raised when a source is missing, malformed, or fails its rights contract."""


@dataclass
class MagazineSourceBundle:
    """Short-lived Engine input. Caller owns and must close ``connection``."""

    connection: sqlite3.Connection
    profile: dict[str, Any]
    coverage_start: datetime
    coverage_end: datetime
    selected_counts: dict[str, int]
    verified_image_count: int
    image_status: str = MAGAZINE_IMAGE_STATUS

    def close(self) -> None:
        self.connection.close()


def _utc(value: datetime | None) -> datetime:
    value = value or datetime.now(timezone.utc)
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def previous_completed_month(now: datetime | None = None) -> tuple[datetime, datetime]:
    """Return the previous complete UTC calendar month as [start, end)."""
    end = _utc(now).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start = (end - timedelta(days=1)).replace(day=1)
    return start, end


def _parse_timestamp(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str) and value.strip():
        try:
            parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
            return _utc(parsed).timestamp()
        except (ValueError, OverflowError):
            return None
    return None


def _safe_https_url(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        parsed = urlsplit(value.strip())
        return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password
    except ValueError:
        return False


def _local_file(value: Any, root: Path) -> Path | None:
    if not isinstance(value, str) or not value.strip():
        return None
    candidate = Path(value.strip())
    if not candidate.is_absolute():
        candidate = root / candidate
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(root.resolve())
    except (OSError, ValueError):
        return None
    return resolved if resolved.is_file() else None


def load_profile(path: Path = PROFILE_PATH) -> dict[str, Any]:
    try:
        profile = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise MagazineAdapterError(f"Magazine profile could not be read: {exc}") from exc
    validate_profile(profile)
    return profile


def validate_profile(profile: dict[str, Any]) -> None:
    if profile.get("schemaVersion") != 1:
        raise MagazineAdapterError("Unsupported Magazine profile schema.")
    if profile.get("viewId") != MAGAZINE_VIEW_ID or profile.get("publisherId") != MAGAZINE_PUBLISHER_ID:
        raise MagazineAdapterError("Magazine Publisher identity check failed.")
    enabled = profile.get("enabledSources")
    if not isinstance(enabled, list) or len(enabled) != len(set(enabled)):
        raise MagazineAdapterError("Magazine enabledSources must be a unique list.")
    if set(enabled) != {"alien-world", "nature"}:
        raise MagazineAdapterError("The initial Magazine allowlist must contain only Alien World and Nature.")
    registry = profile.get("sourceRegistry")
    if not isinstance(registry, dict) or set(registry) != set(SOURCE_REGISTRY):
        raise MagazineAdapterError("Magazine source registry differs from the approved initial source registry.")
    for source_id, expected in SOURCE_REGISTRY.items():
        configured = registry.get(source_id, {})
        for field, value in (
            ("publisherId", expected["publisher_id"]),
            ("databasePath", expected["database_path"]),
        ):
            if configured.get(field) != value:
                raise MagazineAdapterError(f"Magazine {source_id} {field} does not match its approved source contract.")
        if configured.get("imageRightsPolicy") != expected["image_policy"]:
            raise MagazineAdapterError(f"Magazine {source_id} image-rights policy mismatch.")
    publication = profile.get("publication", {})
    if publication.get("windowMode") != "calendar-month":
        raise MagazineAdapterError("Magazine publication window must be a completed calendar month.")
    minimum = int(publication.get("minimumStories", 5))
    maximum = int(publication.get("maximumStories", 8))
    if not 2 <= minimum <= maximum <= 12:
        raise MagazineAdapterError("Magazine story limits are outside the safe range.")
    if int(publication.get("maximumRetainedIssues", 3)) != 3:
        raise MagazineAdapterError("Magazine retention is fixed at the latest three editions.")
    output = profile.get("output", {})
    if output.get("publisherNetworkAccess") is not False or output.get("sourceDatabaseWriteAccess") is not False:
        raise MagazineAdapterError("Magazine Publisher network and source-database write access must remain disabled.")


def open_source_database(source_id: str, path: Path | None = None, root: Path = ROOT) -> sqlite3.Connection:
    if source_id not in SOURCE_REGISTRY:
        raise MagazineAdapterError(f"Unregistered Magazine source: {source_id}")
    actual_path = path or (root / SOURCE_REGISTRY[source_id]["database_path"])
    if not actual_path.is_file():
        raise MagazineAdapterError(f"The {source_id} Collector database is missing: {actual_path}")
    uri = "file:" + quote(actual_path.resolve().as_posix(), safe="/:") + "?mode=ro"
    try:
        connection = sqlite3.connect(uri, uri=True)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA query_only=ON")
        if int(connection.execute("PRAGMA query_only").fetchone()[0]) != 1:
            raise MagazineAdapterError(f"The {source_id} database did not enter read-only mode.")
        return connection
    except sqlite3.Error as exc:
        raise MagazineAdapterError(f"Could not open {source_id} database read-only: {exc}") from exc


def _metadata(connection: sqlite3.Connection, source_id: str) -> dict[str, str]:
    try:
        rows = connection.execute("SELECT key, value FROM publisher_meta").fetchall()
    except sqlite3.Error as exc:
        raise MagazineAdapterError(f"{source_id} publisher_meta table is missing or invalid.") from exc
    meta = {str(row["key"]): str(row["value"]) for row in rows}
    expected = SOURCE_REGISTRY[source_id]
    if meta.get("view_id") != source_id:
        raise MagazineAdapterError(f"Refusing a database whose view_id is not {source_id}.")
    if meta.get("publisher_id") and meta["publisher_id"] != expected["publisher_id"]:
        raise MagazineAdapterError(f"Refusing a database with an unregistered {source_id} publisher_id.")
    return meta


def _nature_rights(connection: sqlite3.Connection, source_id: str) -> dict[str, sqlite3.Row]:
    try:
        rows = connection.execute(
            """SELECT story_id,file_title,source_page,creator,credit,license_name,
                      license_url,caption,usage_note,modification_note,local_path,
                      public_path,image_url,rights_status
               FROM nature_image_rights"""
        ).fetchall()
    except sqlite3.Error as exc:
        raise MagazineAdapterError("Nature image-rights register is missing or invalid.") from exc
    return {str(row["story_id"]): row for row in rows}


def _nature_license_allowed(name: Any, url: Any) -> bool:
    label = str(name or "").strip().lower()
    if not label or not _safe_https_url(url):
        return False
    parsed = urlsplit(str(url).strip())
    if parsed.hostname != "creativecommons.org":
        return False
    if label == "public domain":
        return parsed.path.startswith("/publicdomain/mark/")
    if label == "cc0" or label.startswith("cc0 "):
        return parsed.path.startswith("/publicdomain/zero/")
    # Accept CC BY and CC BY-SA only. NC and ND variants fail closed.
    if label.startswith("cc by-sa "):
        return parsed.path.startswith("/licenses/by-sa/")
    if label.startswith("cc by "):
        return parsed.path.startswith("/licenses/by/")
    return False


def _verified_alien_image(row: sqlite3.Row, root: Path) -> dict[str, Any] | None:
    if row["image_rights_status"] != ALIEN_IMAGE_STATUS:
        return None
    local_path = _local_file(row["image_local_path"], root)
    if (
        local_path is None
        or not _safe_https_url(row["image_url"])
        or not _safe_https_url(row["image_source_url"])
        or not str(row["image_credit"] or "").strip()
        or not str(row["image_rights_note"] or "").strip()
    ):
        return None
    return {
        "image_url": str(row["image_url"]),
        "image_local_path": str(local_path),
        "image_caption": str(row["image_caption"] or ""),
        "image_credit": str(row["image_credit"]),
        "image_source_url": str(row["image_source_url"]),
        "image_rights_status": MAGAZINE_IMAGE_STATUS,
        "image_rights_note": str(row["image_rights_note"]),
    }


def _verified_nature_image(row: sqlite3.Row, rights: sqlite3.Row | None, root: Path) -> dict[str, Any] | None:
    if rights is None or row["image_rights_status"] != NATURE_IMAGE_STATUS:
        return None
    local_path = _local_file(rights["local_path"], root)
    if (
        rights["rights_status"] != NATURE_IMAGE_STATUS
        or not str(rights["source_page"] or "").startswith("https://commons.wikimedia.org/wiki/File:")
        or not str(rights["creator"] or "").strip()
        or not str(rights["credit"] or "").strip()
        or not _nature_license_allowed(rights["license_name"], rights["license_url"])
        or not str(rights["usage_note"] or "").strip()
        or local_path is None
        or not _safe_https_url(rights["image_url"])
        or not str(rights["image_url"]).startswith("https://raw.githubusercontent.com/")
        or str(row["image_local_path"] or "") != str(rights["local_path"] or "")
        or str(row["image_url"] or "") != str(rights["image_url"] or "")
        or str(row["image_source_url"] or "") != str(rights["source_page"] or "")
        or str(row["image_credit"] or "") != str(rights["credit"] or "")
    ):
        return None
    details = [
        f"{rights['license_name']} — {rights['license_url']}",
        f"Creator: {rights['creator']}",
        str(rights["usage_note"] or ""),
        str(rights["modification_note"] or ""),
    ]
    return {
        "image_url": str(rights["image_url"]),
        "image_local_path": str(local_path),
        "image_caption": str(rights["caption"] or row["image_caption"] or ""),
        "image_credit": str(rights["credit"]),
        "image_source_url": str(rights["source_page"]),
        "image_rights_status": MAGAZINE_IMAGE_STATUS,
        "image_rights_note": " · ".join(part.strip() for part in details if part.strip()),
    }


def _read_candidates(
    source_id: str,
    connection: sqlite3.Connection,
    start: datetime,
    end: datetime,
    root: Path,
) -> tuple[list[dict[str, Any]], int]:
    _metadata(connection, source_id)
    rights = _nature_rights(connection, source_id) if source_id == "nature" else {}
    try:
        rows = connection.execute(
            """SELECT story_id,title,url,summary,source_name,source_url,published_at,
                      retrieved_at,image_url,image_local_path,image_caption,image_credit,
                      image_source_url,image_rights_status,image_rights_note,view_id
               FROM stories WHERE view_id=? AND published_at>=? AND published_at<?
               ORDER BY published_at DESC LIMIT 500""",
            (source_id, start.timestamp(), end.timestamp()),
        ).fetchall()
    except sqlite3.Error as exc:
        raise MagazineAdapterError(f"{source_id} story schema is incompatible with the Magazine adapter.") from exc

    candidates: list[dict[str, Any]] = []
    images = 0
    seen_urls: set[str] = set()
    for row in rows:
        article_url = str(row["url"] or "").strip()
        timestamp = _parse_timestamp(row["published_at"])
        title = str(row["title"] or "").strip()
        if not title or not _safe_https_url(article_url) or timestamp is None or article_url in seen_urls:
            continue
        seen_urls.add(article_url)
        image = (
            _verified_alien_image(row, root)
            if source_id == "alien-world"
            else _verified_nature_image(row, rights.get(str(row["story_id"])), root)
        )
        if image:
            images += 1
        candidates.append({
            "source_id": source_id,
            "story_id": f"{source_id}:{str(row['story_id'])}",
            "title": title[:240],
            "url": article_url,
            "summary": str(row["summary"] or "")[:12000],
            "source_name": f"{SOURCE_REGISTRY[source_id]['display_name']} / {str(row['source_name'] or 'Original source')[:160]}",
            "source_url": str(row["source_url"] or "")[:700],
            "published_at": timestamp,
            "retrieved_at": _parse_timestamp(row["retrieved_at"]) or timestamp,
            "image_url": image.get("image_url") if image else None,
            "image_local_path": image.get("image_local_path") if image else None,
            "image_caption": image.get("image_caption") if image else None,
            "image_credit": image.get("image_credit") if image else None,
            "image_source_url": image.get("image_source_url") if image else None,
            "image_rights_status": image.get("image_rights_status") if image else None,
            "image_rights_note": image.get("image_rights_note") if image else None,
            "view_id": MAGAZINE_VIEW_ID,
        })
    return candidates, images


def _select_balanced(
    per_source: dict[str, list[dict[str, Any]]],
    source_ids: list[str],
    maximum_stories: int,
) -> list[dict[str, Any]]:
    """Round-robin sources, prioritising verified image stories within each."""
    queues: dict[str, list[dict[str, Any]]] = {}
    for source_id in source_ids:
        rows = sorted(per_source.get(source_id, []), key=lambda item: item["published_at"], reverse=True)
        with_images = [item for item in rows if item.get("image_rights_status") == MAGAZINE_IMAGE_STATUS]
        without_images = [item for item in rows if item.get("image_rights_status") != MAGAZINE_IMAGE_STATUS]
        queues[source_id] = with_images + without_images
    selected: list[dict[str, Any]] = []
    selected_urls: set[str] = set()
    while len(selected) < maximum_stories:
        progressed = False
        for source_id in source_ids:
            queue = queues[source_id]
            while queue:
                candidate = queue.pop(0)
                if candidate["url"] in selected_urls:
                    continue
                selected.append(candidate)
                selected_urls.add(candidate["url"])
                progressed = True
                break
            if len(selected) >= maximum_stories:
                break
        if not progressed:
            break
    return sorted(selected, key=lambda item: item["published_at"], reverse=True)


def _make_engine_connection(records: list[dict[str, Any]]) -> sqlite3.Connection:
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    connection.execute("CREATE TABLE publisher_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    connection.execute("INSERT INTO publisher_meta(key,value) VALUES('view_id',?)", (MAGAZINE_VIEW_ID,))
    definitions = ",".join(f"{name} {'TEXT' if name not in ('published_at','retrieved_at') else 'REAL'}" for name in ENGINE_STORY_COLUMNS)
    connection.execute(f"CREATE TABLE stories ({definitions})")
    placeholders = ",".join("?" for _ in ENGINE_STORY_COLUMNS)
    connection.executemany(
        f"INSERT INTO stories ({','.join(ENGINE_STORY_COLUMNS)}) VALUES ({placeholders})",
        [tuple(record.get(column) for column in ENGINE_STORY_COLUMNS) for record in records],
    )
    connection.commit()
    connection.execute("PRAGMA query_only=ON")
    return connection


def build_source_bundle(
    profile: dict[str, Any] | None = None,
    *,
    root: Path = ROOT,
    database_paths: dict[str, Path] | None = None,
    now: datetime | None = None,
) -> MagazineSourceBundle:
    """Build an Engine-compatible, ephemeral database from the two read-only sources."""
    profile = profile or load_profile()
    validate_profile(profile)
    start, end = previous_completed_month(now)
    source_ids = list(profile["enabledSources"])
    per_source: dict[str, list[dict[str, Any]]] = {}
    source_connections: list[sqlite3.Connection] = []
    try:
        for source_id in source_ids:
            path = (database_paths or {}).get(source_id)
            if path is None:
                path = root / SOURCE_REGISTRY[source_id]["database_path"]
            connection = open_source_database(source_id, path=path, root=root)
            source_connections.append(connection)
            candidates, _ = _read_candidates(source_id, connection, start, end, root)
            per_source[source_id] = candidates
    finally:
        for connection in source_connections:
            connection.close()

    publication = profile["publication"]
    minimum_per_source = int(publication.get("minimumStoriesPerSource", 1))
    for source_id in source_ids:
        count = len(per_source.get(source_id, []))
        if count < minimum_per_source:
            raise MagazineAdapterError(
                f"{SOURCE_REGISTRY[source_id]['display_name']} has only {count} eligible stories in the completed month; "
                f"at least {minimum_per_source} is required."
            )

    maximum = int(publication["maximumStories"])
    selected = _select_balanced(per_source, source_ids, maximum)
    minimum_stories = int(publication["minimumStories"])
    if len(selected) < minimum_stories:
        raise MagazineAdapterError(
            f"Only {len(selected)} eligible stories are available across the two views; {minimum_stories} are required."
        )
    image_count = sum(1 for item in selected if item.get("image_rights_status") == MAGAZINE_IMAGE_STATUS)
    minimum_images = int(publication.get("minimumVerifiedImages", 0))
    if image_count < minimum_images:
        raise MagazineAdapterError(
            f"Only {image_count} verified images fit the balanced selection; {minimum_images} are required."
        )

    engine_connection = _make_engine_connection(selected)
    counts = {source_id: sum(1 for item in selected if item["source_id"] == source_id) for source_id in source_ids}
    return MagazineSourceBundle(
        connection=engine_connection,
        profile=profile,
        coverage_start=start,
        coverage_end=end,
        selected_counts=counts,
        verified_image_count=image_count,
    )
