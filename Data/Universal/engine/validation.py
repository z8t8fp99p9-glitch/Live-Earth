from __future__ import annotations
from datetime import datetime

def validate_observation(record):
    required = ("dataset_id", "source_id", "observed_at", "retrieved_at", "value", "unit", "provenance")
    missing = [key for key in required if key not in record]
    if missing:
        raise ValueError("Observation missing required fields: " + ", ".join(missing))
    for key in ("observed_at", "retrieved_at"):
        value = record[key]
        if not isinstance(value, str):
            raise ValueError(f"{key} must be an ISO-8601 string")
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError(f"{key} must include a timezone")
    provenance = record["provenance"]
    for key in ("source_url", "retrieval_id", "raw_sha256"):
        if not provenance.get(key):
            raise ValueError(f"provenance.{key} is required")
    if record.get("latitude") is not None and not -90 <= float(record["latitude"]) <= 90:
        raise ValueError("latitude outside [-90, 90]")
    if record.get("longitude") is not None and not -180 <= float(record["longitude"]) <= 180:
        raise ValueError("longitude outside [-180, 180]")
    return record
