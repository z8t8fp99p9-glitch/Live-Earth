#!/usr/bin/env python3
"""LIVE // EARTH — shared, fail-closed Content Rights & Provenance Checker.

This module is deliberately view-independent. Collectors call it before a
record is persisted; Publishers call gate_feed() immediately before output.
The checker never fetches source websites, opens a database by itself, or
writes a feed. Callers supply their own SQLite connection and source evidence.
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = Path(__file__).with_name("source-registry.json")
CHECKER_NAME = "LIVE // EARTH Global Content Rights & Provenance Checker"
CHECKER_VERSION = "1.1.0"
DECISION_TABLE = "global_checker_decisions"
ALLOWED_VERDICTS = {"GREEN", "AMBER", "RED", "UNKNOWN"}
PUBLISHABLE_VERDICTS = {"GREEN", "AMBER"}

RESTRICTIVE_TEXT_MARKERS = (
    "all rights reserved", "copyright", "©", "permission required",
    "do not reproduce", "not for reuse", "licensed exclusively",
    "used with permission", "third-party content", "third party content",
    "reuters", "associated press", "getty images", "shutterstock",
    "afp", "alamy", "istock", "dreamstime", "depositphotos",
)
RESTRICTIVE_IMAGE_MARKERS = RESTRICTIVE_TEXT_MARKERS + (
    "rights managed", "courtesy of getty", "courtesy of shutterstock",
    "licensed from", "copyright holder",
)
NASA_BRAND_MARKERS = ("nasa insignia", "nasa seal", "nasa logo", "nasa logotype")
NON_PHOTOGRAPHIC_MARKERS = (
    "artist concept", "artist's concept", "artist’s concept", "artist impression",
    "artist's impression", "artist’s impression", "illustration", "illustrative",
    "simulation", "simulated", "rendering", "rendered", "diagram", "infographic",
    "concept art", "model image",
)
OPEN_IMAGE_LICENSES = {
    "https://creativecommons.org/publicdomain/zero/1.0/": "CC0 1.0",
    "https://creativecommons.org/licenses/by/4.0/": "CC BY 4.0",
    "https://creativecommons.org/licenses/by-sa/4.0/": "CC BY-SA 4.0",
}


class GlobalCheckerError(RuntimeError):
    """A fail-closed rights or provenance decision blocked publication."""


def _clean(value: Any, limit: int = 4000) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()[:limit]


def _domain(value: Any) -> str:
    try:
        parsed = urlparse(_clean(value, 2000))
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            return ""
        return parsed.hostname.lower().rstrip(".")
    except ValueError:
        return ""


def _host_matches(host: str, domains: list[str] | tuple[str, ...]) -> bool:
    return bool(host) and any(host == d or host.endswith("." + d) for d in domains)


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_registry() -> dict[str, Any]:
    try:
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise GlobalCheckerError(f"Global source registry could not be read: {exc}") from exc
    if registry.get("schemaVersion") != 1 or not isinstance(registry.get("policies"), list):
        raise GlobalCheckerError("Global source registry schema is invalid; all content is held.")
    if not registry.get("registryVersion"):
        raise GlobalCheckerError("Global source registry version is missing; all content is held.")
    return registry


def ensure_decision_table(connection: sqlite3.Connection) -> None:
    """Create the additive evidence table in the caller-owned view database."""
    connection.execute(f"""CREATE TABLE IF NOT EXISTS {DECISION_TABLE} (
        view_id TEXT NOT NULL,
        story_id TEXT NOT NULL,
        content_kind TEXT NOT NULL CHECK(content_kind IN ('text','image')),
        verdict TEXT NOT NULL CHECK(verdict IN ('GREEN','AMBER','RED','UNKNOWN')),
        policy_id TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        decision_id TEXT NOT NULL,
        decision_json TEXT NOT NULL,
        checked_at TEXT NOT NULL,
        PRIMARY KEY(view_id, story_id, content_kind)
    )""")
    connection.execute(
        f"CREATE INDEX IF NOT EXISTS idx_{DECISION_TABLE}_view_checked "
        f"ON {DECISION_TABLE}(view_id, checked_at)"
    )
    connection.commit()


def _decision(
    *, view_id: str, story_id: str, content_kind: str, verdict: str,
    policy_id: str, policy_version: str, allowed: bool, allowed_use: str,
    evidence: dict[str, Any], reasons: list[str], attribution: str = "",
    summary_allowed: bool = True,
) -> dict[str, Any]:
    checked_at = _utc_now()
    material = "|".join((view_id, story_id, content_kind, verdict, policy_id,
                         policy_version, checked_at, json.dumps(evidence, sort_keys=True)))
    decision_id = hashlib.sha256(material.encode("utf-8")).hexdigest()[:24]
    return {
        "checker": CHECKER_NAME,
        "checkerVersion": CHECKER_VERSION,
        "decisionId": decision_id,
        "viewId": view_id,
        "storyId": story_id,
        "contentKind": content_kind,
        "verdict": verdict,
        "allowed": bool(allowed),
        "allowedUse": allowed_use,
        "summaryAllowed": bool(summary_allowed),
        "policyId": policy_id,
        "policyVersion": policy_version,
        "registryVersion": load_registry()["registryVersion"],
        "checkedAt": checked_at,
        "attribution": attribution,
        "evidence": evidence,
        "reasons": reasons,
    }


def _policy_for_story(view_id: str, story: dict[str, Any]) -> dict[str, Any] | None:
    registry = load_registry()
    article_host = _domain(story.get("url"))
    feed_host = _domain(story.get("sourceUrl"))
    source_name = _clean(story.get("sourceName"), 160).casefold()
    for policy in registry["policies"]:
        if view_id not in policy.get("views", ["*"]):
            continue
        if not _host_matches(article_host, policy.get("articleDomains", [])):
            continue
        feeds = policy.get("feedDomains", [])
        if feeds and not _host_matches(feed_host, feeds):
            continue
        allowed_feed_urls = policy.get("allowedFeedUrls", [])
        feed_url = _clean(story.get("sourceUrl") or story.get("source_url"), 1200)
        if allowed_feed_urls and feed_url not in allowed_feed_urls:
            continue
        names = [str(x).casefold() for x in policy.get("sourceNameContains", [])]
        if names and not any(term in source_name for term in names):
            continue
        return policy
    return None


def evaluate_text(view_id: str, story: dict[str, Any]) -> dict[str, Any]:
    """Assess a story before persistence. No matching rule means UNKNOWN."""
    story_id = _clean(story.get("id") or story.get("story_id") or story.get("url"), 160)
    title = _clean(story.get("title"), 300)
    summary = _clean(story.get("summary"), 12000)
    article_url = _clean(story.get("url"), 1200)
    source_url = _clean(story.get("sourceUrl") or story.get("source_url"), 1200)
    if not story_id or not title or not _domain(article_url) or not _domain(source_url):
        return _decision(view_id=view_id, story_id=story_id or "missing-story-id", content_kind="text",
                         verdict="UNKNOWN", policy_id="no-valid-provenance", policy_version="1",
                         allowed=False, allowed_use="none", evidence={},
                         reasons=["Story identity, HTTPS article URL, title, or feed URL is missing/invalid."])

    policy = _policy_for_story(view_id, {**story, "sourceUrl": source_url})
    if not policy:
        return _decision(view_id=view_id, story_id=story_id, content_kind="text",
                         verdict="UNKNOWN", policy_id="unregistered-source", policy_version="1",
                         allowed=False, allowed_use="none", evidence={"articleUrl": article_url,
                         "sourceUrl": source_url}, reasons=["No approved source policy matches both the article and source-feed hosts."])

    policy_id = policy["policyId"]
    policy_version = str(policy.get("policyVersion", "1"))
    source_status = policy.get("status", "UNKNOWN")
    text_policy = policy.get("text", {})
    normalized_summary = _clean(summary, 12000)
    evidence = {
        "articleUrl": article_url, "articleHost": _domain(article_url),
        "title": title,
        "sourceUrl": source_url, "feedHost": _domain(source_url),
        "sourceName": _clean(story.get("sourceName"), 160),
        "author": _clean(story.get("author") or story.get("creator"), 240),
        "rightsNotice": _clean(story.get("rightsNotice") or story.get("rights") or story.get("license"), 500),
        "summarySha256": hashlib.sha256(normalized_summary.encode("utf-8")).hexdigest(),
        "summaryLength": len(normalized_summary),
        "termsUrl": _clean(policy.get("termsUrl"), 1000),
    }
    if source_status == "RED":
        return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="RED",
                         policy_id=policy_id, policy_version=policy_version, allowed=False,
                         allowed_use="none", evidence=evidence,
                         reasons=[text_policy.get("reason", "This source policy does not permit persistent storage.")])
    if not text_policy.get("allowStorage", False):
        verdict = "UNKNOWN" if source_status == "UNKNOWN" else "AMBER"
        return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict=verdict,
                         policy_id=policy_id, policy_version=policy_version, allowed=False,
                         allowed_use="none", evidence=evidence,
                         reasons=[text_policy.get("reason", "The registry does not establish storage permission for this source.")])
    if not text_policy.get("allowDisplay", False):
        return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="UNKNOWN",
                         policy_id=policy_id, policy_version=policy_version, allowed=False,
                         allowed_use="none", evidence=evidence,
                         reasons=["The source policy does not explicitly permit display in this app feed."])

    haystack = " ".join((title, summary, evidence["rightsNotice"], evidence["author"])).casefold()
    markers = [marker for marker in RESTRICTIVE_TEXT_MARKERS if marker in haystack]
    if markers:
        return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="RED",
                         policy_id=policy_id, policy_version=policy_version, allowed=False,
                         allowed_use="none", evidence={**evidence, "restrictionMarkers": markers},
                         reasons=["An explicit copyright, third-party, or reuse restriction signal was found."])

    mode = text_policy.get("mode", "")
    attribution = _clean(text_policy.get("attribution", ""), 240)
    if mode == "headline-link-only":
        # Limited feed use: retain only the headline, source identity, date and link.
        return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="AMBER",
                         policy_id=policy_id, policy_version=policy_version, allowed=True,
                         allowed_use="headline-link-only", evidence=evidence,
                         reasons=["Restricted RSS use: headline/link/date only; do not store or display the source summary."],
                         attribution=attribution, summary_allowed=False)

    if mode == "explicit-open-license":
        license_url = _clean(story.get("licenseUrl") or story.get("license_url") or story.get("license"), 500)
        held_licenses = set(text_policy.get("heldLicenses", []))
        if license_url in held_licenses:
            return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="UNKNOWN",
                             policy_id=policy_id, policy_version=policy_version, allowed=False,
                             allowed_use="none", evidence={**evidence, "licenseUrl": license_url},
                             reasons=["This Mongabay item licence has conditions the current feed renderer cannot guarantee (including no-derivatives, headline, attribution, embedded-link, view-counter, or non-commercial requirements). The story is held until those conditions can be met exactly."],
                             attribution=attribution or "Mongabay", summary_allowed=False)
        accepted = set(text_policy.get("acceptedLicenses", []))
        if license_url not in accepted:
            return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="UNKNOWN",
                             policy_id=policy_id, policy_version=policy_version, allowed=False,
                             allowed_use="none", evidence={**evidence, "licenseUrl": license_url},
                             reasons=["The individual article does not expose an accepted open licence."])
        author = evidence["author"]
        if not author:
            return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="UNKNOWN",
                             policy_id=policy_id, policy_version=policy_version, allowed=False,
                             allowed_use="none", evidence={**evidence, "licenseUrl": license_url},
                             reasons=["The individual open-licensed article has no author attribution metadata."])
        return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="GREEN",
                         policy_id=policy_id, policy_version=policy_version, allowed=True,
                         allowed_use="open-license-text", evidence={**evidence, "licenseUrl": license_url},
                         reasons=["The individual article supplies an accepted open licence and author evidence."],
                         attribution=attribution or f"Mongabay · {author}", summary_allowed=bool(summary and text_policy.get("allowTransform", False)))

    if mode == "conditional-us-government-work":
        # This is not a domain-wide public-domain assumption. The exact feed and
        # article host, NASA feed identity, and clean item metadata must all match.
        source_name = evidence["sourceName"].casefold()
        author = evidence["author"].casefold()
        if "nasa" not in source_name:
            return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="UNKNOWN",
                             policy_id=policy_id, policy_version=policy_version, allowed=False,
                             allowed_use="none", evidence=evidence,
                             reasons=["Official NASA source-feed identity could not be confirmed."])
        if author and not any(token in author for token in ("nasa", "national aeronautics and space administration")):
            return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="RED",
                             policy_id=policy_id, policy_version=policy_version, allowed=False,
                             allowed_use="none", evidence=evidence,
                             reasons=["The item identifies a non-NASA author; third-party authorship is not cleared by the NASA source domain."])
        if not summary:
            return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="AMBER",
                             policy_id=policy_id, policy_version=policy_version, allowed=True,
                             allowed_use="headline-link-only", evidence=evidence,
                             reasons=["No source summary is present; only the headline/link/date may be retained."],
                             attribution="NASA", summary_allowed=False)
        return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="GREEN",
                         policy_id=policy_id, policy_version=policy_version, allowed=True,
                         allowed_use="factual-us-government-source-text", evidence=evidence,
                         reasons=["Official NASA feed and NASA.gov article match; no third-party/copyright signal was detected. Item-level exclusions still apply."],
                         attribution="NASA", summary_allowed=True)

    return _decision(view_id=view_id, story_id=story_id, content_kind="text", verdict="UNKNOWN",
                     policy_id=policy_id, policy_version=policy_version, allowed=False,
                     allowed_use="none", evidence=evidence,
                     reasons=["The registered policy has no executable text-use rule."])


def evaluate_image(view_id: str, story_id: str, image: dict[str, Any], *,
                   article_url: str, source_name: str = "") -> dict[str, Any]:
    """Assess one exact image independently from its associated story text."""
    article_host = _domain(article_url)
    image_url = _clean(image.get("url") or image.get("imageUrl") or image.get("image_url"), 1200)
    image_host = _domain(image_url)
    source_page = _clean(image.get("sourcePage") or image.get("source_page") or
                         image.get("sourceUrl") or image.get("source_url") or
                         image.get("imageSourceUrl"), 1200)
    creator = _clean(image.get("creator"), 300)
    credit = _clean(image.get("credit") or image.get("imageCredit"), 500)
    caption = _clean(image.get("caption") or image.get("imageCaption"), 800)
    license_url = _clean(image.get("licenseUrl") or image.get("license_url"), 500)
    license_name = _clean(image.get("licenseName") or image.get("license_name"), 160)
    modification_note = _clean(image.get("modificationNote") or image.get("modification_note"), 800)
    rights_notice = _clean(image.get("rightsNotice") or image.get("rights_notice"), 800)
    descriptor = " ".join((caption, credit, rights_notice, _clean(image.get("kind"), 160))).casefold()
    evidence = {"articleUrl": _clean(article_url, 1200), "imageUrl": image_url,
                "sourcePage": source_page, "creator": creator, "credit": credit,
                "caption": caption, "licenseName": license_name,
                "licenseUrl": license_url, "modificationNote": modification_note,
                "rightsNotice": rights_notice,
                "termsUrl": "https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en" if view_id == "nature" else "https://www.nasa.gov/nasa-brand-center/images-and-media/"}

    policy_id = "unregistered-image-policy"
    policy_version = "1"
    if not article_host or not image_host or not _domain(source_page) or not credit or not caption:
        return _decision(view_id=view_id, story_id=story_id, content_kind="image", verdict="UNKNOWN",
                         policy_id=policy_id, policy_version=policy_version, allowed=False,
                         allowed_use="none", evidence=evidence,
                         reasons=["Image source, HTTPS URLs, visible credit, or contextual caption is missing."])

    # Nature contextual image policy: the actual original Commons file page and
    # one approved licence must be independently recorded for this exact image.
    if view_id == "nature" and article_host in {"nature.com", "phys.org", "sciencedaily.com", "mongabay.com", "news.mongabay.com", "theguardian.com", "wti.org.in"}:
        policy_id, policy_version = "wikimedia-commons-individual-file-v1", "1"
        expected_creator = _clean(image.get("expectedCreator"), 300)
        expected_license = _clean(image.get("expectedLicenseUrl"), 500)
        if not _host_matches(_domain(source_page), ["commons.wikimedia.org"]):
            reason = "Nature images must retain the exact Wikimedia Commons file-description page."
        elif not _host_matches(image_host, ["upload.wikimedia.org", "raw.githubusercontent.com"]):
            reason = "Nature image file host is outside the approved Commons/publication asset boundary."
        elif license_url not in OPEN_IMAGE_LICENSES:
            reason = "The exact file page does not identify an accepted CC0, CC BY, or CC BY-SA licence."
        elif not creator:
            reason = "The original file page does not expose a creator."
        elif expected_creator and expected_creator.casefold() not in creator.casefold():
            reason = "The live file-page creator does not match the reviewed file record."
        elif expected_license and expected_license.rstrip("/") != license_url.rstrip("/"):
            reason = "The live licence differs from the reviewed file record."
        elif not modification_note:
            reason = "The prepared-image modification/resizing record is missing."
        elif any(marker in descriptor for marker in RESTRICTIVE_IMAGE_MARKERS):
            reason = "A third-party or restrictive image-rights marker was found."
        else:
            reason = ""
        if reason:
            return _decision(view_id=view_id, story_id=story_id, content_kind="image", verdict="RED" if "third-party" in reason or "restrictive" in reason else "UNKNOWN",
                             policy_id=policy_id, policy_version=policy_version, allowed=False,
                             allowed_use="none", evidence=evidence, reasons=[reason])
        name = OPEN_IMAGE_LICENSES[license_url]
        return _decision(view_id=view_id, story_id=story_id, content_kind="image", verdict="GREEN",
                         policy_id=policy_id, policy_version=policy_version, allowed=True,
                         allowed_use="contextual-documentary-image", evidence=evidence,
                         reasons=["Exact Commons file page, creator, accepted licence, credit and contextual caption are recorded."],
                         attribution=f"{creator} · {name} · {source_page}")

    # NASA image policy. Only the exact original-post image is allowed, with
    # explicit source/credit and no third-party restrictions or concept-art labels.
    if view_id == "alien-world" and _host_matches(article_host, ["nasa.gov"]):
        policy_id, policy_version = "nasa-media-guidelines-item-screen-v2", "2"
        source_policy = load_registry()["imagePolicies"]["nasa"]
        if not _host_matches(image_host, ["nasa.gov"]):
            reason = "Image host is outside the NASA.gov host family."
        elif not _host_matches(_domain(source_page), ["nasa.gov"]):
            reason = "The original NASA article/source page is not recorded."
        elif source_policy.get("requireOriginalStoryAssociation", True) and _clean(source_page) != _clean(article_url):
            reason = "The image source page is not the exact originating story; a similar NASA-hosted image is not a substitute."
        elif source_policy.get("rejectNASAInsigniaAndLogos", True) and any(marker in descriptor for marker in NASA_BRAND_MARKERS):
            reason = "NASA insignia, seal and logotypes are excluded from the documentary-photo feed."
        elif source_policy.get("rejectConceptArtForDocumentaryPhotoSlot", True) and any(marker in descriptor for marker in NON_PHOTOGRAPHIC_MARKERS):
            reason = "Artist concepts, illustrations, simulations, renderings, diagrams and infographics are excluded from documentary-photo use."
        elif source_policy.get("rejectThirdPartyAndCopyrightSignals", True) and any(marker in descriptor for marker in RESTRICTIVE_IMAGE_MARKERS):
            reason = "A copyright, stock-agency or third-party rights signal was found."
        elif not source_policy.get("allowNASAEditorialUse", False):
            reason = "Current NASA media policy is not enabled in the Global Source Registry."
        else:
            reason = ""
        if reason:
            return _decision(view_id=view_id, story_id=story_id, content_kind="image", verdict="RED" if any(m in descriptor for m in RESTRICTIVE_IMAGE_MARKERS + NON_PHOTOGRAPHIC_MARKERS + NASA_BRAND_MARKERS) else "UNKNOWN",
                             policy_id=policy_id, policy_version=policy_version, allowed=False,
                             allowed_use="none", evidence=evidence, reasons=[reason])
        return _decision(view_id=view_id, story_id=story_id, content_kind="image", verdict="GREEN",
                         policy_id=policy_id, policy_version=policy_version, allowed=True,
                         allowed_use="factual-context-only", evidence=evidence,
                         reasons=["NASA-hosted original-post image passed host, context, credit and exclusion checks. Screening is not a separate licence or legal opinion."],
                         attribution=credit)

    return _decision(view_id=view_id, story_id=story_id, content_kind="image", verdict="UNKNOWN",
                     policy_id=policy_id, policy_version=policy_version, allowed=False,
                     allowed_use="none", evidence=evidence,
                     reasons=["No image-rights policy matches this image and its originating story."])


def record_decision(connection: sqlite3.Connection, decision: dict[str, Any]) -> None:
    """Persist one decision in the current view's own DB; never open another DB."""
    if decision.get("contentKind") not in {"text", "image"} or decision.get("verdict") not in ALLOWED_VERDICTS:
        raise GlobalCheckerError("Refusing to store a malformed checker decision.")
    ensure_decision_table(connection)
    connection.execute(
        f"""INSERT INTO {DECISION_TABLE}(
            view_id,story_id,content_kind,verdict,policy_id,policy_version,
            decision_id,decision_json,checked_at
        ) VALUES(?,?,?,?,?,?,?,?,?)
        ON CONFLICT(view_id,story_id,content_kind) DO UPDATE SET
            verdict=excluded.verdict,policy_id=excluded.policy_id,
            policy_version=excluded.policy_version,decision_id=excluded.decision_id,
            decision_json=excluded.decision_json,checked_at=excluded.checked_at""",
        (decision["viewId"], decision["storyId"], decision["contentKind"],
         decision["verdict"], decision["policyId"], decision["policyVersion"],
         decision["decisionId"], json.dumps(decision, ensure_ascii=False, sort_keys=True),
         decision["checkedAt"]),
    )
    connection.commit()


