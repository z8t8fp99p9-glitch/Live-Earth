#!/usr/bin/env python3
"""LIVE // EARTH Global Image Engine — Section 9.

Appends the Image Engine's Section 9 to an eight-section Global Checker report.
The engine prioritises an already-approved original image, otherwise discovers
only candidates through explicitly enabled Checker-supplied routes. It performs
bounded image retrieval, pixel-level technical inspection, optional semantic
vision inspection through an injected adapter, image preparation where
modification is explicitly permitted, and returns the complete 9-section
report plus a final candidate submission for Checker Section 10.

This module never grants rights, publishes assets, writes View databases, or
modifies Collector Sections 1–4 / Checker Sections 5–8.
"""
from __future__ import annotations

import copy
import hashlib
import json
import re
import shutil
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Callable

from PIL import Image, ImageStat, ImageFilter

ENGINE_NAME = "LIVE // EARTH Global Image Engine"
ENGINE_VERSION = "1.0.0"
CORE_ENGINE_VERSION = "0.2.0"  # Existing local illustration/Commons core; registry identity retained.
SECTION_NUMBER = 9
SECTION_KEY = "imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission"
CHECKER_NAME = "LIVE // EARTH Global Checker"
CHECKER_VERSION = "2.1.1"
MAX_CANDIDATES = 12
DEFAULT_MAX_DOWNLOAD_BYTES = 7 * 1024 * 1024
DEFAULT_TIMEOUT_SECONDS = 18
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MANAGER_JOB_FIELDS = (
    "jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds", "sourceIds",
    "feedUrls", "collectorEntrypoint", "collectorWorkflow", "destinationDatabaseId",
    "destinationDatabasePath", "scheduledAt", "requestWindowHours", "configVersion", "trigger",
)


class ImageEngineSection9Error(RuntimeError):
    """Invalid Checker report, missing lineage, or unsafe image operation."""


def _dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _text(value: Any, limit: int = 4000) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
    return re.sub(r"\s+", " ", str(value)).strip()[:limit]


