#!/usr/bin/env python3
"""Universal, view-independent intake API for LIVE // EARTH Global Checker.

This module checks a Global Collector batch without editing its posts. It
validates Manager lineage, evaluates text and the post's single image, and
returns decisions only. It never writes story content, summarizes, rewrites,
moderates, ranks, publishes, or opens a destination database itself.

The caller may supply a SQLite connection used only for the internal audit log.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse
import hashlib
import json
import re
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
CHECKER_DIR = Path(__file__).resolve().parent
if str(CHECKER_DIR) not in sys.path:
    sys.path.insert(0, str(CHECKER_DIR))

import global_checker as core  # noqa: E402

try:  # Keep existing educational-source evaluation as the policy authority.
    import global_checker_policy_engine  # noqa: E402
    global_checker_policy_engine.install(core)
except ImportError:
    global_checker_policy_engine = None

UNIVERSAL_RECORD_SCHEMA = "LIVE_EARTH_UNIVERSAL_POST_V1"
UNIVERSAL_POST_FIELDS = (
    "schemaVersion", "postId", "sourcePostId", "viewId", "sourceId",
    "sourceName", "sourcePlatform", "sourceType", "sourceFeedUrl",
    "sourceWebsiteUrl", "originalUrl", "canonicalUrl", "title", "subtitle",
    "summary", "excerpt", "fullText", "fullTextHtml", "authorName",
    "authorId", "authorUrl", "contributors", "publishedAt", "updatedAt",
    "collectedAt", "language", "categories", "tags", "topics", "location",
    "media", "attachments", "links", "engagement", "rightsMetadata",
    "provenance", "sourceMetadata", "collectionContext",
)
UNIVERSAL_MEDIA_FIELDS = (
    "mediaId", "mediaType", "url", "originalUrl", "thumbnailUrl", "title",
    "caption", "altText", "creator", "credit", "licenseName", "licenseUrl",
    "rightsNotice", "mimeType", "width", "height", "durationSeconds",
    "fileSizeBytes", "sourcePage", "position", "metadata", "postId", "viewId",
    "sourceId", "jobId", "profileId", "assignmentIds", "idempotencyKey",
    "configVersion", "destinationDatabaseId", "destinationDatabasePath",
)
MANAGER_FIELDS = (
    "jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds",
    "sourceIds", "feedUrls", "collectorEntrypoint", "collectorWorkflow",
    "destinationDatabaseId", "destinationDatabasePath", "scheduledAt",
    "requestWindowHours", "configVersion", "trigger",
)
POST_LINEAGE_FIELDS = (
    "jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds",
    "sourceIds", "feedUrls", "collectorEntrypoint", "collectorWorkflow",
    "destinationDatabaseId", "destinationDatabasePath", "scheduledAt",
    "requestWindowHours", "configVersion", "trigger",
)
MEDIA_LINEAGE_FIELDS = (
    "postId", "viewId", "sourceId", "jobId", "profileId", "assignmentIds",
    "idempotencyKey", "configVersion", "destinationDatabaseId",
    "destinationDatabasePath",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _load_purpose_context() -> dict[str, Any]:
    path = CHECKER_DIR / "universal-use-context.json"
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"Universal project-use context is unavailable: {type(exc).__name__}.") from exc
    if value.get("schemaVersion") != 1 or value.get("independentAuthorization") is not False:
        raise ValueError("Universal project-use context is malformed or grants an invalid authorization effect.")
    return value


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)


def _is_https(value: Any) -> bool:
    try:
        parsed = urlparse(str(value or ""))
        return parsed.scheme.lower() == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password
    except ValueError:
        return False


def _host(value: Any) -> str:
    if not _is_https(value):
        return ""
    return (urlparse(str(value)).hostname or "").lower().rstrip(".")


def _host_matches(host: str, domains: Iterable[str]) -> bool:
    host = str(host or "").lower().rstrip(".")
    return bool(host) and any(
        host == str(domain).lower().rstrip(".")
        or host.endswith("." + str(domain).lower().rstrip("."))
        for domain in domains if domain
    )


def _same(a: Any, b: Any) -> bool:
    """Compare ID values without silently coercing lists to strings."""
    if isinstance(a, list) or isinstance(b, list):
        return isinstance(a, list) and isinstance(b, list) and sorted(map(str, a)) == sorted(map(str, b))
    return str(a if a is not None else "") == str(b if b is not None else "")


def _manager_job_errors(job: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(job, dict):
        return ["Manager job envelope is missing or is not an object."]
    missing = [field for field in MANAGER_FIELDS if field not in job or job[field] in (None, "", [])]
    if missing:
        errors.append("Manager job is missing required identity/routing fields: " + ", ".join(missing))
    for field in ("assignmentIds", "sourceIds", "feedUrls"):
        if field in job and (not isinstance(job[field], list) or not job[field]):
            errors.append(f"Manager field '{field}' must be a non-empty list.")
    if job.get("trigger") not in ("scheduled", "manual"):
        errors.append("Manager trigger must be 'scheduled' or 'manual'.")
    if job.get("collectorEntrypoint") != "global_collector":
        errors.append("Job does not identify the shared Global Collector entrypoint.")
    if isinstance(job.get("destinationDatabasePath"), str):
        path = job["destinationDatabasePath"]
        parts = Path(path).parts
        if Path(path).is_absolute() or ".." in parts or "\\" in path or not path.startswith(".publisher-data/"):
            errors.append("Manager destination database path is not a safe View-owned relative path.")
    return errors


def _install_wildcard_policy_resolution() -> None:
    """Extend the existing exact policy matcher to honour registry views=['*'].

    Explicit per-View policy lists remain intact. A future View can use a policy
    only when the central registry explicitly marks that policy as global.
    """
    if getattr(core, "_universal_policy_resolver_installed", False):
        return
    original = core._policy_for_story

    def resolve(view_id: str, story: dict[str, Any]):
        matched = original(view_id, story)
        if matched:
            return matched
        registry = core.load_registry()
        article_host = core._domain(story.get("url"))
        feed_host = core._domain(story.get("sourceUrl") or story.get("source_url"))
        source_name = core._clean(story.get("sourceName"), 160).casefold()
        feed_url = core._clean(story.get("sourceUrl") or story.get("source_url"), 1200)
        for policy in registry.get("policies", []):
            views = policy.get("views", ["*"])
            if "*" not in views:
                continue
            if not core._host_matches(article_host, policy.get("articleDomains", [])):
                continue
            domains = policy.get("feedDomains", [])
            if domains and not core._host_matches(feed_host, domains):
                continue
            feeds = policy.get("allowedFeedUrls", [])
            if feeds and feed_url not in feeds:
                continue
            names = [str(x).casefold() for x in policy.get("sourceNameContains", [])]
            if names and not any(term in source_name for term in names):
                continue
            return policy
        return None

    core._policy_for_story = resolve
    core._universal_policy_resolver_installed = True


_install_wildcard_policy_resolution()


def _decision(view_id: str, post_id: str, kind: str, verdict: str,
              allowed: bool, policy_id: str, policy_version: str,
              evidence: dict[str, Any], reasons: list[str],
              allowed_use: str = "none", attribution: str = "",
              summary_allowed: bool = False) -> dict[str, Any]:
    return core._decision(
        view_id=view_id, story_id=post_id, content_kind=kind, verdict=verdict,
        policy_id=policy_id, policy_version=policy_version, allowed=allowed,
        allowed_use=allowed_use, evidence=evidence, reasons=reasons,
        attribution=attribution, summary_allowed=summary_allowed,
    )


def _record_schema_errors(post: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    missing = [field for field in UNIVERSAL_POST_FIELDS if field not in post]
    extra = [field for field in post if field not in UNIVERSAL_POST_FIELDS]
    if missing:
        errors.append("Universal post is missing required fields: " + ", ".join(missing))
    if extra:
        errors.append("Universal post contains fields outside the shared schema: " + ", ".join(sorted(extra)))
    if post.get("schemaVersion") != 1:
        errors.append("Universal post schemaVersion must be 1.")
    for group_name in ("media", "attachments"):
        values = post.get(group_name, [])
        if values in (None, ""):
            continue
        if not isinstance(values, list):
            continue  # _image_candidates returns the detailed type error.
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue  # _image_candidates returns the malformed-item error.
            missing_media = [field for field in UNIVERSAL_MEDIA_FIELDS if field not in item]
            extra_media = [field for field in item if field not in UNIVERSAL_MEDIA_FIELDS]
            if missing_media:
                errors.append(f"{group_name}[{index}] is missing universal media fields: " + ", ".join(missing_media))
            if extra_media:
                errors.append(f"{group_name}[{index}] contains fields outside the shared media schema: " + ", ".join(sorted(extra_media)))
    return errors


def _validate_post_lineage(job: dict[str, Any], post: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    context = post.get("collectionContext")
    if not isinstance(context, dict):
        return ["Post collectionContext is missing."]
    if not post.get("postId"):
        errors.append("Post is missing postId.")
    if not post.get("sourceId") or post.get("sourceId") not in job.get("sourceIds", []):
        errors.append("Post sourceId is missing or not present in the Manager job.")
    if post.get("viewId") != job.get("viewId"):
        errors.append("Post viewId does not match the Manager job.")
    if post.get("sourceFeedUrl") not in job.get("feedUrls", []):
        errors.append("Post sourceFeedUrl is not present in the Manager job.")
    provenance = post.get("provenance") if isinstance(post.get("provenance"), dict) else {}
    assignment_id = provenance.get("assignmentId")
    if assignment_id not in job.get("assignmentIds", []):
        errors.append("Post provenance.assignmentId is missing or not present in the Manager job.")
    for field in POST_LINEAGE_FIELDS:
        if field not in context:
            errors.append(f"Post collectionContext is missing '{field}'.")
        elif not _same(context.get(field), job.get(field)):
            errors.append(f"Post collectionContext.{field} does not match the Manager job.")
    if not _same(context.get("sourceIds"), job.get("sourceIds")):
        if "Post collectionContext.sourceIds does not match the Manager job." not in errors:
            errors.append("Post collectionContext.sourceIds does not match the Manager job.")
    return errors


def _is_image_item(item: dict[str, Any]) -> bool:
    media_type = str(item.get("mediaType") or "").lower()
    mime = str(item.get("mimeType") or "").lower()
    url = str(item.get("url") or "")
    return media_type.startswith("image") or mime.startswith("image/") or bool(
        re.search(r"\.(jpg|jpeg|png|gif|webp|avif)(?:[?#].*)?$", url, re.I)
    )


def _image_candidates(post: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]:
    errors: list[str] = []
    candidates: list[dict[str, Any]] = []
    for group_name in ("media", "attachments"):
        values = post.get(group_name, [])
        if values in (None, ""):
            values = []
        if not isinstance(values, list):
            errors.append(f"Post {group_name} must be a list.")
            continue
        for value in values:
            if not isinstance(value, dict):
                errors.append(f"Post {group_name} contains a malformed media record.")
                continue
            if _is_image_item(value):
                candidates.append(value)
    if len(candidates) > 1:
        errors.append("One-post-one-image rule failed: more than one image is attached to this post.")
    return candidates[:1], errors


def _validate_image_lineage(job: dict[str, Any], post: dict[str, Any], image: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not image.get("mediaId"):
        errors.append("Image is missing its mediaId.")
    expected_by_field = {
        "postId": post.get("postId"), "viewId": post.get("viewId"),
        "sourceId": post.get("sourceId"),
    }
    for field in MEDIA_LINEAGE_FIELDS:
        expected = expected_by_field[field] if field in expected_by_field else job.get(field)
        if field not in image or not _same(image.get(field), expected):
            errors.append(f"Image lineage field '{field}' is missing or does not match its parent post/Manager job.")
    return errors


def _universal_story_view(post: dict[str, Any]) -> dict[str, Any]:
    rights = post.get("rightsMetadata") if isinstance(post.get("rightsMetadata"), dict) else {}
    return {
        "id": post.get("postId", ""),
        "title": post.get("title", ""),
        "summary": post.get("summary", ""),
        "url": post.get("canonicalUrl") or post.get("originalUrl", ""),
        "sourceUrl": post.get("sourceFeedUrl", ""),
        "sourceName": post.get("sourceName", ""),
        "author": post.get("authorName", ""),
        "creator": rights.get("creator", ""),
        "rightsNotice": rights.get("rightsNotice") or rights.get("copyrightNotice", ""),
        "licenseUrl": rights.get("licenseUrl", ""),
        "licenseName": rights.get("licenseName", ""),
        "credit": rights.get("credit") or rights.get("attribution", ""),
    }


def _lookup_text_policy(view_id: str, story: dict[str, Any]) -> dict[str, Any] | None:
    # Uses the same registry resolver as evaluate_text, including explicit '*'.
    return core._policy_for_story(view_id, story)


def _nested_paths(value: Any, prefix: str = "sourceMetadata") -> list[tuple[str, str, str]]:
    """Return non-empty textual leaves in sourceMetadata without retaining them."""
    found: list[tuple[str, str, str]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            path = f"{prefix}.{key}"
            key_name = str(key).casefold()
            if isinstance(child, (dict, list)):
                found.append((path, key_name, _json(child)))
                found.extend(_nested_paths(child, path))
            elif child not in (None, "", [], {}):
                found.append((path, key_name, str(child)))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            path = f"{prefix}[{index}]"
            if isinstance(child, (dict, list)):
                found.extend(_nested_paths(child, path))
            elif child not in (None, "", [], {}):
                found.append((path, "", str(child)))
    return found


def _field_restrictions(post: dict[str, Any], policy: dict[str, Any] | None,
                        text_decision: dict[str, Any]) -> list[dict[str, str]]:
    restrictions: list[dict[str, str]] = []
    if not policy:
        return restrictions
    text_policy = policy.get("text", {})
    permissions = text_policy.get("usePermissions", {})
    materials = text_policy.get("sourceMaterialPermissions", {})
    summary_allowed = bool(text_decision.get("summaryAllowed", False))

    if not summary_allowed:
        for field in ("summary", "excerpt"):
            if post.get(field):
                restrictions.append({
                    "field": field,
                    "rule": "must_not_store_or_display",
                    "reason": "The item-level Checker decision does not permit this summary/excerpt use.",
                })
        for path, key, _value in _nested_paths(post.get("sourceMetadata", {})):
            if key in {"summary", "description", "abstract", "excerpt", "teaser", "standfirst", "content:encoded"}:
                restrictions.append({
                    "field": path,
                    "rule": "must_not_store_or_display",
                    "reason": "This nested source payload contains summary/excerpt material that the item-level decision does not permit.",
                })

    if post.get("subtitle") and not bool(text_policy.get("allowSubtitle", False)):
        restrictions.append({
            "field": "subtitle", "rule": "must_not_store_or_display",
            "reason": "The source policy does not explicitly permit subtitle/subheadline use.",
        })

    if post.get("excerpt") and summary_allowed and post.get("excerpt") != post.get("summary") and not bool(text_policy.get("allowExcerpt", False)):
        restrictions.append({
            "field": "excerpt", "rule": "must_not_store_or_display",
            "reason": "The excerpt differs from the approved source summary and has no separate permission route.",
        })

    raw_text_storage = permissions.get("rawTextStorage", "unknown")
    full_article_temp = materials.get("fullArticleTemporaryProcessing", "unknown")
    allow_full_storage = bool(text_policy.get("allowFullTextStorage", False)) and raw_text_storage == "allowed"
    full_text_fields = ("fullText", "fullTextHtml")
    for field in full_text_fields:
        if post.get(field) and (full_article_temp != "allowed" or not allow_full_storage):
            reason = (
                "Full-article temporary processing is not explicitly permitted."
                if full_article_temp != "allowed"
                else "Raw full-article text storage is not explicitly permitted by the source policy."
            )
            restrictions.append({"field": field, "rule": "must_not_store", "reason": reason})

    raw_body_keys = {
        "fulltext", "fulltexthtml", "content", "contenthtml", "content_html",
        "content:encoded", "articlebody", "body", "bodytext", "contenttext",
    }
    summary_keys = {"summary", "description", "abstract", "excerpt", "teaser", "standfirst"}
    approved_summary = re.sub(r"\s+", " ", str(post.get("summary") or "")).strip()
    for path, key, nested_value in _nested_paths(post.get("sourceMetadata", {})):
        if key in summary_keys and summary_allowed:
            normalized_nested = re.sub(r"\s+", " ", nested_value).strip()
            if normalized_nested != approved_summary:
                restrictions.append({
                    "field": path, "rule": "must_not_store_or_display",
                    "reason": "This nested source summary/excerpt differs from the exact summary cleared by the Checker.",
                })
        if key in raw_body_keys and raw_text_storage != "allowed":
            restrictions.append({
                "field": path, "rule": "must_not_store",
                "reason": "The raw source payload contains full/body text but the registry does not permit raw-text storage.",
            })
        elif key in raw_body_keys and full_article_temp != "allowed":
            restrictions.append({
                "field": path, "rule": "must_not_store_or_process",
                "reason": "The registry does not explicitly permit full-article temporary processing for this route.",
            })

    # Deduplicate identical nested paths when both summary and raw-body rules apply.
    unique: dict[tuple[str, str], dict[str, str]] = {}
    for item in restrictions:
        unique[(item["field"], item["rule"])] = item
    return list(unique.values())


def _image_decision(view_id: str, post: dict[str, Any], image: dict[str, Any]) -> dict[str, Any]:
    registry = core.load_registry()
    image_policies = registry.get("imagePolicies", {})
    post_id = str(post.get("postId") or "missing-post-id")
    article_url = str(post.get("canonicalUrl") or post.get("originalUrl") or "")
    image_url = str(image.get("url") or "")
    source_page = str(image.get("sourcePage") or "")
    creator = str(image.get("creator") or "")
    credit = str(image.get("credit") or "")
    caption = str(image.get("caption") or "")
    license_name = str(image.get("licenseName") or "")
    license_url = str(image.get("licenseUrl") or "")
    rights_notice = str(image.get("rightsNotice") or "")
    metadata = image.get("metadata") if isinstance(image.get("metadata"), dict) else {}
    origin_type = str(metadata.get("originType") or metadata.get("imageOriginType") or image.get("originType") or "")
    engine_name = str(metadata.get("engine") or metadata.get("imageEngine") or image.get("engine") or "")
    engine_version = str(metadata.get("engineVersion") or metadata.get("imageEngineVersion") or image.get("engineVersion") or "")
    article_host, image_host, source_host = _host(article_url), _host(image_url), _host(source_page)
    evidence = {
        "articleUrl": article_url, "imageUrl": image_url, "sourcePage": source_page,
        "creator": creator, "credit": credit, "caption": caption,
        "licenseName": license_name, "licenseUrl": license_url,
        "rightsNotice": rights_notice, "originType": origin_type,
        "engine": engine_name, "engineVersion": engine_version,
    }
    policy_id, policy_version, allowed_use = "unregistered-image-policy", "1", "none"
    reasons: list[str] = []

    if not all((_is_https(article_url), _is_https(image_url), _is_https(source_page), credit.strip(), caption.strip())):
        reasons.append("Image article URL, image URL, exact source page, visible credit, and contextual caption are all required.")
        return _decision(view_id, post_id, "image", "UNKNOWN", False, policy_id, policy_version, evidence, reasons)

    descriptor = " ".join((image_url, source_page, creator, credit, caption, rights_notice,
                            str(image.get("title") or ""), str(image.get("altText") or ""))).casefold()
    restrictive = [marker for marker in getattr(core, "RESTRICTIVE_IMAGE_MARKERS", ()) if marker in descriptor]
    restrictive += [marker for marker in getattr(core, "RESTRICTIVE_TEXT_MARKERS", ()) if marker in descriptor and marker not in restrictive]

    # Image Engine's original illustration route is configuration-driven and
    # uses the assigned View's own published asset folder, never a fixed View list.
    if origin_type == "local-original-illustration":
        policy = image_policies.get("imageEngineOriginalIllustration", {})
        policy_id = str(policy.get("policyId", "image-engine-original-illustration-v1"))
        policy_version = str(policy.get("policyVersion", "1"))
        expected_path = f"/z8t8fp99p9-glitch/Live-Earth/main/{view_id}/published/assets/"
        parsed = urlparse(image_url)
        if policy.get("status") != "GREEN":
            reasons.append("The central Image Engine illustration policy is not GREEN.")
        elif engine_name != policy.get("engineName") or engine_version not in [str(x) for x in policy.get("acceptedEngineVersions", [])]:
            reasons.append("Image Engine identity/version does not match the central registry.")
        elif not _host_matches(image_host, [policy.get("publishedHost", "raw.githubusercontent.com")]) or not parsed.path.startswith(expected_path):
            reasons.append("Original artwork is outside the assigned View's exact published asset folder.")
        elif source_page != policy.get("generatorSourcePage"):
            reasons.append("Original artwork generator provenance does not match the central registry.")
        elif creator != policy.get("creator") or credit != policy.get("credit"):
            reasons.append("Original artwork creator/credit does not match the central registry.")
        elif license_name != policy.get("rightsLabel") or license_url:
            reasons.append("Original artwork rights label is missing or an external licence is asserted.")
        elif str(policy.get("requiredCaptionText", "")).casefold() not in caption.casefold():
            reasons.append("Original artwork caption does not disclose that it is non-documentary.")
        elif str(policy.get("requiredNonLiteralText", "")).casefold() not in caption.casefold():
            reasons.append("Original artwork caption does not say it is not a literal depiction.")
        elif str(policy.get("requiredRightsText", "")).casefold() not in rights_notice.casefold():
            reasons.append("Original artwork rights notice is missing.")
        elif "procedural" not in str(metadata.get("modificationNote") or image.get("modificationNote") or "").casefold():
            reasons.append("Original artwork creation/modification evidence is missing.")
        elif restrictive:
            reasons.append("A restrictive or third-party rights marker was found in the image metadata.")
        else:
            allowed_use = "illustrative-artwork-only"
        if reasons:
            return _decision(view_id, post_id, "image", "UNKNOWN", False, policy_id, policy_version, evidence, reasons)
        return _decision(view_id, post_id, "image", "GREEN", True, policy_id, policy_version,
                         evidence, ["Original illustration passed the registered provenance and disclosure checks."],
                         allowed_use=allowed_use, attribution=credit)

    # Registered generic image policies allow future Views without Python branches.
    for policy in image_policies.get("sourcePolicies", []):
        views = policy.get("views", ["*"])
        if view_id not in views and "*" not in views:
            continue
        if not _host_matches(article_host, policy.get("articleDomains", [])):
            continue
        if not _host_matches(image_host, policy.get("imageDomains", [])):
            continue
        if not _host_matches(source_host, policy.get("sourcePageDomains", [])):
            continue
        policy_id = str(policy.get("policyId", "registered-image-source-policy"))
        policy_version = str(policy.get("policyVersion", "1"))
        policy_status = str(policy.get("status", "UNKNOWN")).upper()
        accepted = [str(x).rstrip("/") for x in policy.get("acceptedLicenses", [])]
        if policy_status not in {"GREEN", "GREEN_CONDITIONAL", "AMBER_LIMITED"}:
            blocked_verdict = "RED" if policy_status == "RED" else "UNKNOWN"
            return _decision(view_id, post_id, "image", blocked_verdict, False, policy_id,
                             policy_version, evidence,
                             ["The generic image policy is not in a publishable registry status."])
        if policy.get("requireSourcePageEqualsArticle") and source_page != article_url:
            reasons.append("Image source page is not the exact originating article.")
        if policy.get("requireCreator", True) and not creator:
            reasons.append("Image creator is missing.")
        if policy.get("requireLicense", True) and license_url.rstrip("/") not in accepted:
            reasons.append("Image licence is missing or is not accepted by the central registry.")
        if policy.get("requireCredit", True) and not credit:
            reasons.append("Image attribution is missing.")
        if policy.get("requireCaption", True) and not caption:
            reasons.append("Contextual image caption is missing.")
        if policy.get("requireModificationNote", False) and not (metadata.get("modificationNote") or image.get("modificationNote")):
            reasons.append("Image modification record is missing.")
        if restrictive:
            reasons.append("A restrictive or third-party rights marker was found in image metadata.")
        if not reasons:
            allowed_use = str(policy.get("allowedUse", "registered-image-use"))
            generic_verdict = "AMBER" if policy_status == "AMBER_LIMITED" else "GREEN"
            return _decision(view_id, post_id, "image", generic_verdict, True, policy_id, policy_version,
                             evidence, ["The exact image matched its explicitly registered source policy."],
                             allowed_use=allowed_use, attribution=credit)
        return _decision(view_id, post_id, "image", "UNKNOWN", False, policy_id, policy_version, evidence, reasons)

    # NASA editorial images: exact originating article association is mandatory.
    nasa_policy = image_policies.get("nasa", {})
    if _host_matches(article_host, ["nasa.gov"]) and _host_matches(image_host, ["nasa.gov"]):
        policy_id, policy_version = "nasa-media-guidelines-item-screen-v2", str(nasa_policy.get("policyVersion", "2"))
        nasa_brands = tuple(getattr(core, "NASA_BRAND_MARKERS", ()))
        non_photo = tuple(getattr(core, "NON_PHOTOGRAPHIC_MARKERS", ()))
        if not nasa_policy.get("allowNASAEditorialUse", False):
            reasons.append("NASA editorial image route is not enabled in the central registry.")
        elif not _host_matches(source_host, ["nasa.gov"]):
            reasons.append("The original NASA article/source page is not recorded.")
        elif nasa_policy.get("requireOriginalStoryAssociation", True) and source_page != article_url:
            reasons.append("NASA image source page is not the exact originating article.")
        elif nasa_policy.get("rejectNASAInsigniaAndLogos", True) and any(m in descriptor for m in nasa_brands):
            reasons.append("NASA insignia, seals and logotypes are not cleared as documentary images.")
        elif nasa_policy.get("rejectConceptArtForDocumentaryPhotoSlot", True) and any(m in descriptor for m in non_photo):
            reasons.append("Concept art, diagrams, simulations and illustrations are not documentary photographs.")
        elif nasa_policy.get("rejectThirdPartyAndCopyrightSignals", True) and restrictive:
            reasons.append("Third-party or restrictive rights evidence was found.")
        else:
            allowed_use = "factual-context-only"
        if reasons:
            return _decision(view_id, post_id, "image", "RED" if restrictive or any(m in descriptor for m in nasa_brands + non_photo) else "UNKNOWN",
                             False, policy_id, policy_version, evidence, reasons)
        return _decision(view_id, post_id, "image", "GREEN", True, policy_id, policy_version,
                         evidence, ["The exact NASA article/image association passed source metadata screening."],
                         allowed_use=allowed_use, attribution=credit)

    # Commons file-page/licence checks are reusable for every View, not just Nature.
    commons_policy = image_policies.get("wikimediaCommons", {})
    if _host_matches(source_host, ["commons.wikimedia.org"]):
        policy_id, policy_version = "wikimedia-commons-individual-file-v1", str(commons_policy.get("policyVersion", "1"))
        accepted = [str(x).rstrip("/") for x in commons_policy.get("acceptedLicenses", [])]
        expected_creator = str(metadata.get("expectedCreator") or "")
        expected_license = str(metadata.get("expectedLicenseUrl") or "")
        if not _host_matches(image_host, ["upload.wikimedia.org", "raw.githubusercontent.com"]):
            reasons.append("Image file host is outside the approved Commons/publication asset boundary.")
        elif commons_policy.get("requireExactFilePage", True) and not source_page.startswith("https://commons.wikimedia.org/wiki/File:"):
            reasons.append("The exact Wikimedia Commons file-description page is required.")
        elif commons_policy.get("requireCreator", True) and not creator:
            reasons.append("Creator is missing from the exact Commons file record.")
        elif expected_creator and expected_creator.casefold() not in creator.casefold():
            reasons.append("Creator does not match the configured reviewed file record.")
        elif commons_policy.get("requireLicenseLink", True) and license_url.rstrip("/") not in accepted:
            reasons.append("The exact Commons file page does not expose an accepted licence.")
        elif expected_license and expected_license.rstrip("/") != license_url.rstrip("/"):
            reasons.append("The live licence does not match the configured reviewed file record.")
        elif commons_policy.get("requireAttribution", True) and not credit:
            reasons.append("Creator/licence attribution is missing.")
        elif commons_policy.get("requireModificationNote", True) and not (metadata.get("modificationNote") or image.get("modificationNote")):
            reasons.append("Image modification note is missing.")
        elif restrictive:
            reasons.append("A restrictive or third-party rights marker was found in the image evidence.")
        if reasons:
            return _decision(view_id, post_id, "image", "RED" if restrictive else "UNKNOWN", False,
                             policy_id, policy_version, evidence, reasons)
        return _decision(view_id, post_id, "image", "GREEN", True, policy_id, policy_version,
                         evidence, ["The exact Commons file page, creator, licence, attribution and modification evidence passed."],
                         allowed_use="contextual-documentary-image", attribution=credit)

    return _decision(view_id, post_id, "image", "UNKNOWN", False, "unregistered-image-policy", "1",
                     evidence, ["No registered image-rights policy matches this exact image and source page."])


def _audit_table(connection) -> None:
    connection.execute("""CREATE TABLE IF NOT EXISTS global_checker_audit_log (
        audit_row_id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_event_id TEXT NOT NULL UNIQUE,
        decision_id TEXT NOT NULL DEFAULT '',
        checked_at TEXT NOT NULL,
        stage TEXT NOT NULL CHECK(stage IN ('lineage','text','image','field_restriction','post_result')),
        post_id TEXT NOT NULL,
        media_id TEXT NOT NULL DEFAULT '',
        view_id TEXT NOT NULL,
        source_id TEXT NOT NULL DEFAULT '',
        job_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        assignment_ids_json TEXT NOT NULL,
        source_ids_json TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        config_version TEXT NOT NULL,
        destination_database_id TEXT NOT NULL,
        destination_database_path TEXT NOT NULL,
        verdict TEXT NOT NULL,
        allowed INTEGER NOT NULL,
        policy_id TEXT NOT NULL DEFAULT '',
        policy_version TEXT NOT NULL DEFAULT '',
        details_json TEXT NOT NULL
    )""")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_global_checker_audit_post ON global_checker_audit_log(view_id, post_id, checked_at)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_global_checker_audit_job ON global_checker_audit_log(job_id, checked_at)")
    connection.commit()


def _audit(connection, job: dict[str, Any], post: dict[str, Any], stage: str,
           verdict: str, allowed: bool, details: dict[str, Any],
           decision: dict[str, Any] | None = None, media_id: str = "") -> None:
    if connection is None:
        return
    _audit_table(connection)
    checked_at = (decision or {}).get("checkedAt") or _utc_now()
    audit_event_id = uuid.uuid4().hex
    decision_id = str((decision or {}).get("decisionId") or "")
    evidence = dict(details)
    # Audit stores policy evidence and reasons, never full source text/body fields.
    if decision:
        evidence.update({
            "decisionId": decision.get("decisionId", ""),
            "reasons": decision.get("reasons", []),
            "evidence": decision.get("evidence", {}),
            "allowedUse": decision.get("allowedUse", "none"),
            "attribution": decision.get("attribution", ""),
        })
    connection.execute("""INSERT OR IGNORE INTO global_checker_audit_log(
        audit_event_id,decision_id,checked_at,stage,post_id,media_id,view_id,source_id,job_id,
        profile_id,assignment_ids_json,source_ids_json,idempotency_key,config_version,
        destination_database_id,destination_database_path,verdict,allowed,policy_id,
        policy_version,details_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
        audit_event_id, decision_id, checked_at, stage, str(post.get("postId", "")), media_id,
        str(job.get("viewId", "")), str(post.get("sourceId", "")), str(job.get("jobId", "")),
        str(job.get("profileId", "")), _json(job.get("assignmentIds", [])),
        _json(job.get("sourceIds", [])), str(job.get("idempotencyKey", "")),
        str(job.get("configVersion", "")), str(job.get("destinationDatabaseId", "")),
        str(job.get("destinationDatabasePath", "")), verdict, int(bool(allowed)),
        str((decision or {}).get("policyId", "")), str((decision or {}).get("policyVersion", "")),
        _json(evidence),
    ))
    connection.commit()


