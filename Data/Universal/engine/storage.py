from __future__ import annotations
import hashlib,json
from pathlib import Path
from datetime import datetime,timezone
from .validation import validate_observation
ROOT=Path(__file__).resolve().parents[2]/"Central-Database"
def _safe(value):
    if not value or any(p in (".","..") for p in value.split("/")) or "\\" in value:raise ValueError(f"Unsafe storage key: {value!r}")
    return value
def store_raw(dataset_id,retrieval_id,payload,metadata):
    dataset_id,retrieval_id=_safe(dataset_id),_safe(retrieval_id)
    digest=hashlib.sha256(payload).hexdigest(); folder=ROOT/"raw"/dataset_id/retrieval_id; folder.mkdir(parents=True,exist_ok=True)
    target=folder/"source.bin"
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()!=digest:raise FileExistsError("Raw retrieval is immutable")
    if not target.exists():target.write_bytes(payload)
    meta=dict(metadata,raw_sha256=digest,raw_bytes=len(payload),retrieval_id=retrieval_id)
    (folder/"metadata.json").write_text(json.dumps(meta,indent=2)+"\n",encoding="utf-8")
    return digest
def store_normalized(dataset_id,retrieval_id,observations):
    dataset_id,retrieval_id=_safe(dataset_id),_safe(retrieval_id)
    rows=[validate_observation(row) for row in observations]
    if not rows:raise ValueError("Refusing to publish an empty normalized batch")
    grouped={}
    for row in rows:
        if row["dataset_id"]!=dataset_id:raise ValueError("Observation dataset_id does not match partition")
        day=row["observed_at"][:10]; grouped.setdefault(day,[]).append(row)
    written=[]
    for day,items in sorted(grouped.items()):
        folder=ROOT/"normalized"/dataset_id/day; folder.mkdir(parents=True,exist_ok=True)
        target=folder/f"{retrieval_id}.jsonl"
        payload="".join(json.dumps(r,separators=(",",":"),sort_keys=True)+"\n" for r in items)
        if target.exists() and target.read_text(encoding="utf-8")!=payload:raise FileExistsError("Normalized retrieval collision")
        target.write_text(payload,encoding="utf-8"); written.append(str(target.relative_to(ROOT)))
    return written
def cleanup_dataset_storage(dataset_id, keep_retrieval_id):
    """Keep only the successfully stored retrieval for one Universal dataset.

    The caller must invoke this only after raw storage, normalized storage,
    and any applicable publication step have completed successfully.
    """
    dataset_id = _safe(dataset_id)
    keep_retrieval_id = _safe(keep_retrieval_id)

    raw_dataset = ROOT / "raw" / dataset_id
    normalized_dataset = ROOT / "normalized" / dataset_id
    current_raw = raw_dataset / keep_retrieval_id

    # Preflight the replacement before deleting anything. A partial or
    # incomplete new retrieval must never cause the previous snapshot to go.
    if not (current_raw / "source.bin").is_file():
        raise FileNotFoundError(
            f"Latest raw payload is missing for {dataset_id}/{keep_retrieval_id}"
        )
    if not (current_raw / "metadata.json").is_file():
        raise FileNotFoundError(
            f"Latest raw metadata is missing for {dataset_id}/{keep_retrieval_id}"
        )

    current_normalized = (
        list(normalized_dataset.glob(f"*/{keep_retrieval_id}.jsonl"))
        if normalized_dataset.exists()
        else []
    )
    if not current_normalized:
        raise FileNotFoundError(
            f"Latest normalized payload is missing for {dataset_id}/{keep_retrieval_id}"
        )

    # Replacement is complete. Remove only older snapshots belonging to this
    # dataset; other dataset IDs and all collection configuration stay intact.
    import shutil

    if raw_dataset.exists():
        for retrieval_folder in raw_dataset.iterdir():
            if retrieval_folder.is_dir() and retrieval_folder.name != keep_retrieval_id:
                shutil.rmtree(retrieval_folder)

    if normalized_dataset.exists():
        for normalized_file in normalized_dataset.rglob("*.jsonl"):
            if normalized_file.stem != keep_retrieval_id:
                normalized_file.unlink()

        # Remove empty date partitions left behind by deleted snapshots.
        for directory in sorted(
            (path for path in normalized_dataset.rglob("*") if path.is_dir()),
            key=lambda path: len(path.parts),
            reverse=True,
        ):
            if not any(directory.iterdir()):
                directory.rmdir()


def write_run(retrieval_id,result):
    retrieval_id=_safe(retrieval_id); folder=ROOT/"runs"; folder.mkdir(parents=True,exist_ok=True)
    result=dict(result,retrieval_id=retrieval_id,recorded_at=datetime.now(timezone.utc).isoformat())
    (folder/f"{retrieval_id}.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
