#!/usr/bin/env python3
"""Section 13 -> View-isolated Newsroom database bridge.

Consumes the completed Global Checker v2.1.1 report (Sections 1-13).
Only Section 13 APPROVE_FOR_DATABASE posts are persisted. The authoritative
View ID comes from the hashed Manager ID Card and is cross-checked against
post and image lineage before the Manager registry selects one database.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import shutil
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit

BRIDGE_VERSION = "1.0.0"
SECTION13_KEY = "postEditorialFinalVerification"
SECTION12_KEY = "liveFeedOutput"
EXPECTED_DECISION = "APPROVE_FOR_DATABASE"


class Section13DatabaseBridgeError(RuntimeError):
    pass


def _dict(value):
    return value if isinstance(value, dict) else {}


def _list(value):
    return value if isinstance(value, list) else []


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _canonical_hash(value) -> str:
    payload = json.dumps(value, sort_keys=True, ensure_ascii=False,
                         separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _canonical_https(value) -> str:
    if not isinstance(value, str):
        return ""
    try:
        parsed = urlsplit(value.strip())
        if (parsed.scheme.lower() != "https" or not parsed.hostname
                or parsed.username or parsed.password
                or parsed.port not in (None, 443)):
            return ""
        return "https://" + parsed.hostname.lower().rstrip(".") + (parsed.path or "/") + (
            ("?" + parsed.query) if parsed.query else "")
    except (TypeError, ValueError):
        return ""


def _timestamp(value, label):
    if isinstance(value, (int, float)):
        dt = datetime.fromtimestamp(float(value), timezone.utc)
    elif isinstance(value, str) and value.strip():
        dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc)
    else:
        raise Section13DatabaseBridgeError(f"{label} is missing.")
    return dt


def _load_writer(root: Path):
    writer_path = root / "newsroom-database-writer" / "newsroom_database_writer.py"
    if not writer_path.is_file():
        raise Section13DatabaseBridgeError("Existing shared Newsroom Database Writer is missing.")
    sys.path.insert(0, str(writer_path.parent))
    spec = importlib.util.spec_from_file_location("newsroom_database_writer", writer_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _index_by_post(items, label):
    result = {}
    for item in _list(items):
        if not isinstance(item, dict):
            continue
        post_id = str(item.get("postId") or "")
        if not post_id or post_id in result:
            raise Section13DatabaseBridgeError(f"{label} has a missing or duplicate postId.")
        result[post_id] = item
    return result


def _manager_job(report):
    sections = _dict(report.get("sections"))
    card = _dict(sections.get("managerIdCard"))
    job = _dict(card.get("payload"))
    digest = str(card.get("sha256") or "").lower()
    if not job or not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise Section13DatabaseBridgeError("Hashed Manager ID Card is required.")
    if _canonical_hash(job) != digest:
        raise Section13DatabaseBridgeError("Manager ID Card checksum mismatch.")
    required = (
        "jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds",
        "sourceIds", "feedUrls", "collectorEntrypoint", "collectorWorkflow",
        "destinationDatabaseId", "destinationDatabasePath", "scheduledAt",
        "requestWindowHours", "configVersion", "trigger",
    )
    missing = [key for key in required if job.get(key) in (None, "", [])]
    if missing:
        raise Section13DatabaseBridgeError("Manager job is incomplete: " + ", ".join(missing))
    if report.get("jobId") != job.get("jobId") or report.get("viewId") != job.get("viewId"):
        raise Section13DatabaseBridgeError("Report identity differs from Manager ID Card.")
    return job


def _approved_inputs(report, view_id):
    sections = _dict(report.get("sections"))
    sec13 = _dict(sections.get(SECTION13_KEY))
    sec12 = _dict(sections.get(SECTION12_KEY))
    if report.get("schemaVersion") != 2 or not sec13 or not sec12:
        raise Section13DatabaseBridgeError("Completed Global Checker Sections 1-13 are required.")
    if sec13.get("statistics", {}).get("approvedForDatabase") != sum(
        x.get("decision") == EXPECTED_DECISION for x in _list(sec13.get("posts"))
        if isinstance(x, dict)
    ):
        raise Section13DatabaseBridgeError("Section 13 approved count does not reconcile.")
    if sec13.get("ownership", {}).get("databaseOpenedOrWritten") is not False:
        raise Section13DatabaseBridgeError("Section 13 ownership contract is invalid.")
    sec13_posts = _index_by_post(sec13.get("posts"), "Section 13")
    sec12_posts = _index_by_post(sec12.get("posts"), "Section 12")
    originals = _index_by_post(report.get("posts"), "Original Checker posts")
    sec9 = _index_by_post(
        _dict(sections.get("imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission")).get("posts"),
        "Section 9",
    )
    sec11 = _index_by_post(
        _dict(sections.get("postEngineAuditAndFinalDecision")).get("posts"),
        "Section 11",
    )
    approved = []
    for post_id, decision in sec13_posts.items():
        if decision.get("decision") != EXPECTED_DECISION:
            continue
        checks = _list(decision.get("checks"))
        if any(not isinstance(c, dict) or c.get("result") in {"FAIL", "HOLD"}
               or (c.get("mandatory") is True and c.get("result") != "PASS")
               for c in checks):
            raise Section13DatabaseBridgeError(f"{post_id}: Section 13 decision/checks are inconsistent.")
        editor = sec12_posts.get(post_id)
        original = originals.get(post_id)
        image_section = sec9.get(post_id)
        audit = sec11.get(post_id)
        if not all((editor, original, image_section, audit)):
            raise Section13DatabaseBridgeError(f"{post_id}: required post lineage is missing.")
        live = _dict(editor.get("liveFeed"))
        image = _dict(editor.get("image"))
        private = _dict(editor.get("privateImageProcessing"))
        lineage = _dict(image_section.get("lineage"))
        if editor.get("status") != "READY" or editor.get("postId") != post_id:
            raise Section13DatabaseBridgeError(f"{post_id}: Section 12 is not READY.")
        if original.get("viewId") not in (None, "", view_id):
            raise Section13DatabaseBridgeError(f"{post_id}: original post View ID mismatch.")
        if lineage.get("viewId") != view_id or lineage.get("postId") != post_id:
            raise Section13DatabaseBridgeError(f"{post_id}: Section 9 lineage View ID mismatch.")
        if live.get("title") != editor.get("headline") or live.get("summary") != editor.get("summary"):
            raise Section13DatabaseBridgeError(f"{post_id}: Section 12 live card mismatch.")
        if live.get("sourceUrl") != editor.get("sourceUrl") or _dict(live.get("image")) != image:
            raise Section13DatabaseBridgeError(f"{post_id}: Section 12 source/image mismatch.")
        approved.append((post_id, decision, editor, original, image_section, audit))
    return approved


def write_section13_approved_posts(report: dict, *, repository_root=".") -> dict:
    root = Path(repository_root).resolve()
    job = _manager_job(report)
    view_id = str(job["viewId"])
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,62}", view_id):
        raise Section13DatabaseBridgeError("Invalid View ID.")
    writer = _load_writer(root)
    try:
        profile, db_path = writer._repository_contract(root, view_id, job)
    except Exception as exc:
        raise Section13DatabaseBridgeError(
            f"View is not registered in Global Collection Manager: {exc}"
        ) from exc
    approved = _approved_inputs(report, view_id)
    if not approved:
        return {
            "schemaVersion": 1, "bridge": "Section 13 View-ID Database Bridge",
            "bridgeVersion": BRIDGE_VERSION, "phase": "database-write-complete",
            "viewId": view_id, "databaseId": profile["destinationDatabaseId"],
            "databasePath": profile["destinationDatabasePath"],
            "statistics": {"approvedReceived": 0, "inserted": 0, "updated": 0,
                           "unchanged": 0, "held": len(_list(_dict(report["sections"].get(SECTION13_KEY)).get("posts")))},
        }

    prepared = []
    section4 = _index_by_post(
        _dict(_dict(report.get("sections")).get("sourceRightsEvidence")).get("posts"),
        "Section 4",
    )
    section7 = _index_by_post(
        _dict(_dict(report.get("sections")).get("textApprovalChecks")).get("posts"),
        "Section 7",
    )
    for post_id, decision, editor, original, image_section, audit in approved:
        live = _dict(editor.get("liveFeed"))
        image = _dict(editor.get("image"))
        private = _dict(editor.get("privateImageProcessing"))
        article_url = _canonical_https(editor.get("sourceUrl"))
        feed_url = _canonical_https(live.get("sourceFeedUrl"))
        title = str(live.get("title") or "").strip()
        summary = str(live.get("summary") or "").strip()
        source_name = str(live.get("sourceName") or original.get("sourceName") or "").strip()
        if not article_url or not feed_url or not title or len(summary.split()) < 1 or not source_name:
            raise Section13DatabaseBridgeError(f"{post_id}: required Live Feed fields are incomplete.")
        if image.get("viewId") not in (None, "", view_id):
            raise Section13DatabaseBridgeError(f"{post_id}: image View ID mismatch.")
        image_url = _canonical_https(image.get("url"))
        image_hash = str(image.get("sha256") or "").lower()
        if not image_url or not re.fullmatch(r"[a-f0-9]{64}", image_hash):
            raise Section13DatabaseBridgeError(f"{post_id}: approved image URL/hash is invalid.")
        stage = Path(str(private.get("stagedPath") or "")).resolve()
        stage_root = (root / ".image-engine-staging").resolve()
        try:
            stage.relative_to(stage_root)
        except ValueError as exc:
            raise Section13DatabaseBridgeError(f"{post_id}: image stage path escapes Image Engine staging.") from exc
        if not stage.is_file() or _sha256_bytes(stage.read_bytes()) != image_hash:
            raise Section13DatabaseBridgeError(f"{post_id}: staged image bytes do not match approved SHA-256.")
        mime = str(image.get("mimeType") or "").lower()
        if mime not in {"image/jpeg", "image/png", "image/webp"}:
            raise Section13DatabaseBridgeError(f"{post_id}: unsupported approved image MIME type.")
        ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[mime]
        media_id = str(image.get("mediaId") or image.get("candidateId") or "")
        if not media_id:
            raise Section13DatabaseBridgeError(f"{post_id}: approved image media identity is missing.")
        # Copy only to the matching View's private asset cache; never public output.
        relative = Path(".publisher-data") / view_id / "newsroom-assets" / f"{post_id}-{image_hash[:16]}{ext}"
        destination = (root / relative).resolve()
        if root not in destination.parents:
            raise Section13DatabaseBridgeError("Private asset destination escapes repository.")
        destination.parent.mkdir(parents=True, exist_ok=True)
        pending = destination.with_suffix(destination.suffix + ".pending")
        shutil.copy2(stage, pending)
        if _sha256_bytes(pending.read_bytes()) != image_hash:
            pending.unlink(missing_ok=True)
            raise Section13DatabaseBridgeError(f"{post_id}: private image copy failed hash verification.")
        pending.replace(destination)

        s4 = _dict(section4.get(post_id))
        rights = _dict(s4.get("sourceRightsEvidence")) or s4
        s7 = _dict(section7.get(post_id))
        text_checks = _list(s7.get("checks"))
        text_policy = next((_dict(x) for x in text_checks if x.get("checkId") == "T09"), {})
        published = _timestamp(live.get("publishedAt") or original.get("publishedAt"), f"{post_id} publishedAt")
        checked_at = _timestamp(_dict(report.get("sections").get(SECTION13_KEY)).get("createdAt") or datetime.now(timezone.utc).isoformat(), "Section 13 createdAt")
        source_id = str(original.get("sourceId") or _dict(lineage if (lineage := _dict(image_section.get("lineage"))) else {}).get("sourceId") or "")
        policy_id = str(text_policy.get("policyId") or rights.get("policyId") or "section13-verified-source-provenance")
        decision_id = str(text_policy.get("decisionId") or text_policy.get("checkId") or "T09")
        manager_lineage = {"jobId": job["jobId"], "viewId": view_id, "profileId": job["profileId"],
                           "destinationDatabaseId": job["destinationDatabaseId"],
                           "destinationDatabasePath": job["destinationDatabasePath"],
                           "postId": post_id, "sourceId": source_id,
                           "assignmentIds": job["assignmentIds"], "sourceIds": job["sourceIds"]}
        checker_decisions = {"section13Decision": decision, "section13Checks": decision.get("checks", []),
                             "section11Decision": audit, "section12References": editor.get("inputReferences", {})}
        media_meta = {"mediaId": media_id, "originType": image.get("originType", ""),
                      "creator": image.get("creator", ""), "credit": image.get("credit", ""),
                      "caption": image.get("caption", ""), "altText": image.get("altText", ""),
                      "sourcePage": image.get("sourcePage", ""), "licenseName": image.get("licenseName", ""),
                      "licenseUrl": image.get("licenseUrl", ""), "rightsNotice": image.get("rightsNotice", ""),
                      "mimeType": mime, "width": image.get("width"), "height": image.get("height"),
                      "sha256": image_hash, "privatePath": relative.as_posix()}
        evidence = [{"sourceRecordId": post_id, "sourceUrl": article_url,
                     "sourcePolicyRef": policy_id,
                     "summarySha256": editor.get("summarySha256"),
                     "summarySourceSha256": editor.get("summarySourceSha256")}]
        package_digest = _canonical_hash({"managerJob": job, "postId": post_id, "section13": decision,
                                          "section12": editor, "imageSha256": image_hash})
        checker_digest = _canonical_hash({"checker": report.get("checker"),
                                           "checkerVersion": report.get("checkerVersion"),
                                           "section13": decision, "packageSha256": package_digest})
        prepared.append({
            "view_id": view_id, "story_id": post_id, "url": article_url,
            "title": title, "summary": summary, "source_name": source_name,
            "source_url": feed_url, "published_at": published.timestamp(),
            "retrieved_at": checked_at.timestamp(),
            "image_url": None, "image_local_path": None, "image_caption": None,
            "image_credit": None, "image_source_url": None, "image_rights_status": None,
            "image_rights_note": None, "source_policy_ref": policy_id,
            "global_checker_intake_decision_id": decision_id,
            "checker_review_id": checker_digest,
            "checker_registry_version": str(report.get("checkerVersion") or ""),
            "checker_checked_at": checked_at.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "editorial_engine_version": "Live Feed Editor Section 12",
            "editorial_adapter_version": BRIDGE_VERSION,
            "evidence_ledger_json": json.dumps(evidence, ensure_ascii=False, sort_keys=True),
            "topic_tags_json": json.dumps(list(dict.fromkeys(_list(original.get("topics")) + _list(original.get("categories")) + _list(original.get("tags")))), ensure_ascii=False),
            "image_rights_json": json.dumps(media_meta, ensure_ascii=False, sort_keys=True),
            "approved_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "post_id": post_id, "source_id": source_id, "media_id": media_id,
            "image_stage_path": str(stage), "image_sha256": image_hash,
            "image_mime_type": mime, "image_origin_type": str(image.get("originType") or ""),
            "media_metadata_json": json.dumps(media_meta, ensure_ascii=False, sort_keys=True),
            "manager_lineage_json": json.dumps(manager_lineage, ensure_ascii=False, sort_keys=True),
            "checker_decisions_json": json.dumps(checker_decisions, ensure_ascii=False, sort_keys=True),
            "editorial_package_sha256": package_digest,
            "verification_gate_version": "Section 13 " + str(report.get("checkerVersion") or ""),
        })

    db_path.parent.mkdir(parents=True, exist_ok=True)
    uri = "file:" + db_path.as_posix() + "?mode=rwc"
    connection = sqlite3.connect(uri, uri=True, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA busy_timeout=10000")
        connection.execute("BEGIN IMMEDIATE")
        writer._ensure_view_schema(connection, view_id, profile)
        writer._verify_db(connection, view_id, profile)
        counts = {"inserted": 0, "updated": 0, "unchanged": 0, "older_review_ignored": 0}
        for record in prepared:
            counts[writer._persist_one(connection, record)] += 1
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
    return {
        "schemaVersion": 1, "bridge": "Section 13 View-ID Database Bridge",
        "bridgeVersion": BRIDGE_VERSION, "phase": "database-write-complete",
        "viewId": view_id, "databaseId": profile["destinationDatabaseId"],
        "databasePath": profile["destinationDatabasePath"], "table": writer.TABLE,
        "statistics": {"approvedReceived": len(prepared), **counts,
                       "held": len(_list(_dict(report["sections"].get(SECTION13_KEY)).get("posts"))) - len(prepared)},
        "privacy": {"otherViewDatabaseOpened": False, "rawArticleBodyPersisted": False,
                    "publicAssetsWritten": False, "publisherOutputWritten": False},
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checker-report", required=True)
    parser.add_argument("--repository-root", default=".")
    parser.add_argument("--output")
    args = parser.parse_args(argv)
    try:
        report = json.loads(Path(args.checker_report).read_text(encoding="utf-8"))
        result = write_section13_approved_posts(report, repository_root=args.repository_root)
        payload = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
        if args.output:
            Path(args.output).write_text(payload, encoding="utf-8")
        else:
            print(payload, end="")
        return 0
    except Exception as exc:
        print(json.dumps({"phase": "database-write-blocked", "databaseWriteAttempted": False,
                          "errorType": type(exc).__name__, "message": str(exc)}, indent=2),
              file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
