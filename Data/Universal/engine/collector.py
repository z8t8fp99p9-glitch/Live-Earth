from __future__ import annotations
import importlib,uuid
from datetime import datetime,timezone
from .registry import load_registry,enabled_jobs
from .storage import write_run,store_raw,store_normalized
from .publisher import publish_grid_snapshot
ADAPTER_PACKAGE="Data.Universal.engine.adapters"
def run_all():
 registry=load_registry(); jobs=enabled_jobs(registry)
 print(f"UNIVERSAL_COLLECTOR registered={len(registry['datasets'])} enabled={len(jobs)}")
 successes=[]; failures=[]; skipped=[]
 for dataset in jobs:
  dataset_id=dataset["dataset_id"]
  retrieval_id=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")+"-"+uuid.uuid4().hex[:8]
  try:
   adapter_id=dataset["collection"]["adapter_id"]
   module=importlib.import_module(f"{ADAPTER_PACKAGE}.{adapter_id}")
   due=getattr(module,"is_due",None)
   if callable(due) and not due(dataset):
    skipped.append(dataset_id)
    print(f"DATASET_RESULT {dataset_id}=SKIPPED reason=source_cycle_already_stored")
    continue
   result=module.collect(dataset)
   if not isinstance(result,dict) or not isinstance(result.get("raw_payload"),bytes) or not result["raw_payload"]:
    raise ValueError("Adapter must return non-empty raw_payload bytes")
   rows=result.get("observations")
   if not isinstance(rows,list) or not rows: raise ValueError("Adapter must return non-empty typed observations")
   raw_metadata=result.get("raw_metadata",{})
   digest=store_raw(dataset_id,retrieval_id,result["raw_payload"],raw_metadata)
   for row in rows:
    provenance=row.setdefault("provenance",{})
    provenance["raw_sha256"]=digest; provenance["retrieval_id"]=retrieval_id
    if not provenance.get("source_url"): raise ValueError("Observation provenance.source_url is required")
   locations=store_normalized(dataset_id,retrieval_id,rows)
   published_path=publish_grid_snapshot(dataset_id,retrieval_id,result["raw_payload"],raw_metadata)
   write_run(retrieval_id,{"dataset_id":dataset_id,"status":"success","normalized_paths":locations,
    "record_count":len(rows),"raw_sha256":digest,"data_kind":raw_metadata.get("data_kind"),
    "published_path":published_path})
   successes.append(dataset_id)
   print(f"DATASET_RESULT {dataset_id}=SUCCESS records={len(rows)}"+(f" published={published_path}" if published_path else ""))
  except Exception as exc:
   try: write_run(retrieval_id,{"dataset_id":dataset_id,"status":"failed","error":str(exc)})
   except Exception: pass
   failures.append(dataset_id); print(f"DATASET_RESULT {dataset_id}=FAILED: {exc}")
 print(f"COLLECTION_SUMMARY success={len(successes)} skipped={len(skipped)} failed={len(failures)}")
 if failures: raise SystemExit("Independent dataset jobs failed: "+", ".join(failures))
if __name__=="__main__":run_all()
