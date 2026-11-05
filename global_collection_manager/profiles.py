"""View Collection Profiles. Every profile routes to the same Global Collector."""
from __future__ import annotations

from pathlib import Path, PurePosixPath
from typing import Any
import json

from .models import GLOBAL_COLLECTOR_ENTRYPOINT, ManagerError, require_id


class ViewProfiles:
    def __init__(self, path: Path):
        try:
            data = json.loads(Path(path).read_text(encoding="utf-8"))
        except Exception as exc:
            raise ManagerError(f"View Collection Profiles cannot be read: {exc}") from exc
        if not isinstance(data, dict) or data.get("schemaVersion") != 1 or not isinstance(data.get("profiles"), list):
            raise ManagerError("View Collection Profiles schema is invalid.")

        self.profiles: dict[str, dict[str, Any]] = {}
        profile_ids: set[str] = set()
        for profile in data["profiles"]:
            if not isinstance(profile, dict):
                raise ManagerError("Every View Collection Profile must be an object.")
            pid = require_id(profile.get("profileId"), "profileId")
            vid = require_id(profile.get("viewId"), "viewId")
            if pid in profile_ids or vid in self.profiles:
                raise ManagerError("Profile IDs and View IDs must be unique.")
            profile_ids.add(pid)

            if not isinstance(profile.get("enabled"), bool):
                raise ManagerError(f"Profile {pid} must have an enabled flag.")
            for field in ("lookbackWindowHours", "retentionDays"):
                value = profile.get(field)
                if isinstance(value, bool) or not isinstance(value, int) or value < 1:
                    raise ManagerError(f"Profile {pid} has an invalid {field}.")

            # A View never selects or owns a Collector implementation.
            if profile.get("collectorEntrypoint") != GLOBAL_COLLECTOR_ENTRYPOINT:
                raise ManagerError(
                    f"Profile {pid} must route to the one shared Global Collector ({GLOBAL_COLLECTOR_ENTRYPOINT})."
                )
            if not isinstance(profile.get("collectorWorkflow"), str) or not profile["collectorWorkflow"].strip():
                raise ManagerError(f"Profile {pid} must retain its registered workflow context.")

            db_id = require_id(profile.get("destinationDatabaseId"), "destinationDatabaseId")
            db_path = profile.get("destinationDatabasePath")
            if not isinstance(db_path, str) or "\\" in db_path:
                raise ManagerError(f"Profile {pid} has an invalid destination database path.")
            path_parts = PurePosixPath(db_path).parts
            if (
                PurePosixPath(db_path).is_absolute()
                or any(part in ("", ".", "..") for part in path_parts)
                or len(path_parts) < 3
                or path_parts[0] != ".publisher-data"
                or path_parts[1] != vid
            ):
                raise ManagerError(
                    f"Profile {pid} destination must stay inside .publisher-data/{vid}/."
                )
            profile["destinationDatabaseId"] = db_id
            self.profiles[vid] = profile


    def get(self, view_id: str) -> dict[str, Any]:
        if view_id not in self.profiles:
            raise ManagerError(f"No Collection Profile is registered for View: {view_id}")
        return self.profiles[view_id]

    def all(self) -> list[dict[str, Any]]:
        return list(self.profiles.values())

    def ids(self) -> set[str]:
        return set(self.profiles)
