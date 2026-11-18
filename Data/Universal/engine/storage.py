from __future__ import annotations
import hashlib, json
from pathlib import Path
from datetime import datetime, timezone
from .validation import validate_observation

ROOT = Path(__file__).resolve().parents[2] / "Central-Database"

def _safe(value):
    if not value or any(part in (".", "..") for part in value.split("/")) or "\\" in value:
        raise ValueError(f"Unsafe storage key: {value!r}")
    return value

def store_raw(dataset_id, retrieval_id, payload, metadata):
    dataset_id, retrieval_id = _safe(dataset_id), _safe(retrieval_id)
    digest = hashlib.sha256(payload).hexdigest()
    folder = ROOT / "raw" / dataset_id / retrieval_id
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / "source.bin"
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() != digest:
        raise FileExistsError("Raw retrieval is immutable; use a new retrieval_id")
    if not target.exists():
        target.write_bytes(payload)
    meta = dict(metadata, raw_sha256=digest, raw_bytes=len(payload), retrieval_id=retrieval_id)
    (folder / "metadata.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    return digest

def store_normalized(dataset_id, retrieval_id, observations):
    dataset_id, retrieval_id = _safe(dataset_id), _safe(retrieval_id)
    rows = [validate_observation(row) for row in observations]
    if not rows:
        raise ValueError("Refusing to publish an empty normalized batch")
    by_day = {}
    for row in rows:
        if row["dataset_id"] != dataset_id:
            raise ValueError("Observation dataset_id does not match storage partition")
        by_day.setdefault(row["observed_at"][:10], []).append(row)
    written = []
    for day, day_rows in sorted(by_day.items()):
        folder = ROOT / "normalized" / dataset_id / day
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / f"{retrieval_id}.jsonl"
        payload = "".join(json.dumps(row, separators=(",", ":"), sort_keys=True) + "\n" for row in day_rows)
        if target.exists() and target.read_text(encoding="utf-8") != payload:
            raise FileExistsError("Normalized retrieval already exists with different content")
        target.write_text(payload, encoding="utf-8")
        written.append(str(target.relative_to(ROOT)))
    return written

def write_run(retrieval_id, result):
    retrieval_id = _safe(retrieval_id)
    folder = ROOT / "runs"
    folder.mkdir(parents=True, exist_ok=True)
    result = dict(result, retrieval_id=retrieval_id, recorded_at=datetime.now(timezone.utc).isoformat())
    (folder / f"{retrieval_id}.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
