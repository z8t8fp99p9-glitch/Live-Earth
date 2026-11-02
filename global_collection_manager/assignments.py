"""Many-to-many Source-View Assignments with independent View rules."""
from __future__ import annotations
from pathlib import Path
from typing import Any
import json
from .models import ManagerError, require_id

class SourceViewAssignments:
    def __init__(self, path: Path):
        try:
            data = json.loads(Path(path).read_text(encoding="utf-8"))
        except Exception as exc:
            raise ManagerError(f"Source-View Assignments cannot be read: {exc}") from exc
        if data.get("schemaVersion") != 1 or not isinstance(data.get("assignments"), list):
            raise ManagerError("Source-View Assignments schema is invalid.")
        self.assignments = data["assignments"]
        seen = set()
        for item in self.assignments:
            aid = require_id(item.get("assignmentId"), "assignmentId")
            require_id(item.get("sourceId"), "sourceId")
            require_id(item.get("viewId"), "viewId")
            if aid in seen:
                raise ManagerError(f"Duplicate assignmentId: {aid}")
            seen.add(aid)
            if not isinstance(item.get("feedUrls"), list) or not item["feedUrls"]:
                raise ManagerError(f"Assignment {aid} needs one or more feed URLs.")
            if not isinstance(item.get("enabled"), bool):
                raise ManagerError(f"Assignment {aid} needs an enabled flag.")

    def for_view(self, view_id: str, enabled_only: bool = True) -> list[dict[str, Any]]:
        return [
            a for a in self.assignments
            if a["viewId"] == view_id and (a["enabled"] or not enabled_only)
        ]
