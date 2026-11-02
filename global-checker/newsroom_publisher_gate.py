#!/usr/bin/env python3
"""Final publication gate for Writer-approved, transformed Newsroom stories.

The existing feed gate intentionally requires source-summary hashes to match
unchanged feed text. A GREEN Newsroom story is a transformed editorial output,
so it uses a separate approval path backed by the exact GREEN Writer row.
Ordinary Collector stories continue through the original gate unchanged.
"""
from __future__ import annotations

import hashlib
import json
import re
from typing import Any

PATCH_MARKER = "_live_earth_newsroom_publisher_gate_v1"
NEWSROOM_TABLE = "newsroom_approved_stories"


def _clean(value: Any, limit: int = 12000) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def _is_newsroom_approved(story: dict[str, Any], connection: Any,
                          view_id: str, registry: dict[str, Any]) -> dict[str, Any] | None:
    table = connection.execute(
        "SELECT type FROM sqlite_master WHERE name=?", (NEWSROOM_TABLE,)
    ).fetchone()
    if not table:
        return None
    if table[0] != "table":
        raise RuntimeError("Newsroom approval destination exists but is not a table.")

    row = connection.execute(
        f"""SELECT view_id,story_id,url,title,summary,source_name,source_url,
                   source_policy_ref,global_checker_intake_decision_id,
                   checker_review_id,checker_registry_version,checker_checked_at,
                   editorial_engine_version,editorial_adapter_version,
                   evidence_ledger_json,topic_tags_json,image_rights_json,
                   image_url,image_local_path,image_caption,image_credit,
                   image_source_url,image_rights_status,image_rights_note
            FROM {NEWSROOM_TABLE} WHERE view_id=? AND story_id=?""",
        (view_id, _clean(story.get("id"), 160)),
    ).fetchone()
    if not row:
        return None
    value = dict(row) if hasattr(row, "keys") else dict(zip(
        ["view_id","story_id","url","title","summary","source_name","source_url",
         "source_policy_ref","global_checker_intake_decision_id","checker_review_id",
         "checker_registry_version","checker_checked_at","editorial_engine_version",
         "editorial_adapter_version","evidence_ledger_json","topic_tags_json","image_rights_json",
         "image_url","image_local_path","image_caption","image_credit","image_source_url",
         "image_rights_status","image_rights_note"], row
    ))

    # Compare the exact Publisher row to the exact final Checker/Writer row.
    for field, column in (("url", "url"), ("title", "title"), ("summary", "summary"),
                          ("sourceName", "source_name"), ("sourceUrl", "source_url")):
        if _clean(story.get(field), 12000) != _clean(value.get(column), 12000):
            raise RuntimeError("Publisher story differs from its GREEN Newsroom Database Writer row.")
    if value.get("view_id") != view_id or value.get("story_id") != _clean(story.get("id"), 160):
        raise RuntimeError("Newsroom Publisher approval row has a mismatched View/story identity.")
    if value.get("checker_registry_version") != registry.get("registryVersion"):
        raise RuntimeError("Newsroom Publisher approval row belongs to a different Checker registry version.")
    if value.get("editorial_engine_version") != "1.3.0" or value.get("editorial_adapter_version") != "1.0.0":
        raise RuntimeError("Newsroom Publisher approval row uses an unregistered Editorial Engine version.")
    if not _clean(value.get("global_checker_intake_decision_id"), 200):
        raise RuntimeError("Newsroom Publisher approval row is missing its intake decision identity.")
    review_id = _clean(value.get("checker_review_id"), 120)
    checked_at = _clean(value.get("checker_checked_at"), 80)
    if not review_id.startswith("gcr-") or not checked_at:
        raise RuntimeError("Newsroom Publisher approval row is missing its exact final GREEN review identity.")

    policy_ref = _clean(value.get("source_policy_ref"), 160)
    policies = {str(item.get("policyId")): item for item in registry.get("policies", [])}
    policy = policies.get(policy_ref)
    if not policy or view_id not in policy.get("views", []) or policy.get("status") not in {
        "GREEN_CONDITIONAL", "AMBER_LIMITED", "AMBER_ITEM_LICENSE_REQUIRED"
    }:
        raise RuntimeError("Newsroom Publisher approval row references a non-publishable source policy.")
    use = policy.get("text", {}).get("usePermissions", {})
    for permission in ("temporaryProcessing", "transformation", "derivedOutputStorage", "derivedOutputDisplay"):
        if use.get(permission) != "allowed":
            raise RuntimeError("Newsroom Publisher source policy no longer permits the derived editorial output.")
    if use.get("rawTextStorage") != "prohibited":
        raise RuntimeError("Newsroom Publisher source policy does not explicitly prohibit raw-text storage.")

    try:
        evidence = json.loads(value.get("evidence_ledger_json") or "null")
        tags = json.loads(value.get("topic_tags_json") or "null")
        image_rights = json.loads(value.get("image_rights_json") or "null")
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        raise RuntimeError("Newsroom Publisher row has malformed evidence or topic metadata.") from exc
    story_id = value["story_id"]
    if not isinstance(evidence, list) or not evidence or not isinstance(tags, list) or not isinstance(image_rights, dict):
        raise RuntimeError("Newsroom Publisher row has incomplete GREEN provenance metadata.")
    for item in evidence:
        if (not isinstance(item, dict)
                or item.get("sourceRecordId") != story_id
                or item.get("sourceUrl") != value.get("url")
                or item.get("sourcePolicyRef") != policy_ref
                or not re.fullmatch(r"[a-f0-9]{64}", str(item.get("excerptSha256", "")))):
            raise RuntimeError("Newsroom Publisher evidence metadata does not match its approved source.")
    if any(value.get(field) not in (None, "") for field in (
        "image_url", "image_local_path", "image_caption", "image_credit",
        "image_source_url", "image_rights_status", "image_rights_note"
    )):
        raise RuntimeError("A Newsroom image asset appeared before a separate approved image hand-off.")
    if len(_clean(value.get("summary"))) < 100 or len(_clean(value.get("summary")).split()) < 16:
        raise RuntimeError("Newsroom editorial output is not meaningful enough to publish.")
    return value


