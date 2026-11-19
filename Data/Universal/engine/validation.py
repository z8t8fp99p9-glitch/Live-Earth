from __future__ import annotations

from datetime import datetime
from math import isfinite


def validate_observation(record):
    required = (
        "dataset_id", "source_id", "observed_at", "retrieved_at",
        "value", "unit", "provenance",
    )
    missing = [key for key in required if key not in record]
    if missing:
        raise ValueError("Observation missing required fields: " + ", ".join(missing))
    if not isinstance(record["dataset_id"], str) or not record["dataset_id"]:
        raise ValueError("dataset_id must be a non-empty string")
    if not isinstance(record["source_id"], str) or not record["source_id"]:
        raise ValueError("source_id must be a non-empty string")
    if record["unit"] is not None and not isinstance(record["unit"], str):
        raise ValueError("unit must be a string or null")

    for key in ("observed_at", "retrieved_at"):
        value = record[key]
        if not isinstance(value, str):
            raise ValueError(f"{key} must be an ISO-8601 string")
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError(f"{key} must include a timezone")

    provenance = record["provenance"]
    if not isinstance(provenance, dict) or not provenance.get("source_url"):
        raise ValueError("provenance.source_url is required")

    if record.get("quality") is not None and not isinstance(record["quality"], dict):
        raise ValueError("quality must be an object")
    if record.get("latitude") is not None:
        latitude = float(record["latitude"])
        if not isfinite(latitude) or not -90 <= latitude <= 90:
            raise ValueError("latitude outside [-90, 90]")
    if record.get("longitude") is not None:
        longitude = float(record["longitude"])
        if not isfinite(longitude) or not -180 <= longitude <= 180:
            raise ValueError("longitude outside [-180, 180]")
    return record