def get_decision(connection: sqlite3.Connection, view_id: str, story_id: str,
                 content_kind: str) -> dict[str, Any] | None:
    try:
        row = connection.execute(
            f"SELECT decision_json FROM {DECISION_TABLE} WHERE view_id=? AND story_id=? AND content_kind=?",
            (view_id, story_id, content_kind),
        ).fetchone()
    except sqlite3.OperationalError as exc:
        if "no such table" in str(exc).lower():
            return None
        raise
    if not row:
        return None
    try:
        value = json.loads(row[0])
        if value.get("viewId") != view_id or value.get("storyId") != story_id or value.get("contentKind") != content_kind:
            return None
        if value.get("verdict") not in ALLOWED_VERDICTS or not value.get("decisionId"):
            return None
        return value
    except (TypeError, json.JSONDecodeError):
        return None


def prune_decisions(connection: sqlite3.Connection, view_id: str, retention_days: int = 32) -> int:
    """Retain the decision/audit trail for the same bounded 32-day period."""
    ensure_decision_table(connection)
    retention_days = max(1, min(365, int(retention_days)))
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    cutoff_text = cutoff.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    cursor = connection.execute(
        f"DELETE FROM {DECISION_TABLE} WHERE view_id=? AND checked_at < ?",
        (view_id, cutoff_text),
    )
    connection.commit()
    return max(0, int(cursor.rowcount or 0))