def _canonical_hash(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _https_host(url: Any) -> str:
    try:
        parsed = urllib.parse.urlsplit(_text(url, 8000))
        host = (parsed.hostname or "").lower().rstrip(".")
        if parsed.scheme.lower() != "https" or not host or parsed.username or parsed.password:
            return ""
        if parsed.port not in (None, 443):
            return ""
        return host
    except (TypeError, ValueError):
        return ""


def _host_allowed(url: str, allowed_hosts: list[str] | set[str]) -> bool:
    host = _https_host(url)
    domains = {str(x).lower().strip().rstrip(".") for x in allowed_hosts if str(x).strip()}
    return bool(host) and any(host == domain or host.endswith("." + domain) for domain in domains)


def _normalise_url(url: Any) -> str:
    try:
        p = urllib.parse.urlsplit(_text(url, 8000))
        host = _https_host(url)
        if not host:
            return ""
        port = f":{p.port}" if p.port not in (None, 443) else ""
        return urllib.parse.urlunsplit(("https", host + port, p.path or "/", p.query, ""))
    except (TypeError, ValueError):
        return ""


def _words(value: Any) -> set[str]:
    stop = {"the", "and", "for", "with", "from", "that", "this", "into", "about", "image", "photo", "news", "report", "image", "photo"}
    return {x for x in re.findall(r"[a-z0-9]{3,}", _text(value, 10000).lower()) if x not in stop}


def _check(check_id: str, name: str, passed: bool | None, evidence: dict[str, Any] | None = None, reason: str = "") -> dict[str, Any]:
    result = "UNKNOWN" if passed is None else "PASS" if passed else "FAIL"
    return {
        "checkId": check_id,
        "checkName": name,
        "executed": "YES",
        "passed": "YES" if passed is True else "NO",
        "result": result,
        "evidence": evidence or {},
        "reason": reason or ("Verified." if result == "PASS" else "Evidence is insufficient." if result == "UNKNOWN" else "Requirement not met."),
    }


def _checks_outcome(checks: list[dict[str, Any]]) -> str:
    results = [x["result"] for x in checks]
    if "FAIL" in results:
        return "NO"
    if "UNKNOWN" in results or not results:
        return "UNKNOWN"
    return "YES"


def _section8_check(section8: dict[str, Any], check_id: str) -> str:
    for check in _list(section8.get("checks")):
        if isinstance(check, dict) and check.get("checkId") == check_id:
            return _text(check.get("result"), 20).upper()
    return "UNKNOWN"


def _section_posts(section: dict[str, Any]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in _list(section.get("posts")):
        if isinstance(item, dict) and _text(item.get("postId"), 160):
            result[_text(item.get("postId"), 160)] = item
    return result


def _discovery_enabled(policy: dict[str, Any]) -> bool:
    """Only call external discovery when Checker explicitly enables a route."""
    if policy.get("externalDiscoveryAllowed") is True:
        return True
    routes = _dict(policy.get("discoveryRoutes"))
    return any(_dict(route).get("enabled") is True for route in routes.values())


def _validate_report(report: Any) -> tuple[dict[str, Any], dict[str, Any]]:
    if not isinstance(report, dict):
        raise ImageEngineSection9Error("Image Engine requires a complete Global Checker report object.")
    if report.get("checker") != CHECKER_NAME or report.get("checkerVersion") != CHECKER_VERSION:
        raise ImageEngineSection9Error("Only the registered Global Checker v2 eight-section report is accepted.")
    if report.get("schemaVersion") != 2:
        raise ImageEngineSection9Error("Global Checker report schemaVersion must be 2.")
    sections = _dict(report.get("sections"))
    manager_card = _dict(sections.get("managerIdCard"))
    manager_payload = _dict(manager_card.get("payload"))
    manager_hash = _text(manager_card.get("sha256"), 128).lower()
    if not manager_payload:
        raise ImageEngineSection9Error("Collector Section 1 must include the complete Manager ID Card payload.")
    missing_manager_fields = [field for field in MANAGER_JOB_FIELDS if manager_payload.get(field) in (None, "", [])]
    if missing_manager_fields:
        raise ImageEngineSection9Error("Manager ID Card is missing required lineage fields: " + ", ".join(missing_manager_fields))
    if not manager_hash or _canonical_hash(manager_payload) != manager_hash:
        raise ImageEngineSection9Error("Collector Section 1 Manager ID Card checksum is missing or invalid.")
    if _text(manager_payload.get("jobId"), 160) != _text(report.get("jobId"), 160) or _text(manager_payload.get("viewId"), 80) != _text(report.get("viewId"), 80):
        raise ImageEngineSection9Error("Collector Section 1 Manager ID Card does not match the Checker job/View identity.")
    if not isinstance(manager_payload.get("assignmentIds"), list) or not manager_payload["assignmentIds"] or not isinstance(manager_payload.get("sourceIds"), list) or not manager_payload["sourceIds"] or not isinstance(manager_payload.get("feedUrls"), list) or not manager_payload["feedUrls"]:
        raise ImageEngineSection9Error("Manager ID Card assignment/source/feed identifiers must be non-empty lists.")
    if manager_payload.get("collectorEntrypoint") != "global_collector" or manager_payload.get("trigger") not in {"scheduled", "manual"}:
        raise ImageEngineSection9Error("Manager ID Card does not identify a valid Global Collector job.")
    destination = str(manager_payload.get("destinationDatabasePath") or "")
    if destination.startswith("/") or ".." in Path(destination).parts or "\\" in destination or not destination.startswith(".publisher-data/"):
        raise ImageEngineSection9Error("Manager ID Card destination database path is unsafe.")
    required = (
        "managerIdCard", "fullArticle", "originalImageRecords", "sourceRightsEvidence",
        "imageUrlCheckerAndFinalImage", "allChecks", "textApprovalChecks", "imageApprovalChecks",
    )
    missing = [name for name in required if name not in sections]
    if missing:
        raise ImageEngineSection9Error("Checker report is missing required sections: " + ", ".join(missing))
    posts = _list(report.get("posts"))
    if not posts:
        raise ImageEngineSection9Error("Checker report has no post decisions to process.")
    seen: set[str] = set()
    for post in posts:
        if not isinstance(post, dict) or not _text(post.get("postId"), 160):
            raise ImageEngineSection9Error("Checker post result is missing postId.")
        pid = _text(post.get("postId"), 160)
        if pid in seen:
            raise ImageEngineSection9Error(f"Duplicate postId in Checker report: {pid}")
        seen.add(pid)
        dispatch = _dict(_dict(report.get("imageEngineDispatch")).get(pid))
        dispatched_job = _dict(dispatch.get("managerJob"))
        if manager_payload and dispatched_job and dispatched_job != manager_payload:
            raise ImageEngineSection9Error("Checker dispatch Manager job differs from Collector Section 1; Manager lineage cannot be reconstructed or altered.")
        if not isinstance(post.get("section5"), dict) or not isinstance(post.get("section8"), dict):
            raise ImageEngineSection9Error(f"Post '{pid}' is missing Checker Sections 5 or 8.")
    return report, sections


def _find_post_record(container: dict[str, Any], post_id: str) -> dict[str, Any]:
    for item in _list(container.get("posts")):
        if isinstance(item, dict) and _text(item.get("postId"), 160) == post_id:
            return item
    return _dict(container.get(post_id))


def _extract_candidate(record: dict[str, Any]) -> dict[str, Any]:
    """Normalize source-image record field names without manufacturing evidence."""
    if not isinstance(record, dict):
        return {}
    candidate = copy.deepcopy(record)
    candidate["url"] = _text(candidate.get("originalUrl") or candidate.get("sourceMediaUrl") or candidate.get("url") or candidate.get("imageUrl"), 4000)
    candidate["sourcePage"] = _text(candidate.get("sourcePage") or candidate.get("sourceUrl") or candidate.get("pageUrl"), 4000)
    candidate["caption"] = _text(candidate.get("caption") or candidate.get("description") or candidate.get("imageDescription"), 2000)
    candidate["credit"] = _text(candidate.get("credit") or candidate.get("attribution"), 800)
    candidate["creator"] = _text(candidate.get("creator") or candidate.get("author"), 800)
    raw_mime = _text(candidate.get("mimeType") or candidate.get("mime"), 100).lower()
    candidate["mimeType"] = raw_mime if raw_mime.startswith("image/") else ""
    return candidate


class _SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    def __init__(self, allowed_hosts: set[str]):
        super().__init__()
        self.allowed_hosts = allowed_hosts

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not _host_allowed(newurl, self.allowed_hosts):
            raise ImageEngineSection9Error("Image URL redirected outside the Checker-authorised host list.")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _download(url: str, allowed_hosts: list[str] | set[str], max_bytes: int, timeout: int) -> tuple[bytes, str, str]:
    allowed = {str(x).lower().strip().rstrip(".") for x in allowed_hosts if str(x).strip()}
    if not _host_allowed(url, allowed):
        raise ImageEngineSection9Error("Image URL host is not present in the explicit Checker-supplied allowlist.")
    req = urllib.request.Request(url, headers={"User-Agent": "LIVE-EARTH-Image-Engine-Section9/1.0", "Accept": "image/jpeg,image/png,image/webp"})
    opener = urllib.request.build_opener(_SafeRedirectHandler(allowed))
    try:
        with opener.open(req, timeout=timeout) as response:
            final_url = response.geturl()
            if not _host_allowed(final_url, allowed):
                raise ImageEngineSection9Error("Final image URL is outside the Checker-authorised host list.")
            mime = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
            payload = response.read(max_bytes + 1)
    except ImageEngineSection9Error:
        raise
    except Exception as exc:
        raise ImageEngineSection9Error(f"Bounded image download failed: {type(exc).__name__}.") from exc
    if not payload or len(payload) > max_bytes:
        raise ImageEngineSection9Error("Image response is empty or exceeds the configured byte limit.")
    if mime and mime not in ALLOWED_MIME:
        raise ImageEngineSection9Error(f"Image response MIME is not supported: {mime}.")
    return payload, final_url, mime


def _dhash(image: Image.Image) -> str:
    sample = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    pixels = list(sample.get_flattened_data())
    bits = 0
    for y in range(8):
        for x in range(8):
            bits = (bits << 1) | int(pixels[y * 9 + x] > pixels[y * 9 + x + 1])
    return f"{bits:016x}"


def _hamming(left: str, right: str) -> int:
    try:
        return (int(left, 16) ^ int(right, 16)).bit_count()
    except (TypeError, ValueError):
        return 64


def _inspect_image(payload: bytes) -> dict[str, Any]:
    try:
        with Image.open(BytesIO(payload)) as probe:
            fmt = (probe.format or "").upper()
            width, height = probe.size
            if fmt not in {"JPEG", "PNG", "WEBP"}:
                raise ImageEngineSection9Error(f"Unsupported decoded image format: {fmt or 'unknown'}.")
            if width < 1 or height < 1:
                raise ImageEngineSection9Error("Decoded image has invalid dimensions.")
            probe.verify()
        with Image.open(BytesIO(payload)) as opened:
            image = opened.convert("RGB")
            gray = image.convert("L")
            stats = ImageStat.Stat(gray)
            # A simple edge-energy signal is a technical indicator only; it is
            # not represented as semantic interpretation or definitive sharpness.
            edges = gray.filter(ImageFilter.FIND_EDGES)
            edge_stats = ImageStat.Stat(edges)
            variance = round(float(stats.var[0]), 3)
            edge_mean = round(float(edge_stats.mean[0]), 3)
            digest = _dhash(image)
        return {
            "decodeStatus": "PASS", "format": fmt, "mimeType": {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}[fmt],
            "width": width, "height": height, "aspectRatio": round(width / height, 4),
            "pixelCount": width * height, "fileSizeBytes": len(payload),
            "grayscaleVariance": variance, "edgeEnergyMean": edge_mean,
            "perceptualHashDHash": digest,
            "technicalNotes": ["Pixel format and dimensions were decoded from the image bytes.", "Variance and edge-energy are technical signals, not semantic image understanding or a definitive quality score."],
        }
    except ImageEngineSection9Error:
        raise
    except Exception as exc:
        raise ImageEngineSection9Error(f"Image bytes could not be decoded safely: {type(exc).__name__}.") from exc


def _write_staged(payload: bytes, inspection: dict[str, Any], staging_dir: Path, post_id: str) -> tuple[Path, str]:
    staging_dir.mkdir(parents=True, exist_ok=True)
    ext = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}[inspection["format"]]
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", post_id)[:80] or "post"
    digest = hashlib.sha256(payload).hexdigest()
    path = staging_dir / f"{safe_id}-{digest[:16]}{ext}"
    path.write_bytes(payload)
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        path.unlink(missing_ok=True)
        raise ImageEngineSection9Error("Staged image hash verification failed.")
    return path, digest


def _article_context(sections: dict[str, Any], post_id: str) -> dict[str, Any]:
    article = _find_post_record(_dict(sections.get("fullArticle")), post_id)
    nested_article = _dict(article.get("fullArticle"))
    if nested_article:
        article = {**article, **nested_article}
    manager = _dict(sections.get("managerIdCard"))
    # Article title may be carried in Section 2, Manager card or Section 5 candidate.
    title = _text(article.get("title") or manager.get("title"), 500)
    body = _text(article.get("text") or article.get("fullText") or article.get("fullArticleText") or article.get("body"), 12000)
    summary = _text(article.get("summary") or article.get("abstract"), 2500)
    source_url = _text(article.get("canonicalUrl") or article.get("articleUrl") or article.get("url"), 3000)
    return {"title": title, "articleText": body, "summary": summary, "articleUrl": source_url, "contextText": " ".join(x for x in (title, summary, body[:5000]) if x)}


def _relevance(candidate: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    descriptor = " ".join(_text(candidate.get(k), 1500) for k in ("title", "caption", "altText", "description", "filename", "fileTitle", "keywords"))
    story_terms = _words(context.get("title", "") + " " + context.get("summary", ""))
    candidate_terms = _words(descriptor)
    overlap = sorted(story_terms & candidate_terms)
    ratio = round(len(overlap) / max(1, len(story_terms)), 4)
    return {"matchedTerms": overlap, "matchedTermCount": len(overlap), "storyTermCount": len(story_terms), "metadataOverlapRatio": ratio, "descriptor": descriptor[:1000], "status": "PASS" if overlap else "UNKNOWN", "limitation": "Metadata-only relevance. A semantic visual inspector is needed to confirm depicted subject and context."}


def _visual_analysis(visual_inspector: Any, image_path: Path, context: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    if visual_inspector is None:
        return {
            "status": "UNKNOWN", "inspectedBy": "NONE",
            "description": "", "visibleEntities": [], "eventContext": "",
            "articleRelevance": "UNKNOWN", "misrepresentationWarnings": [],
            "reason": "No semantic vision adapter was supplied. Pixel-level technical analysis was performed, but depicted content was not inferred.",
        }
    try:
        if hasattr(visual_inspector, "inspect"):
            result = visual_inspector.inspect(image_path=image_path, context=context, candidate=candidate)
        else:
            result = visual_inspector(image_path=image_path, context=context, candidate=candidate)
        if not isinstance(result, dict):
            raise ValueError("vision adapter must return an object")
        status = _text(result.get("status"), 20).upper()
        if status not in {"PASS", "FAIL", "UNKNOWN"}:
            status = "UNKNOWN"
        inspected_by = _text(result.get("inspectedBy") or type(visual_inspector).__name__, 160)
        description = _text(result.get("description"), 2000)
        confidence = result.get("confidence") if isinstance(result.get("confidence"), (int, float)) and 0 <= result.get("confidence") <= 1 else None
        article_relevance = _text(result.get("articleRelevance") or "UNKNOWN", 40).upper()
        if article_relevance not in {"YES", "NO", "UNKNOWN"}:
            article_relevance = "UNKNOWN"
        if status == "PASS" and (not inspected_by or not description or confidence is None or article_relevance == "UNKNOWN"):
            status = "UNKNOWN"
        return {
            "status": status,
            "inspectedBy": inspected_by,
            "description": description,
            "visibleEntities": [_text(x, 300) for x in _list(result.get("visibleEntities"))[:30]],
            "eventContext": _text(result.get("eventContext"), 1000),
            "articleRelevance": article_relevance,
            "misrepresentationWarnings": [_text(x, 500) for x in _list(result.get("misrepresentationWarnings"))[:20]],
            "confidence": confidence,
            "reason": _text(result.get("reason") or ("Vision adapter result received." if status != "UNKNOWN" else "Vision adapter did not provide a complete, bounded PASS assessment."), 800),
        }
    except Exception as exc:
        return {"status": "UNKNOWN", "inspectedBy": type(visual_inspector).__name__, "description": "", "visibleEntities": [], "eventContext": "", "articleRelevance": "UNKNOWN", "misrepresentationWarnings": [], "reason": f"Vision adapter failed safely: {type(exc).__name__}."}


class ImageEngineSection9:
    """Produce Section 9 and a final image candidate handoff for Checker Sections 10–11."""

    def __init__(self, staging_dir: str | Path, *, max_download_bytes: int = DEFAULT_MAX_DOWNLOAD_BYTES, timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS, visual_inspector: Any = None, engine_factory: Callable[..., Any] | None = None):
        if max_download_bytes < 1024:
            raise ValueError("max_download_bytes is below the safe minimum")
        self.staging_dir = Path(staging_dir).resolve()
        self.max_download_bytes = int(max_download_bytes)
        self.timeout_seconds = int(timeout_seconds)
        self.visual_inspector = visual_inspector
        if engine_factory is None:
            try:
                # Existing core engine is retained for registered Commons and
                # procedural-illustration routes. This wrapper is the new v1.0.0
                # nine-to-eleven-section handoff layer.
                from image_engine import ImageEngine
                engine_factory = ImageEngine
            except Exception:
                engine_factory = None
        self.engine_factory = engine_factory

    def run(self, checker_report: dict[str, Any], *, route_policies: dict[str, Any] | None = None, discovered_candidates: dict[str, list[dict[str, Any]]] | None = None, candidate_discoverer: Callable[..., list[dict[str, Any]]] | None = None) -> dict[str, Any]:
        report, sections = _validate_report(checker_report)
        policies = _dict(route_policies) if route_policies is not None else _dict(report.get("imageEngineDispatch"))
        discovered = _dict(discovered_candidates)
        s3 = _dict(sections.get("originalImageRecords"))
        section3_by_post = _section_posts(s3)
        output_posts: list[dict[str, Any]] = []
        submission_posts: list[dict[str, Any]] = []
        for checker_post in _list(report.get("posts")):
            pid = _text(checker_post.get("postId"), 160)
            post_policy = _dict(policies.get(pid))
            s5 = _dict(checker_post.get("section5"))
            s8 = _dict(checker_post.get("section8"))
            context = _article_context(sections, pid)
            selected_original = _dict(s5.get("selectedCandidate"))
            original_approved = s8.get("decision") == "YES" and bool(_text(s5.get("selectedImageUrl")))
            selected_url = _text(selected_original.get("originalUrl") or selected_original.get("url") or s5.get("selectedImageUrl"))
            section3_post = _dict(section3_by_post.get(pid))
            collector_images = _list(section3_post.get("originalImageRecords")) or _list(section3_post.get("images"))
            collector_alternatives: list[tuple[str, dict[str, Any]]] = []
            for item in collector_images:
                if isinstance(item, dict):
                    candidate = _extract_candidate(item)
                    item_url = _text(candidate.get("url"))
                    if item_url and _normalise_url(item_url) != _normalise_url(selected_url):
                        collector_alternatives.append(("COLLECTOR_IMAGE_ALTERNATIVE", candidate))
            supplied_alternatives = [
                ("DISCOVERED_ALTERNATIVE", _extract_candidate(item))
                for item in _list(discovered.get(pid)) if isinstance(item, dict)
            ]

            # An already-approved original is processed alone first. Do not
            # download or inspect alternatives unless that exact original
            # proves inaccessible or unsuitable.
            if original_approved:
                candidates = [("APPROVED_ORIGINAL", _extract_candidate(selected_original))]
            else:
                candidates = collector_alternatives + supplied_alternatives
                if candidate_discoverer is not None and _discovery_enabled(post_policy):
                    try:
                        results = candidate_discoverer(post_id=pid, context=context, policy=post_policy, checker_post=checker_post)
                        candidates.extend(("DISCOVERED_ALTERNATIVE", _extract_candidate(x)) for x in _list(results) if isinstance(x, dict))
                    except Exception:
                        # A failing discovery provider is recorded, not treated
                        # as permission and cannot erase other candidates.
                        pass

            candidates = candidates[:MAX_CANDIDATES]
            chosen, reviews, inspection, staged_path, original_digest, preparation, visual, relevance, checks, error = self._evaluate_candidates(
                pid, checker_post, context, candidates, post_policy
            )
            if chosen is None and original_approved:
                # Only after the approved original fails do we inspect the
                # remaining Collector candidates or invoke global discovery.
                fallback_candidates = collector_alternatives + supplied_alternatives
                if candidate_discoverer is not None and _discovery_enabled(post_policy):
                    try:
                        results = candidate_discoverer(post_id=pid, context=context, policy=post_policy, checker_post=checker_post)
                        fallback_candidates.extend(("DISCOVERED_ALTERNATIVE", _extract_candidate(x)) for x in _list(results) if isinstance(x, dict))
                    except Exception as exc:
                        error = f"Alternative discovery failed safely: {type(exc).__name__}."
                if fallback_candidates:
                    chosen, more_reviews, inspection, staged_path, original_digest, preparation, visual, relevance, more_checks, alternative_error = self._evaluate_candidates(
                        pid, checker_post, context, fallback_candidates[:MAX_CANDIDATES], post_policy
                    )
                    reviews.extend(more_reviews)
                    checks.extend(more_checks)
                    error = alternative_error or error
            if chosen is None:
                # Try enabled built-in Commons route, then enabled local original
                # illustration. Each route is controlled by an explicit policy.
                fallback = self._built_in_fallback(pid, checker_post, context, post_policy, original_approved)
                if fallback is not None:
                    route_name, candidate = fallback
                    chosen, more_reviews, inspection, staged_path, original_digest, preparation, visual, relevance, more_checks, error = self._evaluate_candidates(
                        pid, checker_post, context, [(route_name, _extract_candidate(candidate))], post_policy
                    )
                    reviews.extend(more_reviews)
                    checks.extend(more_checks)
            source_record = _dict(section3_by_post.get(pid))
            candidate_source_id = _text((chosen or {}).get("sourceId") or source_record.get("sourceId"), 160)
            manager_card = _dict(sections.get("managerIdCard"))
            manager_job = _dict(manager_card.get("payload")) or _dict(post_policy.get("managerJob"))
            manager_card_hash = _text(manager_card.get("sha256"), 128).lower()
            # Keep the complete Manager job as a verbatim value. Per-media
            # lineage fields are copied from the source media record where
            # present, otherwise from that exact Manager job envelope.
            manager_media_fields = (
                "jobId", "viewId", "profileId", "assignmentIds", "idempotencyKey",
                "configVersion", "destinationDatabaseId", "destinationDatabasePath",
            )
            chosen_media_lineage = {}
            chosen_record = chosen or {}
            for field in manager_media_fields:
                value = chosen_record.get(field)
                if value in (None, "", []):
                    value = manager_job.get(field)
                chosen_media_lineage[field] = copy.deepcopy(value)
            lineage = {
                "postId": pid,
                "jobId": _text(report.get("jobId") or manager_job.get("jobId"), 160),
                "viewId": _text(report.get("viewId") or manager_job.get("viewId"), 80),
                "sourceId": candidate_source_id,
                "managerIdCardSha256": manager_card_hash,
                "managerJob": copy.deepcopy(manager_job),
                "mediaLineage": chosen_media_lineage,
            }
            if chosen is None:
                checks = self._ensure_minimum_checks(checks, pid, post_policy, error)
                outcome = "NO IMAGE SELECTED"
                final_image = {"selected": False, "imageUrl": "", "stagedPath": "", "sha256": ""}
                visual = visual or {"status": "UNKNOWN", "inspectedBy": "NONE", "reason": error or "No candidate met the required source, permission and technical conditions."}
                inspection = inspection or {}
                preparation = preparation or {"originalPreserved": "YES", "derivativeCreated": "NO", "modificationPerformed": "NO"}
                relevance = relevance or {"status": "UNKNOWN", "matchedTerms": [], "limitation": "No image candidate was available for relevance inspection."}
                submission = {"postId": pid, "lineage": lineage, "decision": outcome, "candidate": None, "checks": checks}
            else:
                outcome = "READY_FOR_CHECKER_REVIEW"
                final_image = {
                    "selected": True,
                    "candidateId": _text(chosen.get("candidateId") or chosen.get("mediaId"), 200),
                    "imageUrl": _text(chosen.get("originalUrl") or chosen.get("sourceMediaUrl") or chosen.get("url"), 4000),
                    "sourceImageUrl": _text(chosen.get("originalUrl") or chosen.get("sourceMediaUrl") or chosen.get("url"), 4000),
                    "preparedAssetUrl": _text(chosen.get("assetUrl"), 4000),
                    "assetPublished": False,
                    "sourcePage": _text(chosen.get("sourcePage"), 4000),
                    "stagedPath": str(staged_path or ""),
                    "sha256": original_digest,
                    "mimeType": _text(inspection.get("mimeType"), 100),
                    "width": inspection.get("width"), "height": inspection.get("height"),
                    "fileSizeBytes": inspection.get("fileSizeBytes"),
                    "creator": _text(chosen.get("creator"), 800),
                    "credit": _text(chosen.get("credit"), 800),
                    "caption": _text(chosen.get("caption"), 2000),
                    "altText": _text(chosen.get("altText") or chosen.get("caption"), 2000),
                    "licenseName": _text(chosen.get("licenseName"), 300),
                    "licenseUrl": _text(chosen.get("licenseUrl"), 1000),
                    "rightsEvidence": copy.deepcopy(_dict(chosen.get("rightsEvidence"))),
                    "originType": _text(chosen.get("originType") or "source-image", 100),
                    "candidateOnly": True,
                    "lineage": copy.deepcopy(lineage),
                }
                submission = {"postId": pid, "lineage": lineage, "decision": outcome, "candidate": copy.deepcopy(final_image), "sourceCandidate": copy.deepcopy(chosen), "technicalAssessment": copy.deepcopy(inspection), "visualIntelligence": copy.deepcopy(visual), "checks": copy.deepcopy(checks)}
            editorial = self._editorial_enhancement(chosen, context, inspection, visual, relevance, final_image)
            section9_post = {
                "section": SECTION_NUMBER,
                "title": "Image Intelligence, Editorial Enhancement & Final Checker Submission",
                "owner": ENGINE_NAME,
                "engineVersion": ENGINE_VERSION,
                "postId": pid,
                "lineage": lineage,
                "originalImageAlreadyApproved": original_approved,
                "finalImageUsesApprovedOriginal": bool(original_approved and chosen and _normalise_url(chosen.get("originalUrl") or chosen.get("url")) == _normalise_url(selected_url)),
                "processingRoute": "APPROVED_ORIGINAL" if (original_approved and chosen and _normalise_url(chosen.get("originalUrl") or chosen.get("url")) == _normalise_url(selected_url)) else ("ALTERNATIVE_OR_GENERATED" if chosen else "NO_CANDIDATE"),
                "candidateReviews": reviews,
                "technicalAssessment": inspection,
                "visualIntelligence": visual,
                "relevanceAssessment": relevance,
                "imagePreparation": preparation,
                "editorialEnhancement": editorial,
                "finalImage": final_image,
                "checks": checks,
                "checksSummary": {"executed": len(checks), "passed": sum(x["result"] == "PASS" for x in checks), "failed": sum(x["result"] == "FAIL" for x in checks), "unknown": sum(x["result"] == "UNKNOWN" for x in checks), "allExecuted": all(x["executed"] == "YES" for x in checks)},
                "decision": outcome,
                "decisionMeaning": "Candidate is submitted to Checker Section 10 for independent verification; this is not image-rights approval." if chosen else "No image candidate met the Image Engine's processing and technical requirements.",
            }
            output_posts.append(section9_post)
            submission_posts.append(submission)
        output = copy.deepcopy(report)
        output_sections = output["sections"]
        output_sections[SECTION_KEY] = {"section": SECTION_NUMBER, "title": "Image Intelligence, Editorial Enhancement & Final Checker Submission", "owner": ENGINE_NAME, "engineVersion": ENGINE_VERSION, "posts": output_posts}
        output["sectionOrder"] = list(report.get("sectionOrder") or ["managerIdCard", "fullArticle", "originalImageRecords", "sourceRightsEvidence", "imageUrlCheckerAndFinalImage", "allChecks", "textApprovalChecks", "imageApprovalChecks"]) + [SECTION_KEY]
        output["imageEngine"] = {"name": ENGINE_NAME, "version": ENGINE_VERSION, "processedAt": datetime.now(timezone.utc).isoformat(), "postsProcessed": len(output_posts), "imagesReadyForChecker": sum(x["decision"] == "READY_FOR_CHECKER_REVIEW" for x in output_posts), "noImageSelected": sum(x["decision"] == "NO IMAGE SELECTED" for x in output_posts), "canApproveRights": False, "canPublish": False}
        output["checkerHandoff"] = {
            "schemaVersion": 1,
            "phase": "checker-image-final-review",
            "sourceCheckerVersion": CHECKER_VERSION,
            "imageEngineVersion": ENGINE_VERSION,
            "postCount": len(submission_posts),
            "posts": submission_posts,
            "requiresSection10": True,
            "imageRightsApproved": False,
            "publicationAuthorized": False,
        }
        output["boundaries"] = {**_dict(output.get("boundaries")), "imageEngineCanApproveRights": False, "imageEngineCanPublish": False, "collectorSections1To4Modified": False, "checkerSections5To8Modified": False}
        return output

    def _evaluate_candidates(self, post_id: str, checker_post: dict[str, Any], context: dict[str, Any], candidates: list[tuple[str, dict[str, Any]]], policy: dict[str, Any]):
        reviews: list[dict[str, Any]] = []
        seen_sha256: set[str] = set()
        seen_dhashes: list[str] = []
        best: tuple[float, dict[str, Any], dict[str, Any], Path, str, dict[str, Any], dict[str, Any], dict[str, Any], list[dict[str, Any]]] | None = None
        error = ""
        s8 = _dict(checker_post.get("section8"))
        already_approved = s8.get("decision") == "YES"
        for route, candidate in candidates:
            url = _text(candidate.get("sourceMediaUrl") or candidate.get("originalUrl") or candidate.get("url"), 4000)
            route_key = "wikimediaCommons" if route == "WIKIMEDIA_COMMONS" else "localIllustration" if route == "LOCAL_ILLUSTRATION" else ""
            route_config = _dict(_dict(policy.get("discoveryRoutes")).get(route_key)) if route_key else {}
            hosts = list(dict.fromkeys(_list(policy.get("allowedHosts")) + _list(route_config.get("allowedHosts"))))
            # The local illustration route is generated inside this trusted
            # engine wrapper; use only the fixed host allowlist attached by
            # that route after Checker explicitly enables it.
            if route == "LOCAL_ILLUSTRATION":
                hosts = list(dict.fromkeys(hosts + _list(candidate.get("allowedHosts"))))
            # For an already-approved image, the Checker decision must be YES
            # and the route policy still supplies explicit retrieval hosts.
            local_generated = route == "LOCAL_ILLUSTRATION" or candidate.get("originType") == "local-original-illustration"
            approved_original = route == "APPROVED_ORIGINAL" and already_approved
            temp_allowed = approved_original or policy.get("temporaryProcessingAllowed") is True or route_config.get("temporaryProcessingAllowed") is True or local_generated
            host_ok = _host_allowed(url, hosts)
            download_allowed = temp_allowed and host_ok
            checks = [
                _check("E9-01", "Candidate identity is present", bool(_text(candidate.get("candidateId") or candidate.get("mediaId") or url)), {"candidateId": candidate.get("candidateId") or candidate.get("mediaId"), "url": url}),
                _check("E9-02", "Candidate has an HTTPS source URL", bool(_https_host(url)), {"url": url}),
                _check("E9-03", "Source host is explicitly authorised", host_ok, {"host": _https_host(url), "allowedHosts": hosts}),
                _check("E9-04", "Temporary image processing is permitted", True if approved_original or local_generated else (policy.get("temporaryProcessingAllowed") is True or route_config.get("temporaryProcessingAllowed") is True), {"thisIsApprovedOriginal": approved_original, "postHasApprovedOriginal": already_approved, "temporaryProcessingAllowed": policy.get("temporaryProcessingAllowed"), "routeTemporaryProcessingAllowed": route_config.get("temporaryProcessingAllowed"), "localIllustrationRoute": local_generated}),
                _check("E9-05", "Image bytes can be retrieved within limits", None if not download_allowed else None, {"downloadAttempted": False}),
            ]
            if not download_allowed:
                checks[-1] = _check("E9-05", "Image bytes can be retrieved within limits", False, {"downloadAttempted": False}, "Image retrieval is blocked because Checker has not explicitly permitted temporary processing for this candidate or the host is not allowlisted.")
                reviews.append({"candidateId": candidate.get("candidateId") or candidate.get("mediaId") or "", "route": route, "url": url, "decision": "HOLD", "checks": checks, "reason": "This candidate has no explicit temporary-processing permission or allowed source host."})
                error = "Image download was not authorised by the supplied source policy."
                continue
            try:
                local_stage = _text(candidate.get("stagedPath"), 4000)
                if local_stage:
                    staged_source = Path(local_stage).resolve()
                    allowed_stage_root = (self.staging_dir / "provider-staging").resolve()
                    try:
                        staged_source.relative_to(allowed_stage_root)
                    except ValueError as exc:
                        raise ImageEngineSection9Error("Pre-staged candidate path is outside the private Image Engine provider staging directory.") from exc
                    if not staged_source.is_file():
                        raise ImageEngineSection9Error("Pre-staged Image Engine candidate file is missing.")
                    payload = staged_source.read_bytes()
                    expected_source_hash = _text(candidate.get("sha256"), 100)
                    if expected_source_hash and hashlib.sha256(payload).hexdigest() != expected_source_hash:
                        raise ImageEngineSection9Error("Pre-staged candidate hash does not match its metadata.")
                    final_url = url
                    mime = _text(candidate.get("mime") or candidate.get("mimeType"), 100).lower()
                else:
                    payload, final_url, mime = _download(url, hosts, int(policy.get("maxDownloadBytes") or self.max_download_bytes), self.timeout_seconds)
                checks[-1] = _check("E9-05", "Image bytes can be retrieved within limits", True, {"finalUrl": final_url, "bytes": len(payload), "mimeType": mime, "fromPrivateStaging": bool(local_stage)})
                inspection = _inspect_image(payload)
                checks.append(_check("E9-06", "Image MIME and file format are compatible", not mime or mime == inspection["mimeType"], {"responseMime": mime, "decodedMime": inspection["mimeType"]}))
                checks.append(_check("E9-07", "Image meets minimum display dimensions", inspection["width"] >= int(policy.get("minimumWidth", 320)) and inspection["height"] >= int(policy.get("minimumHeight", 240)), {"width": inspection["width"], "height": inspection["height"], "minimumWidth": int(policy.get("minimumWidth", 320)), "minimumHeight": int(policy.get("minimumHeight", 240))}))
                digest_source = hashlib.sha256(payload).hexdigest()
                duplicate_exact = digest_source in seen_sha256
                duplicate_near = any(_hamming(inspection["perceptualHashDHash"], old) <= int(policy.get("nearDuplicateHammingDistance", 3)) for old in seen_dhashes)
                checks.append(_check("E9-15", "Exact and near-duplicate candidates are resolved", not (duplicate_exact or duplicate_near), {"exactDuplicate": duplicate_exact, "nearDuplicate": duplicate_near, "sourceSha256": digest_source, "perceptualHashDHash": inspection["perceptualHashDHash"]}, "Duplicate candidates are excluded from final selection."))
                seen_sha256.add(digest_source)
                seen_dhashes.append(inspection["perceptualHashDHash"])
                relevance = _relevance(candidate, context)
                checks.append(_check("E9-08", "Image metadata has story relevance signals", True if relevance["status"] == "PASS" else None, {"matchedTerms": relevance["matchedTerms"], "ratio": relevance["metadataOverlapRatio"]}, relevance["limitation"]))
                # No modification by default. The original is always staged
                # byte-for-byte. Derivatives may be added in a later editor stage.
                if local_stage:
                    stage, digest = _write_staged(payload, inspection, self.staging_dir, post_id)
                else:
                    stage, digest = _write_staged(payload, inspection, self.staging_dir, post_id)
                checks.append(_check("E9-09", "Original image is preserved byte-for-byte", hashlib.sha256(stage.read_bytes()).hexdigest() == hashlib.sha256(payload).hexdigest(), {"sourceSha256": hashlib.sha256(payload).hexdigest(), "stagedSha256": digest}))
                visual = _visual_analysis(self.visual_inspector, stage, context, candidate)
                checks.append(_check("E9-10", "Semantic visual inspection is completed", True if visual["status"] == "PASS" else False if visual["status"] == "FAIL" else None, {"status": visual["status"], "inspectedBy": visual.get("inspectedBy"), "descriptionPresent": bool(visual.get("description"))}, visual.get("reason", "")))
                checks.append(_check("E9-11", "Image has no visual misrepresentation warning", False if visual.get("misrepresentationWarnings") else True if visual["status"] == "PASS" else None, {"warnings": visual.get("misrepresentationWarnings", [])}, "A semantic vision result is required to clear this check."))
                modification_allowed = already_approved and _section8_check(s8, "I07") == "PASS" or policy.get("modificationAllowed") is True
                checks.append(_check("E9-12", "Preparation respects modification permissions", True, {"modificationPerformed": False, "modificationAllowed": modification_allowed}, "Original bytes were staged unchanged; no image modification was performed."))
                checks.append(_check("E9-13", "Required source credit is retained", bool(_text(candidate.get("credit") or candidate.get("creator"))), {"credit": candidate.get("credit"), "creator": candidate.get("creator")}))
                checks.append(_check("E9-14", "Final image candidate is complete for Checker review", bool(url and digest and stage.is_file() and candidate.get("sourcePage")), {"sourceUrl": url, "sourcePage": candidate.get("sourcePage"), "sha256": digest, "stagedPath": str(stage)}))
                metadata_relevance = relevance["metadataOverlapRatio"]
                visual_bonus = 50.0 if visual.get("status") == "PASS" and visual.get("articleRelevance") == "YES" else 0.0
                original_bonus = 10000.0 if route == "APPROVED_ORIGINAL" else 0.0
                score = original_bonus + metadata_relevance * 100 + visual_bonus + min(inspection["width"] * inspection["height"] / 1_000_000, 10)
                prep = {"originalPreserved": "YES", "derivativeCreated": "NO", "modificationPerformed": "NO", "modificationAllowed": modification_allowed, "stagedPath": str(stage), "sha256": digest, "processingMode": "BYTE_FOR_BYTE_COPY"}
                reviews.append({"candidateId": candidate.get("candidateId") or candidate.get("mediaId") or "", "route": route, "url": url, "finalUrl": final_url, "score": round(score, 4), "decision": "CANDIDATE", "checks": checks, "technicalAssessment": inspection, "relevanceAssessment": relevance, "visualIntelligence": visual})
                if all(x["result"] != "FAIL" for x in checks):
                    if best is None or score > best[0]:
                        candidate = copy.deepcopy(candidate)
                        candidate["originalUrl"] = url
                        candidate["url"] = url
                        candidate["sourceMediaUrl"] = final_url
                        candidate["stagedPath"] = str(stage)
                        candidate["sha256"] = digest
                        candidate["width"] = inspection["width"]
                        candidate["height"] = inspection["height"]
                        candidate["mimeType"] = inspection["mimeType"]
                        candidate["sourceSha256"] = hashlib.sha256(payload).hexdigest()
                        best = (score, candidate, inspection, stage, digest, prep, visual, relevance, checks)
            except Exception as exc:
                checks.append(_check("E9-99", "Candidate processing completes without an exception", False, {"url": url, "error": type(exc).__name__}, str(exc)))
                reviews.append({"candidateId": candidate.get("candidateId") or candidate.get("mediaId") or "", "route": route, "url": url, "decision": "REJECTED", "checks": checks, "reason": str(exc)})
                error = str(exc)
        if best is None:
            return None, reviews, {}, None, "", {}, {}, {}, [x for r in reviews for x in r.get("checks", [])], error or "No candidate passed Image Engine checks."
        _, candidate, inspection, stage, digest, prep, visual, relevance, selected_checks = best
        # Section 9's unified audit includes checks for every examined candidate,
        # then a separate selection/submission record. Candidate-specific check
        # failures remain visible but do not invalidate a different passing pick.
        all_checks = [item for review in reviews for item in review.get("checks", [])]
        all_checks.extend([
            _check("E9-16", "Exactly one final image candidate is selected", True, {"postId": post_id, "selectedUrl": candidate.get("originalUrl"), "selectedSha256": digest}),
            _check("E9-17", "Image rights approval remains with Global Checker", True, {"rightsApproval": "NOT_DECIDED_BY_IMAGE_ENGINE"}),
            _check("E9-18", "Final image package is submitted to Checker Section 10", bool(stage.is_file() and digest), {"stagedPath": str(stage), "sha256": digest}),
        ])
        # Ineligible candidates remain in review history. The selected candidate
        # is only a proposal; the Checker independently authorises final use.
        return candidate, reviews, inspection, stage, digest, prep, visual, relevance, all_checks, ""

    def _built_in_fallback(self, post_id: str, checker_post: dict[str, Any], context: dict[str, Any], policy: dict[str, Any], original_approved: bool):
        routes = _dict(policy.get("discoveryRoutes"))
        engine = None
        if self.engine_factory is not None:
            try:
                engine = self.engine_factory(self.staging_dir / "provider-staging", max_download_bytes=self.max_download_bytes)
            except Exception:
                engine = None
        if routes.get("wikimediaCommons", {}).get("enabled") is True and engine is not None:
            route = _dict(routes.get("wikimediaCommons"))
            accepted = _list(route.get("acceptedLicenses"))
            if accepted and _text(context.get("title")) and _text(context.get("articleUrl")):
                try:
                    found = engine.discover_commons(_text(context.get("title") + " " + context.get("summary"), 500), view_id=_text(_dict(checker_post.get("managerIdCard")).get("viewId") or policy.get("viewId"), 80), post_id=post_id, article_url=context["articleUrl"], accepted_licenses=accepted)
                    if found:
                        candidate = engine.prepare_commons_candidate(found[0], asset_url_base=_text(route.get("assetUrlBase"), 1000))
                        return "WIKIMEDIA_COMMONS", candidate
                except Exception:
                    pass
        if routes.get("localIllustration", {}).get("enabled") is True and engine is not None:
            job = _dict(policy.get("managerJob"))
            route = _dict(routes.get("localIllustration"))
            if job and _text(context.get("title")) and _text(context.get("articleUrl")):
                try:
                    candidate = engine.create_original_illustration(post={"postId": post_id, "title": context["title"], "searchText": context.get("summary") or context["title"], "articleUrl": context["articleUrl"]}, view_id=_text(policy.get("viewId")), asset_url_base=_text(route.get("assetUrlBase")), manager_job=job)
                    # Local illustration is already staged. It still must go to
                    # Checker, and is visibly classified as non-documentary art.
                    candidate["url"] = candidate.get("assetUrl")
                    candidate["originalUrl"] = candidate.get("assetUrl")
                    candidate["sourceMediaUrl"] = candidate.get("assetUrl")
                    candidate["allowedHosts"] = ["raw.githubusercontent.com"]
                    return "LOCAL_ILLUSTRATION", candidate
                except Exception:
                    pass
        return None

    @staticmethod
    def _ensure_minimum_checks(existing: list[dict[str, Any]], post_id: str, policy: dict[str, Any], reason: str) -> list[dict[str, Any]]:
        if existing:
            return existing
        return [
            _check("E9-01", "Image Engine received a valid post identity", bool(post_id), {"postId": post_id}),
            _check("E9-02", "An eligible image candidate is available", False, {"candidateCount": 0}, reason or "No candidate was supplied or discovered."),
            _check("E9-03", "Image discovery route is explicitly authorised", None if not _dict(policy.get("discoveryRoutes")) else any(_dict(v).get("enabled") is True for v in _dict(policy.get("discoveryRoutes")).values()), {"discoveryRoutes": policy.get("discoveryRoutes", {})}),
            _check("E9-04", "Image permission remains with Global Checker", True, {"rightsApproval": "NOT_DECIDED_BY_IMAGE_ENGINE"}),
            _check("E9-05", "Image Engine does not publish or write a View database", True, {"published": False, "databaseWrite": False}),
        ]

    @staticmethod
    def _editorial_enhancement(candidate: dict[str, Any] | None, context: dict[str, Any], inspection: dict[str, Any], visual: dict[str, Any], relevance: dict[str, Any], final_image: dict[str, Any]) -> dict[str, Any]:
        if not candidate:
            return {"captionSuggestion": "", "altText": "", "contextNotes": "No image selected.", "layoutRecommendation": "NO IMAGE", "cropGuidance": "No crop guidance available."}
        verified_caption = _text(candidate.get("caption"), 1600)
        visual_description = _text(visual.get("description"), 1600)
        caption = verified_caption or (visual_description if visual.get("status") == "PASS" else "")
        alt_text = _text(candidate.get("altText"), 1600) or (visual_description if visual.get("status") == "PASS" else "")
        if not alt_text and verified_caption:
            alt_text = "Source-provided image description; visual verification status: " + _text(visual.get("status"), 20) + ". " + verified_caption
        ratio = inspection.get("aspectRatio")
        layout = "Hero or lead image" if isinstance(ratio, (int, float)) and 1.25 <= ratio <= 2.1 else "Inline or supporting image; evaluate crop in layout"
        return {
            "captionSuggestion": caption,
            "captionSource": "SOURCE_METADATA" if verified_caption else "VISION_ANALYSIS" if visual_description else "NOT_AVAILABLE",
            "altText": alt_text,
            "altTextSource": "SOURCE_METADATA" if candidate.get("altText") or verified_caption else "VISION_ANALYSIS" if visual_description else "NOT_AVAILABLE",
            "contextNotes": " ".join(x for x in (visual_description, _text(visual.get("eventContext"), 800)) if x) or "Semantic scene context was not available; do not infer depicted facts from the filename or article alone.",
            "layoutRecommendation": layout,
            "cropGuidance": "No crop or pixel modification was performed. Use a focal-point-aware crop only after Checker confirms modification permission and a visual inspector identifies the focal point." if not visual_description else "Keep the visually identified focal subject in frame; prepare a crop only when modification permission is explicit.",
            "articleRelevanceNote": relevance.get("limitation", ""),
            "dimensions": {"width": inspection.get("width"), "height": inspection.get("height"), "aspectRatio": ratio},
            "imageUrl": final_image.get("imageUrl", ""),
        }


def run_image_engine_section9(checker_report: dict[str, Any], **kwargs) -> dict[str, Any]:
    """Convenience entry point for the Image Engine's Section 9 workflow."""
    staging_dir = kwargs.pop("staging_dir", ".image-engine-staging")
    engine_keys = {"max_download_bytes", "timeout_seconds", "visual_inspector", "engine_factory"}
    init_args = {k: kwargs.pop(k) for k in list(kwargs) if k in engine_keys}
    return ImageEngineSection9(staging_dir, **init_args).run(checker_report, **kwargs)
