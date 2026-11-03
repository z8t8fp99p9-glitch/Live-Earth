"""Global Collector orchestration: fetch, parse, normalize, and hand to Checker."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from collections import defaultdict

from .errors import GlobalCollectorError
from .job_contract import JobContract
from .normalizer import normalize_entry
from .rss_atom import parse_feed
from .security import fetch_bounded


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class GlobalCollector:
    """One shared collector runtime; a job is restricted to exactly one View."""

    def __init__(self, repository_root: Path):
        self.repository_root = Path(repository_root).resolve()
        self.contract = JobContract(self.repository_root)

    def collect(self, job: dict[str, Any]) -> dict[str, Any]:
        validated = self.contract.validate(job)
        profile = validated["profile"]
        view_id = job["viewId"]
        now = _utc_now()
        window_hours = int(job["requestWindowHours"])
        records_by_identity = {}
        feeds = []
        errors = []

        sources_by_feed = {}
        for url, source_id in validated["sourceByFeedUrl"].items():
            sources_by_feed[url] = (
                validated["sourceById"][source_id],
                validated["checkerPolicyBySource"][source_id],
            )

        for feed_url in sorted(job["feedUrls"]):
            source, policy = sources_by_feed[feed_url]
            allowed_domains = policy.get("feedDomains", [])
            source_result = {
                "sourceId": source["sourceId"],
                "sourceName": source["sourceName"],
                "feedUrl": feed_url,
                "status": "pending",
                "attempts": 0,
                "itemsDiscovered": 0,
                "recordsPrepared": 0,
            }
            try:
                fetched = fetch_bounded(feed_url, allowed_domains=allowed_domains)
                source_result["attempts"] = fetched.attempts
                source_result["finalUrl"] = fetched.final_url
                source_result["contentType"] = fetched.content_type
                entries = parse_feed(fetched.payload, source["sourceName"], feed_url)
                source_result["itemsDiscovered"] = len(entries)

                prepared_for_feed = 0
                for entry in entries:
                    record = normalize_entry(
                        entry,
                        view_id=view_id,
                        source=source,
                        policy=policy,
                        feed_url=feed_url,
                        job_id=job["jobId"],
                        collected_at=now,
                        request_window_hours=window_hours,
                    )
                    if record is None:
                        continue
                    identity = (record["sourceId"], record["url"])
                    if identity not in records_by_identity:
                        records_by_identity[identity] = record
                        prepared_for_feed += 1
                    else:
                        # Same source story repeated in two feeds for this View:
                        # preserve provenance and merge only media candidate metadata.
                        existing = records_by_identity[identity]
                        seen = {item["url"] for item in existing["mediaCandidates"]}
                        for candidate in record["mediaCandidates"]:
                            if candidate["url"] not in seen:
                                existing["mediaCandidates"].append(candidate)
                                seen.add(candidate["url"])
                        existing.setdefault("alsoFoundInFeeds", []).append(feed_url)
                source_result["recordsPrepared"] = prepared_for_feed
                source_result["status"] = "succeeded"
            except Exception as exc:
                source_result["status"] = "failed"
                source_result["errorType"] = type(exc).__name__
                source_result["error"] = str(exc)[:350]
                errors.append({
                    "sourceId": source["sourceId"],
                    "feedUrl": feed_url,
                    "errorType": type(exc).__name__,
                    "message": str(exc)[:350],
                })
            feeds.append(source_result)

        records = list(records_by_identity.values())
        for record in records:
            record["alsoFoundInFeeds"] = sorted(set(record.get("alsoFoundInFeeds", [])))

        succeeded = sum(1 for item in feeds if item["status"] == "succeeded")
        failed = len(feeds) - succeeded
        if succeeded == len(feeds):
            status = "succeeded"
        elif succeeded:
            status = "partial"
        else:
            status = "failed"

        return {
            "schemaVersion": 1,
            "collector": "LIVE // EARTH Global Collector",
            "collectorVersion": "0.1.0",
            # Preserve the complete, already-validated Manager job envelope.
            # Global Checker revalidates the profile, Collector entry point,
            # workflow, View database identity/path, assignments and feed URLs
            # against the current central registries before it accepts records.
            "job": dict(job),
            "registries": {
                "managerSourceRegistryVersion": validated["managerRegistryVersion"],
                "globalCheckerRegistryVersion": validated["checkerRegistryVersion"],
            },
            "status": status,
            "startedAt": now,
            "finishedAt": _utc_now(),
            "statistics": {
                "feedsTotal": len(feeds),
                "feedsSucceeded": succeeded,
                "feedsFailed": failed,
                "itemsDiscovered": sum(x["itemsDiscovered"] for x in feeds),
                "recordsPrepared": len(records),
                "mediaCandidatesFound": sum(len(x["mediaCandidates"]) for x in records),
            },
            "feeds": feeds,
            "records": records,
            "errors": errors,
            "handoff": {
                "nextSystem": "Global Checker",
                "checkerRequiredBeforePersistence": True,
                "imageCandidatesRequireIndependentCheckerDecision": True,
                "rawCandidateTextIsTransient": True,
                "databaseWritesPerformed": False,
                "publicationPerformed": False,
            },
        }
