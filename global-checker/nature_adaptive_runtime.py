#!/usr/bin/env python3
"""Nature feed adapter: discovery parsing and uncapped 32-day eligible-story selection.

This module contains no source-rights policy. Every text/image decision is made
by the shared Global Checker policy engine using source-registry.json.
"""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

EXTRA_HOSTS = {"noaa.gov", "nasa.gov", "usgs.gov", "news.mongabay.com", "mongabay.com"}
PROFILE_RELATIVE = Path("nature/publisher/profile.json")
EXPECTED_POLICY_IDS = {
    "nasa-official-federal-source-text-v1",
    "noaa-ocean-service-educational-government-v1",
    "usgs-national-news-educational-government-v1",
    "physorg-rss-headline-link-limited-v1",
    "mongabay-per-item-open-license-required-v2",
    "sciencedaily-no-persistent-database-v1",
    "nature-portfolio-database-storage-prohibited-v1",
}


def _validate_configuration(root: Path, checker) -> None:
    profile = json.loads((root / PROFILE_RELATIVE).read_text(encoding="utf-8"))
    publication = profile["publication"]
    if publication.get("maximumStories") != 0 or publication.get("adaptiveLookback", {}).get("targetStories") != 0:
        raise RuntimeError("Nature must not impose a published story-count limit.")
    if publication.get("issueWindowHours") != 768:
        raise RuntimeError("Nature must publish the complete rolling 32-day window.")
    if publication.get("adaptiveLookback", {}).get("expansionHours") != [768]:
        raise RuntimeError("Nature must use one complete 32-day publication window.")
    if profile.get("database", {}).get("retentionDays") != 32:
        raise RuntimeError("Nature's independent database retention must remain 32 days.")
    if len(profile.get("sources", [])) != 6:
        raise RuntimeError("Nature must use the six active feeds; Phys.org has been removed.")
    if any("phys.org" in str(source.get("url", "")).lower() for source in profile.get("sources", [])):
        raise RuntimeError("Phys.org must remain absent from Nature's active source list.")
    registry = checker.load_registry()
    ids = {item.get("policyId") for item in registry.get("policies", [])}
    missing = EXPECTED_POLICY_IDS - ids
    if missing:
        raise RuntimeError("Central Global Checker registry is missing: " + ", ".join(sorted(missing)))
    for policy_id in (
        "nasa-official-federal-source-text-v1",
        "noaa-ocean-service-educational-government-v1",
        "usgs-national-news-educational-government-v1",
    ):
        policy = next(item for item in registry["policies"] if item["policyId"] == policy_id)
        if set(policy.get("views", [])) != {"nature", "alien-world"}:
            raise RuntimeError(f"Shared government policy is not enabled for both views: {policy_id}")


