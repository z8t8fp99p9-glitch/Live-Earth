#!/usr/bin/env python3
"""Shared Image Engine hand-off for the Nature and Alien World Live Feed publishers.

The helper creates only local procedural illustrations. It never decides rights:
all candidates are sent to the Global Checker, and only exact GREEN decisions
are attached and copied into a view's public assets directory.
"""
from __future__ import annotations

import hashlib
import sqlite3
import shutil
import uuid
from pathlib import Path
from typing import Any

from image_engine import ENGINE_NAME, ENGINE_VERSION, ImageEngine, stage_directory

ROOT = Path(__file__).resolve().parents[1]
GENERATOR_SOURCE_PAGE = (
    "https://github.com/z8t8fp99p9-glitch/Live-Earth/blob/main/"
    "image-engine/image_engine.py"
)
RIGHTS_NOTE = (
    "Original procedural illustration generated locally; no third-party image asset was used. "
    "This is illustrative artwork, not documentary evidence."
)


def attach_original_illustrations(
    feed: dict[str, Any],
    view_id: str,
    *,
    database_path: str | Path,
    output_dir: str | Path,
    raw_asset_base_url: str,
    checker: Any,
) -> list[dict[str, Any]]:
    """Enrich image-less eligible feed stories, after editorial formatting and before final gate."""
    if view_id not in {"nature", "alien-world"}:
        raise ValueError("Image Engine view is not registered.")
    if not isinstance(feed, dict) or feed.get("viewId") != view_id:
        raise ValueError("Image Engine received a feed for the wrong view.")
    stories = feed.get("stories")
    if not isinstance(stories, list):
        raise ValueError("Image Engine received an invalid stories collection.")

    db_path = Path(database_path).resolve()
    if not db_path.is_file():
        raise RuntimeError("The view's own Collector database is missing; illustration hand-off is held.")
    output_path = Path(output_dir).resolve()
    output_path.mkdir(parents=True, exist_ok=True)
    staging_root = db_path.parent / "image-engine-staging"
    run_id = uuid.uuid4().hex
    staging_path = stage_directory(staging_root, run_id)
    engine = ImageEngine(staging_path)
    approved_records: list[dict[str, Any]] = []

    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA busy_timeout=5000")
        checker.ensure_decision_table(connection)
        registry_version = checker.load_registry().get("registryVersion")

        for story in stories:
            if not isinstance(story, dict) or story.get("imageUrl"):
                continue  # Existing documentary/Commons image keeps precedence.
            story_id = str(story.get("id") or "").strip()
            article_url = str(story.get("url") or "").strip()
            title = str(story.get("title") or "").strip()
            if not story_id or not article_url or not title:
                continue

            # An original artwork may decorate only a story whose text/source
            # route is already approved by this same registry version.
            text_decision = checker.get_decision(connection, view_id, story_id, "text")
            if not (
                text_decision
                and text_decision.get("allowed") is True
                and text_decision.get("verdict") in checker.PUBLISHABLE_VERDICTS
                and text_decision.get("registryVersion") == registry_version
                and text_decision.get("evidence", {}).get("articleUrl") == article_url
                and text_decision.get("evidence", {}).get("title") == title
            ):
                continue

            candidate = engine.create_original_illustration(
                {
                    "id": story_id,
                    "url": article_url,
                    "title": title,
                    "summary": str(story.get("summary") or ""),
                },
                view_id,
                published_base_url=raw_asset_base_url,
            )
            decision = checker.evaluate_image(
                view_id,
                story_id,
                candidate,
                article_url=article_url,
                source_name=str(story.get("sourceName") or ""),
            )
            checker.record_decision(connection, decision)
            approved_candidate = ImageEngine.attach_checker_decision(candidate, decision)
            if not approved_candidate.get("approved"):
                continue

            published_path = engine.publish_checker_approved(approved_candidate, output_path)
            if not published_path.is_file():
                raise RuntimeError("Checker-approved illustration was not published to the view asset folder.")
            digest = hashlib.sha256(published_path.read_bytes()).hexdigest()
            if digest != candidate.get("sha256"):
                raise RuntimeError("Published illustration hash does not match the staged candidate.")

            story.update({
                "imageUrl": candidate["imageUrl"],
                "imageCredit": candidate["credit"],
                "imageSourceUrl": candidate["sourcePage"],
                "imageCaption": candidate["caption"],
                "imageRightsNote": candidate["rightsNotice"],
                "imageLicense": candidate["licenseName"],
                "imageLicenseUrl": "",
                "imageOriginType": candidate["originType"],
                "imageEngine": candidate["engine"],
                "imageEngineVersion": candidate["engineVersion"],
            })
            approved_records.append({
                "storyId": story_id,
                "originType": candidate["originType"],
                "engine": candidate["engine"],
                "engineVersion": candidate["engineVersion"],
                "creator": candidate["creator"],
                "credit": candidate["credit"],
                "caption": candidate["caption"],
                "rightsNote": candidate["rightsNotice"],
                "sourcePage": candidate["sourcePage"],
                "license": candidate["licenseName"],
                "file": "assets/" + published_path.name,
                "sha256": digest,
                "checkerDecisionId": decision["decisionId"],
            })
        connection.commit()
    finally:
        connection.close()
        shutil.rmtree(staging_path, ignore_errors=True)

    return approved_records
