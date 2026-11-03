"""Many-to-many source-to-View assignments with independent View rules."""
from __future__ import annotations

from pathlib import Path
from typing import Any
from urllib.parse import urlsplit
import json

from .models import ManagerError, require_id


class SourceViewAssignments:
    def __init__(self, path: Path):
        try:
            data = json.loads(Path(path).read_text(encoding="utf-8"))
        except Exception as exc:
            raise ManagerError(f"Source-View Assignments cannot be read: {exc}") from exc
        if not isinstance(data, dict) or data.get("schemaVersion") != 1 or not isinstance(data.get("assignments"), list):
            raise ManagerError("Source-View Assignments schema is invalid.")
        self.assignments = data["assignments"]
        seen: set[str] = set()
        for item in self.assignments:
            if not isinstance(item, dict):
                raise ManagerError("Every Source-View Assignment must be an object.")
            aid = require_id(item.get("assignmentId"), "assignmentId")
            require_id(item.get("sourceId"), "sourceId")
            require_id(item.get("viewId"), "viewId")
            if aid in seen:
                raise ManagerError(f"Duplicate assignmentId: {aid}")
            seen.add(aid)
            urls = item.get("feedUrls")
            if not isinstance(urls, list) or not urls:
                raise ManagerError(f"Assignment {aid} needs one or more feed URLs.")
            if any(not isinstance(url, str) for url in urls):
                raise ManagerError(f"Assignment {aid} contains a non-text feed URL.")
            if len(urls) != len(set(urls)):
                raise ManagerError(f"Assignment {aid} contains duplicate feed URLs.")
            if not isinstance(item.get("enabled"), bool):
                raise ManagerError(f"Assignment {aid} needs an enabled flag.")
            for url in urls:
                parsed = urlsplit(url)
                if parsed.scheme.lower() != "https" or not parsed.hostname or parsed.username or parsed.password:
                    raise ManagerError(f"Assignment {aid} contains an invalid feed URL.")

    def for_view(self, view_id: str, enabled_only: bool = True) -> list[dict[str, Any]]:
        return [
            assignment for assignment in self.assignments
            if assignment["viewId"] == view_id
            and (assignment["enabled"] or not enabled_only)
        ]

    def all(self) -> list[dict[str, Any]]:
        return list(self.assignments)