def install(checker: Any) -> None:
    """Wrap the shared Checker gate once; keep all legacy story checks intact."""
    if getattr(checker, PATCH_MARKER, False):
        return
    original_gate = checker.gate_feed

    def gate_feed(feed: dict[str, Any], connection: Any, view_id: str,
                  *, minimum_stories: int = 2) -> dict[str, Any]:
        if not isinstance(feed, dict) or feed.get("viewId") != view_id:
            return original_gate(feed, connection, view_id, minimum_stories=minimum_stories)
        registry = checker.load_registry()
        newsroom_rows: list[dict[str, Any]] = []
        ordinary_rows: list[dict[str, Any]] = []
        rejected_newsroom: list[str] = []
        for raw in feed.get("stories", []):
            if not isinstance(raw, dict):
                ordinary_rows.append(raw)
                continue
            try:
                approved_row = _is_newsroom_approved(raw, connection, view_id, registry)
            except Exception:
                # A row claiming Newsroom identity but failing its approval
                # check is held; it is never downgraded to the legacy route.
                exists = connection.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
                    (NEWSROOM_TABLE,),
                ).fetchone()
                if exists:
                    candidate = connection.execute(
                        "SELECT 1 FROM newsroom_approved_stories WHERE view_id=? AND story_id=?",
                        (view_id, _clean(raw.get("id"), 160)),
                    ).fetchone()
                    if candidate:
                        rejected_newsroom.append(_clean(raw.get("id"), 160))
                        continue
                raise
            if approved_row is not None:
                story = dict(raw)
                policy = next((p for p in registry.get("policies", [])
                               if p.get("policyId") == approved_row.get("source_policy_ref")), {})
                story["publicationRoute"] = "text"
                story["rights"] = {
                    "checker": checker.CHECKER_NAME,
                    "verdict": "GREEN",
                    "policyId": approved_row.get("source_policy_ref"),
                    "policyVersion": str(policy.get("policyVersion", "1")),
                    "decisionId": approved_row.get("checker_review_id"),
                    "checkedAt": approved_row.get("checker_checked_at"),
                    "allowedUse": "GREEN-approved-derived-editorial-output",
                    "attribution": policy.get("text", {}).get("attribution", ""),
                    "licenseUrl": "",
                    "author": "",
                }
                newsroom_rows.append(story)
            else:
                ordinary_rows.append(raw)

        # Existing per-Collector decisions still pass through the original
        # unchanged-source-hash gate. Only exact Writer-approved Newsroom rows
        # take the transformed-editorial route.
        feed["stories"] = ordinary_rows
        approved_feed = original_gate(feed, connection, view_id, minimum_stories=minimum_stories)
        approved_feed["stories"] = newsroom_rows + approved_feed.get("stories", [])
        approved_feed["storyCount"] = len(approved_feed["stories"])
        summary = approved_feed.get("globalChecker", {})
        summary["newsroomApprovedStories"] = len(newsroom_rows)
        summary["newsroomRowsHeld"] = len(rejected_newsroom)
        summary["policy"] = "fail-closed-newsroom-writer-approval-plus-legacy-text-or-image"
        approved_feed["globalChecker"] = summary
        return approved_feed

    checker.gate_feed = gate_feed
    setattr(checker, PATCH_MARKER, True)


def bootstrap() -> None:
    """Install only inside a LIVE // EARTH project Python process."""
    import os
    from pathlib import Path
    import sys

    root_value = os.environ.get("LIVE_EARTH_PROJECT_ROOT", "")
    if not root_value:
        return
    checker_dir = Path(root_value).resolve() / "global-checker"
    if str(checker_dir) not in sys.path:
        sys.path.insert(0, str(checker_dir))
    import global_checker as checker
    import global_checker_policy_engine
    global_checker_policy_engine.install(checker)
    install(checker)


if __name__ != "__main__":
    # The .pth hook imports this module after the existing bootstrap has set
    # the project-root marker in the dispatched Publisher process.
    bootstrap()
