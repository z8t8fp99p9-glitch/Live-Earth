"""Independent View Collection Profiles."""
from __future__ import annotations
from pathlib import Path
from typing import Any
import json
from .models import ManagerError, require_id

class ViewProfiles:
    def __init__(self, path: Path):
        try:
            data = json.loads(Path(path).read_text(encoding="utf-8"))
        except Exception as exc:
            raise ManagerError(f"View Collection Profiles cannot be read: {exc}") from exc
        if data.get("schemaVersion") != 1 or not isinstance(data.get("profiles"), list):
            raise ManagerError("View Collection Profiles schema is invalid.")
        self.profiles: dict[str, dict[str, Any]] = {}
        ids = set()
        for profile in data["profiles"]:
            pid = require_id(profile.get("profileId"), "profileId")
            vid = require_id(profile.get("viewId"), "viewId")
            if pid in ids or vid in self.profiles:
                raise ManagerError("Profile IDs and View IDs must be unique in this configuration.")
            ids.add(pid)
            if not isinstance(profile.get("enabled"), bool):
                raise ManagerError(f"Profile {pid} must have an enabled flag.")
            if not isinstance(profile.get("lookbackWindowHours"), int) or profile["lookbackWindowHours"] < 1:
                raise ManagerError(f"Profile {pid} has an invalid lookback window.")
            if not isinstance(profile.get("retentionDays"), int) or profile["retentionDays"] < 1:
                raise ManagerError(f"Profile {pid} has an invalid retention period.")
            self.profiles[vid] = profile

    def get(self, view_id: str) -> dict[str, Any]:
        if view_id not in self.profiles:
            raise ManagerError(f"No Collection Profile is registered for View: {view_id}")
        return self.profiles[view_id]

    def all(self) -> list[dict[str, Any]]:
        return list(self.profiles.values())
