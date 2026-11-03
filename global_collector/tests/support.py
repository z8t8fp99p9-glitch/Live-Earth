import hashlib
import json
from pathlib import Path
import uuid


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def build_repo(root: Path, view_id="future-view-01"):
    config = root / "global_collection_manager" / "config"
    profile = {
        "profileId": f"{view_id}-profile", "viewId": view_id,
        "viewName": "A future View", "enabled": True,
        "collectorEntrypoint": "global_collector",
        "collectorWorkflow": ".github/workflows/future-view.yml",
        "destinationDatabaseId": f"{view_id}-sqlite",
        "destinationDatabasePath": f".publisher-data/{view_id}/{view_id}.sqlite3",
        "lookbackWindowHours": 768,
    }
    source = {
        "sourceId": "source-example", "sourceName": "Example Public Source",
        "websiteUrl": "https://example.org/", "feedUrls": ["https://example.org/feed.json"],
        "connectorType": "auto", "sourceStatus": "enabled",
    }
    assignment = {
        "assignmentId": f"{view_id}-example", "sourceId": "source-example",
        "viewId": view_id, "feedUrls": ["https://example.org/feed.json"],
        "enabled": True, "limits": {"maxItemsPerRun": 0},
    }
    write_json(config / "source-registry.json", {"schemaVersion": 1, "registryVersion": "test-1", "sources": [source]})
    write_json(config / "view-collection-profiles.json", {"schemaVersion": 1, "profiles": [profile]})
    write_json(config / "source-view-assignments.json", {"schemaVersion": 1, "assignments": [assignment]})
    scheduled_at = "2026-11-03T00:00:00Z"
    snapshot = {
        "viewId": view_id,
        "profileId": profile["profileId"],
        "assignmentIds": [assignment["assignmentId"]],
        "sourceIds": [source["sourceId"]],
        "feedUrls": source["feedUrls"],
        "collectorEntrypoint": "global_collector",
        "collectorWorkflow": profile["collectorWorkflow"],
        "destinationDatabaseId": profile["destinationDatabaseId"],
        "destinationDatabasePath": profile["destinationDatabasePath"],
        "scheduledAt": scheduled_at,
        "requestWindowHours": profile["lookbackWindowHours"],
        "trigger": "scheduled",
    }
    config_version = hashlib.sha256(json.dumps(snapshot, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
    idempotency = hashlib.sha256(json.dumps({"viewId": view_id, "scheduledAt": scheduled_at, "configVersion": config_version}, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
    return {
        "jobId": "gcm-" + uuid.uuid5(uuid.NAMESPACE_URL, idempotency).hex[:20],
        "idempotencyKey": idempotency,
        "viewId": view_id,
        "profileId": profile["profileId"],
        "assignmentIds": [assignment["assignmentId"]],
        "sourceIds": [source["sourceId"]],
        "feedUrls": source["feedUrls"],
        "collectorEntrypoint": "global_collector",
        "collectorWorkflow": profile["collectorWorkflow"],
        "destinationDatabaseId": profile["destinationDatabaseId"],
        "destinationDatabasePath": profile["destinationDatabasePath"],
        "scheduledAt": scheduled_at,
        "requestWindowHours": profile["lookbackWindowHours"],
        "configVersion": config_version,
        "trigger": "scheduled",
    }
