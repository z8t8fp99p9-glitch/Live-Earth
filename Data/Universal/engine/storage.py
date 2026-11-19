from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from .validation import validate_observation

ROOT = Path(__file__).resolve().parents[2] / "Central-Database"


def _safe(value):
    if not value or any(part in (".", "..") for part in value.split("/")) or "\\" in value:
        raise ValueError(f"Unsafe storage key: {value!r}")
    return value


def _atomic_write(path: Path, payload: bytes):
    """Write beside the target, then atomically replace the current file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except Exception:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def _json_bytes(value):
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")


def store_raw(dataset_id, retrieval_id, payload, metadata):
    """Replace the one current raw payload and metadata for this dataset."""
    dataset_id, retrieval_id = _safe(dataset_id), _safe(retrieval_id)
    digest = hashlib.sha256(payload).hexdigest()
    folder = ROOT / "raw" / dataset_id
    meta = dict(
        metadata,
        raw_sha256=digest,
        raw_bytes=len(payload),
        retrieval_id=retrieval_id,
    )
    _atomic_write(folder / "source.bin", payload)
    _atomic_write(folder / "metadata.json", _json_bytes(meta))
    return digest


def store_normalized(dataset_id, retrieval_id, observations):
    """Replace the one current normalized record file for this dataset."""
    dataset_id, retrieval_id = _safe(dataset_id), _safe(retrieval_id)
    rows = [validate_observation(row) for row in observations]
    if not rows:
        raise ValueError("Refusing to publish an empty normalized batch")
    for row in rows:
        if row["dataset_id"] != dataset_id:
            raise ValueError("Observation dataset_id does not match partition")
        if row.get("provenance", {}).get("retrieval_id") != retrieval_id:
            raise ValueError("Observation retrieval_id does not match current write")

    payload = "".join(
        json.dumps(row, separators=(",", ":"), sort_keys=True) + "\n"
        for row in rows
    ).encode("utf-8")
    target = ROOT / "normalized" / dataset_id / "latest.jsonl"
    _atomic_write(target, payload)
    return [str(target.relative_to(ROOT))]


def _latest_successful_runs():
    """Return the newest successful run record for each dataset."""
    runs = ROOT / "runs"
    latest = {}
    if not runs.exists():
        return latest
    for path in runs.glob("*.json"):
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        dataset_id = record.get("dataset_id")
        if record.get("status") != "success" or not dataset_id:
            continue
        previous = latest.get(dataset_id)
        if previous is None or str(record.get("recorded_at", "")) > str(previous.get("recorded_at", "")):
            latest[dataset_id] = record
    return latest


def _remove_legacy_files(dataset_id):
    """Remove timestamped raw/normalized files after a stable current copy exists."""
    raw_dataset = ROOT / "raw" / dataset_id
    if raw_dataset.exists():
        for item in list(raw_dataset.iterdir()):
            if item.is_dir():
                shutil.rmtree(item)
            elif item.name not in {"source.bin", "metadata.json"}:
                item.unlink()

    normalized_dataset = ROOT / "normalized" / dataset_id
    if normalized_dataset.exists():
        for item in list(normalized_dataset.iterdir()):
            if item.is_dir():
                shutil.rmtree(item)
            elif item.name != "latest.jsonl":
                item.unlink()


def _migrate_dataset_from_run(dataset_id, run):
    """Promote one verified legacy retrieval into the stable latest-value files."""
    retrieval_id = _safe(run.get("retrieval_id", ""))
    raw_folder = ROOT / "raw" / dataset_id / retrieval_id
    raw_file = raw_folder / "source.bin"
    metadata_file = raw_folder / "metadata.json"
    if not raw_file.is_file() or not metadata_file.is_file():
        return False

    raw_payload = raw_file.read_bytes()
    digest = hashlib.sha256(raw_payload).hexdigest()
    if run.get("raw_sha256") and digest != run["raw_sha256"]:
        return False

    paths = run.get("normalized_paths")
    if not isinstance(paths, list) or not paths:
        return False
    normalized_rows = []
    for relative in paths:
        candidate = (ROOT / relative).resolve()
        if ROOT.resolve() not in candidate.parents or not candidate.is_file():
            return False
        try:
            for line in candidate.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                row = json.loads(line)
                if row.get("dataset_id") != dataset_id:
                    return False
                if row.get("provenance", {}).get("retrieval_id") != retrieval_id:
                    return False
                normalized_rows.append(row)
        except (OSError, ValueError):
            return False
    if not normalized_rows:
        return False

    metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
    if metadata.get("retrieval_id") not in (None, retrieval_id):
        return False

    # Write both stable files only after the old retrieval has passed checks.
    _atomic_write(ROOT / "raw" / dataset_id / "source.bin", raw_payload)
    _atomic_write(ROOT / "raw" / dataset_id / "metadata.json", _json_bytes(metadata))
    normalized_payload = "".join(
        json.dumps(row, separators=(",", ":"), sort_keys=True) + "\n"
        for row in normalized_rows
    ).encode("utf-8")
    _atomic_write(ROOT / "normalized" / dataset_id / "latest.jsonl", normalized_payload)
    return True


def _update_published_manifest():
    """Keep the existing browser manifest contract, but point it at stable files."""
    manifest_path = ROOT / "published" / "atmosphere" / "manifest.json"
    if not manifest_path.is_file():
        return
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    snapshots = manifest.get("snapshots")
    if not isinstance(snapshots, list):
        raise ValueError("Existing Atmosphere manifest has an unsupported shape")

    changed = False
    for entry in snapshots:
        if not isinstance(entry, dict):
            continue
        dataset_id = entry.get("dataset_id")
        if not dataset_id:
            continue
        raw_folder = ROOT / "raw" / dataset_id
        if (raw_folder / "source.bin").is_file() and (raw_folder / "metadata.json").is_file():
            data_path = f"../../raw/{dataset_id}/source.bin"
            metadata_path = f"../../raw/{dataset_id}/metadata.json"
            if entry.get("data") != data_path or entry.get("metadata") != metadata_path:
                entry["data"] = data_path
                entry["metadata"] = metadata_path
                changed = True
    if changed:
        manifest["updated_at_utc"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        _atomic_write(manifest_path, _json_bytes(manifest))


def compact_legacy_database():
    """One-time/recurring migration: retain one current payload per dataset.

    A dataset is compacted only when a successful run record identifies a
    complete, checksum-matching raw + normalized retrieval. Unverifiable data
    is left untouched rather than guessed or deleted.
    """
    latest_runs = _latest_successful_runs()
    compacted = []
    for dataset_id, run in latest_runs.items():
        dataset_id = _safe(dataset_id)
        raw_folder = ROOT / "raw" / dataset_id
        stable_raw = raw_folder / "source.bin"
        stable_meta = raw_folder / "metadata.json"
        stable_normalized = ROOT / "normalized" / dataset_id / "latest.jsonl"

        stable_is_current = False
        if stable_raw.is_file() and stable_meta.is_file() and stable_normalized.is_file():
            try:
                meta = json.loads(stable_meta.read_text(encoding="utf-8"))
                rows = [
                    json.loads(line)
                    for line in stable_normalized.read_text(encoding="utf-8").splitlines()
                    if line.strip()
                ]
                stable_digest = hashlib.sha256(stable_raw.read_bytes()).hexdigest()
                stable_is_current = (
                    meta.get("retrieval_id") == run.get("retrieval_id")
                    and meta.get("raw_sha256") == stable_digest
                    and run.get("raw_sha256") == stable_digest
                    and bool(rows)
                    and all(
                        row.get("dataset_id") == dataset_id
                        and row.get("provenance", {}).get("retrieval_id") == run.get("retrieval_id")
                        for row in rows
                    )
                )
            except (OSError, ValueError):
                stable_is_current = False

        if not stable_is_current:
            try:
                if not _migrate_dataset_from_run(dataset_id, run):
                    continue
            except (OSError, ValueError, KeyError, TypeError):
                # An unverifiable dataset is left untouched; other datasets
                # can still be compacted independently.
                continue

        try:
            _remove_legacy_files(dataset_id)
        except OSError:
            continue
        compacted.append(dataset_id)

    _update_published_manifest()
    return compacted


def remove_legacy_dataset_files(dataset_id):
    """Remove timestamped legacy files after a new stable snapshot is published."""
    dataset_id = _safe(dataset_id)
    raw_folder = ROOT / "raw" / dataset_id
    normalized_file = ROOT / "normalized" / dataset_id / "latest.jsonl"
    if not (raw_folder / "source.bin").is_file():
        raise FileNotFoundError(f"Current raw payload missing for {dataset_id}")
    if not (raw_folder / "metadata.json").is_file():
        raise FileNotFoundError(f"Current raw metadata missing for {dataset_id}")
    if not normalized_file.is_file() or normalized_file.stat().st_size == 0:
        raise FileNotFoundError(f"Current normalized payload missing for {dataset_id}")
    _remove_legacy_files(dataset_id)


def write_run(retrieval_id, result):
    retrieval_id = _safe(retrieval_id)
    folder = ROOT / "runs"
    folder.mkdir(parents=True, exist_ok=True)
    result = dict(
        result,
        retrieval_id=retrieval_id,
        recorded_at=datetime.now(timezone.utc).isoformat(),
    )
    (folder / f"{retrieval_id}.json").write_text(
        json.dumps(result, indent=2) + "\n",
        encoding="utf-8",
    )
