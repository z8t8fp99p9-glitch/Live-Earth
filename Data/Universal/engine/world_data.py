from __future__ import annotations
import json
from pathlib import Path
from .storage import ROOT
BASE=Path(__file__).resolve().parents[1]
def _json(path):return json.loads(path.read_text(encoding="utf-8"))
def datasets_for_world(world_id,include_uncollected=False):
    """Return dataset definitions assigned to a World, ordered by display_order."""
    registry={d["dataset_id"]:d for d in _json(BASE/"registry"/"datasets.json")["datasets"]}
    assignments=_json(BASE/"registry"/"world-dataset-assignments.json")["assignments"]
    selected=[a for a in assignments if a["world_id"]==world_id and a.get("enabled",True)]
    selected.sort(key=lambda a:a.get("display_order",0))
    out=[]
    for a in selected:
        d=registry.get(a["dataset_id"])
        if d and (include_uncollected or d.get("collection",{}).get("enabled")):
            out.append({**d,"assignment":a})
    return out
def latest_dataset_records(dataset_id,limit=1000):
    """Read the one current normalized file for a dataset."""
    dataset_id = str(dataset_id)
    if not dataset_id or any(part in (".", "..") for part in dataset_id.split("/")) or "\\" in dataset_id:
        raise ValueError(f"Unsafe dataset_id: {dataset_id!r}")
    latest = ROOT / "normalized" / dataset_id / "latest.jsonl"
    if not latest.is_file():
        return []
    rows=[]
    for line in latest.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
            if len(rows)>=limit:
                break
    return rows


def world_snapshot(world_id,limit_per_dataset=1000):
    """World Controller data contract: assigned datasets plus their central records."""
    result=[]
    for dataset in datasets_for_world(world_id):
        result.append({"dataset":dataset,"records":latest_dataset_records(dataset["dataset_id"],limit_per_dataset)})
    return result
