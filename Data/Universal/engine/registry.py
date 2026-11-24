from __future__ import annotations

import json
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]

# Composition datasets share the broad atmosphere world namespace, but
# they are collected by their own workflow.
ATMOSPHERIC_COMPOSITION_IDS = frozenset({
    "earth.atmosphere.water_vapour",
    "earth.atmosphere.cloud_properties",
    "earth.atmosphere.co2_concentration",
    "earth.atmosphere.methane",
    "earth.atmosphere.ozone",
    "earth.atmosphere.carbon_monoxide",
    "earth.atmosphere.aerosols_dust",
})

GROUP_PREFIXES = {
    "atmosphere": ("earth.atmosphere.",),
    "oceans": ("earth.oceans.",),
    "land": ("earth.land.",),
    "water_ice": ("earth.water_ice.",),
    "earth_activity": ("earth.earth_activity.",),
    "energy_humanity": ("earth.energy_humanity.",),
}

SUPPORTED_GROUPS = frozenset((*GROUP_PREFIXES, "atmospheric_composition"))


def load_registry():
    data = json.loads(
        (BASE / "registry" / "datasets.json").read_text(encoding="utf-8")
    )
    items = data.get("datasets")
    if not isinstance(items, list):
        raise ValueError("Dataset registry must contain a datasets array")

    seen = set()
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Every dataset registry entry must be an object")
        key = item.get("dataset_id")
        if not key or key in seen:
            raise ValueError(f"Missing or duplicate dataset_id: {key!r}")
        seen.add(key)
    return data


def load_assignments():
    data = json.loads(
        (BASE / "registry" / "world-dataset-assignments.json").read_text(
            encoding="utf-8"
        )
    )
    assignments = data.get("assignments", [])
    if not isinstance(assignments, list):
        raise ValueError("World dataset assignments must be an array")
    return assignments


def dataset_group(dataset_id: str) -> str | None:
    """Map a stable dataset ID to exactly one collector group."""

    if dataset_id in ATMOSPHERIC_COMPOSITION_IDS:
        return "atmospheric_composition"

    for group, prefixes in GROUP_PREFIXES.items():
        if dataset_id.startswith(prefixes):
            return group

    return None


def enabled_jobs(registry=None, group: str | None = None):
    """
    Return enabled collection jobs.

    Omitting group preserves the original all-enabled-datasets behaviour.
    Supplying a group restricts collection to that group.
    """

    if group is not None and group not in SUPPORTED_GROUPS:
        supported = ", ".join(sorted(SUPPORTED_GROUPS))
        raise ValueError(
            f"Unknown dataset group {group!r}. Supported groups: {supported}"
        )

    registry = registry or load_registry()
    jobs = [
        dataset
        for dataset in registry["datasets"]
        if dataset.get("collection", {}).get("enabled") is True
        and dataset.get("collection", {}).get("adapter_id")
    ]

    if group is None:
        return jobs

    return [
        dataset
        for dataset in jobs
        if dataset_group(dataset["dataset_id"]) == group
    ]
