#!/usr/bin/env python3
"""LIVE // EARTH Universal Editorial Engine — Global Newsroom adapter.

This additive adapter sits beside the existing Universal Editorial Engine
v1.3.0. It consumes only the `editorialInputs` explicitly released by Global
Checker collection intake and produces a transient package for
`global_checker_workflow.review_editorial_package(...)`.

It does not collect sources, call a hosted model, open/write a View database,
write a feed/PDF, or publish anything.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import importlib
import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, urlsplit

ENGINE_NAME = "Universal Editorial Engine"
NEWSROOM_ADAPTER_VERSION = "1.0.0"
CORE_ENGINE_VERSION = "1.3.0"
ALLOWED_VIEWS = {"nature", "alien-world"}
REQUIRED_EDITORIAL_PERMISSIONS = (
    "temporaryProcessing",
    "transformation",
    "derivedOutputStorage",
    "derivedOutputDisplay",
    "headingLinkUse",
)
RAW_SOURCE_FIELDS = {
    "rawText", "sourceText", "sourceBody", "articleBody", "fullText",
    "rawHtml", "htmlBody", "originalArticleText",
}
RISK_RULES = (
    ("medical-instructions", ("dosage", "prescription", "treatment recommendation", "cure", "clinical advice"), "high"),
    ("casualties-or-violence", ("killed", "fatalities", "casualties", "mass shooting", "armed attack", "bombing"), "medium"),
    ("active-conflict", ("war zone", "military operation", "airstrike", "invasion", "hostage"), "medium"),
    ("election-or-political-claim", ("election result", "vote count", "candidate claims", "political party"), "medium"),
    ("unverified-emergency-advice", ("evacuate immediately", "emergency warning", "life-threatening advice"), "high"),
)


class UniversalEditorialNewsroomError(RuntimeError):
    """The editorial hand-off is invalid or cannot be safely produced."""


def _clean(value: Any, limit: int = 12000) -> str:
    if value is None:
        return ""
    raw = html.unescape(str(value))
    raw = re.sub(r"<[^>]*>", " ", raw)
    raw = raw.replace("\u00a0", " ")
    return re.sub(r"\s+", " ", raw).strip()[:limit]


def _https(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        parsed = urlparse(value.strip())
        return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password
    except ValueError:
        return False


def _canonical_url(value: Any) -> str:
    """Match Global Checker's HTTPS canonicalisation for article identity."""
    try:
        parsed = urlsplit(str(value or "").strip())
        if (
            parsed.scheme.lower() != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.port not in (None, 443)
        ):
            return ""
        host = parsed.hostname.lower().rstrip(".")
        path = parsed.path or "/"
        query = "&".join(
            part for part in parsed.query.split("&")
            if part and not part.split("=", 1)[0].lower().startswith("utm_")
            and part.split("=", 1)[0].lower() not in {"fbclid", "gclid", "mc_cid", "mc_eid"}
        )
        return f"https://{host}{path}" + (f"?{query}" if query else "")
    except (TypeError, ValueError):
        return ""


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _load_policy_context(repository_root: Path):
    root = Path(repository_root).resolve()
    checker_dir = root / "global-checker"
    if not checker_dir.is_dir():
        raise UniversalEditorialNewsroomError("The Global Checker directory is missing.")
    if str(checker_dir) not in sys.path:
        sys.path.insert(0, str(checker_dir))
    try:
        workflow = importlib.import_module("global_checker_workflow")
        context = workflow.RepositoryPolicies(root)
    except Exception as exc:
        raise UniversalEditorialNewsroomError(
            f"Global Checker policies could not be loaded: {type(exc).__name__}: {exc}"
        ) from exc
    return context


def _sentence_list(summary: str) -> list[str]:
    """Extract substantial source sentences for traceable, attributed synthesis."""
    raw = _clean(summary, 16000)
    if not raw:
        return []
    # Keep sentence boundaries where practical; abbreviations may be split, so
    # short fragments are discarded rather than treated as factual claims.
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])", raw)
    output: list[str] = []
    seen: set[str] = set()
    for part in parts:
        sentence = _clean(part, 1800)
        low = sentence.casefold()
        if len(sentence) < 48 or len(sentence.split()) < 7:
            continue
        if any(marker in low for marker in (
            "read more", "click here", "subscribe", "sign up", "related stories",
            "privacy policy", "terms of use", "all rights reserved",
        )):
            continue
        key = re.sub(r"[^a-z0-9]+", " ", low).strip()
        if key and key not in seen:
            seen.add(key)
            output.append(sentence)
    return output


