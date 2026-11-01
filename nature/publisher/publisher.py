#!/usr/bin/env python3
"""Nature Publisher: database-only, read-only, no external source networking."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sqlite3
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
PROFILE_PATH = Path(__file__).with_name("profile.json")
DB_PATH = ROOT / ".publisher-data" / "nature" / "nature.sqlite3"
OUTPUT_DIR = ROOT / "nature" / "published"
ENGINE_DIR = ROOT / "editorial-engine"
IMAGE_STATUS = "nature-commons-filepage-verified"
RAW_ROOT = "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/nature/published/"

def load_profile():
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    if profile.get("schemaVersion") != 1 or profile.get("viewId") != "nature":
        raise RuntimeError("Nature Publisher profile identity check failed.")
    if profile.get("publisherId") != "nature-publisher":
        raise RuntimeError("Nature Publisher identifier is not registered.")
    return profile

def open_readonly():
    if not DB_PATH.is_file():
        raise RuntimeError("Nature Collector database is missing. Run the Collector first.")
    uri = "file:" + quote(DB_PATH.as_posix(), safe="/:") + "?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA query_only=ON")
    return con

def run_tests():
    test_dir = ROOT / "nature" / "tests"
    result = __import__("subprocess").run(
        [sys.executable, "-m", "unittest", "discover", "-s", str(test_dir), "-p", "test_*.py", "-v"],
        cwd=ROOT, check=False
    )
    if result.returncode:
        raise RuntimeError("Nature contract tests failed; the last-good issue was not changed.")

def atomic_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".pending")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)

def current_month_window(now: datetime):
    end = now.astimezone(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # Previous completed UTC month is calculated by the shared Engine. This
    # function supplies an independent release-gate assertion.
    if end.month == 1:
        start = end.replace(year=end.year - 1, month=12)
    else:
        start = end.replace(month=end.month - 1)
    return start, end


def select_engine_story_rows(rows, verified_images, maximum_stories: int):
    """Retain Nature's verified photo stories in the Engine's limited sample.

    The shared Engine ordinarily takes only the newest N stories. Nature's
    Commons-screened photographs can belong to slightly older stories in the
    same completed month, so a recency-only cut can drop every image even when
    the Collector has attached them. Select verified-image stories first,
    fill remaining slots by recency, then restore chronological order. This
    adapter is Nature-only; the shared Engine and other views stay unchanged.
    """
    rows = list(rows)
    preferred = []
    for row in rows:
        record = verified_images.get(str(row["story_id"]))
        if not record:
            continue
        local_path = str(row["image_local_path"] or "")
        if (
            row["image_rights_status"] == IMAGE_STATUS
            and local_path == str(record["local_path"])
            and str(row["image_url"] or "") == str(record["image_url"])
            and str(row["image_credit"] or "") == str(record["credit"])
            and str(row["image_source_url"] or "") == str(record["source_page"])
            and bool(str(row["image_rights_note"] or "").strip())
            and bool(local_path)
            and (ROOT / local_path).is_file()
        ):
            preferred.append(row)
    selected = preferred[:maximum_stories]
    selected_ids = {str(row["story_id"]) for row in selected}
    for row in rows:
        if len(selected) >= maximum_stories:
            break
        story_id = str(row["story_id"])
        if story_id not in selected_ids:
            selected.append(row)
            selected_ids.add(story_id)
    selected.sort(key=lambda row: float(row["published_at"] or 0), reverse=True)
    return selected


class _BufferedRows:
    """Minimal cursor facade for the Engine's existing fetchall() call."""
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class NatureEngineReadOnlyConnection:
    """Read-only DB adapter that keeps approved Nature images in the Engine sample."""
    def __init__(self, connection, verified_images, maximum_stories):
        self._connection = connection
        self._verified_images = verified_images
        self._maximum_stories = maximum_stories
        self.story_selection_applied = False
        self.selected_documentary_images = 0

    def execute(self, sql, parameters=()):
        cursor = self._connection.execute(sql, parameters)
        normalized = " ".join(str(sql).lower().split())
        if "from stories where published_at" not in normalized:
            return cursor
        rows = cursor.fetchall()
        selected = select_engine_story_rows(rows, self._verified_images, self._maximum_stories)
        self.story_selection_applied = True
        self.selected_documentary_images = sum(
            1 for row in selected
            if str(row["story_id"]) in self._verified_images
            and row["image_rights_status"] == IMAGE_STATUS
            and str(row["image_local_path"] or "") == str(self._verified_images[str(row["story_id"])]["local_path"])
            and str(row["image_url"] or "") == str(self._verified_images[str(row["story_id"])]["image_url"])
            and str(row["image_credit"] or "") == str(self._verified_images[str(row["story_id"])]["credit"])
            and str(row["image_source_url"] or "") == str(self._verified_images[str(row["story_id"])]["source_page"])
            and bool(str(row["image_rights_note"] or "").strip())
            and bool(str(row["image_local_path"] or ""))
            and (ROOT / str(row["image_local_path"])).is_file()
        )
        return _BufferedRows(selected)


