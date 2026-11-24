from __future__ import annotations

import argparse
import importlib
import json
import os
from pathlib import Path

from .registry import (
    SUPPORTED_GROUPS,
    enabled_jobs,
    load_registry,
)
from .storage import store_current_values

ADAPTER_PACKAGE = "Data.Universal.engine.adapters"
REGISTRY_PATH = Path(__file__).resolve().parents[1] / "registry" / "datasets.json"


def _write_step_summary(successes, skipped, failures, group=None):
    """Write a useful GitHub Actions summary without hiding dataset failures."""
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return

    def section(title, items):
        if not items:
            return f"### {title}\\n- None\\n"
        return f"### {title}\\n" + "".join(f"- `{item}`\\n" for item in items)

    scope = group or "all enabled groups"
    content = (
        f"# LIVE // EARTH — Collection report ({scope})\\n\\n"
        f"- Updated: **{len(successes)}**\\n"
        f"- Skipped (already current): **{len(skipped)}**\\n"
        f"- Failed: **{len(failures)}**\\n\\n"
        + section("Updated datasets", successes) + "\\n"
        + section("Skipped datasets", skipped) + "\\n"
        + section("Failed datasets", failures)
    )
    with open(summary_path, "a", encoding="utf-8") as stream:
        stream.write(content)


def _save_registry_status(registry, statuses):
    """Persist per-dataset health without creating a history of collection runs."""
    by_id = {item["dataset_id"]: item for item in registry["datasets"]}
    for dataset_id, status in statuses.items():
        item = by_id.get(dataset_id)
        if item:
            item["status"] = status
    REGISTRY_PATH.write_text(
        json.dumps(registry, indent=2) + "\\n",
        encoding="utf-8",
    )


def run_all(group: str | None = None):
    registry = load_registry()
    jobs = enabled_jobs(registry, group=group)
    scope = group or "all"
    print(
        f"UNIVERSAL_COLLECTOR group={scope} "
        f"registered={len(registry['datasets'])} enabled={len(jobs)}"
    )

    successes, failures, skipped = [], [], []
    statuses = {}

    for dataset in jobs:
        dataset_id = dataset["dataset_id"]
        try:
            adapter_id = dataset["collection"]["adapter_id"]
            module = importlib.import_module(f"{ADAPTER_PACKAGE}.{adapter_id}")

            due = getattr(module, "is_due", None)
            if callable(due) and not due(dataset):
                skipped.append(dataset_id)
                print(
                    f"DATASET_RESULT {dataset_id}=SKIPPED "
                    "reason=current_values_already_match_source_cycle"
                )
                continue

            result = module.collect(dataset)
            if not isinstance(result, dict):
                raise ValueError("Adapter must return a result object")
            value_payload = result.get("value_payload")
            metadata = result.get("metadata", {})
            rows = result.get("observations")
            if not isinstance(metadata, dict):
                raise ValueError("Adapter metadata must be an object")
            data_kind = metadata.get("data_kind")
            if not data_kind and metadata.get("world") == "atmosphere":
                data_kind = "grid"
            if not data_kind and str(metadata.get("format", "")).lower() == "netcdf":
                data_kind = "grid"
            if data_kind == "grid" and (
                not isinstance(value_payload, bytes) or not value_payload
            ):
                raise ValueError(
                    "Grid adapter must return its current encoded value field"
                )
            if not isinstance(rows, list) or not rows:
                raise ValueError("Adapter must return non-empty typed observations")

            # Validate provenance and stable dataset identity before one atomic value write.
            for row in rows:
                if not isinstance(row, dict) or row.get("dataset_id") != dataset_id:
                    raise ValueError(
                        "Adapter returned an observation for the wrong dataset"
                    )
                provenance = row.setdefault("provenance", {})
                if not provenance.get("source_url"):
                    source_url = metadata.get("source_url")
                    if not source_url:
                        raise ValueError(
                            "Observation provenance.source_url is required"
                        )
                    provenance["source_url"] = source_url

            stored = store_current_values(
                dataset_id, value_payload, metadata, rows
            )
            successes.append(dataset_id)
            statuses[dataset_id] = "collector_configured_success"
            quantity = (
                f"cells={stored['cell_count']}"
                if stored.get("cell_count") is not None
                else f"records={stored['record_count']}"
            )
            print(
                f"DATASET_RESULT {dataset_id}=SUCCESS "
                f"kind={stored['data_kind']} {quantity} "
                f"file={stored['value_file']}"
            )

        except Exception as exc:
            failures.append(dataset_id)
            statuses[dataset_id] = "collector_configured_failed"
            print(f"DATASET_RESULT {dataset_id}=FAILED: {exc}")

    _save_registry_status(registry, statuses)
    _write_step_summary(successes, skipped, failures, group=group)

    print(
        f"COLLECTION_SUMMARY group={scope} updated={len(successes)} "
        f"skipped={len(skipped)} failed={len(failures)}"
    )

    if failures:
        raise SystemExit(
            "Independent dataset jobs failed: " + ", ".join(failures)
        )


def main():
    parser = argparse.ArgumentParser(description="Run LIVE // EARTH collection")
    parser.add_argument(
        "--group",
        choices=sorted(SUPPORTED_GROUPS),
        help="Collect only one configured dataset group; omit for all groups.",
    )
    args = parser.parse_args()
    run_all(group=args.group)


if __name__ == "__main__":
    main()
