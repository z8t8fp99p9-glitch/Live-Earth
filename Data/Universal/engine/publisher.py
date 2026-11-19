from __future__ import annotations
import json
from datetime import datetime,timezone
from pathlib import Path
import gzip,hashlib
from .storage import ROOT

def publish_grid_snapshot(dataset_id,retrieval_id,payload,metadata):
 if metadata.get("world")!="atmosphere": return None
 width=int(metadata["width"]); height=int(metadata["height"]); scale=int(metadata.get("scale_factor",100))
 if width<2 or height<2 or scale<=0: raise ValueError("Atmosphere grid metadata is invalid")
 raw=gzip.decompress(payload)
 if len(raw)!=width*height*2: raise ValueError("Atmosphere grid byte length does not match its dimensions")
 digest=hashlib.sha256(raw).hexdigest()
 if digest!=metadata.get("sha256_uncompressed_values"): raise ValueError("Atmosphere grid checksum does not match metadata")
 required=("coordinate_order","row_order","latitude_first","latitude_step","longitude_first","longitude_step","longitude_convention","units","encoding")
 missing=[key for key in required if metadata.get(key) is None]
 if missing: raise ValueError("Atmosphere grid metadata missing: "+", ".join(missing))
 if metadata["coordinate_order"]!="latitude-longitude" or metadata["row_order"] not in ("north-to-south","south-to-north") or metadata["longitude_convention"]!="0..360":
  raise ValueError("Atmosphere grid coordinate convention is unsupported")
 folder=ROOT/"published"/"atmosphere"; folder.mkdir(parents=True,exist_ok=True)
 path_data=f"../../raw/{dataset_id}/source.bin"
 path_meta=f"../../raw/{dataset_id}/metadata.json"
 manifest_path=folder/"manifest.json"
 if manifest_path.exists():
  manifest=json.loads(manifest_path.read_text(encoding="utf-8"))
  if manifest.get("world")!="atmosphere" or not isinstance(manifest.get("snapshots"),list):
   raise ValueError("Existing Atmosphere published manifest has an unsupported shape")
 else:
  manifest={"schema_version":1,"world":"atmosphere","snapshots":[]}
 entry={"dataset_id":dataset_id,"dataset":metadata.get("dataset",dataset_id),
  "grid_id":metadata.get("grid_id"),"data":path_data,"metadata":path_meta,
  "sha256_uncompressed_values":digest,"valid_time_utc":metadata.get("valid_time_utc")}
 by_id={item.get("dataset_id"):item for item in manifest["snapshots"] if isinstance(item,dict)}
 by_id[dataset_id]=entry
 manifest["snapshots"]=sorted(by_id.values(),key=lambda item:item.get("dataset_id",""))
 manifest["updated_at_utc"]=datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
 temp=manifest_path.with_suffix(".json.tmp")
 temp.write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
 temp.replace(manifest_path)
 return str(manifest_path.relative_to(ROOT))
