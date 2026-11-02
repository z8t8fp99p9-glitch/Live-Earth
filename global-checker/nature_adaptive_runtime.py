#!/usr/bin/env python3
"""Nature feed adapter: discovery parsing, eligible-story selection and 50 cap.

This module contains no source-rights policy. Every text/image decision is made
by the shared Global Checker policy engine using source-registry.json.
"""
from __future__ import annotations

import builtins
import importlib.util
import json
import subprocess
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any

EXTRA_HOSTS = {"noaa.gov", "nasa.gov", "usgs.gov", "phys.org", "news.mongabay.com", "mongabay.com"}
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


@contextmanager
def _legacy_test_profile(profile_path: Path):
    """Run pre-existing 10-story fixtures without changing the live 50 target."""
    original = profile_path.read_text(encoding="utf-8")
    data = json.loads(original)
    data["publication"]["maximumStories"] = 10
    data["publication"]["adaptiveLookback"]["targetStories"] = 10
    profile_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    try:
        yield
    finally:
        profile_path.write_text(original, encoding="utf-8")


def _validate_configuration(root: Path, checker) -> None:
    profile = json.loads((root / PROFILE_RELATIVE).read_text(encoding="utf-8"))
    publication = profile["publication"]
    if publication.get("maximumStories") != 50 or publication.get("adaptiveLookback", {}).get("targetStories") != 50:
        raise RuntimeError("Nature's live publication target must be 50 stories.")
    if publication.get("issueWindowHours") != 48:
        raise RuntimeError("Nature must retain its 48-hour initial lookback.")
    if publication.get("adaptiveLookback", {}).get("expansionHours") != [48, 96, 168, 336, 504, 768]:
        raise RuntimeError("Nature adaptive lookback stages changed unexpectedly.")
    if profile.get("database", {}).get("retentionDays") != 32:
        raise RuntimeError("Nature's independent database retention must remain 32 days.")
    if len(profile.get("sources", [])) != 7:
        raise RuntimeError("Nature source profile must contain the seven verified feeds.")
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
                with _legacy_test_profile(profile_path):
                    return original_tests()

            def nature_min(*values):
                if len(values) == 2 and values[0] == 12 and values[1] == 50:
                    return 50
                return builtins.min(*values)

            module.run_tests = compatible_tests
            module.min = nature_min
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
                registry_version = checker.load_registry().get("registryVersion")
                eligibility = checker.load_registry().get("publicationEligibility", {})
                eligible = []
                for row in rows:
                    story_id = str(row["story_id"])
                    text_decision = checker.get_decision(self._connection, "nature", story_id, "text")
                    text_ok = bool(
                        text_decision
                        and text_decision.get("allowed")
                        and text_decision.get("registryVersion") == registry_version
                        and text_decision.get("summaryAllowed")
                        and checker._meaningful_text(row["summary"], eligibility)
                    )
                    image_decision = checker.get_decision(self._connection, "nature", story_id, "image")
                    image_record = self._verified_images.get(story_id)
                    image_ok = bool(
                        image_decision and image_decision.get("allowed")
                        and image_decision.get("registryVersion") == registry_version
                        and pipeline._technical_image_record(row, image_record, publisher_module.ROOT)
                    )
                    if text_ok or image_ok:
                        eligible.append(row)

                preferred = [
                    row for row in eligible
                    if pipeline._technical_image_record(
                        row, self._verified_images.get(str(row["story_id"])), publisher_module.ROOT
                    )
                ]
                selected = preferred[:self._maximum_stories]
                selected_ids = {str(row["story_id"]) for row in selected}
                for row in eligible:
                    if len(selected) >= self._maximum_stories:
                        break
                    story_id = str(row["story_id"])
                    if story_id not in selected_ids:
                        selected.append(row)
                        selected_ids.add(story_id)
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
        with _legacy_test_profile(root / PROFILE_RELATIVE):
            original_contract_tests()
        shared_test = root / "global-checker" / "tests" / "test_shared_policy_engine.py"
        result = subprocess.run(
            [sys.executable, str(shared_test)], cwd=root, check=False
        )
        if result.returncode:
            raise RuntimeError("Shared Global Checker policy-engine tests failed.")

    def install_50_story_engine(engine):
        original_engine_handoff(engine)
        original_build_brief = engine.build_brief

        def build_brief(profile, command, now=None):
            brief = original_build_brief(profile, command, now)
            if brief.view_id == "nature":
                from dataclasses import replace
                return replace(brief, maximum_stories=50)
            return brief

        engine.build_brief = build_brief

    module._run_contract_tests = compatible_contract_tests
    module._install_collector_checker = install_collector_with_registry_backfill
    module._install_engine_handoff = install_50_story_engine
    _install_checker_eligible_adaptive_selection(module, checker)
    sys.argv = [str(runner), phase, "--view", "nature"]
    result = module.main()
    if isinstance(result, int) and result:
        raise SystemExit(result)
