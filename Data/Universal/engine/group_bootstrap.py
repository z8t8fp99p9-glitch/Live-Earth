from __future__ import annotations

import argparse
import json

from .bootstrap import (
    CADENCE_RESOLUTION,
    CONFIG,
    CONTRACTS,
    SUCCESS_STATES,
    REGISTRY,
)
from .registry import SUPPORTED_GROUPS, dataset_group


def configure_group(group: str):
    if group not in SUPPORTED_GROUPS:
        supported = ", ".join(sorted(SUPPORTED_GROUPS))
        raise ValueError(
            f"Unknown dataset group {group!r}. Supported groups: {supported}"
        )

    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    datasets = data.get("datasets")
    if not isinstance(datasets, list):
        raise ValueError("Dataset registry must contain a datasets array")

    seen = set()
    processed = 0

    for item in datasets:
        dataset_id = item.get("dataset_id")
        if dataset_group(dataset_id) != group:
            continue

        seen.add(dataset_id)
        processed += 1

        if dataset_id not in CONFIG:
            item["collection"] = {
                "enabled": False,
                "adapter_id": None,
                "source_id": None,
                "cadence": None,
            }
            if dataset_id in {
                "earth.atmosphere.co2_concentration",
                "earth.atmosphere.methane",
                "earth.atmosphere.carbon_monoxide",
                "earth.atmosphere.aerosols_dust",
            }:
                item["status"] = "source_not_configured"
            continue

        adapter, source, cadence = CONFIG[dataset_id]
        previous_adapter = item.get("collection", {}).get("adapter_id")
        item["collection"] = {
            "enabled": True,
            "adapter_id": adapter,
            "source_id": source,
            "cadence": cadence,
        }

        if (
            dataset_id.startswith("earth.oceans.")
            and previous_adapter not in {"ocean", "ocean_fixed", "ocean_additional"}
        ):
            item["status"] = "collector_configured_pending_first_success"
        elif item.get("status") not in SUCCESS_STATES:
            item["status"] = "collector_configured_pending_first_success"

        if dataset_id in CONTRACTS:
            units, coverage = CONTRACTS[dataset_id]
            item.setdefault("data_contract", {})
            item["data_contract"]["units"] = units
            item["data_contract"]["spatial_coverage"] = coverage
            item["data_contract"]["temporal_resolution"] = (
                CADENCE_RESOLUTION[cadence]
            )

    expected = {
        dataset_id
        for dataset_id in CONFIG
        if dataset_group(dataset_id) == group
    }
    missing = expected - seen
    if missing:
        raise RuntimeError(
            "Registry missing configured IDs for "
            f"{group}: " + ", ".join(sorted(missing))
        )

    # Only this group's entries are modified; every other registry entry
    # is retained exactly as loaded.
    REGISTRY.write_text(
        json.dumps(data, indent=2) + "\n",
        encoding="utf-8",
    )

    enabled = sum(
        1
        for item in datasets
        if dataset_group(item.get("dataset_id")) == group
        and item.get("collection", {}).get("enabled") is True
    )
    print(
        f"UNIVERSAL_REGISTRY_READY group={group} "
        f"processed={processed} enabled={enabled}"
    )


def main():
    parser = argparse.ArgumentParser(
        description="Configure one LIVE // EARTH dataset group"
    )
    parser.add_argument(
        "--group",
        required=True,
        choices=sorted(SUPPORTED_GROUPS),
        help="The dataset group to configure without changing other groups.",
    )
    args = parser.parse_args()
    configure_group(args.group)


if __name__ == "__main__":
    main()
