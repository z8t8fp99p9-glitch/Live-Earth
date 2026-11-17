#!/usr/bin/env python3
"""LIVE // EARTH compact scientific CSV collector.

No network calls. Reads explicitly staged, licensed CSV files from inbox/.
Writes deterministic gzip JSONL partitions by world and UTC day.
"""
from __future__ import annotations
import csv, gzip, hashlib, json, os, sys, tempfile
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INBOX = ROOT / "inbox"
PUBLISHED = ROOT / "published"
RETENTION_DAYS = int(os.environ.get("LIVE_EARTH_RETENTION_DAYS", "365"))
MAX_PUBLISHED_BYTES = int(os.environ.get("LIVE_EARTH_MAX_PUBLISHED_BYTES", str(45*1024*1024)))
WORLDS = {"atmosphere","oceans","land","water-ice","earth-activity","energy-humanity"}
REQUIRED = {"world_id","dataset_key","signal_key","signal_name","observed_at","numeric_value","unit","source_record_key","source_name","source_url","licence","attribution"}

def fail(msg): raise ValueError(msg)
def parse_time(s):
    value = datetime.fromisoformat(s.strip().replace("Z","+00:00"))
    if value.tzinfo is None: fail("observed_at must include a timezone")
    return value.astimezone(timezone.utc)

def load_rows():
    rows = defaultdict(dict)
    source_files=[]
    for path in sorted(INBOX.glob("*.csv")):
        if path.name.startswith("_"): continue
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        source_files.append({"file":path.name,"sha256":digest,"bytes":path.stat().st_size})
        with path.open("r",encoding="utf-8-sig",newline="") as f:
            reader=csv.DictReader(f)
            missing=REQUIRED-set(reader.fieldnames or [])
            if missing: fail(f"{path.name}: missing columns: {', '.join(sorted(missing))}")
            for line,row in enumerate(reader, start=2):
                world=row["world_id"].strip()
                if world not in WORLDS: fail(f"{path.name}:{line}: unknown world_id {world!r}")
                when=parse_time(row["observed_at"])
                try: value=float(row["numeric_value"])
                except Exception: fail(f"{path.name}:{line}: numeric_value is not numeric")
                if value != value or value in (float("inf"),float("-inf")): fail(f"{path.name}:{line}: non-finite numeric_value")
                lat=row.get("latitude","").strip(); lon=row.get("longitude","").strip()
                lat=float(lat) if lat else None; lon=float(lon) if lon else None
                if lat is not None and not -90 <= lat <= 90: fail(f"{path.name}:{line}: latitude out of range")
                if lon is not None and not -180 <= lon <= 180: fail(f"{path.name}:{line}: longitude out of range")
                key=(row["dataset_key"].strip(),row["signal_key"].strip(),row["source_record_key"].strip())
                if not all(key): fail(f"{path.name}:{line}: empty dataset/signal/record key")
                record={
                    "world_id":world,"dataset_key":key[0],"signal_key":key[1],
                    "signal_name":row["signal_name"].strip(),"observed_at":when.isoformat().replace("+00:00","Z"),
                    "numeric_value":value,"unit":row["unit"].strip(),"source_record_key":key[2],
                    "source_name":row["source_name"].strip(),"source_url":row["source_url"].strip(),
                    "licence":row["licence"].strip(),"attribution":row["attribution"].strip(),
                    "latitude":lat,"longitude":lon,
                    "region_code":row.get("region_code","").strip() or None,
                    "quality_status":"unreviewed"
                }
                if not all(record[k] for k in ("signal_name","unit","source_name","source_url","licence","attribution")):
                    fail(f"{path.name}:{line}: provenance and measurement metadata cannot be blank")
                rows[(world,when.date().isoformat())][key]=record
    return rows,source_files

def existing_rows(path):
    result={}
    if path.exists():
        with gzip.open(path,"rt",encoding="utf-8") as f:
            for line in f:
                obj=json.loads(line)
                key=(obj["dataset_key"],obj["signal_key"],obj["source_record_key"])
                result[key]=obj
    return result

def main():
    if RETENTION_DAYS < 1 or RETENTION_DAYS > 365: fail("Retention must be between 1 and 365 days.")
    PUBLISHED.mkdir(parents=True,exist_ok=True)
    rows,source_files=load_rows()
    now=datetime.now(timezone.utc)
    cutoff=(now-timedelta(days=RETENTION_DAYS)).date().isoformat()
    written=0
    # Merge today's staged records with existing partitions; keep one compact file per world/day.
    for (world,day),incoming in sorted(rows.items()):
        if day < cutoff: continue
        folder=PUBLISHED/world
        folder.mkdir(parents=True,exist_ok=True)
        target=folder/f"{day}.jsonl.gz"
        merged=existing_rows(target)
        merged.update(incoming)
        fd,tmp=tempfile.mkstemp(prefix=".partition-",suffix=".gz",dir=folder)
        os.close(fd)
        try:
            with open(tmp,"wb") as raw:
                with gzip.GzipFile(fileobj=raw,mode="wb",mtime=0,compresslevel=9) as gz:
                    for key,obj in sorted(merged.items()):
                        gz.write((json.dumps(obj,separators=(",",":"),ensure_ascii=False)+"\n").encode())
            os.replace(tmp,target)
        finally:
            if os.path.exists(tmp): os.unlink(tmp)
        written += len(incoming)
    # Retention is applied only to our generated partition files.
    for world in WORLDS:
        folder=PUBLISHED/world
        if folder.exists():
            for path in folder.glob("????-??-??.jsonl.gz"):
                if path.stem.split(".")[0] < cutoff: path.unlink()
    partitions=[]
    total=0
    for world in sorted(WORLDS):
        for path in sorted((PUBLISHED/world).glob("????-??-??.jsonl.gz")) if (PUBLISHED/world).exists() else []:
            size=path.stat().st_size; total+=size
            partitions.append({"world_id":world,"path":path.relative_to(ROOT).as_posix(),"bytes":size,
                               "sha256":hashlib.sha256(path.read_bytes()).hexdigest()})
    if total > MAX_PUBLISHED_BYTES:
        fail(f"Published data is {total} bytes; safety ceiling is {MAX_PUBLISHED_BYTES}. No further publishing.")
    manifest={"schema_version":1,"generated_at":now.isoformat(),"retention_days":RETENTION_DAYS,
              "storage_bytes":total,"storage_limit_bytes":MAX_PUBLISHED_BYTES,
              "staged_sources":source_files,"partitions":partitions,
              "records_added_or_refreshed":written,
              "note":"Only explicitly staged CSV data is included; no network/API calls are made."}
    (PUBLISHED/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"records_added_or_refreshed":written,"partitions":len(partitions),
                      "storage_bytes":total,"staged_csv_files":len(source_files)},indent=2))

if __name__=="__main__":
    try: main()
    except Exception as exc:
        print(f"COLLECTION FAILED: {exc}",file=sys.stderr); sys.exit(1)