def _select_evidence_sentences(summary: str) -> list[str]:
    sentences = _sentence_list(summary)
    if not sentences:
        return []
    total_words = max(1, len(_clean(summary).split()))
    chosen: list[str] = []
    words = 0
    for sentence in sentences:
        sentence_words = len(sentence.split())
        if chosen and words + sentence_words > max(30, int(total_words * 0.72)):
            break
        chosen.append(sentence)
        words += sentence_words
        if len(chosen) >= 3:
            break
    return chosen


def _topic_tags(profile: dict[str, Any], title: str, summary: str) -> list[str]:
    corpus = f"{title} {summary}".casefold()
    tags: list[str] = []
    for raw in profile.get("topicsAndCategories", []):
        tag = _clean(raw, 100)
        if not tag:
            continue
        needle = tag.casefold()
        if needle in corpus:
            tags.append(tag)
            continue
        terms = [x for x in re.findall(r"[a-z0-9]+", needle) if len(x) > 2]
        if terms and all(re.search(rf"\b{re.escape(term)}\b", corpus) for term in terms):
            tags.append(tag)
    return tags


def _risk_assessment(summary: str, title: str) -> dict[str, Any]:
    corpus = f"{title} {summary}".casefold()
    flags = []
    for risk_code, phrases, severity in RISK_RULES:
        matches = [phrase for phrase in phrases if phrase in corpus]
        if matches:
            flags.append({
                "riskCode": risk_code,
                "severity": severity,
                "resolved": False,
                "matchedTerms": matches,
                "note": "Deterministic keyword flag; requires assessment before publication.",
            })
    return {
        "method": "bounded-deterministic-keyword-screen-v1",
        "scope": "limited screening only; not a substitute for expert fact-checking",
        "flags": flags,
    }


def _headline(view_name: str, source_title: str) -> str:
    # A neutral editorial wrapper is added without inventing a new factual claim.
    source_title = _clean(source_title, 180)
    prefix = f"{view_name} Brief: "
    available = max(12, 200 - len(prefix))
    if len(source_title) > available:
        source_title = source_title[:available - 1].rsplit(" ", 1)[0].rstrip(" -,:;") + "…"
    return _clean(prefix + source_title, 200)


