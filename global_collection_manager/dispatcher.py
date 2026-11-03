"""Assigns immutable, View-scoped jobs to the one shared Global Collector."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import uuid

from .models import (
    GLOBAL_COLLECTOR_ENTRYPOINT,
    CollectionJob,
    ManagerError,
    canonical_hash,
    utc_now,
)


class JobDispatcher:
    def __init__(self, source_registry, profiles, assignments, scheduler_config):
        self.sources = source_registry
        self.profiles = profiles
        self.assignments = assignments
        self.scheduler_config = scheduler_config

    def create_job(
        self,
        view_id: str,
        trigger: str = "scheduled",
        scheduled_at: str | None = None,
        authorised: bool = False,
    ) -> CollectionJob:
        if trigger not in {"scheduled", "manual"}:
            raise ManagerError("Trigger must be scheduled or manual.")
        if trigger == "manual":
            allowed = bool(self.scheduler_config.get("manualRefreshEnabled"))
            if self.scheduler_config.get("manualRefreshRequiresAuthorization", True):
                allowed = allowed and authorised
            if not allowed:
                raise ManagerError("Manual refresh is disabled or not authorised.")

        profile = self.profiles.get(view_id)
        if not profile.get("enabled"):
            raise ManagerError(f"Collection Profile is disabled for {view_id}.")

        assigned = self.assignments.for_view(view_id)
        if not assigned:
            raise ManagerError(f"No enabled Source-View Assignments for {view_id}.")

        sources: dict[str, dict[str, Any]] = {}
        feed_urls: list[str] = []
        assignment_ids: list[str] = []
        for assignment in assigned:
            source = self.sources.get(assignment["sourceId"])
            if source.get("sourceStatus") != "enabled":
                raise ManagerError(
                    f"Enabled assignment {assignment['assignmentId']} references a source that is not enabled. "
                    "Disable the assignment or review the source before assigning a job."
                )
            allowed_urls = set(source["feedUrls"])
            for url in assignment["feedUrls"]:
                if url not in allowed_urls:
                    raise ManagerError(
                        f"Assignment {assignment['assignmentId']} references a feed URL "
                        "not present in its Source Registry entry."
                    )
                feed_urls.append(url)
            sources[source["sourceId"]] = source
            assignment_ids.append(assignment["assignmentId"])

        if not feed_urls:
            raise ManagerError(f"No enabled source feeds remain for {view_id}.")

        feed_urls = sorted(set(feed_urls))
        assignment_ids = sorted(assignment_ids)
        source_ids = sorted(sources)
        now = scheduled_at or utc_now()
        if not isinstance(now, str) or not now.strip():
            raise ManagerError("scheduledAt must be a non-empty UTC timestamp string.")

        # Collector entry point is deliberately global and identical for every
        # View. Workflow context remains the existing registered View workflow;
        # this Manager-only change does not edit or trigger any workflow.
        snapshot = {
            "viewId": view_id,
            "profileId": profile["profileId"],
            "assignmentIds": assignment_ids,
            "sourceIds": source_ids,
            "feedUrls": feed_urls,
            "collectorEntrypoint": GLOBAL_COLLECTOR_ENTRYPOINT,
            "collectorWorkflow": profile["collectorWorkflow"],
            "destinationDatabaseId": profile["destinationDatabaseId"],
            "destinationDatabasePath": profile["destinationDatabasePath"],
            "scheduledAt": now,
            "requestWindowHours": profile["lookbackWindowHours"],
            "trigger": trigger,
        }
        config_version = canonical_hash(snapshot)
        idempotency_key = canonical_hash({
            "viewId": view_id,
            "scheduledAt": now,
            "configVersion": config_version,
        })
        job_id = "gcm-" + uuid.uuid5(uuid.NAMESPACE_URL, idempotency_key).hex[:20]

        return CollectionJob(
            jobId=job_id,
            idempotencyKey=idempotency_key,
            viewId=view_id,
            profileId=profile["profileId"],
            assignmentIds=tuple(assignment_ids),
            sourceIds=tuple(source_ids),
            feedUrls=tuple(feed_urls),
            collectorEntrypoint=GLOBAL_COLLECTOR_ENTRYPOINT,
            collectorWorkflow=profile["collectorWorkflow"],
            destinationDatabaseId=profile["destinationDatabaseId"],
            destinationDatabasePath=profile["destinationDatabasePath"],
            scheduledAt=now,
            requestWindowHours=int(profile["lookbackWindowHours"]),
            configVersion=config_version,
            trigger=trigger,
        )

    def assign_due_jobs(self, scheduler, when: datetime | None = None) -> list[CollectionJob]:
        now = (when or datetime.now(timezone.utc)).astimezone(timezone.utc)
        stamp = now.replace(second=0, microsecond=0).isoformat().replace("+00:00", "Z")
        return [
            self.create_job(view_id, trigger="scheduled", scheduled_at=stamp)
            for view_id in scheduler.due_views(now)
        ]

    # Backward-compatible method name used by the existing code surface.
    def plan_due_jobs(self, scheduler, when: datetime | None = None) -> list[CollectionJob]:
        return self.assign_due_jobs(scheduler, when)
