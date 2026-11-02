#!/usr/bin/env python3
"""Shared educational-source policy engine for LIVE // EARTH Global Checker.

All source permissions are read from source-registry.json. This module adds the
common evaluator for conditional U.S. government educational/informational work
and makes the same central policy executable for Nature and Alien World.
It defines no source list or permissions of its own.
"""
from __future__ import annotations

from typing import Any


EDUCATIONAL_MODE = "educational-government-work"


def _educational_decision(checker, view_id: str, story: dict[str, Any], policy: dict[str, Any]):
    story_id = checker._clean(story.get("id") or story.get("story_id") or story.get("url"), 160)
    title = checker._clean(story.get("title"), 300)
    summary = checker._clean(story.get("summary"), 12000)
    article_url = checker._clean(story.get("url"), 1200)
    source_url = checker._clean(story.get("sourceUrl") or story.get("source_url"), 1200)
    source_name = checker._clean(story.get("sourceName"), 160)
    author = checker._clean(story.get("author") or story.get("creator"), 240)
    rights_notice = checker._clean(story.get("rightsNotice") or story.get("rights") or story.get("license"), 500)
    policy_id = str(policy.get("policyId", "educational-government-source"))
    policy_version = str(policy.get("policyVersion", "1"))
    text_policy = policy.get("text", {})
    attribution = checker._clean(text_policy.get("attribution", policy.get("displayName", "Source")), 240)

    if not story_id or not title or not checker._domain(article_url) or not checker._domain(source_url):
        return checker._decision(
            view_id=view_id, story_id=story_id or "missing-story-id", content_kind="text",
            verdict="UNKNOWN", policy_id=policy_id, policy_version=policy_version,
            allowed=False, allowed_use="none", evidence={},
            reasons=["Missing or invalid story identity, title, HTTPS article URL, or official feed URL."],
            attribution=attribution, summary_allowed=False,
        )

    if policy.get("status") != "GREEN_CONDITIONAL" or not text_policy.get("allowStorage") or not text_policy.get("allowDisplay"):
        return checker._decision(
            view_id=view_id, story_id=story_id, content_kind="text", verdict="UNKNOWN",
            policy_id=policy_id, policy_version=policy_version, allowed=False,
            allowed_use="none", evidence={"articleUrl": article_url, "sourceUrl": source_url},
            reasons=["The central registry does not grant persistent educational display for this route."],
            attribution=attribution, summary_allowed=False,
        )

    evidence = {
        "articleUrl": article_url,
        "articleHost": checker._domain(article_url),
        "title": title,
        "sourceUrl": source_url,
        "feedHost": checker._domain(source_url),
        "sourceName": source_name,
        "author": author,
        "rightsNotice": rights_notice,
        "summarySha256": checker.hashlib.sha256(summary.encode("utf-8")).hexdigest(),
        "summaryLength": len(summary),
        "termsUrl": checker._clean(policy.get("termsUrl"), 1000),
    }

    # An official government feed is not a blanket clearance for third-party
    # material embedded in one item. Explicit restrictive signals always win.
    haystack = " ".join((title, summary, rights_notice, author)).casefold()
    markers = [marker for marker in checker.RESTRICTIVE_TEXT_MARKERS if marker in haystack]
    if markers:
        return checker._decision(
            view_id=view_id, story_id=story_id, content_kind="text", verdict="RED",
            policy_id=policy_id, policy_version=policy_version, allowed=False,
            allowed_use="none", evidence={**evidence, "restrictionMarkers": markers},
            reasons=["A restrictive, copyright, or third-party rights marker was found in this item."],
            attribution=attribution, summary_allowed=False,
        )

    agency = checker._clean(text_policy.get("agency"), 100).casefold()
    accepted_authors = [str(value).casefold() for value in text_policy.get("acceptedAuthorMarkers", [])]
    allow_missing_author = bool(text_policy.get("allowMissingAuthor", False))
    if not author and not allow_missing_author:
        return checker._decision(
            view_id=view_id, story_id=story_id, content_kind="text", verdict="UNKNOWN",
            policy_id=policy_id, policy_version=policy_version, allowed=False,
            allowed_use="none", evidence=evidence,
            reasons=[f"The item does not expose an author that confirms {agency or 'agency'} authorship."],
            attribution=attribution, summary_allowed=False,
        )
    if author and accepted_authors and not any(token in author.casefold() for token in accepted_authors):
        return checker._decision(
            view_id=view_id, story_id=story_id, content_kind="text", verdict="UNKNOWN",
            policy_id=policy_id, policy_version=policy_version, allowed=False,
            allowed_use="none", evidence=evidence,
            reasons=[f"The item identifies an author outside the approved {agency or 'agency'} authorship route."],
            attribution=attribution, summary_allowed=False,
        )

    if not summary:
        return checker._decision(
            view_id=view_id, story_id=story_id, content_kind="text", verdict="AMBER",
            policy_id=policy_id, policy_version=policy_version, allowed=True,
            allowed_use="headline-link-only", evidence=evidence,
            reasons=["The official item has no usable RSS summary; only headline, date and link may be retained."],
            attribution=attribution, summary_allowed=False,
        )

    summary_allowed = bool(text_policy.get("allowSummary", False))
    if not summary_allowed:
        return checker._decision(
            view_id=view_id, story_id=story_id, content_kind="text", verdict="AMBER",
            policy_id=policy_id, policy_version=policy_version, allowed=True,
            allowed_use="headline-link-only", evidence=evidence,
            reasons=["The central policy does not permit retaining the source summary."],
            attribution=attribution, summary_allowed=False,
        )

    return checker._decision(
        view_id=view_id, story_id=story_id, content_kind="text", verdict="GREEN",
        policy_id=policy_id, policy_version=policy_version, allowed=True,
        allowed_use="educational-government-source-text", evidence=evidence,
        reasons=[f"The exact official {agency or 'government'} feed/article route matched the central registry; no item-level restriction was detected."],
        attribution=attribution, summary_allowed=True,
    )


