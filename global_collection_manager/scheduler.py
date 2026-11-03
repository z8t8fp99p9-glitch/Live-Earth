"""Generic UTC schedule evaluation for any registered View ID."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .models import ManagerError, require_id


class Scheduler:
    def __init__(self, config: dict[str, Any]):
        if (
            not isinstance(config, dict)
            or config.get("schemaVersion") != 1
            or config.get("timezone") != "UTC"
            or not isinstance(config.get("views"), dict)
        ):
            raise ManagerError("Scheduler config must use schemaVersion 1, UTC and a Views object.")
        for flag in ("manualRefreshEnabled", "manualRefreshRequiresAuthorization"):
            if not isinstance(config.get(flag), bool):
                raise ManagerError(f"Scheduler config must declare boolean {flag}.")
        for view_id, item in config["views"].items():
            require_id(view_id, "scheduler viewId")
            if not isinstance(item, dict) or not isinstance(item.get("enabled"), bool):
                raise ManagerError(f"Scheduler entry for {view_id} is invalid.")
            cadence = item.get("cadence")
            if cadence not in {"hourly", "daily"}:
                raise ManagerError(f"Scheduler cadence for {view_id} must be hourly or daily.")
            minute = item.get("anchorMinuteUtc")
            if isinstance(minute, bool) or not isinstance(minute, int) or not 0 <= minute <= 59:
                raise ManagerError(f"Scheduler minute for {view_id} must be between 0 and 59.")
            if cadence == "daily":
                hour = item.get("anchorHourUtc")
                if isinstance(hour, bool) or not isinstance(hour, int) or not 0 <= hour <= 23:
                    raise ManagerError(f"Scheduler hour for {view_id} must be between 0 and 23.")
        self.config = config

    def due_views(self, when: datetime | None = None) -> list[str]:
        now = (when or datetime.now(timezone.utc)).astimezone(timezone.utc)
        due: list[str] = []
        for view_id, item in self.config["views"].items():
            if not item["enabled"]:
                continue
            if item["cadence"] == "hourly" and now.minute == item["anchorMinuteUtc"]:
                due.append(view_id)
            elif (
                item["cadence"] == "daily"
                and now.hour == item["anchorHourUtc"]
                and now.minute == item["anchorMinuteUtc"]
            ):
                due.append(view_id)
        return sorted(due)

    def manual_refresh_allowed(self, authorised: bool) -> bool:
        return bool(self.config["manualRefreshEnabled"]) and (
            not self.config["manualRefreshRequiresAuthorization"] or authorised
        )