def _expanded_nature_feed_parser(module):
    """Parse RSS/Atom robustly, including publisher feeds with imperfect XML.

    Feedparser recovers entries from common RSS/Atom markup defects (unescaped
    ampersands, malformed embedded HTML and namespace quirks) that make strict
    ElementTree parsing reject an entire feed. It performs no rights decisions.
    """
    import feedparser

    def parse_feed(payload: bytes, source_name: str, source_url: str) -> list[dict[str, str]]:
        parsed = feedparser.parse(payload)
        entries = list(parsed.get("entries", []))
        if not entries:
            detail = parsed.get("bozo_exception")
            if detail:
                raise ValueError(f"RSS/Atom parser recovered no entries: {detail}")
            return []
        items = []
        terms = (
            "nature", "wildlife", "species", "forest", "ocean", "marine", "ecology",
            "conservation", "biodiversity", "climate", "habitat", "bird", "animal",
            "plant", "reef", "river", "pollution", "deforestation", "restoration",
            "environment", "ecosystem", "tiger", "coral", "deep sea", "wetland",
            "insect", "pollinator", "mammal", "amphibian", "reptile", "fish", "tree",
            "vegetation", "rainforest", "grassland", "soil", "freshwater", "drought",
            "flood", "wildfire", "fire", "storm", "hurricane", "cyclone", "tornado",
            "volcano", "earthquake", "glacier", "ice sheet", "coast", "estuary",
            "water quality", "air quality", "carbon", "emissions", "extinction",
            "endangered", "invasive", "migration", "ocean acidification", "sea level",
            "natural event", "earth observation", "environmental research", "ecological",
            "ocean service", "wetlands", "coral bleaching", "marine heatwave", "landslide",
            "disease ecology", "habitat restoration", "national park", "geology", "volcanic",
        )
        for entry in entries:
            title = module.clean(entry.get("title", ""), 240)
            url = module.clean(entry.get("link", ""), 1200)
            raw_summary = entry.get("summary", "")
            if not raw_summary:
                content_blocks = entry.get("content") or []
                if content_blocks:
                    raw_summary = content_blocks[0].get("value", "")
            summary = module.clean(raw_summary, 6000)
            published = module.clean(
                entry.get("published") or entry.get("updated") or entry.get("created") or "", 240
            )
            if not title or not module.safe_https(url, module.ALLOWED_FEED_HOSTS):
                continue
            haystack = (title + " " + summary).casefold()
            if not any(term in haystack for term in terms):
                continue
            items.append({
                "title": title[:240], "url": url, "summary": summary[:2200],
                "sourceName": source_name, "sourceUrl": source_url, "published": published,
            })
        return items

    return parse_feed


def _install_runner_adapters(run_pipeline, root: Path) -> None:
    original_loader = run_pipeline._load_module
    profile_path = root / PROFILE_RELATIVE

    def loader(name: str, path: Path):
        module = original_loader(name, path)
        normalized = Path(path).as_posix()
        if normalized.endswith("nature/collector/collector.py"):
            module.ALLOWED_FEED_HOSTS.update(EXTRA_HOSTS)
            module.parse_feed = _expanded_nature_feed_parser(module)
        elif normalized.endswith("nature/publisher/publisher.py"):
            original_tests = module.run_tests

            def compatible_tests():
                # Contract tests read the real uncapped 32-day profile.
                return original_tests()

            module.run_tests = compatible_tests
        return module

    run_pipeline._load_module = loader


def _install_checker_eligible_adaptive_selection(pipeline, checker) -> None:
    """Count only stories that pass the same central Text OR Image Checker rule."""
    original_install = pipeline._install_readonly_publisher

    def install(publisher_module):
        original_install(publisher_module)
        base = publisher_module.NatureEngineReadOnlyConnection

        class CheckerEligibleConnection(base):
            def execute(self, sql, parameters=()):
                normalized = " ".join(str(sql).lower().split())
                if "from stories where published_at" not in normalized:
                    return self._connection.execute(sql, parameters)
                if self._now is not None and self._lookback_hours is not None:
                    params = (
                        (self._now - pipeline.timedelta(hours=self._lookback_hours)).timestamp(),
                        (self._now + pipeline.timedelta(hours=2)).timestamp(),
                    )
                else:
                    params = parameters
                rows = self._connection.execute(sql, params).fetchall()
                rows = publisher_module.deduplicate_story_rows(rows)
                registry = checker.load_registry()
                registry_version = registry.get("registryVersion")
                policies_by_id = {str(policy.get("policyId")): policy for policy in registry.get("policies", [])}
                eligible = []
                for row in rows:
                    story_id = str(row["story_id"])
                    text_decision = checker.get_decision(self._connection, "nature", story_id, "text")
                    text_evidence = (text_decision or {}).get("evidence", {})
                    text_policy = policies_by_id.get(str((text_decision or {}).get("policyId")), {})
                    # Storage approval is the entry gate. Summary restrictions are
                    # already enforced before persistence by CheckedConnection;
                    # a permitted headline/link may still use approved original artwork.
                    text_ok = bool(
                        text_decision
                        and text_decision.get("allowed")
                        and text_decision.get("registryVersion") == registry_version
                        and text_policy.get("status") in {"GREEN_CONDITIONAL", "AMBER_LIMITED", "AMBER_ITEM_LICENSE_REQUIRED"}
                        and text_evidence.get("articleUrl") == str(row["url"])
                        and text_evidence.get("title") == str(row["title"])
                        and text_evidence.get("sourceUrl") == str(row["source_url"])
                        and text_evidence.get("sourceName") == str(row["source_name"])
                    )
                    # A source denied for storage is rejected even if an image
                    # exists. Stored and permitted text routes (including limited
                    # headline/link use) can proceed to the image fallback.
                    if text_ok:
                        eligible.append(row)

                preferred = [
                    row for row in eligible
                    if pipeline._technical_image_record(
                        row, self._verified_images.get(str(row["story_id"])), publisher_module.ROOT
                    )
                ]
                # All eligible records in the 32-day window are published.
                # Documentary photos retain ordering priority only when a cap exists.
                if self._maximum_stories > 0:
                    selected = preferred[:self._maximum_stories]
                    selected_ids = {str(row["story_id"]) for row in selected}
                    for row in eligible:
                        if len(selected) >= self._maximum_stories:
                            break
                        story_id = str(row["story_id"])
                        if story_id not in selected_ids:
                            selected.append(row)
                            selected_ids.add(story_id)
                else:
                    selected = list(eligible)
                selected.sort(key=lambda row: float(row["published_at"] or 0), reverse=True)
                self.story_selection_applied = True
                self.selected_documentary_images = sum(
                    1 for row in selected
                    if pipeline._technical_image_record(
                        row, self._verified_images.get(str(row["story_id"])), publisher_module.ROOT
                    )
                )
                return publisher_module._BufferedRows(selected)

        publisher_module.NatureEngineReadOnlyConnection = CheckerEligibleConnection

    pipeline._install_readonly_publisher = install


