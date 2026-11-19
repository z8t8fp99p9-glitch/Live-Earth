from __future__ import annotations

import gzip
import hashlib
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from .validation import validate_observation

ROOT = Path(__file__).resolve().parents[2] / "Central-Database"
VALUES_ROOT = ROOT / "values"


def _safe_dataset_id(value: str) -> str:
    if not isinstance(value, str) or not re.fullmatch(r"[a-z0-9]+(?:[._-][a-z0-9]+)*", value):
        raise ValueError(f"Unsafe dataset id: {value!r}")
    return value


def _atomic_write(path: Path, payload: bytes) -> None:
    """Replace one stable value file only after the complete payload is ready."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
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


def _json_bytes(value) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")


def _record_key(record: dict) -> str:
    """Return a stable identity for one current observation/event."""
    if record.get("event_id"):
        return "event:" + str(record["event_id"])
    quality = record.get("quality") or {}
    if not isinstance(quality, dict):
        raise ValueError("Observation quality must be an object")
    sample_id = quality.get("sample_tile_id")
    if sample_id:
        return "sample:" + str(sample_id)
    explicit = record.get("record_key")
    if explicit:
        return str(explicit)
    latitude, longitude = record.get("latitude"), record.get("longitude")
    if latitude is not None and longitude is not None:
        return "point:{}:{:.5f}:{:.5f}".format(
            record.get("source_id", "source"), float(latitude), float(longitude)
        )
    return "series:" + str(record.get("source_id", "source"))


def _validate_grid_payload(payload: bytes, metadata: dict) -> None:
    if not isinstance(payload, bytes) or not payload:
        raise ValueError("Grid value payload must be non-empty bytes")

    fmt = str(metadata.get("format", "")).lower()
    encoding = str(metadata.get("encoding", "")).lower()
    width, height = metadata.get("width"), metadata.get("height")

    # The Atmosphere GFS collector stores its decoded numeric field as gzip-compressed
    # little-endian int16 values. Validate the actual value array before replacing it.
    if "int16" in encoding or "int16" in fmt or metadata.get("world") == "atmosphere":
        if not isinstance(width, int) or width < 2 or not isinstance(height, int) or height < 2:
            raise ValueError("Grid dimensions are missing or invalid")
        required = (
            "coordinate_order", "row_order", "latitude_first", "latitude_step",
            "longitude_first", "longitude_step", "longitude_convention",
            "units", "encoding", "scale_factor", "sha256_uncompressed_values",
        )
        missing = [key for key in required if metadata.get(key) is None]
        if missing:
            raise ValueError("Grid metadata is incomplete: " + ", ".join(missing))
        if metadata["coordinate_order"] != "latitude-longitude":
            raise ValueError("Grid coordinate order must be latitude-longitude")
        if metadata["row_order"] not in ("north-to-south", "south-to-north"):
            raise ValueError("Grid row order is unsupported")
        if metadata["longitude_convention"] not in ("0..360", "-180..180"):
            raise ValueError("Grid longitude convention is unsupported")
        if not str(metadata["encoding"]).lower().startswith("little-endian signed int16"):
            raise ValueError("Grid value encoding is not the approved little-endian int16 format")
        scale = float(metadata["scale_factor"])
        if not (scale > 0 and scale < float("inf")):
            raise ValueError("Grid scale factor must be finite and positive")
        try:
            values = gzip.decompress(payload)
        except (OSError, EOFError) as exc:
            raise ValueError("Grid value payload is not a valid gzip stream") from exc
        expected = width * height * 2
        if len(values) != expected:
            raise ValueError(f"Grid value byte length {len(values)} does not match {expected}")
        expected_hash = str(metadata["sha256_uncompressed_values"])
        if len(expected_hash) != 64 or hashlib.sha256(values).hexdigest().lower() != expected_hash.lower():
            raise ValueError("Grid values failed their uncompressed SHA-256 check")
        return

    # Other gridded products (for example OISST NetCDF) are retained as the one
    # current encoded value field, never as a per-retrieval source archive.
    if fmt == "netcdf":
        if not payload.startswith((b"CDF\x01", b"CDF\x02", b"\x89HDF\r\n\x1a\n")):
            raise ValueError("Current grid field is not a recognized NetCDF payload")
        if len(payload) < 100_000:
            raise ValueError("Current NetCDF grid field is unexpectedly small")
        return

    if not ("width" in metadata and "height" in metadata):
        raise ValueError("Grid metadata does not describe a supported value encoding")


def _validate_rows(dataset_id: str, observations: list) -> list[dict]:
    if not isinstance(observations, list) or not observations:
        raise ValueError("Refusing to replace a dataset with an empty record set")
    rows = []
    seen = set()
    for source_row in observations:
        row = validate_observation(dict(source_row))
        if row["dataset_id"] != dataset_id:
            raise ValueError("Observation dataset_id does not match its value partition")
        key = _record_key(row)
        if key in seen:
            raise ValueError(f"Duplicate current record key: {key}")
        seen.add(key)
        row["record_key"] = key
        rows.append(row)
    return rows


def _read_existing_records(path: Path) -> dict[str, dict]:
    existing: dict[str, dict] = {}
    if not path.is_file():
        return existing
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
            key = row.get("record_key") or _record_key(row)
            existing[key] = row
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            raise ValueError(
                f"Existing current-value records are invalid at line {line_number}; refusing overwrite"
            ) from exc
    return existing



def _commit_current_value(folder: Path, value_file: str, value_bytes: bytes, metadata: dict) -> None:
    """Commit value bytes and their descriptor, restoring old bytes on descriptor failure."""
    target = folder / value_file
    metadata_target = folder / "metadata.json"
    old_value = target.read_bytes() if target.is_file() else None
    stored_metadata = dict(metadata, value_bytes=len(value_bytes))
    try:
        _atomic_write(target, value_bytes)
        _atomic_write(metadata_target, _json_bytes(stored_metadata))
    except Exception:
        # Metadata still describes the prior value if its atomic replacement failed.
        # Restore that value file (or remove a first-write target) before propagating.
        try:
            if old_value is None:
                target.unlink(missing_ok=True)
            else:
                _atomic_write(target, old_value)
        except Exception as rollback_error:
            raise RuntimeError(
                f"Value commit failed and rollback also failed for {target}: {rollback_error}"
            )
        raise


def store_current_values(dataset_id: str, value_payload: bytes | None, metadata: dict, observations: list) -> dict:
    """Persist current dataset values at stable paths, replacing prior values in place.

    A grid is one current numeric field (its cells are the values); point samples and
    events are keyed records. No collection snapshots, provider-response archives,
    retrieval folders, dated partitions, run history, or cleanup process are created.
    """
    dataset_id = _safe_dataset_id(dataset_id)
    if not isinstance(metadata, dict):
        raise ValueError("Adapter metadata must be an object")
    if metadata.get("dataset_id") not in (None, dataset_id):
        raise ValueError("Adapter metadata dataset_id does not match its value partition")
    # Validate every observation, including the descriptor row accompanying a grid.
    rows = _validate_rows(dataset_id, observations)

    folder = VALUES_ROOT / dataset_id
    base_metadata = dict(metadata)
    # Transient identifiers belong to retrieval logs, not to the current-value store.
    for transient_key in ("retrieval_id", "raw_sha256", "raw_bytes", "raw_payload"):
        base_metadata.pop(transient_key, None)

    data_kind = base_metadata.get("data_kind")
    if not data_kind and base_metadata.get("world") == "atmosphere":
        data_kind = "grid"
    if not data_kind and str(base_metadata.get("format", "")).lower() == "netcdf":
        data_kind = "grid"
    data_kind = data_kind or "records"
    if data_kind not in {"grid", "point_samples", "events", "records"}:
        raise ValueError(f"Unsupported current-value data kind: {data_kind}")

    updated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    folder.mkdir(parents=True, exist_ok=True)

    if data_kind == "grid":
        if len(rows) != 1:
            raise ValueError("A grid dataset must provide exactly one field descriptor observation")
        _validate_grid_payload(value_payload, base_metadata)
        value_bytes = value_payload
        value_hash = hashlib.sha256(value_bytes).hexdigest()
        width, height = base_metadata.get("width"), base_metadata.get("height")
        cell_count = width * height if isinstance(width, int) and isinstance(height, int) else None
        record_count = None
        value_file = "values.bin"
        observed_at = (
            base_metadata.get("valid_time_utc")
            or base_metadata.get("source_cycle_utc")
            or rows[0].get("observed_at")
        )
    else:
        target = folder / "records.jsonl"
        current = _read_existing_records(target)

        # A complete event-feed response defines the active event set. Point-sample
        # sources define a complete current set for their stable sample-tile keys.
        if data_kind == "events":
            current = {}
        elif data_kind == "point_samples":
            current = {key: value for key, value in current.items() if not key.startswith("sample:")}

        for row in rows:
            current[row["record_key"]] = row

        serialized = "".join(
            json.dumps(current[key], separators=(",", ":"), sort_keys=True) + "\n"
            for key in sorted(current)
        ).encode("utf-8")
        value_bytes = serialized
        value_hash = hashlib.sha256(value_bytes).hexdigest()
        record_count = len(current)
        cell_count = None
        value_file = "records.jsonl"
        observed_at = max(
            (row.get("observed_at") for row in current.values() if row.get("observed_at")),
            default=None,
        )

    stored_metadata = dict(
        base_metadata,
        database_schema_version=1,
        dataset_id=dataset_id,
        data_kind=data_kind,
        value_file=value_file,
        record_count=record_count,
        cell_count=cell_count,
        updated_at_utc=updated_at,
        observed_at_utc=observed_at,
        value_sha256=value_hash,
    )
    _commit_current_value(folder, value_file, value_bytes, stored_metadata)
    stale_value_file = "records.jsonl" if data_kind == "grid" else "values.bin"
    try:
        (folder / stale_value_file).unlink()
    except FileNotFoundError:
        pass

    return {
        "dataset_id": dataset_id,
        "data_kind": data_kind,
        "value_file": str((folder / value_file).relative_to(ROOT)),
        "record_count": record_count,
        "cell_count": cell_count,
        "value_sha256": value_hash,
        "updated_at_utc": updated_at,
    }


def read_current_metadata(dataset_id: str) -> dict | None:
    dataset_id = _safe_dataset_id(dataset_id)
    path = VALUES_ROOT / dataset_id / "metadata.json"
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def read_current_records(dataset_id: str, limit: int = 1000) -> list[dict]:
    dataset_id = _safe_dataset_id(dataset_id)
    path = VALUES_ROOT / dataset_id / "records.jsonl"
    if not path.is_file():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        rows.append(json.loads(line))
        if len(rows) >= limit:
            break
    return rows
