"""Shared data models and validation helpers for Global Collection Manager."""
from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any
import hashlib
import json
import re

SAFE_ID = re.compile(r"^[a-z0-9][a-z0-9-]{1,79}$")

class ManagerError(RuntimeError):
    """Invalid configuration or unsafe collection-management operation."""

def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

def require_id(value: Any, label: str) -> str:
    if not isinstance(value, str) or not SAFE_ID.fullmatch(value):
        raise ManagerError(f"{label} must be a stable lowercase ID (letters, numbers and hyphens).")
    return value

def canonical_hash(value: Any) -> str:
    raw = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

@dataclass(frozen=True)
class CollectionJob:
    jobId: str
    idempotencyKey: str
    viewId: str
    profileId: str
    assignmentIds: tuple[str, ...]
    sourceIds: tuple[str, ...]
    feedUrls: tuple[str, ...]
    collectorEntrypoint: str
    collectorWorkflow: str
    destinationDatabaseId: str
    destinationDatabasePath: str
    scheduledAt: str
    requestWindowHours: int
    configVersion: str
    trigger: str
    status: str = "planned"

    def to_dict(self) -> dict[str, Any]:
        result = asdict(self)
        for key in ("assignmentIds", "sourceIds", "feedUrls"):
            result[key] = list(result[key])
        return result