def _make_story(record: dict[str, Any], intake_item: dict[str, Any], profile: dict[str, Any],
                view_name: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]], str | None]:
    story_id = _clean(record.get("id") or record.get("story_id"), 160)
    title_in = _clean(record.get("title"), 500)
    summary_in = _clean(record.get("summary"), 16000)
    article_url = _canonical_url(record.get("url"))
    source_name = _clean(record.get("sourceName"), 200)
    source_url = _clean(record.get("sourceUrl"), 1400)
    policy_ref = _clean(intake_item.get("sourcePolicyRef"), 160)
    permissions = intake_item.get("permissions", {})

    if not story_id or not article_url or not _https(source_url):
        return None, [], "Missing story identity or valid HTTPS source links."
    if not title_in or not source_name or not policy_ref:
        return None, [], "Missing permitted headline or registered source identity."
    if any(permissions.get(name) != "allowed" for name in REQUIRED_EDITORIAL_PERMISSIONS):
        return None, [], "The required editorial-use permission matrix is not fully allowed."
    if not summary_in:
        return None, [], "No source summary was released for permitted editorial transformation."

    evidence_sentences = _select_evidence_sentences(summary_in)
    if not evidence_sentences:
        return None, [], "No substantial source sentences were available for traceable editorial synthesis."

    # The lead is newly composed by the Engine; source sentences remain bounded,
    # attributed evidence. This deterministic adapter does not claim open-ended
    # generative paraphrasing or introduce facts absent from the source excerpt.
    lead = f"This {view_name.lower()} editorial brief draws on reporting from {source_name}."
    editorial_summary = _clean(" ".join([lead, *evidence_sentences]), 6000)
    if len(editorial_summary) < 100 or len(editorial_summary.split()) < 16:
        return None, [], "The permitted source excerpt is too short for the Checker minimum summary length."
    if _hash(editorial_summary) == _hash(summary_in):
        return None, [], "The editorial summary did not differ from the source summary."

    headline = _headline(view_name, title_in)
    if not 12 <= len(headline) <= 200:
        return None, [], "The editorial headline is outside the Global Checker length limits."

    tags = _topic_tags(profile, headline, editorial_summary)
    if not tags:
        return None, [], "No registered View topic/category could be grounded in the permitted source text."

    evidence: list[dict[str, Any]] = []
    claims: list[dict[str, Any]] = []
    for index, sentence in enumerate(evidence_sentences, start=1):
        evidence_id = f"{story_id}-e{index}"
        evidence.append({
            "evidenceId": evidence_id,
            "sourceRecordId": story_id,
            "sourceUrl": article_url,
            "sourcePolicyRef": policy_ref,
            "sourceDecisionId": intake_item.get("sourceDecision", {}).get("decisionId"),
            "excerpt": sentence,
        })
        claims.append({
            "claimId": f"{story_id}-c{index}",
            "text": sentence,
            "evidenceIds": [evidence_id],
            "material": True,
        })

    story: dict[str, Any] = {
        "id": story_id,
        "sourceRecordId": story_id,
        "viewId": intake_item.get("viewId"),
        "title": headline,
        "summary": editorial_summary,
        "url": article_url,
        "sourceName": source_name,
        "sourceUrl": source_url,
        "sourcePolicyRef": policy_ref,
        "publishedAt": record.get("publishedAt") or record.get("published"),
        "globalCheckerIntakeDecisionId": record.get("globalCheckerIntakeDecisionId"),
        "topicTags": tags,
        "claims": claims,
        "riskAssessment": _risk_assessment(editorial_summary, headline),
    }

    # Reuse only original images already approved by Global Checker at intake.
    # Image Engine fallback records are handled on their own eligible branch;
    # this adapter never upgrades or imports an image decision on its own.
    approved_images = record.get("approvedOriginalImages")
    if isinstance(approved_images, list):
        first = next((item for item in approved_images if isinstance(item, dict)), None)
        if first:
            story["imageCandidate"] = dict(first)

    return story, evidence, None


