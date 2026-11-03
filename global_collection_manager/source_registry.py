"""Global Collection Manager source catalogue, separate from Checker policies."""
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
        self.sources = {item["sourceId"]: item for item in self.data["sources"]}

    def _load(self) -> dict[str, Any]:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except Exception as exc:
            raise ManagerError(f"Collection Source Registry cannot be read: {exc}") from exc
        if not isinstance(data, dict) or data.get("schemaVersion") != 1 or not isinstance(data.get("sources"), list):
            raise ManagerError("Collection Source Registry schema is invalid.")
        if not isinstance(data.get("registryVersion"), str) or not data["registryVersion"].strip():
            raise ManagerError("Collection Source Registry version is missing.")

        seen: set[str] = set()
        for source in data["sources"]:
            if not isinstance(source, dict):
                raise ManagerError("Every Source Registry entry must be an object.")
            sid = require_id(source.get("sourceId"), "sourceId")
            if sid in seen:
                raise ManagerError(f"Duplicate sourceId: {sid}")
            seen.add(sid)
            if source.get("sourceStatus") not in {"enabled", "disabled", "review"}:
                raise ManagerError(f"Invalid sourceStatus for {sid}.")
            urls = source.get("feedUrls")
            if not isinstance(urls, list) or not urls:
                raise ManagerError(f"Source {sid} must have at least one feed URL.")
            if any(not isinstance(url, str) for url in urls):
                raise ManagerError(f"Source {sid} contains a non-text feed URL.")
            if len(urls) != len(set(urls)):
                raise ManagerError(f"Source {sid} contains duplicate feed URLs.")
            if not isinstance(source.get("sourceName"), str) or not source["sourceName"].strip():
                raise ManagerError(f"Source {sid} has no sourceName.")
            if not isinstance(source.get("checkerPolicyRef"), str) or not source["checkerPolicyRef"].strip():
                raise ManagerError(f"Source {sid} has no Global Checker policy reference.")
            for url in urls:
                try:
                    parsed = urlsplit(url)
                    valid_port = parsed.port in (None, 443)
                except ValueError:
                    valid_port = False
                    parsed = urlsplit("")
                if (
                    parsed.scheme.lower() != "https" or not parsed.hostname
                    or parsed.username or parsed.password or not valid_port
                ):
                    raise ManagerError(f"Source {sid} contains a non-HTTPS or invalid feed URL.")
        return data

    def get(self, source_id: str) -> dict[str, Any]:
        try:
            return self.sources[source_id]
        except KeyError as exc:
            raise ManagerError(f"Unknown sourceId: {source_id}") from exc

    def enabled_sources(self) -> list[dict[str, Any]]:
        return [source for source in self.data["sources"] if source["sourceStatus"] == "enabled"]

    def ids(self) -> set[str]:
        return set(self.sources)
