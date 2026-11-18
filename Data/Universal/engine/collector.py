from __future__ import annotations
import importlib, uuid
from datetime import datetime, timezone
from .registry import load_registry, enabled_jobs
from .storage import write_run

ADAPTER_PACKAGE = "Data.Universal.engine.adapters"

def run_all():
    registry = load_registry()
    jobs = enabled_jobs(registry)
    print(f"UNIVERSAL_COLLECTOR registered={len(registry['datasets'])} enabled={len(jobs)}")
    failures, successes = [], []
    for dataset in jobs:
        retrieval_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:8]
        adapter_id = dataset["collection"]["adapter_id"]
        try:
            module = importlib.import_module(f"{ADAPTER_PACKAGE}.{adapter_id}")
            result = module.collect(dataset)
            if not isinstance(result, dict) or not isinstance(result.get("raw_payload"), bytes) or not result.get("observations"):
                raise ValueError("Adapter must return non-empty raw_payload bytes and observations")
            # Adapter must store raw first and provide provenance-linked observations.
            from .storage import store_raw, store_normalized
            metadata = result.get("raw_metadata", {})
            digest = store_raw(dataset["dataset_id"], retrieval_id, result["raw_payload"], metadata)
            for row in result["observations"]:
                row.setdefault("provenance", {})["raw_sha256"] = digest
                row["provenance"].setdefault("retrieval_id", retrieval_id)
            location = store_normalized(dataset["dataset_id"], retrieval_id, result["observations"])
            write_run(retrieval_id, {"dataset_id":dataset["dataset_id"],"status":"success","normalized_path":location,"record_count":len(result["observations"])})
            successes.append(dataset["dataset_id"])
        except Exception as exc:
            write_run(retrieval_id, {"dataset_id":dataset["dataset_id"],"status":"failed","error":str(exc)})
            failures.append(dataset["dataset_id"])
            print(f"DATASET_RESULT {dataset['dataset_id']}=FAILED: {exc}")
    print(f"COLLECTION_SUMMARY success={len(successes)} failed={len(failures)}")
    if failures:
        raise SystemExit("One or more independent dataset jobs failed: " + ", ".join(failures))

if __name__ == "__main__":
    run_all()
