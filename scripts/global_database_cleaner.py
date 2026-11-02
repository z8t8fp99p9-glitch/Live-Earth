#!/usr/bin/env python3
"""LIVE // EARTH — Global Database Cleaner.

==========================================================================
IMPORTANT MAINTENANCE NOTE — READ BEFORE EDITING THIS FILE
==========================================================================

This cleaner is intentionally INTERNAL and intentionally STATIC.
It is not an app feature, is not exposed to visitors, and does not discover
folders or databases dynamically.

CURRENT SCOPE — EXACTLY TWO VIEWS, THREE PRIMARY PATHS EACH

NATURE
  1. Permanent SQLite database:
     .publisher-data/nature/nature.sqlite3
  2. Temporary source-media working cache:
     .publisher-data/nature/media/
  3. Permanent published output:
     nature/published/

ALIEN WORLD
  1. Permanent SQLite database:
     .publisher-data/alien-world/alien-world.sqlite3
  2. Temporary source-media working cache:
     .publisher-data/alien-world/media/
  3. Permanent published output:
     alien-world/published/

The workflow separately removes only the matching Actions cache keys:
  Nature:     nature-db-v1-*
  Alien World: alien-world-db-v1-*

WHAT A RESET DOES
  • Backs up the three selected path targets before deletion.
  • Removes the SQLite database and its SQLite sidecar files.
  • Removes the selected view's media working cache.
  • Removes the selected view's published feed and asset files.
  • Preserves README.md instruction files in published folders.
  • Does not touch the other view, app code, shared engines, source
    configuration, Home, Moon View, Sun View, local browser storage, or
    any other database/cache prefix.

TEMPORARY IMAGE-ENGINE STAGING
  Nature's Publisher creates a fresh OS temporary directory named with
  the prefix "nature-live-feed-" and removes it in its own finally block.
  That directory is runner-local, is not part of the persistent Actions
  cache, and does not survive the publisher job. Persistent prepared source
  media is the explicit media/ path listed above.

HOW TO ADD A FUTURE VIEW — MANUAL CODE CHANGE ONLY
  1. Add one explicit entry to TARGETS below with exactly three paths:
       database, temporary, published.
  2. Add its exact Actions cache-key prefix to the workflow's cache-deletion
     mapping and add a cache restore step for that view.
  3. Add its workflow filename to the workflow-quiesce mapping so its
     collector/publisher cannot run during its reset.
  4. Add its exact publisher workflow path to the workflow commit mapping.
  5. Add or update tests and review the resulting diff before upload.

Do NOT add automatic path discovery, globs that cross view boundaries,
shared database registries, or a generic recursive delete of .publisher-data.
Every future view must be added explicitly in both this script and the YAML.
==========================================================================
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class ViewTargets:
    # Exactly three primary paths per view. Keep these explicit and separate.
    database: str
    temporary: str
    published: str
    cache_prefix: str


# ======================================================================
# ADD FUTURE VIEWS HERE — MANUAL ONLY.
# Do not replace this with dynamic discovery or a directory registry.
# Each view must define exactly one database file, one temp-media folder,
# one published-output folder, and its unique Actions cache prefix.
# Remember to also add the same view to the workflow YAML mappings.
# ======================================================================
TARGETS: dict[str, ViewTargets] = {
    "nature": ViewTargets(
        database=".publisher-data/nature/nature.sqlite3",
        temporary=".publisher-data/nature/media",
        published="nature/published",
        cache_prefix="nature-db-v1-",
    ),
    "alien-world": ViewTargets(
        database=".publisher-data/alien-world/alien-world.sqlite3",
        temporary=".publisher-data/alien-world/media",
        published="alien-world/published",
        cache_prefix="alien-world-db-v1-",
    ),
}

SIDECAR_SUFFIXES = ("-wal", "-shm", "-journal")
PRESERVED_README_NAMES = {"README.md"}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def target_names(selection: str) -> list[str]:
    if selection == "both":
        return ["nature", "alien-world"]
    if selection not in TARGETS:
        raise ValueError(f"Unknown target: {selection}")
    return [selection]


def repo_path(relative: str) -> Path:
    """Resolve one hard-coded repository-relative path without following links."""
    raw = Path(relative)
    if raw.is_absolute() or ".." in raw.parts:
        raise RuntimeError(f"Unsafe hard-coded path: {relative}")
    candidate = ROOT.joinpath(raw)
    # Every existing ancestor is checked so we never traverse a symlink.
    current = ROOT
    for part in raw.parts:
        current = current / part
        if current.is_symlink():
            raise RuntimeError(f"Refusing to follow symbolic link: {relative}")
    resolved_parent = candidate.parent.resolve()
    if resolved_parent != ROOT and ROOT not in resolved_parent.parents:
        raise RuntimeError(f"Path escapes repository root: {relative}")
    return candidate


def iter_regular_files(path: Path) -> Iterable[Path]:
    if path.is_symlink():
        raise RuntimeError(f"Refusing symbolic link: {path}")
    if path.is_file():
        yield path
    elif path.is_dir():
        for item in sorted(path.rglob("*")):
            if item.is_symlink():
                raise RuntimeError(f"Refusing symbolic link inside target: {item}")
            if item.is_file():
                yield item


def collect_backup_files(view: str) -> list[tuple[Path, str]]:
    spec = TARGETS[view]
    selected: list[tuple[Path, str]] = []

    # 1) Database file plus SQLite's adjacent WAL/SHM/journal sidecars.
    db = repo_path(spec.database)
    database_candidates = [db] + [Path(str(db) + suffix) for suffix in SIDECAR_SUFFIXES]
    for candidate in database_candidates:
        if candidate.is_symlink():
            raise RuntimeError(f"Refusing symbolic link: {candidate}")
        if candidate.is_file():
            selected.append((candidate, candidate.relative_to(ROOT).as_posix()))
        elif candidate.exists():
            raise RuntimeError(f"Expected a database file, found a non-file: {candidate}")

    # 2) Temporary prepared-media working cache.
    media = repo_path(spec.temporary)
    if media.exists():
        if not media.is_dir():
            raise RuntimeError(f"Expected a temporary media folder: {media}")
        for item in iter_regular_files(media):
            selected.append((item, item.relative_to(ROOT).as_posix()))

    # 3) Entire published output is included in the backup, README files too.
    published = repo_path(spec.published)
    if published.exists():
        if not published.is_dir():
            raise RuntimeError(f"Expected a published-output folder: {published}")
        for item in iter_regular_files(published):
            selected.append((item, item.relative_to(ROOT).as_posix()))

    # De-duplicate paths while preserving their first occurrence.
    unique: dict[str, tuple[Path, str]] = {}
    for item in selected:
        unique[item[1]] = item
    return [unique[name] for name in sorted(unique)]


def create_backup(selection: str, archive_path: Path) -> dict:
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    names = target_names(selection)
    manifest = {
        "tool": "LIVE // EARTH Global Database Cleaner",
        "createdAt": utc_now(),
        "target": selection,
        "views": {},
        "note": "Backup is created before any cleanup. It contains only the selected views' three explicit path targets.",
    }

    # Build in a temporary .part file; only publish the archive after it closes.
    partial = archive_path.with_suffix(archive_path.suffix + ".part")
    partial.unlink(missing_ok=True)
    try:
        with zipfile.ZipFile(partial, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=3) as zf:
            for view in names:
                files = collect_backup_files(view)
                records = []
                for source, relative in files:
                    digest = hashlib.sha256()
                    size = 0
                    with source.open("rb") as stream:
                        # Stream into ZIP and hash in bounded chunks.
                        info = zipfile.ZipInfo(relative)
                        info.compress_type = zipfile.ZIP_DEFLATED
                        with zf.open(info, "w") as destination:
                            while True:
                                chunk = stream.read(1024 * 1024)
                                if not chunk:
                                    break
                                destination.write(chunk)
                                digest.update(chunk)
                                size += len(chunk)
                    records.append({"path": relative, "size": size, "sha256": digest.hexdigest()})
                manifest["views"][view] = {
                    "databasePath": TARGETS[view].database,
                    "temporaryPath": TARGETS[view].temporary,
                    "publishedPath": TARGETS[view].published,
                    "files": records,
                    "fileCount": len(records),
                    "bytes": sum(item["size"] for item in records),
                    "cachePrefixToDelete": TARGETS[view].cache_prefix,
                }
            zf.writestr("BACKUP_MANIFEST.json", json.dumps(manifest, indent=2) + "\n")
        partial.replace(archive_path)
    except Exception:
        partial.unlink(missing_ok=True)
        raise

    return manifest


def count_tree(path: Path) -> tuple[int, int]:
    if not path.exists():
        return 0, 0
    files = list(iter_regular_files(path))
    return len(files), sum(item.stat().st_size for item in files)


def remove_file(path: Path, removed: list[dict]) -> None:
    if path.is_symlink():
        raise RuntimeError(f"Refusing symbolic link: {path}")
    if not path.exists():
        return
    if not path.is_file():
        raise RuntimeError(f"Refusing to unlink non-file: {path}")
    size = path.stat().st_size
    name = path.relative_to(ROOT).as_posix()
    path.unlink()
    removed.append({"path": name, "bytes": size})


def clear_directory_contents(path: Path, removed: list[dict], preserve_readmes: bool) -> None:
    if not path.exists():
        return
    if path.is_symlink() or not path.is_dir():
        raise RuntimeError(f"Refusing unsafe directory target: {path}")
    for child in sorted(path.iterdir()):
        if child.is_symlink():
            raise RuntimeError(f"Refusing symbolic link inside target: {child}")
        if preserve_readmes and child.is_file() and child.name in PRESERVED_README_NAMES:
            continue
        if child.is_dir():
            # The assets/ README is a small operational placeholder, not a
            # published asset. Keep it while deleting every feed/image file.
            if child.name == "assets":
                clear_directory_contents(child, removed, preserve_readmes=True)
            else:
                for file_path in iter_regular_files(child):
                    removed.append({"path": file_path.relative_to(ROOT).as_posix(), "bytes": file_path.stat().st_size})
                shutil.rmtree(child)
        elif child.is_file():
            remove_file(child, removed)
        else:
            raise RuntimeError(f"Refusing special filesystem entry: {child}")


def clear_view(view: str) -> dict:
    spec = TARGETS[view]
    removed: list[dict] = []

    # 1) Permanent DB + SQLite sidecars. Parent folder is NOT removed.
    db = repo_path(spec.database)
    remove_file(db, removed)
    for suffix in SIDECAR_SUFFIXES:
        remove_file(Path(str(db) + suffix), removed)

    # 2) Temporary media working cache. Only this view's media/ is removed.
    media = repo_path(spec.temporary)
    if media.exists():
        if media.is_symlink() or not media.is_dir():
            raise RuntimeError(f"Refusing unsafe media path: {media}")
        for file_path in iter_regular_files(media):
            removed.append({"path": file_path.relative_to(ROOT).as_posix(), "bytes": file_path.stat().st_size})
        shutil.rmtree(media)

    # 3) Permanent published output. Delete feed and all assets/data, while
    # retaining README.md instructions (not story/feed/image data).
    published = repo_path(spec.published)
    clear_directory_contents(published, removed, preserve_readmes=True)

    return {
        "view": view,
        "databasePath": spec.database,
        "temporaryPath": spec.temporary,
        "publishedPath": spec.published,
        "removedFileCount": len(removed),
        "removedBytes": sum(item["bytes"] for item in removed),
        "removedFiles": removed,
        "cachePrefixToDelete": spec.cache_prefix,
    }


def write_report(report_path: Path | None, report: dict) -> None:
    if report_path is None:
        print(json.dumps(report, indent=2))
        return
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser(description="Internal LIVE // EARTH full-reset cleaner")
    sub = parser.add_subparsers(dest="command", required=True)

    backup_parser = sub.add_parser("backup", help="Back up selected view paths before deletion")
    backup_parser.add_argument("--target", choices=["nature", "alien-world", "both"], required=True)
    backup_parser.add_argument("--archive", type=Path, required=True)

    clear_parser = sub.add_parser("clear", help="Clear only selected view paths")
    clear_parser.add_argument("--target", choices=["nature", "alien-world", "both"], required=True)
    clear_parser.add_argument("--report", type=Path, required=True)

    args = parser.parse_args()
    try:
        if args.command == "backup":
            result = create_backup(args.target, args.archive)
            total_files = sum(view["fileCount"] for view in result["views"].values())
            total_bytes = sum(view["bytes"] for view in result["views"].values())
            print(f"Backup ready: {args.archive} ({total_files} files, {total_bytes} bytes)")
        elif args.command == "clear":
            names = target_names(args.target)
            results = [clear_view(view) for view in names]
            report = {
                "tool": "LIVE // EARTH Global Database Cleaner",
                "completedAt": utc_now(),
                "target": args.target,
                "status": "filesystem-cleaned-cache-removal-pending",
                "views": results,
                "totalRemovedFiles": sum(item["removedFileCount"] for item in results),
                "totalRemovedBytes": sum(item["removedBytes"] for item in results),
                "nextStep": "The workflow must delete only each selected view's matching GitHub Actions cache prefix before re-enabling its publisher workflow.",
            }
            write_report(args.report, report)
        return 0
    except Exception as exc:  # Fail closed; the workflow must not continue to cache deletion on error.
        print(f"CLEANER ERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