def run_nature(root: Path, runner: Path, phase: str) -> None:
    if str(root / "global-checker") not in sys.path:
        sys.path.insert(0, str(root / "global-checker"))
    import global_checker as checker
    _validate_configuration(root, checker)

    import run_pipeline
    _install_runner_adapters(run_pipeline, root)

    spec = importlib.util.spec_from_file_location("live_earth_nature_pipeline_shared_checker", runner)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load the existing Nature single-Checker runner.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)

    original_contract_tests = module._run_contract_tests
    original_engine_handoff = module._install_engine_handoff
    original_collector_checker = module._install_collector_checker

    def install_collector_with_registry_backfill(collector_module, profile):
        # A registry-version change invalidates old decisions. Re-check retained
        # Nature rows/images through the same shared Checker before cache reuse.
        original_collector_checker(collector_module, profile)
        original_db_connect = collector_module.db_connect

        def open_checked_db():
            connection = original_db_connect()
            connection.backfill_existing()
            return connection

        collector_module.db_connect = open_checked_db

    def compatible_contract_tests():
        # Keep the actual Nature profile intact while checking the uncapped 32-day contract.
        original_contract_tests()
        shared_test = root / "global-checker" / "tests" / "test_shared_policy_engine.py"
        result = subprocess.run(
            [sys.executable, str(shared_test)], cwd=root, check=False
        )
        if result.returncode:
            raise RuntimeError("Shared Global Checker policy-engine tests failed.")

    def install_unlimited_story_engine(engine):
        original_engine_handoff(engine)
        original_build_brief = engine.build_brief

        def build_brief(profile, command, now=None):
            brief = original_build_brief(profile, command, now)
            if brief.view_id == "nature":
                from dataclasses import replace
                return replace(brief, maximum_stories=0)
            return brief

        engine.build_brief = build_brief

    module._run_contract_tests = compatible_contract_tests
    module._install_collector_checker = install_collector_with_registry_backfill
    module._install_engine_handoff = install_unlimited_story_engine
    _install_checker_eligible_adaptive_selection(module, checker)
    sys.argv = [str(runner), phase, "--view", "nature"]
    result = module.main()
    if isinstance(result, int) and result:
        raise SystemExit(result)
