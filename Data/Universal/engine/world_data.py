from __future__ import annotations

import json
from pathlib import Path

from .storage import VALUES_ROOT, read_current_metadata, read_current_records

BASE = Path(__file__).resolve().parents[1]


def _json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def datasets_for_world(world_id, include_uncollected=False):
    """Return dataset definitions assigned to a World, ordered by display_order."""
    registry = {
        d["dataset_id"]: d
        for d in _json(BASE / "registry" / "datasets.json")["datasets"]
    }
    assignments = _json(BASE / "registry" / "world-dataset-assignments.json")["assignments"]
    selected = [
        a for a in assignments
        if a["world_id"] == world_id and a.get("enabled", True)
    ]
    selected.sort(key=lambda a: a.get("display_order", 0))
    out = []
    for assignment in selected:
        dataset = registry.get(assignment["dataset_id"])
        if dataset and (include_uncollected or dataset.get("collection", {}).get("enabled")):
            out.append({**dataset, "assignment": assignment})
    return out


def current_dataset_data(dataset_id, limit=1000):
    """Read the current keyed values for a dataset, without historical collections."""
    dataset_id = str(dataset_id)
    if not dataset_id or "/" in dataset_id or "\\" in dataset_id or any(
        part in (".", "..") for part in dataset_id.split(".")
    ):
        raise ValueError(f"Unsafe dataset_id: {dataset_id!r}")

    metadata = read_current_metadata(dataset_id)
    if metadata is None:
        return {"dataset_id": dataset_id, "metadata": None, "records": [], "grid_path": None}

    folder = VALUES_ROOT / dataset_id
    grid_path = str((folder / "values.bin").relative_to(VALUES_ROOT.parent)) if metadata.get("data_kind") == "grid" else None
    records = read_current_records(dataset_id, limit=limit)
    return {
        "dataset_id": dataset_id,
        "metadata": metadata,
        "records": records,
        "grid_path": grid_path,
    }


def current_world_values(world_id, limit_per_dataset=1000):
    """World Controller contract: assigned datasets plus their current stored values."""
    result = []
    for dataset in datasets_for_world(world_id):
        result.append({
            "dataset": dataset,
            "current": current_dataset_data(dataset["dataset_id"], limit_per_dataset),
        })
    return result

