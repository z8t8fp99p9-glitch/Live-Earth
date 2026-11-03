#!/usr/bin/env python3
"""Publisher-owned copy of Checker-approved Newsroom images into View assets."""
from __future__ import annotations

import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any


class NewsroomPublisherAssetError(RuntimeError):
    pass


def attach_newsroom_images(
    connection,
    feed: dict[str, Any],
    *,
    repository_root: str | Path,
    view_id: str,
    output_directory: str | Path,
    raw_asset_base: str,
) -> dict[str, Any]:
    """Copy only already-Checker-approved image bytes; Publisher owns public copy.

    No row-count limit is used. The query is bounded by the same published feed
    time window and is scoped to one View's existing database.
    """
    root = Path(repository_root).resolve()
    if view_id not in {"nature", "alien-world"} or feed.get("viewId") != view_id:
        raise NewsroomPublisherAssetError("Feed and Publisher View identities do not match.")
    stories = feed.get("stories")
    if not isinstance(stories, list):
        raise NewsroomPublisherAssetError("Live Feed stories must be an array.")
    window_hours = feed.get("windowHours")
    generated = feed.get("generatedAt")
    if not isinstance(window_hours, int) or not 1 <= window_hours <= 768 or not isinstance(generated, str):
        raise NewsroomPublisherAssetError("Feed time window is invalid.")
    end = datetime.fromisoformat(generated.replace("Z", "+00:00")).astimezone(timezone.utc).timestamp()
    start = end - window_hours * 3600
    table = connection.execute("SELECT type FROM sqlite_master WHERE name='newsroom_approved_stories'").fetchone()
    if not table:
        return {"images": [], "assetFiles": [], "attached": 0}
    if str(table[0]) != "table":
        raise NewsroomPublisherAssetError("Newsroom approved-story destination is not a table.")
    columns = {row[1] for row in connection.execute("PRAGMA table_info(newsroom_approved_stories)").fetchall()}
    required = {"view_id", "story_id", "media_id", "image_stage_path", "image_sha256", "media_metadata_json", "published_at", "verification_gate_version"}
    if not required.issubset(columns):
        # A legacy table with no v2 media hand-off simply has no v2 image rows.
        if {"view_id", "story_id"}.issubset(columns):
            return {"images": [], "assetFiles": [], "attached": 0}
        raise NewsroomPublisherAssetError("Newsroom approved-story table cannot be read by the v2 Publisher adapter.")
    rows = connection.execute(
        """SELECT story_id,media_id,image_stage_path,image_sha256,media_metadata_json,published_at,verification_gate_version
           FROM newsroom_approved_stories
           WHERE view_id=? AND published_at>=? AND published_at<? AND media_id IS NOT NULL
           ORDER BY published_at DESC""",
        (view_id, start, end + 2 * 3600),
    ).fetchall()
    by_story: dict[str, Any] = {}
    for row in rows:
        story_id = str(row["story_id"])
        if story_id in by_story:
            raise NewsroomPublisherAssetError(f"More than one approved image row exists for '{story_id}'.")
        by_story[story_id] = row

    feed_by_id = {str(item.get("id")): item for item in stories if isinstance(item, dict) and item.get("id")}
    output = Path(output_directory).resolve()
    assets = output / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    used: list[str] = []
    for story_id, row in by_story.items():
        feed_story = feed_by_id.get(story_id)
        if feed_story is None:
            continue
        if row["verification_gate_version"] != "1.0.0":
            raise NewsroomPublisherAssetError(f"Newsroom story '{story_id}' has no recognized post-Editorial Checker gate.")
        relative = PurePosixPath(str(row["image_stage_path"] or ""))
        expected_prefix = PurePosixPath(".publisher-data") / view_id / "newsroom-assets"
        if relative.is_absolute() or ".." in relative.parts or relative.parts[:3] != expected_prefix.parts:
            raise NewsroomPublisherAssetError(f"Newsroom image path for '{story_id}' escapes its private View cache.")
        source = (root / Path(*relative.parts)).resolve()
        if root not in source.parents or not source.is_file():
            raise NewsroomPublisherAssetError(f"Private approved image is missing for '{story_id}'.")
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if digest != str(row["image_sha256"] or ""):
            raise NewsroomPublisherAssetError(f"Private approved image hash changed for '{story_id}'.")
        try:
            metadata = json.loads(row["media_metadata_json"] or "{}")
        except json.JSONDecodeError as exc:
            raise NewsroomPublisherAssetError(f"Image metadata is invalid for '{story_id}'.") from exc
        if not isinstance(metadata, dict) or metadata.get("mediaId") != row["media_id"] or metadata.get("sha256") != digest:
            raise NewsroomPublisherAssetError(f"Image media identity/hash mismatch for '{story_id}'.")
        filename = f"newsroom-{digest[:24]}.jpg"
        target = assets / filename
        pending = target.with_suffix(target.suffix + ".pending")
        shutil.copy2(source, pending)
        if hashlib.sha256(pending.read_bytes()).hexdigest() != digest:
            pending.unlink(missing_ok=True)
            raise NewsroomPublisherAssetError(f"Public image copy failed final hash verification for '{story_id}'.")
        pending.replace(target)
        origin = str(metadata.get("originType") or "")
        credit = str(metadata.get("credit") or "")
        caption = str(metadata.get("caption") or "")
        source_page = str(metadata.get("sourcePage") or "")
        rights_notice = str(metadata.get("rightsNotice") or "")
        license_name = str(metadata.get("licenseName") or "")
        license_url = str(metadata.get("licenseUrl") or "")
        if not credit or not caption or not source_page or not rights_notice or not license_name:
            raise NewsroomPublisherAssetError(f"Approved image public attribution is incomplete for '{story_id}'.")
        feed_story.update({
            "imageUrl": raw_asset_base.rstrip("/") + "/assets/" + filename,
            "imageMediaId": str(row["media_id"]),
            "imageOriginType": origin,
            "imageCredit": credit,
            "imageCaption": caption,
            "imageSourceUrl": source_page,
            "imageRightsNote": rights_notice,
            "imageLicense": license_name,
            "imageLicenseUrl": license_url,
        })
        used.append(filename)
    return {"assetFiles": used, "attached": len(used)}
