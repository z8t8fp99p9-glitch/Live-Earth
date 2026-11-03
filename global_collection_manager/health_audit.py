"""Append-only Manager health and assignment audit log."""
from __future__ import annotations

from pathlib import Path
from typing import Any
import json

from .models import ManagerError, utc_now


class HealthAuditLog:
    def __init__(self, path: Path):
        self.path = Path(path)

    def record(self, event_type: str, *, view_id: str | None = None,
               source_id: str | None = None, job_id: str | None = None,
               status: str = "info", details: dict[str, Any] | None = None) -> dict[str, Any]:
        event = {
            "timestamp": utc_now(),
            "component": "Global Collection Manager",
            "eventType": event_type,
            "viewId": view_id,
            "sourceId": source_id,
            "jobId": job_id,
            "status": status,
            "details": details or {},
        }
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(event, ensure_ascii=False, sort_keys=True) + "\n")
        return event

    def read_recent(self, limit: int = 100) -> list[dict[str, Any]]:
        if limit < 1 or limit > 1000:
            raise ManagerError("Audit read limit must be between 1 and 1000.")
        if not self.path.exists():
            return []
        lines = self.path.read_text(encoding="utf-8").splitlines()[-limit:]
        return [json.loads(line) for line in lines if line.strip()]
