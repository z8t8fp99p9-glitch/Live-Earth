"""Global Collection Manager source catalogue (not the Checker policy registry)."""
from __future__ import annotations
from pathlib import Path
from urllib.parse import urlsplit
from typing import Any
import json
from .models import ManagerError, require_id

class SourceRegistry:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.data = self._load()

    def _load(self) -> dict[str, Any]:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except Exception as exc:
            raise ManagerError(f"Collection Source Registry cannot be read: {exc}") from exc
        if data.get("schemaVersion") != 1 or not isinstance(data.get("sources"), list):
            raise ManagerError("Collection Source Registry schema is invalid.")
        seen = set()
        for source in data["sources"]:
            sid = require_id(source.get("sourceId"), "sourceId")
            if sid in seen:
                raise ManagerError(f"Duplicate sourceId: {sid}")
            seen.add(sid)
            if source.get("sourceStatus") not in {"enabled", "disabled", "review"}:
                raise ManagerError(f"Invalid sourceStatus for {sid}.")
            if not isinstance(source.get("feedUrls"), list) or not source["feedUrls"]:
                raise ManagerError(f"Source {sid} must have at least one feed URL.")
            for url in source["feedUrls"]:
                p = urlsplit(url)
                if p.scheme != "https" or not p.hostname or p.username or p.password:
                    raise ManagerError(f"Source {sid} contains a non-HTTPS or invalid feed URL.")
        return data

    def get(self, source_id: str) -> dict[str, Any]:
        for source in self.data["sources"]:
            if source["sourceId"] == source_id:
                return source
        raise ManagerError(f"Unknown sourceId: {source_id}")

    def enabled_sources(self) -> list[dict[str, Any]]:
        return [s for s in self.data["sources"] if s["sourceStatus"] == "enabled"]
