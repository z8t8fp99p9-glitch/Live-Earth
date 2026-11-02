"""Validation of Global Collection Manager jobs against both central registries."""
from __future__ import annotations

from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import urlsplit
import hashlib
import json
import uuid

from .errors import GlobalCollectorError
from .security import _host, host_matches


def _read_json(path: Path, label: str) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise GlobalCollectorError(f"{label} cannot be read: {exc}") from exc
    if not isinstance(data, dict):
        raise GlobalCollectorError(f"{label} must contain a JSON object.")
    return data


def _canonical_hash(value: Any) -> str:
    raw = json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _safe_database_path(value: str, expected: str) -> bool:
    if value != expected or "\\" in value:
        return False
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in ("", ".", "..") for part in path.parts):
        return False
    return len(path.parts) >= 3 and path.parts[0] == ".publisher-data"


class JobContract:
    """Loads live Manager/Checker config and validates a Manager job envelope."""

    def __init__(self, repository_root: Path):
        self.root = Path(repository_root).resolve()
        self.manager_root = self.root / "global_collection_manager"
        self.manager_sources = _read_json(
            self.manager_root / "config" / "source-registry.json",
            "Global Collection Manager Source Registry",
        )
        self.manager_profiles = _read_json(
            self.manager_root / "config" / "view-collection-profiles.json",
            "Global Collection Manager View Collection Profiles",
        )
        self.manager_assignments = _read_json(
            self.manager_root / "config" / "source-view-assignments.json",
            "Global Collection Manager Source-View Assignments",
        )
        self.checker_registry = _read_json(
            self.root / "global-checker" / "source-registry.json",
            "Global Checker Source Registry",
        )
        self._validate_registry_shapes()

    def _validate_registry_shapes(self) -> None:
        if self.manager_sources.get("schemaVersion") != 1:
            raise GlobalCollectorError("Manager Source Registry schema is unsupported.")
        if self.manager_profiles.get("schemaVersion") != 1:
            raise GlobalCollectorError("Manager View Collection Profiles schema is unsupported.")
        if self.manager_assignments.get("schemaVersion") != 1:
            raise GlobalCollectorError("Manager Source-View Assignments schema is unsupported.")
        if self.checker_registry.get("schemaVersion") != 1:
            raise GlobalCollectorError("Global Checker Source Registry schema is unsupported.")
        for key, data in (
            ("sources", self.manager_sources),
            ("profiles", self.manager_profiles),
            ("assignments", self.manager_assignments),
            ("policies", self.checker_registry),
        ):
            if not isinstance(data.get(key), list):
                raise GlobalCollectorError(f"Registry field '{key}' is missing or malformed.")
        if not self.manager_sources.get("registryVersion"):
            raise GlobalCollectorError("Manager Source Registry version is missing.")
        if not self.checker_registry.get("registryVersion"):
            raise GlobalCollectorError("Global Checker registry version is missing.")

    def _policy(self, source: dict[str, Any], view_id: str) -> dict[str, Any]:
        policy_ref = source.get("checkerPolicyRef")
        for policy in self.checker_registry["policies"]:
            if policy.get("policyId") == policy_ref:
                if view_id not in policy.get("views", []):
                    raise GlobalCollectorError(
                        f"Global Checker policy '{policy_ref}' is not enabled for View '{view_id}'."
                    )
                return policy
        raise GlobalCollectorError(
            f"Source '{source.get('sourceId')}' references a missing Global Checker policy."
        )

    def validate(self, job: dict[str, Any]) -> dict[str, Any]:
        required = (
            "jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds",
            "sourceIds", "feedUrls", "collectorEntrypoint", "collectorWorkflow",
            "destinationDatabaseId", "destinationDatabasePath", "scheduledAt",
            "requestWindowHours", "configVersion", "trigger",
        )
        missing = [key for key in required if key not in job]
        if missing:
            raise GlobalCollectorError(
                "Manager job is incomplete; missing: " + ", ".join(missing)
            )
        view_id = job["viewId"]
        if not isinstance(view_id, str) or not view_id:
            raise GlobalCollectorError("Manager job has no valid View ID.")

        profiles = {
            item.get("viewId"): item for item in self.manager_profiles["profiles"]
        }
        profile = profiles.get(view_id)
        if not profile or not profile.get("enabled"):
            raise GlobalCollectorError(f"No enabled Manager profile exists for '{view_id}'.")
        if profile.get("profileId") != job["profileId"]:
            raise GlobalCollectorError("Job profile ID does not match the registered View profile.")
        if job["collectorEntrypoint"] != profile.get("collectorEntrypoint"):
            raise GlobalCollectorError("Job Collector entry point does not match the View profile.")
        if job["collectorWorkflow"] != profile.get("collectorWorkflow"):
            raise GlobalCollectorError("Job workflow does not match the View profile.")
        if job["destinationDatabaseId"] != profile.get("destinationDatabaseId"):
            raise GlobalCollectorError("Job database identity does not match the View profile.")
        if not _safe_database_path(
            str(job["destinationDatabasePath"]),
            str(profile.get("destinationDatabasePath", "")),
        ):
            raise GlobalCollectorError("Job database path is not the exact safe View-owned path.")
        if int(job["requestWindowHours"]) != int(profile["lookbackWindowHours"]):
            raise GlobalCollectorError("Job request window does not match the View profile.")
        if job["trigger"] not in {"scheduled", "manual"}:
            raise GlobalCollectorError("Job trigger is not supported.")

        assignment_map = {
            item.get("assignmentId"): item
            for item in self.manager_assignments["assignments"]
            if item.get("viewId") == view_id and item.get("enabled") is True
        }
        assignment_ids = sorted(set(job["assignmentIds"]))
        if not assignment_ids or assignment_ids != sorted(assignment_map):
            raise GlobalCollectorError(
                "Job assignments do not exactly match this View's enabled assignments."
            )

        source_map = {
            item.get("sourceId"): item for item in self.manager_sources["sources"]
        }
        policy_by_source = {}
        url_to_source = {}
        expected_sources = set()
        expected_urls = set()

        for assignment_id in assignment_ids:
            assignment = assignment_map[assignment_id]
            source_id = assignment.get("sourceId")
            source = source_map.get(source_id)
            if not source or source.get("sourceStatus") != "enabled":
                raise GlobalCollectorError(
                    f"Assignment '{assignment_id}' points to a missing or disabled source."
                )
            expected_sources.add(source_id)
            policy = self._policy(source, view_id)
            policy_by_source[source_id] = policy
            catalogue_urls = set(source.get("feedUrls", []))
            policy_urls = set(policy.get("allowedFeedUrls", []))
            policy_domains = policy.get("feedDomains", [])
            for url in assignment.get("feedUrls", []):
                if url not in catalogue_urls:
                    raise GlobalCollectorError(
                        f"Assignment '{assignment_id}' references a feed not in the Manager Source Registry."
                    )
                if url not in policy_urls:
                    raise GlobalCollectorError(
                        f"Feed URL is not explicitly registered by Global Checker policy '{policy.get('policyId')}'."
                    )
                host = _host(url)
                if not host_matches(host, policy_domains):
                    raise GlobalCollectorError(
                        "Feed URL host does not match the registered Global Checker feed-domain boundary."
                    )
                expected_urls.add(url)
                existing = url_to_source.get(url)
                if existing and existing != source_id:
                    raise GlobalCollectorError(
                        "The same feed URL is assigned to conflicting source identities."
                    )
                url_to_source[url] = source_id

        if sorted(expected_sources) != sorted(set(job["sourceIds"])):
            raise GlobalCollectorError("Job source IDs do not match enabled assignments.")
        if sorted(expected_urls) != sorted(set(job["feedUrls"])):
            raise GlobalCollectorError("Job feed URLs do not match enabled assignments.")

        snapshot = {
            "viewId": view_id,
            "profileId": profile["profileId"],
            "assignmentIds": assignment_ids,
            "sourceIds": sorted(expected_sources),
            "feedUrls": sorted(expected_urls),
            "collectorEntrypoint": profile["collectorEntrypoint"],
            "collectorWorkflow": profile["collectorWorkflow"],
            "destinationDatabaseId": profile["destinationDatabaseId"],
            "destinationDatabasePath": profile["destinationDatabasePath"],
            "scheduledAt": job["scheduledAt"],
            "requestWindowHours": profile["lookbackWindowHours"],
            "trigger": job["trigger"],
        }
        expected_config_version = _canonical_hash(snapshot)
        if job["configVersion"] != expected_config_version:
            raise GlobalCollectorError("Job configuration fingerprint does not match current registries.")
        expected_idempotency = _canonical_hash({
            "viewId": view_id,
            "scheduledAt": job["scheduledAt"],
            "configVersion": expected_config_version,
        })
        if job["idempotencyKey"] != expected_idempotency:
            raise GlobalCollectorError("Job idempotency key is invalid.")
        expected_job_id = "gcm-" + uuid.uuid5(
            uuid.NAMESPACE_URL, expected_idempotency
        ).hex[:20]
        if job["jobId"] != expected_job_id:
            raise GlobalCollectorError("Job ID does not match its deterministic Manager identity.")

        return {
            "job": job,
            "profile": profile,
            "sourceByFeedUrl": url_to_source,
            "sourceById": source_map,
            "checkerPolicyBySource": policy_by_source,
            "managerRegistryVersion": self.manager_sources["registryVersion"],
            "checkerRegistryVersion": self.checker_registry["registryVersion"],
        }