def publish(now: datetime | None = None):
    os.chdir(ROOT)
    now = now or datetime.now(timezone.utc)
    now = now.astimezone(timezone.utc)
    profile = load_profile()
    run_tests()
    con = open_readonly()
    stage_parent = Path(tempfile.mkdtemp(prefix="nature-publication-"))
    stage = stage_parent / "output"
    stage.mkdir(parents=True)
    try:
        meta = con.execute("SELECT value FROM publisher_meta WHERE key='view_id'").fetchone()
        if not meta or meta["value"] != "nature":
            raise RuntimeError("Refusing to publish from a database not owned by Nature.")
        start, end = current_month_window(now)
        rows = con.execute("""
            SELECT story_id, image_rights_status, image_local_path, image_credit,
                   image_source_url, image_rights_note
            FROM stories
            WHERE view_id='nature' AND published_at>=? AND published_at<?
            ORDER BY published_at DESC
        """, (start.timestamp(), end.timestamp())).fetchall()
        story_count = len(rows)
        min_stories = int(profile["publication"]["minimumStories"])
        if story_count < min_stories:
            raise RuntimeError(f"Only {story_count} stories are eligible for the completed month; {min_stories} are required.")
        verified = con.execute("""
            SELECT r.story_id,r.file_title,r.source_page,r.creator,r.credit,r.license_name,
                   r.license_url,r.caption,r.usage_note,r.modification_note,r.local_path,
                   r.public_path,r.image_url,r.rights_status
            FROM nature_image_rights r
            JOIN stories s ON s.story_id=r.story_id
            WHERE s.view_id='nature' AND s.published_at>=? AND s.published_at<?
              AND r.rights_status=? AND r.creator<>'' AND r.credit<>''
              AND r.license_url<>'' AND r.source_page LIKE 'https://commons.wikimedia.org/wiki/File:%'
              AND r.local_path<>'' AND r.image_url LIKE 'https://raw.githubusercontent.com/%'
        """, (start.timestamp(), end.timestamp(), IMAGE_STATUS)).fetchall()
        verified = [dict(r) for r in verified if (ROOT / r["local_path"]).is_file()]
        min_images = int(profile["publication"].get(
            "minimumDocumentaryImages",
            profile["imagePolicy"].get("minimumDocumentaryImages", 4)
        ))
        if len(verified) < min_images:
            raise RuntimeError(
                f"Only {len(verified)} source-page-verified documentary photographs are eligible; "
                f"{min_images} are required. Last-good Nature issue preserved."
            )
        # The Engine is global and unchanged. Its current generic image-status
        # sentinel is NASA-named; set a Nature-specific value in this process only.
        sys.path.insert(0, str(ENGINE_DIR))
        import universal_editorial_engine as engine
        engine.VALID_IMAGE_STATUS = IMAGE_STATUS
        command = {
            "commandId": hashlib.sha256(f"nature:{now.isoformat()}".encode()).hexdigest()[:24],
            "viewId": "nature",
            "publisherId": "nature-publisher",
            "issuedAt": now.isoformat(),
            "mode": "all",
            "customRequest": profile["editorialProfile"]["defaultCustomRequest"]
        }
        rights_by_story = {r["story_id"]: r for r in verified}
        maximum_stories = max(2, min(12, int(profile["publication"].get("maximumStories", 8))))
        engine_db = NatureEngineReadOnlyConnection(con, rights_by_story, maximum_stories)
        result = engine.run_engine(engine_db, profile, command, stage, now)
        if not engine_db.story_selection_applied:
            raise RuntimeError("Shared Engine did not use Nature's verified-image selection boundary.")
        if engine_db.selected_documentary_images < min_images:
            raise RuntimeError(
                f"Only {engine_db.selected_documentary_images} verified documentary image stories "
                f"fit the Engine selection; {min_images} are required. Last-good Nature issue preserved."
            )
        if result.get("viewId") != "nature" or result.get("windowMode") != "calendar-month":
            raise RuntimeError("Shared Engine returned the wrong Nature publication contract.")
        if result.get("coverageStart") != start.isoformat().replace("+00:00", "Z"):
            raise RuntimeError("Engine coverage start differs from the previous UTC calendar month.")
        if result.get("coverageEnd") != end.isoformat().replace("+00:00", "Z"):
            raise RuntimeError("Engine coverage end differs from the previous UTC calendar month.")
        feed = result["feed"]
        for story in feed.get("stories", []):
            record = rights_by_story.get(story["id"])
            if record and story.get("imageUrl"):
                story["imageCaption"] = record["caption"]
                story["imageLicense"] = record["license_name"]
                story["imageLicenseUrl"] = record["license_url"]
                story["imageRightsNote"] = record["usage_note"]
                story["imageSourceUrl"] = record["source_page"]
            else:
                story["imageUrl"] = None
                story["imageCredit"] = None
                story["imageCaption"] = None
        feed["documentaryImageCount"] = sum(1 for s in feed["stories"] if s.get("imageUrl"))
        if feed["documentaryImageCount"] < min_images:
            raise RuntimeError("The Engine feed did not retain the minimum number of fully credited images.")
        magazine = result["magazine"]
        pdf_source = stage / magazine["relativePath"]
        if not pdf_source.is_file() or pdf_source.stat().st_size < 12000:
            raise RuntimeError("Shared Engine PDF failed file-size validation.")
        with pdf_source.open("rb") as stream:
            reader = PdfReader(stream, strict=True)
            pages = len(reader.pages)
            if pages != int(magazine["pages"]) or pages < 1:
                raise RuntimeError("Shared Engine PDF page-count validation failed.")
        pdf_hash = hashlib.sha256(pdf_source.read_bytes()).hexdigest()
        if pdf_hash != magazine["sha256"]:
            raise RuntimeError("Shared Engine PDF SHA-256 differs from the Engine receipt.")
        issue_id = magazine["issueId"]
        if issue_id != "nature-" + start.strftime("%Y%m"):
            raise RuntimeError("Nature issue ID does not match the covered month.")
        # A single current public PDF is emitted. Stage every public asset before
        # touching current files. GitHub publishes the staged tree in one commit.
        issue_asset_dir = stage / "assets"
        issue_asset_dir.mkdir(parents=True, exist_ok=True)
        used_assets = []
        for story in feed["stories"]:
            record = rights_by_story.get(story["id"])
            if not (record and story.get("imageUrl")):
                continue
            source = ROOT / record["local_path"]
            target = issue_asset_dir / Path(record["public_path"]).name
            if not source.is_file():
                raise RuntimeError(f"Prepared Nature image is missing: {source.name}")
            shutil.copy2(source, target)
            if hashlib.sha256(source.read_bytes()).digest() != hashlib.sha256(target.read_bytes()).digest():
                raise RuntimeError("Prepared Nature image changed during staging.")
            used_assets.append({
                "storyId": story["id"], "fileTitle": record["file_title"],
                "sourcePage": record["source_page"], "creator": record["creator"],
                "credit": record["credit"], "license": record["license_name"],
                "licenseUrl": record["license_url"], "caption": record["caption"],
                "usageNote": record["usage_note"], "modificationNote": record["modification_note"],
                "file": "assets/" + target.name
            })
            story["imageUrl"] = RAW_ROOT + "assets/" + target.name
        cover_story = next((s for s in feed["stories"] if s.get("imageUrl")), None)
        issue_record = {
            "issueId": issue_id,
            "title": magazine["title"],
            "publishedAt": result["generatedAt"],
            "coverageStart": result["coverageStart"],
            "coverageEnd": result["coverageEnd"],
            "windowHours": result["windowHours"],
            "pdfUrl": RAW_ROOT + "current.pdf",
            "pages": pages,
            "bytes": pdf_source.stat().st_size,
            "sha256": pdf_hash,
            "storyCount": result["eligibleStoryCount"],
            "documentaryImageCount": feed["documentaryImageCount"],
            "coverImageUrl": cover_story["imageUrl"] if cover_story else None,
            "coverImageCredit": cover_story["imageCredit"] if cover_story else None,
            "coverImageCaption": cover_story["imageCaption"] if cover_story else None
        }
        catalog = {
            "schemaVersion": 1, "viewId": "nature", "publisherId": "nature-publisher",
            "generatedAt": result["generatedAt"], "coverageStart": result["coverageStart"],
            "coverageEnd": result["coverageEnd"], "windowMode": "calendar-month",
            "latest": issue_record, "issues": [issue_record]
        }
        rights_manifest = {
            "schemaVersion": 1, "viewId": "nature", "issueId": issue_id,
            "generatedAt": result["generatedAt"], "images": used_assets
        }
        # Prepare the one stable PDF path; engine PDF remains in staging until
        # the complete issue has passed every check.
        out_stage = stage_parent / "public"
        (out_stage / "assets").mkdir(parents=True)
        shutil.copy2(pdf_source, out_stage / "current.pdf")
        for item in issue_asset_dir.iterdir():
            shutil.copy2(item, out_stage / "assets" / item.name)
        atomic_json(out_stage / "live-feed.json", feed)
        atomic_json(out_stage / "catalog.json", catalog)
        atomic_json(out_stage / "assets" / "image-rights.json", rights_manifest)
        # Final output switch. A GitHub Actions commit captures this completed tree.
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        temp_pdf = OUTPUT_DIR / "current.pdf.pending"
        shutil.copy2(out_stage / "current.pdf", temp_pdf)
        if hashlib.sha256(temp_pdf.read_bytes()).hexdigest() != pdf_hash:
            raise RuntimeError("Staged public PDF hash validation failed.")
        temp_pdf.replace(OUTPUT_DIR / "current.pdf")
        for name in ("live-feed.json", "catalog.json"):
            temp = OUTPUT_DIR / (name + ".pending")
            shutil.copy2(out_stage / name, temp)
            temp.replace(OUTPUT_DIR / name)
        public_assets = OUTPUT_DIR / "assets"
        backup_assets = OUTPUT_DIR / "assets.previous"
        if backup_assets.exists():
            shutil.rmtree(backup_assets)
        if public_assets.exists():
            public_assets.replace(backup_assets)
        (out_stage / "assets").replace(public_assets)
        if backup_assets.exists():
            shutil.rmtree(backup_assets)
        # Public Nature magazines are deliberately not archived; old PDFs saved
        # in the shared Reader's IndexedDB are outside this repository directory.
        for old in OUTPUT_DIR.glob("nature-*.pdf"):
            old.unlink(missing_ok=True)
        print(json.dumps({
            "status": "published", "viewId": "nature", "issueId": issue_id,
            "coverageStart": result["coverageStart"], "coverageEnd": result["coverageEnd"],
            "stories": result["eligibleStoryCount"], "documentaryImages": feed["documentaryImageCount"],
            "pages": pages, "bytes": magazine["bytes"], "sha256": pdf_hash,
            "publicFiles": ["nature/published/current.pdf", "nature/published/live-feed.json",
                            "nature/published/catalog.json", "nature/published/assets/"]
        }, ensure_ascii=False, indent=2))
        return 0
    finally:
        con.close()
        shutil.rmtree(stage_parent, ignore_errors=True)

def atomic_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".pending")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("all", "magazine"), default="all")
    args = parser.parse_args()
    try:
        raise SystemExit(publish())
    except Exception as exc:
        print(json.dumps({"status":"skipped", "error":str(exc), "preservedLastGood":True},
                         ensure_ascii=False, indent=2), file=sys.stderr)
        raise SystemExit(2)
