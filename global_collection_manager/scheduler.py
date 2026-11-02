"""UTC scheduler calculations. Does not modify existing GitHub workflows."""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any
from .models import ManagerError

class Scheduler:
    def __init__(self, config: dict[str, Any]):
        if config.get("schemaVersion") != 1 or config.get("timezone") != "UTC":
            raise ManagerError("Scheduler config must use schemaVersion 1 and UTC.")
        self.config = config

    def due_views(self, when: datetime | None = None) -> list[str]:
        now = (when or datetime.now(timezone.utc)).astimezone(timezone.utc)
        minute = now.minute
        result = []
        for view_id, item in self.config.get("views", {}).items():
            if not item.get("enabled"):
                continue
            cadence = item.get("cadence")
            if cadence == "hourly" and minute == int(item.get("anchorMinuteUtc", -1)):
                result.append(view_id)
            elif cadence == "daily" and now.hour == int(item.get("anchorHourUtc", -1)) and minute == int(item.get("anchorMinuteUtc", -1)):
                result.append(view_id)
        return result

    def manual_refresh_allowed(self, authorised: bool) -> bool:
        return bool(self.config.get("manualRefreshEnabled")) and (
            not self.config.get("manualRefreshRequiresAuthorization", True) or authorised
        )
