from __future__ import annotations
import json
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]

def load_registry():
    data = json.loads((BASE / "registry" / "datasets.json").read_text(encoding="utf-8"))
    items = data.get("datasets")
    if not isinstance(items, list):
        raise ValueError("Dataset registry must contain a datasets array")
    seen = set()
    for item in items:
        key = item.get("dataset_id")
        if not key or key in seen:
            raise ValueError(f"Missing or duplicate dataset_id: {key!r}")
        seen.add(key)
    return data

def load_assignments():
    data = json.loads((BASE / "registry" / "world-dataset-assignments.json").read_text(encoding="utf-8"))
    return data.get("assignments", [])

def enabled_jobs(registry=None):
    registry = registry or load_registry()
    return [d for d in registry["datasets"] if d.get("collection", {}).get("enabled") is True and d.get("collection", {}).get("adapter_id")]
