"""Command-line interface for LIVE // EARTH Global Collection Manager.

The Manager registers sources, maintains View subscriptions and assigns jobs
for the one shared Global Collector. It does not fetch or edit news itself.
"""
from __future__ import annotations

from pathlib import Path
import argparse
import json
import sys

from .source_registry import SourceRegistry
from .profiles import ViewProfiles
from .assignments import SourceViewAssignments
from .scheduler import Scheduler
from .dispatcher import JobDispatcher
from .health_audit import HealthAuditLog
from .models import GLOBAL_COLLECTOR_ENTRYPOINT, ManagerError

BASE = Path(__file__).resolve().parent
CONFIG = BASE / "config"


def _validate_configuration(registry, profiles, assignments, scheduler):
    profile_ids = profiles.ids()
    source_ids = registry.ids()
    schedule_ids = set(scheduler.config["views"])

    missing_schedules = profile_ids - schedule_ids
    orphan_schedules = schedule_ids - profile_ids
    if missing_schedules:
        raise ManagerError(
            "Every registered View needs a scheduler entry; missing: "
            + ", ".join(sorted(missing_schedules))
        )
    if orphan_schedules:
        raise ManagerError(
            "Scheduler contains unregistered View IDs: " + ", ".join(sorted(orphan_schedules))
        )

    for profile in profiles.all():
        if scheduler.config["views"][profile["viewId"]]["enabled"] and not profile["enabled"]:
            raise ManagerError(f"Scheduler enables disabled View profile {profile['viewId']}.")

    feed_owner_by_view: dict[str, dict[str, str]] = {}
    for assignment in assignments.all():
        aid = assignment["assignmentId"]
        if assignment["sourceId"] not in source_ids:
            raise ManagerError(f"Assignment {aid} references an unknown Source ID.")
        if assignment["viewId"] not in profile_ids:
            raise ManagerError(f"Assignment {aid} references an unknown View ID.")
        source = registry.get(assignment["sourceId"])
        unknown_urls = set(assignment["feedUrls"]) - set(source["feedUrls"])
        if unknown_urls:
            raise ManagerError(
                f"Assignment {aid} contains feed URLs not registered to source {source['sourceId']}."
            )
        if assignment["enabled"] and source["sourceStatus"] != "enabled":
            raise ManagerError(
                f"Enabled assignment {aid} references a source that is not enabled."
            )
        owners = feed_owner_by_view.setdefault(assignment["viewId"], {})
        for feed_url in assignment["feedUrls"]:
            previous_source = owners.get(feed_url)
            if previous_source and previous_source != assignment["sourceId"]:
                raise ManagerError(
                    f"Feed URL {feed_url} is assigned to conflicting source identities in View {assignment['viewId']}."
                )
            owners[feed_url] = assignment["sourceId"]


def build_manager(config_dir: Path | None = None, state_dir: Path | None = None):
    config_dir = Path(config_dir or CONFIG)
    source_registry = SourceRegistry(config_dir / "source-registry.json")
    profiles = ViewProfiles(config_dir / "view-collection-profiles.json")
    assignments = SourceViewAssignments(config_dir / "source-view-assignments.json")
    try:
        scheduler_data = json.loads((config_dir / "scheduler.json").read_text(encoding="utf-8"))
    except Exception as exc:
        raise ManagerError(f"Scheduler configuration cannot be read: {exc}") from exc
    scheduler = Scheduler(scheduler_data)
    _validate_configuration(source_registry, profiles, assignments, scheduler)
    dispatcher = JobDispatcher(source_registry, profiles, assignments, scheduler_data)
    audit_path = Path(state_dir or Path(".manager-state")) / "global-collection-manager.jsonl"
    audit = HealthAuditLog(audit_path)
    return source_registry, profiles, assignments, scheduler, dispatcher, audit


def _overview(registry, profiles, assignments):
    return {
        "manager": "LIVE // EARTH Global Collection Manager",
        "globalCollector": GLOBAL_COLLECTOR_ENTRYPOINT,
        "mode": "global assignment; one shared Collector; per-View destination preserved",
        "sources": [
            {"sourceId": source["sourceId"], "sourceName": source["sourceName"],
             "status": source["sourceStatus"]}
            for source in registry.data["sources"]
        ],
        "views": [
            {
                "viewId": profile["viewId"],
                "profileId": profile["profileId"],
                "enabled": profile["enabled"],
                "assignmentCount": len(assignments.for_view(profile["viewId"])),
                "collectorEntrypoint": GLOBAL_COLLECTOR_ENTRYPOINT,
                "destinationDatabaseId": profile["destinationDatabaseId"],
                "destinationDatabasePath": profile["destinationDatabasePath"],
            }
            for profile in profiles.all()
        ],
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="global-collection-manager")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("overview", help="Show all registered Views, sources and assignments.")

    assign = sub.add_parser(
        "assign", aliases=["plan"],
        help="Assign one View's collection job to the shared Global Collector.",
    )
    assign.add_argument("--view", required=True, help="Exact registered View ID.")
    assign.add_argument("--manual", action="store_true")
    assign.add_argument(
        "--authorised", action="store_true",
        help="Required when manual refresh authorisation is enabled.",
    )

    due = sub.add_parser("assign-due", help="Assign jobs for every View due at the current UTC minute.")
    due.add_argument("--at", help="Optional ISO-8601 UTC timestamp for deterministic schedule checks.")

    args = parser.parse_args(argv)
    try:
        registry, profiles, assignments, scheduler, dispatcher, audit = build_manager()
        if args.command == "overview":
            print(json.dumps(_overview(registry, profiles, assignments), indent=2, ensure_ascii=False))
            return 0

        if args.command in {"assign", "plan"}:
            job = dispatcher.create_job(
                args.view,
                trigger="manual" if args.manual else "scheduled",
                authorised=args.authorised,
            )
            payload = job.to_dict()
            audit.record(
                "job_assigned_to_global_collector", view_id=job.viewId,
                job_id=job.jobId, status="assigned",
                details={"configVersion": job.configVersion, "trigger": job.trigger,
                         "collectorEntrypoint": job.collectorEntrypoint},
            )
            print(json.dumps(payload, indent=2, ensure_ascii=False))
            return 0

        when = None
        if args.at:
            from datetime import datetime, timezone
            try:
                when = datetime.fromisoformat(args.at.replace("Z", "+00:00"))
            except ValueError as exc:
                raise ManagerError("--at must be a valid ISO-8601 timestamp.") from exc
            if when.tzinfo is None:
                raise ManagerError("--at must include a UTC offset or Z.")
            if when.utcoffset().total_seconds() != 0:
                raise ManagerError("--at must be expressed in UTC.")
        jobs = dispatcher.assign_due_jobs(scheduler, when)
        for job in jobs:
            audit.record(
                "job_assigned_to_global_collector", view_id=job.viewId,
                job_id=job.jobId, status="assigned",
                details={"configVersion": job.configVersion, "trigger": job.trigger,
                         "collectorEntrypoint": job.collectorEntrypoint},
            )
        print(json.dumps({"collectorEntrypoint": GLOBAL_COLLECTOR_ENTRYPOINT,
                          "assignedJobs": [job.to_dict() for job in jobs]},
                         indent=2, ensure_ascii=False))
        return 0
    except (ManagerError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Global Collection Manager blocked safely: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