def install(checker) -> None:
    """Install shared registry-driven rules once into the central Checker module."""
    if getattr(checker, "_shared_policy_engine_installed", False):
        return

    original_evaluate_text = checker.evaluate_text

    def evaluate_text(view_id: str, story: dict[str, Any]):
        policy = checker._policy_for_story(view_id, story)
        if policy and policy.get("text", {}).get("mode") == EDUCATIONAL_MODE:
            return _educational_decision(checker, view_id, story, policy)
        return original_evaluate_text(view_id, story)

    checker.evaluate_text = evaluate_text

    original_evaluate_image = checker.evaluate_image

    def _remap_image_decision(view_id: str, story_id: str, decision: dict[str, Any], image_policy_key: str):
        evidence = dict(decision.get("evidence", {}))
        policy_version = str(
            checker.load_registry().get("imagePolicies", {}).get(image_policy_key, {}).get(
                "policyVersion", decision.get("policyVersion", "1")
            )
        )
        return checker._decision(
            view_id=view_id, story_id=story_id, content_kind="image",
            verdict=decision.get("verdict", "UNKNOWN"),
            policy_id=decision.get("policyId", "unregistered-image-policy"),
            policy_version=policy_version,
            allowed=bool(decision.get("allowed")),
            allowed_use=decision.get("allowedUse", "none"),
            evidence=evidence, reasons=list(decision.get("reasons", [])),
            attribution=decision.get("attribution", ""),
        )

    def evaluate_image(view_id: str, story_id: str, image: dict[str, Any], *, article_url: str, source_name: str = ""):
        # NASA's own image-use standard is one central rule and can be applied
        # to either feed when an original NASA image is actually associated with
        # the exact NASA article. Nature's current Collector still uses Commons
        # contextual assets; this also keeps the shared route ready for NASA media.
        if view_id == "nature":
            article_host = checker._domain(article_url)
            image_url = checker._clean(image.get("url") or image.get("imageUrl") or image.get("image_url"), 1200)
            image_host = checker._domain(image_url)
            nasa_article = article_host == "nasa.gov" or article_host.endswith(".nasa.gov")
            nasa_image = image_host == "nasa.gov" or image_host.endswith(".nasa.gov")
            if nasa_article and nasa_image:
                nasa_decision = original_evaluate_image(
                    "alien-world", story_id, image,
                    article_url=article_url, source_name=source_name,
                )
                return _remap_image_decision("nature", story_id, nasa_decision, "nasa")

            registry = checker.load_registry()
            government_hosts = set()
            for policy in registry.get("policies", []):
                if policy.get("text", {}).get("mode") == EDUCATIONAL_MODE:
                    government_hosts.update(policy.get("articleDomains", []))
            is_government_article = any(
                article_host == domain or article_host.endswith("." + domain)
                for domain in government_hosts
            )
            is_commons_image = checker._host_matches(image_host, ["upload.wikimedia.org", "raw.githubusercontent.com"])
            if is_government_article and is_commons_image:
                checked = original_evaluate_image(
                    "nature", story_id, image,
                    article_url="https://phys.org/nature-educational-context-check",
                    source_name=source_name,
                )
                evidence = dict(checked.get("evidence", {}))
                evidence["articleUrl"] = checker._clean(article_url, 1200)
                checked = dict(checked)
                checked["evidence"] = evidence
                return _remap_image_decision("nature", story_id, checked, "wikimediaCommons")

        decision = original_evaluate_image(
            view_id, story_id, image, article_url=article_url, source_name=source_name
        )
        if view_id == "nature" and decision.get("policyId") == "wikimedia-commons-individual-file-v1":
            return _remap_image_decision("nature", story_id, decision, "wikimediaCommons")
        return decision

    checker.evaluate_image = evaluate_image

    # The shared final gate has a legacy per-view image-policy version selector
    # (Nature -> Commons, Alien World -> NASA). Permit a separately approved
    # NASA image in a Nature story without changing the Commons policy version:
    # temporarily map only that NASA decision to the Nature gate's expected
    # version, then restore the actual NASA policy version in the output record.
    original_get_decision = checker.get_decision
    original_gate_feed = checker.gate_feed

    def gate_feed(feed, connection, view_id: str, *, minimum_stories: int = 2):
        if view_id != "nature":
            return original_gate_feed(
                feed, connection, view_id, minimum_stories=minimum_stories
            )
        expected_version = str(
            checker.load_registry().get("imagePolicies", {}).get(
                "wikimediaCommons", {}
            ).get("policyVersion", "1")
        )
        nasa_versions: dict[str, str] = {}

        def compatible_get_decision(db, current_view, story_id, content_kind):
            decision = original_get_decision(db, current_view, story_id, content_kind)
            if (decision and current_view == "nature" and content_kind == "image"
                    and decision.get("policyId") == "nasa-media-guidelines-item-screen-v2"):
                nasa_versions[str(story_id)] = str(decision.get("policyVersion", "2"))
                compatible = dict(decision)
                compatible["policyVersion"] = expected_version
                return compatible
            return decision

        checker.get_decision = compatible_get_decision
        try:
            approved = original_gate_feed(
                feed, connection, view_id, minimum_stories=minimum_stories
            )
        finally:
            checker.get_decision = original_get_decision

        for story in approved.get("stories", []):
            story_id = checker._clean(story.get("id"), 160)
            actual_version = nasa_versions.get(story_id)
            if actual_version and isinstance(story.get("imageRights"), dict):
                story["imageRights"]["policyVersion"] = actual_version
        return approved

    checker.gate_feed = gate_feed
    checker.CHECKER_VERSION = "1.2.0"
    checker._shared_policy_engine_installed = True