class UniversalGlobalChecker:
    """One Checker implementation for any Manager-registered View."""
    def __init__(self, audit_connection=None):
        self.audit_connection = audit_connection

    def check_batch(self, collector_result: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(collector_result, dict):
            raise ValueError("Global Collector result must be a JSON object.")
        if collector_result.get("schemaVersion") != 1 or collector_result.get("recordSchema") != UNIVERSAL_RECORD_SCHEMA:
            raise ValueError("Global Collector result schema is not LIVE_EARTH_UNIVERSAL_POST_V1 version 1.")
        if collector_result.get("recordFields") != list(UNIVERSAL_POST_FIELDS):
            raise ValueError("Global Collector post field list does not match the fixed universal schema.")
        job = collector_result.get("job")
        job_errors = _manager_job_errors(job)
        if job_errors:
            raise ValueError("Manager job validation failed: " + " ".join(job_errors))
        manager_registry_version = str(collector_result.get("managerRegistryVersion") or "")
        if not manager_registry_version:
            raise ValueError("Global Collector result is missing the validated Manager registry version.")
        records = collector_result.get("records")
        if not isinstance(records, list):
            raise ValueError("Global Collector result has no records array.")
        view_id = str(job["viewId"])
        checks = []
        seen_post_ids: set[str] = set()
        for post in records:
            if not isinstance(post, dict):
                raise ValueError("Global Collector records array contains a non-object entry.")
            post_id = str(post.get("postId") or "missing-post-id")
            schema_errors = _record_schema_errors(post)
            lineage_errors = _validate_post_lineage(job, post)
            image_candidates, image_shape_errors = _image_candidates(post)
            duplicate_errors = []
            if post_id in seen_post_ids:
                duplicate_errors.append("Duplicate postId appeared more than once in the same Collector batch.")
            seen_post_ids.add(post_id)
            structural_errors = schema_errors + lineage_errors + image_shape_errors + duplicate_errors
            lineage_pass = not structural_errors
            lineage_detail = {"errors": structural_errors, "managerJobId": job["jobId"]}
            _audit(self.audit_connection, job, post, "lineage", "PASS" if lineage_pass else "HOLD",
                   lineage_pass, lineage_detail)

            story = _universal_story_view(post)
            policy = _lookup_text_policy(view_id, story)
            try:
                text_decision = core.evaluate_text(view_id, story)
            except Exception as exc:
                text_decision = _decision(view_id, post_id, "text", "UNKNOWN", False,
                                          "checker-evaluation-error", "1", {},
                                          [f"Text evaluation failed closed: {type(exc).__name__}."])
            field_restrictions = _field_restrictions(post, policy, text_decision)
            _audit(self.audit_connection, job, post, "text", text_decision.get("verdict", "UNKNOWN"),
                   bool(text_decision.get("allowed")), {"policyId": text_decision.get("policyId", ""),
                   "policyVersion": text_decision.get("policyVersion", ""),
                   "sourceUrl": story.get("sourceUrl", ""), "articleUrl": story.get("url", ""),
                   "fieldRestrictions": field_restrictions}, text_decision)
            for restriction in field_restrictions:
                _audit(self.audit_connection, job, post, "field_restriction", "HOLD", False,
                       restriction, media_id="")

            if image_candidates:
                image = image_candidates[0]
                image_errors = _validate_image_lineage(job, post, image)
                if image_errors:
                    image_decision = _decision(view_id, post_id, "image", "UNKNOWN", False,
                                               "media-lineage-invalid", "1", {"mediaId": image.get("mediaId", "")}, image_errors)
                else:
                    try:
                        image_decision = _image_decision(view_id, post, image)
                    except Exception as exc:
                        image_decision = _decision(view_id, post_id, "image", "UNKNOWN", False,
                                                   "checker-evaluation-error", "1", {"mediaId": image.get("mediaId", "")},
                                                   [f"Image evaluation failed closed: {type(exc).__name__}."])
                media_id = str(image.get("mediaId") or "")
                _audit(self.audit_connection, job, post, "image", image_decision.get("verdict", "UNKNOWN"),
                       bool(image_decision.get("allowed")), {"mediaId": media_id}, image_decision, media_id)
                image_result = {"mediaId": media_id, "verdict": image_decision.get("verdict", "UNKNOWN"),
                                "allowed": bool(image_decision.get("allowed")),
                                "decisionId": image_decision.get("decisionId", ""),
                                "policyId": image_decision.get("policyId", ""),
                                "reasons": list(image_decision.get("reasons", []))}
            else:
                image_result = {"status": "NOT_PROVIDED", "allowed": False, "reasons": ["No image supplied for this post."]}
                _audit(self.audit_connection, job, post, "image", "NOT_PROVIDED", False,
                       {"reason": "No image supplied for this post."})

            summary_allowed = bool(text_decision.get("summaryAllowed", False))
            summary = str(post.get("summary") or "")
            eligibility = core.load_registry().get("publicationEligibility", {})
            meaningful_text = summary_allowed and core._meaningful_text(summary, eligibility)
            image_allowed = bool(image_result.get("allowed"))
            field_clearance = not field_restrictions
            publish_eligible = bool((meaningful_text or image_allowed) and field_clearance)
            overall_pass = lineage_pass and bool(text_decision.get("allowed")) and field_clearance and publish_eligible
            reasons = []
            if structural_errors:
                reasons.extend(structural_errors)
            if not text_decision.get("allowed"):
                reasons.extend(text_decision.get("reasons", []))
            if field_restrictions:
                reasons.extend(f"{x['field']}: {x['reason']}" for x in field_restrictions)
            if not meaningful_text and not image_allowed:
                reasons.append("Post has neither meaningful text permitted for the registered use nor an independently approved image.")
            result = {
                "postId": post_id,
                "viewId": view_id,
                "sourceId": post.get("sourceId", ""),
                "lineage": {"passed": lineage_pass, "errors": structural_errors},
                "text": {"verdict": text_decision.get("verdict", "UNKNOWN"),
                         "allowed": bool(text_decision.get("allowed")),
                         "decisionId": text_decision.get("decisionId", ""),
                         "policyId": text_decision.get("policyId", ""),
                         "summaryAllowed": summary_allowed,
                         "reasons": list(text_decision.get("reasons", []))},
                "image": image_result,
                "fieldRestrictions": field_restrictions,
                "meaningfulText": meaningful_text,
                "publishEligible": publish_eligible,
                "status": "PASS" if overall_pass else "HOLD",
                "reasons": reasons,
            }
            _audit(self.audit_connection, job, post, "post_result", result["status"], overall_pass,
                   {"publishEligible": publish_eligible, "meaningfulText": meaningful_text,
                    "fieldRestrictionCount": len(field_restrictions), "resultReasons": reasons})
            checks.append(result)

        passed = sum(1 for item in checks if item["status"] == "PASS")
        held = len(checks) - passed
        return {
            "schemaVersion": 1,
            "checker": "LIVE // EARTH Global Content Rights & Provenance Checker",
            "checkerMode": "universal-view-independent",
            "checkerVersion": "2.0.0",
            "reportVisibility": "INTERNAL_ONLY_NOT_FOR_PUBLICATION",
            "viewId": view_id,
            "jobId": job["jobId"],
            "configVersion": job["configVersion"],
            "managerRegistryVersion": manager_registry_version,
            "purposeContext": _load_purpose_context(),
            "checkedAt": _utc_now(),
            "statistics": {"postsChecked": len(checks), "passed": passed, "held": held,
                           "textPassed": sum(bool(x["text"]["allowed"]) for x in checks),
                           "imagePassed": sum(bool(x["image"].get("allowed")) for x in checks),
                           "postsWithFieldRestrictions": sum(bool(x["fieldRestrictions"]) for x in checks)},
            "posts": checks,
            "contentMutationPerformed": False,
            "editorialChangesPerformed": False,
            "databasePostWritesPerformed": False,
            "publicationPerformed": False,
        }


def check_collection(collector_result: dict[str, Any], audit_connection=None) -> dict[str, Any]:
    """Convenience API used by the next pipeline stage after Global Collector."""
    return UniversalGlobalChecker(audit_connection=audit_connection).check_batch(collector_result)