def _clear_image(story: dict[str, Any]) -> None:
    for key in ("imageUrl", "imageCredit", "imageSourceUrl", "imageRightsNote",
                "imageCaption", "imageLicense", "imageLicenseUrl"):
        if key in story:
            story[key] = None


def _meaningful_text(value: Any, eligibility: dict[str, Any]) -> bool:
    """A text route must contain real body copy, not a title or a tiny teaser."""
    raw = _clean(value, 12000)
    minimum_chars = max(80, int(eligibility.get("minimumTextChars", 120)))
    minimum_words = max(12, int(eligibility.get("minimumTextWords", 18)))
    return len(raw) >= minimum_chars and len(raw.split()) >= minimum_words


def gate_feed(feed: dict[str, Any], connection: sqlite3.Connection, view_id: str,
              *, minimum_stories: int = 2) -> dict[str, Any]:
    """Final Checker gate: publish only meaningful approved text OR a verified image.

    A text decision remains mandatory to establish the exact article/source metadata
    route. Headline-link-only sources can proceed only with a separately approved
    image. A story with neither meaningful text nor a verified image is held.
    """
    if not isinstance(feed, dict) or feed.get("schemaVersion") != 1 or feed.get("viewId") != view_id:
        raise GlobalCheckerError("Published feed schema/view identity failed Global Checker gate.")
    stories = feed.get("stories")
    if not isinstance(stories, list):
        raise GlobalCheckerError("Published feed has no stories array.")
    registry = load_registry()
    registry_version = registry["registryVersion"]
    eligibility = registry.get("publicationEligibility", {})
    # A successful run must not leave a previously published headline-only feed
    # visible just because fewer stories passed the new eligibility rule. The
    # registry owns the allowed output floor; legacy caller thresholds cannot
    # override the Checker or preserve now-ineligible content.
    minimum_stories = max(0, int(eligibility.get("minimumPublishableStories", 0)))
    policies_by_id = {str(policy.get("policyId")): policy for policy in registry["policies"]}
    accepted: list[dict[str, Any]] = []
    rejected_text: list[str] = []
    content_held: list[str] = []
    stripped_images = 0
    text_routes = 0
    image_routes = 0
    combined_routes = 0
    seen_urls: set[str] = set()

    for raw in stories:
        if not isinstance(raw, dict):
            continue
        story = dict(raw)
        story_id = _clean(story.get("id"), 160)
        story_url = _clean(story.get("url"), 1200)
        if not story_id or not _domain(story_url) or story_url in seen_urls:
            rejected_text.append(story_id or "missing-id")
            continue
        seen_urls.add(story_url)
        text_decision = get_decision(connection, view_id, story_id, "text")
        if not text_decision or not text_decision.get("allowed") or text_decision.get("verdict") not in PUBLISHABLE_VERDICTS:
            rejected_text.append(story_id)
            continue
        evidence = text_decision.get("evidence", {})
        current_policy = policies_by_id.get(str(text_decision.get("policyId")))
        if (text_decision.get("registryVersion") != registry_version or not current_policy
                or str(current_policy.get("policyVersion", "1")) != str(text_decision.get("policyVersion", ""))
                or current_policy.get("status") not in {"GREEN_CONDITIONAL", "AMBER_LIMITED", "AMBER_ITEM_LICENSE_REQUIRED"}):
            rejected_text.append(story_id)
            continue
        if evidence.get("articleUrl") != story_url or evidence.get("title") != _clean(story.get("title"), 300):
            rejected_text.append(story_id)
            continue
        feed_source_url = _clean(story.get("sourceUrl"), 1200)
        if (not feed_source_url or evidence.get("sourceUrl") != feed_source_url
                or evidence.get("sourceName") != _clean(story.get("sourceName"), 160)):
            rejected_text.append(story_id)
            continue

        summary = _clean(story.get("summary"), 12000)
        summary_allowed = bool(text_decision.get("summaryAllowed", False))
        if summary_allowed:
            digest = hashlib.sha256(summary.encode("utf-8")).hexdigest()
            if digest != evidence.get("summarySha256"):
                rejected_text.append(story_id)
                continue
        else:
            # Restricted/no-derivatives routes may not be enriched with a summary.
            story["summary"] = ""
            summary = ""
        meaningful_text = summary_allowed and _meaningful_text(summary, eligibility)

        # Verify the image independently, even when the source-text route is
        # headline-only or otherwise too short to qualify as meaningful text.
        image_approved = False
        if story.get("imageUrl"):
            image_decision = get_decision(connection, view_id, story_id, "image")
            image_policy_key = "wikimediaCommons" if view_id == "nature" else "nasa"
            current_image_policy = registry.get("imagePolicies", {}).get(image_policy_key, {})
            image_policy_version = str(current_image_policy.get("policyVersion", "1"))
            if (not image_decision or not image_decision.get("allowed")
                    or image_decision.get("verdict") not in PUBLISHABLE_VERDICTS
                    or image_decision.get("registryVersion") != registry_version
                    or not current_image_policy
                    or str(image_decision.get("policyVersion", "")) != image_policy_version):
                _clear_image(story)
                stripped_images += 1
            else:
                image_evidence = image_decision.get("evidence", {})
                image_matches = (
                    image_evidence.get("articleUrl") == story_url
                    and _clean(image_evidence.get("imageUrl"), 1200) == _clean(story.get("imageUrl"), 1200)
                    and _clean(image_evidence.get("credit"), 500) == _clean(story.get("imageCredit"), 500)
                    and _clean(image_evidence.get("sourcePage"), 1200) == _clean(story.get("imageSourceUrl"), 1200)
                    and bool(_clean(story.get("imageCaption"), 800))
                    and _clean(image_evidence.get("caption"), 800) == _clean(story.get("imageCaption"), 800)
                    and bool(_clean(story.get("imageRightsNote"), 800))
                    and _clean(image_evidence.get("rightsNotice"), 800) == _clean(story.get("imageRightsNote"), 800)
                    and (not story.get("imageLicenseUrl") or _clean(image_evidence.get("licenseUrl"), 500) == _clean(story.get("imageLicenseUrl"), 500))
                    and (not story.get("imageLicense") or _clean(image_evidence.get("licenseName"), 160) == _clean(story.get("imageLicense"), 160))
                )
                if not image_matches:
                    _clear_image(story)
                    stripped_images += 1
                else:
                    image_approved = True
                    story["imageRights"] = {
                        "checker": CHECKER_NAME, "verdict": image_decision["verdict"],
                        "policyId": image_decision["policyId"], "policyVersion": image_decision["policyVersion"],
                        "decisionId": image_decision["decisionId"], "checkedAt": image_decision["checkedAt"],
                        "allowedUse": image_decision["allowedUse"],
                        "attribution": image_decision.get("attribution", ""),
                        "licenseUrl": image_evidence.get("licenseUrl", ""),
                        "sourcePage": image_evidence.get("sourcePage", ""),
                        "modificationNote": image_evidence.get("modificationNote", ""),
                    }
        else:
            _clear_image(story)

        if not meaningful_text and not image_approved:
            content_held.append(story_id)
            continue

        if meaningful_text and image_approved:
            route = "text+image"
            combined_routes += 1
        elif meaningful_text:
            route = "text"
            text_routes += 1
        else:
            route = "image"
            image_routes += 1
        story["publicationRoute"] = route
        story["rights"] = {
            "checker": CHECKER_NAME, "verdict": text_decision["verdict"],
            "policyId": text_decision["policyId"], "policyVersion": text_decision["policyVersion"],
            "decisionId": text_decision["decisionId"], "checkedAt": text_decision["checkedAt"],
            "allowedUse": text_decision["allowedUse"], "attribution": text_decision.get("attribution", ""),
            "licenseUrl": evidence.get("licenseUrl", ""),
            "author": evidence.get("author", ""),
        }
        accepted.append(story)

    if len(accepted) < minimum_stories:
        raise GlobalCheckerError(
            f"Global Checker left {len(accepted)} stories that meet the Text OR Image rule; "
            f"minimum is {minimum_stories}. Headline-only stories were held and the last-good feed must be preserved."
        )
    feed["stories"] = accepted
    feed["storyCount"] = len(accepted)
    feed["globalChecker"] = {
        "name": CHECKER_NAME, "version": CHECKER_VERSION,
        "registryVersion": registry_version,
        "checkedAt": _utc_now(), "textRejected": len(rejected_text),
        "contentHeld": len(content_held), "textRoutes": text_routes,
        "imageRoutes": image_routes, "combinedRoutes": combined_routes,
        "imagesStripped": stripped_images, "policy": "fail-closed-text-or-image",
    }
    return feed


def evaluate_and_record_text(connection: sqlite3.Connection, view_id: str,
                             story: dict[str, Any]) -> dict[str, Any]:
    decision = evaluate_text(view_id, story)
    record_decision(connection, decision)
    return decision


def evaluate_and_record_image(connection: sqlite3.Connection, view_id: str,
                              story_id: str, image: dict[str, Any], *,
                              article_url: str, source_name: str = "") -> dict[str, Any]:
    decision = evaluate_image(view_id, story_id, image, article_url=article_url, source_name=source_name)
    record_decision(connection, decision)
    return decision