def produce_editorial_package(intake_review: dict[str, Any], *, repository_root: str | Path) -> dict[str, Any]:
    """Build a transient Universal Editorial Engine package from Checker intake."""
    if not isinstance(intake_review, dict) or intake_review.get("schemaVersion") != 1:
        raise UniversalEditorialNewsroomError("Global Checker intake schema is invalid.")
    if intake_review.get("phase") != "collection-intake":
        raise UniversalEditorialNewsroomError("Editorial Engine requires the Global Checker collection-intake phase.")
    view_id = intake_review.get("viewId")
    if view_id not in ALLOWED_VIEWS:
        raise UniversalEditorialNewsroomError("Editorial Engine received an unregistered View.")

    context = _load_policy_context(Path(repository_root))
    profile = context.profiles.get(view_id)
    if not profile or profile.get("enabled") is not True:
        raise UniversalEditorialNewsroomError("The matching View Collection Profile is missing or disabled.")
    if intake_review.get("checkerRegistryVersion") != context.checker_registry.get("registryVersion"):
        raise UniversalEditorialNewsroomError("Global Checker registry changed after intake; editorial production is held.")
    if intake_review.get("managerRegistryVersion") != context.sources_doc.get("registryVersion"):
        raise UniversalEditorialNewsroomError("Manager Source Registry changed after intake; editorial production is held.")

    reviews = {
        item.get("storyId"): item for item in intake_review.get("reviews", [])
        if isinstance(item, dict) and item.get("storyId")
    }
    inputs = intake_review.get("editorialInputs")
    if not isinstance(inputs, list):
        raise UniversalEditorialNewsroomError("Global Checker intake has no editorialInputs array.")

    stories: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []
    held: list[dict[str, Any]] = []
    seen: set[str] = set()
    view_name = _clean(profile.get("viewName") or view_id, 100)

    for record in inputs:
        if not isinstance(record, dict):
            held.append({"storyId": "invalid-record", "status": "UNKNOWN", "reason": "Editorial input is not an object."})
            continue
        story_id = _clean(record.get("id") or record.get("story_id"), 160)
        if not story_id or story_id in seen:
            held.append({"storyId": story_id or "missing-story-id", "status": "UNKNOWN", "reason": "Missing or repeated source record identity."})
            continue
        seen.add(story_id)
        intake_item = reviews.get(story_id)
        if not intake_item or intake_item.get("eligibleForGlobalEditor") is not True:
            held.append({"storyId": story_id, "status": "UNKNOWN", "reason": "No exact eligible Global Checker editorial intake decision exists."})
            continue
        if record.get("globalCheckerIntakeDecisionId") != intake_item.get("sourceDecision", {}).get("decisionId"):
            held.append({"storyId": story_id, "status": "RED", "reason": "Editorial input does not match the exact Checker decision ID."})
            continue
        if record.get("globalCheckerPermissionMatrix") != intake_item.get("permissions"):
            held.append({"storyId": story_id, "status": "RED", "reason": "Editorial input permission matrix differs from the Checker review."})
            continue
        if record.get("rawSourceTextPersistence") != "PROHIBITED_BY_THIS_WORKFLOW":
            held.append({"storyId": story_id, "status": "RED", "reason": "Raw source text persistence marker is missing."})
            continue
        if record.get("viewId") not in (None, view_id):
            held.append({"storyId": story_id, "status": "RED", "reason": "Editorial input crosses a View boundary."})
            continue
        if _canonical_url(record.get("url")) != intake_item.get("articleUrl"):
            held.append({"storyId": story_id, "status": "RED", "reason": "Article URL differs from the exact Checker intake decision."})
            continue
        if any(field in record for field in RAW_SOURCE_FIELDS):
            held.append({"storyId": story_id, "status": "RED", "reason": "Raw article body/HTML fields are forbidden in Editorial Engine input."})
            continue

        story, story_evidence, reason = _make_story(record, intake_item, profile, view_name)
        if reason:
            held.append({"storyId": story_id, "status": "UNKNOWN", "reason": reason})
            continue
        stories.append(story)
        evidence.extend(story_evidence)

    return {
        "schemaVersion": 1,
        "engine": ENGINE_NAME,
        "coreEngineVersion": CORE_ENGINE_VERSION,
        "newsroomAdapterVersion": NEWSROOM_ADAPTER_VERSION,
        "phase": "editorial-production",
        "viewId": view_id,
        "profileId": profile.get("profileId"),
        "generatedAt": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "statistics": {
            "editorialInputsReceived": len(inputs),
            "storiesPackaged": len(stories),
            "storiesHeld": len(held),
            "evidenceRecords": len(evidence),
        },
        "stories": stories,
        "evidence": evidence,
        "held": held,
        "privacyAndOwnership": {
            "sourceWebsitesFetched": False,
            "hostedAIOrInferenceUsed": False,
            "paidServiceUsed": False,
            "rawArticleBodyRead": False,
            "rawSourceTextPersisted": False,
            "evidenceExcerptsAreTransientForCheckerOnly": True,
            "viewDatabaseOpenedOrWritten": False,
            "feedOrPDFWritten": False,
            "publicationPerformed": False,
            "viewDatabasesMixed": False,
            "checkerDecisionsCreatedOrSelfApproved": False,
        },
        "nextSystem": "Global Checker final review",
        "handoffNote": (
            "Pass this package and the exact same collection-intake review to "
            "global_checker_workflow.review_editorial_package(...). Only its GREEN "
            "approvedStories may continue to the correct View-owned database writer and Publisher."
        ),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="live-earth-universal-editorial-engine",
        description="Create a Checker-reviewable editorial package from Global Checker intake.",
    )
    parser.add_argument("--intake-file", required=True, help="JSON output from Global Checker collection intake.")
    parser.add_argument("--repository-root", default=".", help="LIVE // EARTH repository root.")
    args = parser.parse_args(argv)
    try:
        intake = json.loads(Path(args.intake_file).read_text(encoding="utf-8"))
        package = produce_editorial_package(intake, repository_root=args.repository_root)
        json.dump(package, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:
        json.dump({
            "engine": ENGINE_NAME,
            "newsroomAdapterVersion": NEWSROOM_ADAPTER_VERSION,
            "phase": "editorial-production-blocked",
            "viewDatabaseOpenedOrWritten": False,
            "errorType": type(exc).__name__,
            "message": str(exc)[:500],
        }, sys.stderr, ensure_ascii=False, indent=2)
        sys.stderr.write("\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
