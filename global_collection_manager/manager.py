"""Command-line entry point for LIVE // EARTH Global Collection Manager."""
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
from .models import ManagerError

BASE = Path(__file__).resolve().parent
CONFIG = BASE / "config"

def build_manager():
    source_registry = SourceRegistry(CONFIG / "source-registry.json")
    profiles = ViewProfiles(CONFIG / "view-collection-profiles.json")
    assignments = SourceViewAssignments(CONFIG / "source-view-assignments.json")
    scheduler_data = json.loads((CONFIG / "scheduler.json").read_text(encoding="utf-8"))
    scheduler = Scheduler(scheduler_data)
    dispatcher = JobDispatcher(source_registry, profiles, assignments, scheduler_data)
    audit = HealthAuditLog(Path(".manager-state") / "global-collection-manager.jsonl")
    return source_registry, profiles, assignments, scheduler, dispatcher, audit

def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="global-collection-manager")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("overview", help="Show registered collection Views, sources and assignments.")
    plan = sub.add_parser("plan", help="Create a non-executing dispatch plan for a View.")
    plan.add_argument("--view", required=True, choices=["nature", "alien-world"])
    plan.add_argument("--manual", action="store_true")
    plan.add_argument("--authorised", action="store_true",
                      help="Explicit authorisation flag for a manual plan.")
    args = parser.parse_args(argv)
    try:
        registry, profiles, assignments, scheduler, dispatcher, audit = build_manager()
        if args.command == "overview":
            result = {
                "manager": "Global Collection Manager",
                "sources": [{"sourceId": s["sourceId"], "sourceName": s["sourceName"],
                             "status": s["sourceStatus"]} for s in registry.data["sources"]],
                "views": [{
                    "viewId": p["viewId"], "profileId": p["profileId"],
                    "enabled": p["enabled"],
                    "assignmentCount": len(assignments.for_view(p["viewId"])),
                    "collectorEntrypoint": p["collectorEntrypoint"],
                    "destinationDatabaseId": p["destinationDatabaseId"]
                } for p in profiles.all()],
                "mode": "planning-only; existing Collectors remain database writers"
            }
            print(json.dumps(result, indent=2, ensure_ascii=False))
            return 0
        trigger = "manual" if args.manual else "scheduled"
        job = dispatcher.create_job(args.view, trigger=trigger, authorised=args.authorised)
        audit.record("job_planned", view_id=args.view, job_id=job.jobId,
                     status="planned", details={"configVersion": job.configVersion,
                                                "trigger": trigger})
        print(json.dumps(job.to_dict(), indent=2, ensure_ascii=False))
        return 0
    except (ManagerError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Global Collection Manager blocked safely: {exc}", file=sys.stderr)
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
