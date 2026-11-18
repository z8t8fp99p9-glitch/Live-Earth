from __future__ import annotations

import importlib
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .registry import load_registry, enabled_jobs
from .storage import write_run, store_raw, store_normalized
from .publisher import publish_grid_snapshot

ADAPTER_PACKAGE = "Data.Universal.engine.adapters"
REGISTRY_PATH = Path(__file__).resolve().parents[1] / "registry" / "datasets.json"


def _write_step_summary(successes, skipped, failures):
    """Write a useful GitHub Actions summary without hiding per-dataset failures."""
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return

    def section(title, items):
        if not items:
            return f"### {title}\n- None\n"
        return f"### {title}\n" + "".join(f"- `{item}`\n" for item in items)

    content = (
        "# LIVE // EARTH — Universal collection report\n\n"
        f"- Successful: **{len(successes)}**\n"
        f"- Skipped (already current): **{len(skipped)}**\n"
        f"- Failed: **{len(failures)}**\n\n"
        + section("Successful datasets", successes) + "\n"
        + section("Skipped datasets", skipped) + "\n"
        + section("Failed datasets", failures)
    )
    with open(summary_path, "a", encoding="utf-8") as stream:
        stream.write(content)


def _save_registry_status(registry, statuses):
    """Persist per-dataset health after all independent jobs have been attempted."""
    by_id = {item["dataset_id"]: item for item in registry["datasets"]}
    for dataset_id, status in statuses.items():
        item = by_id.get(dataset_id)
        if item:
            item["status"] = status
    REGISTRY_PATH.write_text(
        json.dumps(registry, indent=2) + "\n",
        encoding="utf-8",
    )


def run_all():
    registry = load_registry()
    jobs = enabled_jobs(registry)
    print(
        f"UNIVERSAL_COLLECTOR registered={len(registry['datasets'])} "
        f"enabled={len(jobs)}"
    )

    successes, failures, skipped = [], [], []
    statuses = {}

    for dataset in jobs:
        dataset_id = dataset["dataset_id"]
        retrieval_id = (
            datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
            + "-" + uuid.uuid4().hex[:8]
        )

        try:
            adapter_id = dataset["collection"]["adapter_id"]
            module = importlib.import_module(f"{ADAPTER_PACKAGE}.{adapter_id}")

            due = getattr(module, "is_due", None)
            if callable(due) and not due(dataset):
                skipped.append(dataset_id)
                print(
                    f"DATASET_RESULT {dataset_id}=SKIPPED "
                    "reason=latest_successful_snapshot_already_current"
                )
                continue

            result = module.collect(dataset)
            if (
                not isinstance(result, dict)
                or not isinstance(result.get("raw_payload"), bytes)
                or not result["raw_payload"]
            ):
                raise ValueError("Adapter must return non-empty raw_payload bytes")

            rows = result.get("observations")
            if not isinstance(rows, list) or not rows:
                raise ValueError("Adapter must return non-empty typed observations")
            raw_metadata = result.get("raw_metadata", {})

            digest = store_raw(
                dataset_id, retrieval_id, result["raw_payload"], raw_metadata
            )

            for row in rows:
                provenance = row.setdefault("provenance", {})
                provenance["raw_sha256"] = digest
                provenance["retrieval_id"] = retrieval_id
                if not provenance.get("source_url"):
                    raise ValueError("Observation provenance.source_url is required")

            locations = store_normalized(dataset_id, retrieval_id, rows)
            published_path = publish_grid_snapshot(
                dataset_id, retrieval_id, result["raw_payload"], raw_metadata
            )

            write_run(retrieval_id, {
                "dataset_id": dataset_id,
                "status": "success",
                "normalized_paths": locations,
                "record_count": len(rows),
                "raw_sha256": digest,
                "data_kind": raw_metadata.get("data_kind"),
                "published_path": published_path,
            })

            successes.append(dataset_id)
            statuses[dataset_id] = "collector_configured_success"
            print(
                f"DATASET_RESULT {dataset_id}=SUCCESS records={len(rows)}"
                + (f" published={published_path}" if published_path else "")
            )

        except Exception as exc:
            try:
                write_run(retrieval_id, {
                    "dataset_id": dataset_id,
                    "status": "failed",
                    "error": str(exc),
                })
            except Exception as run_error:
                print(
                    f"DATASET_RUN_RECORD_ERROR {dataset_id}: {run_error}"
                )

            failures.append(dataset_id)
            statuses[dataset_id] = "collector_configured_failed"
            print(f"DATASET_RESULT {dataset_id}=FAILED: {exc}")

    _save_registry_status(registry, statuses)
    _write_step_summary(successes, skipped, failures)

    print(
        f"COLLECTION_SUMMARY success={len(successes)} "
        f"skipped={len(skipped)} failed={len(failures)}"
    )

    # Deliberately fail only after every enabled dataset has been attempted.
    if failures:
        raise SystemExit(
            "Independent dataset jobs failed: " + ", ".join(failures)
        )


if __name__ == "__main__":
    run_all()
