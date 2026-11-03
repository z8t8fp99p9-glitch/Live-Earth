"""Validate the Manager envelope and registered source assignments only.

This module deliberately does not load or evaluate Global Checker policies.
It verifies routing, identity, assignments, URLs and Manager fingerprints so
that collection is correctly attributed and delivered to the requested View.
"""
from __future__ import annotations

from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import urlsplit
import hashlib
import json
import re
import uuid

from .errors import GlobalCollectorError

SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
REQUIRED_JOB_FIELDS = (
    "jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds",
    "sourceIds", "feedUrls", "collectorEntrypoint", "collectorWorkflow",
    "destinationDatabaseId", "destinationDatabasePath", "scheduledAt",
    "requestWindowHours", "configVersion", "trigger",
)


def canonical_hash(value: Any) -> str:
    raw = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _read_json(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise GlobalCollectorError(f"{label} cannot be read: {exc}") from exc
    if not isinstance(value, dict):
        raise GlobalCollectorError(f"{label} must contain a JSON object.")
    return value


def _safe_id(value: Any, label: str) -> str:
    if not isinstance(value, str) or not SAFE_ID.fullmatch(value):
        raise GlobalCollectorError(f"{label} is not a valid stable ID.")
    return value


def _safe_https(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise GlobalCollectorError(f"{label} must be a non-empty HTTPS URL.")
    try:
        p = urlsplit(value)
        valid_port = p.port in (None, 443)
    except ValueError:
        valid_port = False
        p = urlsplit("")
    if p.scheme.lower() != "https" or not p.hostname or p.username or p.password or not valid_port:
        raise GlobalCollectorError(f"{label} must be an absolute HTTPS URL without credentials or a custom port.")
    return value


def _safe_destination(value: Any, view_id: str, expected: Any) -> str:
    if not isinstance(value, str) or value != expected or "\\" in value:
        raise GlobalCollectorError("Manager destination path does not match the registered View destination.")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in ("", ".", "..") for part in path.parts):
        raise GlobalCollectorError("Manager destination path is not a safe relative path.")
    if len(path.parts) < 3 or path.parts[:2] != (".publisher-data", view_id):
        raise GlobalCollectorError("Manager destination path must remain inside that View's own database folder.")
    return value


class JobContract:
    """Validates current Manager configuration without evaluating content."""

    def __init__(self, repository_root: Path):
        self.root = Path(repository_root).resolve()
        self.manager_config = self.root / "global_collection_manager" / "config"
        self.sources = _read_json(self.manager_config / "source-registry.json", "Manager Source Registry")
        self.profiles = _read_json(self.manager_config / "view-collection-profiles.json", "Manager View Profiles")
        self.assignments = _read_json(self.manager_config / "source-view-assignments.json", "Manager Source-View Assignments")
        self._validate_shapes()

    def _validate_shapes(self):
        for label, data, key in (
            ("Source Registry", self.sources, "sources"),
            ("View Profiles", self.profiles, "profiles"),
            ("Source-View Assignments", self.assignments, "assignments"),
        ):
            if data.get("schemaVersion") != 1 or not isinstance(data.get(key), list):
                raise GlobalCollectorError(f"Manager {label} schema is invalid.")
        if not self.sources.get("registryVersion"):
            raise GlobalCollectorError("Manager Source Registry version is missing.")

    def validate(self, job: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(job, dict):
            raise GlobalCollectorError("Manager job must be a JSON object.")
        missing = [key for key in REQUIRED_JOB_FIELDS if key not in job]
        if missing:
            raise GlobalCollectorError("Manager job is incomplete; missing: " + ", ".join(missing))

        view_id = _safe_id(job["viewId"], "viewId")
        _safe_id(job["profileId"], "profileId")
        _safe_id(job["destinationDatabaseId"], "destinationDatabaseId")
        _safe_id(job["jobId"], "jobId")
        if job["collectorEntrypoint"] != "global_collector":
            raise GlobalCollectorError("Manager job is not addressed to the single global_collector entrypoint.")
        if job["trigger"] not in {"scheduled", "manual"}:
            raise GlobalCollectorError("Manager job trigger must be scheduled or manual.")
        if not isinstance(job["requestWindowHours"], int) or job["requestWindowHours"] <= 0:
            raise GlobalCollectorError("Manager requestWindowHours must be a positive integer.")
        if not isinstance(job["scheduledAt"], str) or not job["scheduledAt"].strip():
            raise GlobalCollectorError("Manager scheduledAt is missing.")

        profiles = {p.get("viewId"): p for p in self.profiles["profiles"]}
        profile = profiles.get(view_id)
        if not profile or not profile.get("enabled"):
            raise GlobalCollectorError(f"No enabled Manager profile exists for View '{view_id}'.")
        if profile.get("profileId") != job["profileId"]:
            raise GlobalCollectorError("Manager profile ID does not match the registered View profile.")
        if profile.get("collectorEntrypoint") != "global_collector":
            raise GlobalCollectorError("Registered View profile does not target the global Collector.")
        if profile.get("collectorWorkflow") != job["collectorWorkflow"]:
            raise GlobalCollectorError("Manager workflow context does not match the registered View profile.")
        if profile.get("destinationDatabaseId") != job["destinationDatabaseId"]:
            raise GlobalCollectorError("Manager database ID does not match the registered View destination.")
        _safe_destination(job["destinationDatabasePath"], view_id, profile.get("destinationDatabasePath"))
        if int(profile.get("lookbackWindowHours", -1)) != job["requestWindowHours"]:
            raise GlobalCollectorError("Manager request window does not match the View profile.")

        assignments = {
            a.get("assignmentId"): a for a in self.assignments["assignments"]
            if a.get("viewId") == view_id and a.get("enabled") is True
        }
        requested_assignment_ids = job["assignmentIds"]
        if not isinstance(requested_assignment_ids, list) or not requested_assignment_ids:
            raise GlobalCollectorError("Manager job must include enabled assignment IDs.")
        assignment_ids = sorted(set(requested_assignment_ids))
        if assignment_ids != sorted(assignments):
            raise GlobalCollectorError("Manager assignment IDs do not match this View's enabled assignments.")

        source_map = {s.get("sourceId"): s for s in self.sources["sources"]}
        expected_source_ids: set[str] = set()
        expected_feed_urls: set[str] = set()
        source_by_feed: dict[str, dict[str, Any]] = {}
        assignment_by_feed: dict[str, dict[str, Any]] = {}
        source_by_id: dict[str, dict[str, Any]] = {}
        for assignment_id in assignment_ids:
            assignment = assignments[assignment_id]
            source_id = assignment.get("sourceId")
            source = source_map.get(source_id)
            if not source or source.get("sourceStatus") != "enabled":
                raise GlobalCollectorError(f"Assignment '{assignment_id}' points to a missing or disabled source.")
            expected_source_ids.add(source_id)
            source_by_id[source_id] = source
            registered_urls = set(source.get("feedUrls", []))
            for feed_url in assignment.get("feedUrls", []):
                _safe_https(feed_url, "Registered feed URL")
                if feed_url not in registered_urls:
                    raise GlobalCollectorError(f"Assignment '{assignment_id}' contains a URL not registered to its source.")
                if feed_url in source_by_feed and source_by_feed[feed_url]["sourceId"] != source_id:
                    raise GlobalCollectorError("A feed URL is assigned to conflicting source identities within one View.")
                source_by_feed[feed_url] = source
                assignment_by_feed[feed_url] = assignment
                expected_feed_urls.add(feed_url)

        if sorted(expected_source_ids) != sorted(set(job["sourceIds"])):
            raise GlobalCollectorError("Manager source IDs do not match this View's enabled assignments.")
        if sorted(expected_feed_urls) != sorted(set(job["feedUrls"])):
            raise GlobalCollectorError("Manager feed URLs do not match this View's enabled assignments.")

        # Re-create the exact Manager fingerprint; do not add Collector-specific fields.
        snapshot = {
            "viewId": view_id,
            "profileId": profile["profileId"],
            "assignmentIds": assignment_ids,
            "sourceIds": sorted(expected_source_ids),
            "feedUrls": sorted(expected_feed_urls),
            "collectorEntrypoint": "global_collector",
            "collectorWorkflow": profile["collectorWorkflow"],
            "destinationDatabaseId": profile["destinationDatabaseId"],
            "destinationDatabasePath": profile["destinationDatabasePath"],
            "scheduledAt": job["scheduledAt"],
            "requestWindowHours": profile["lookbackWindowHours"],
            "trigger": job["trigger"],
        }
        config_version = canonical_hash(snapshot)
        expected_key = canonical_hash({"viewId": view_id, "scheduledAt": job["scheduledAt"], "configVersion": config_version})
        expected_job_id = "gcm-" + uuid.uuid5(uuid.NAMESPACE_URL, expected_key).hex[:20]
        if job["configVersion"] != config_version:
            raise GlobalCollectorError("Manager configuration fingerprint does not match current Manager configuration.")
        if job["idempotencyKey"] != expected_key:
            raise GlobalCollectorError("Manager idempotency key is invalid.")
        if job["jobId"] != expected_job_id:
            raise GlobalCollectorError("Manager job ID is invalid.")

        return {
            "job": dict(job),
            "viewProfile": profile,
            "sourceById": source_by_id,
            "sourceByFeedUrl": source_by_feed,
            "assignmentByFeedUrl": assignment_by_feed,
            "managerRegistryVersion": self.sources["registryVersion"],
        }
