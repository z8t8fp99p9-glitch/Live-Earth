#!/usr/bin/env python3
"""Build the Nature monthly test edition using the production Universal Editorial Engine."""
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "editorial-engine"))
import universal_editorial_engine as engine

PROFILE = json.loads((ROOT / "tests/nature-monthly/profile.json").read_text(encoding="utf-8"))
FIXTURE = json.loads((ROOT / "tests/nature-monthly/stories.json").read_text(encoding="utf-8"))
NOW = datetime.fromisoformat(FIXTURE["generatedAt"].replace("Z", "+00:00")).astimezone(timezone.utc)

connection = sqlite3.connect(":memory:")
connection.row_factory = sqlite3.Row
connection.execute("CREATE TABLE publisher_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)")
connection.execute("INSERT INTO publisher_meta VALUES('view_id', 'nature')")
connection.execute("""CREATE TABLE stories(
    story_id TEXT PRIMARY KEY, title TEXT NOT NULL, url TEXT NOT NULL, summary TEXT NOT NULL,
    source_name TEXT NOT NULL, source_url TEXT NOT NULL, published_at REAL NOT NULL,
    retrieved_at REAL NOT NULL, image_url TEXT, image_local_path TEXT, image_caption TEXT,
    image_credit TEXT, image_source_url TEXT, image_rights_status TEXT,
    image_rights_note TEXT, view_id TEXT NOT NULL
)""")
for story in FIXTURE["stories"]:
    published = datetime.fromisoformat(story["publishedAt"].replace("Z", "+00:00"))
    connection.execute(
        "INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (story["id"], story["title"], story["url"], story["summary"], story["sourceName"],
         story["sourceUrl"], published.timestamp(), NOW.timestamp(), None, None, None, None,
         None, None, story["rightsNote"], "nature")
    )
connection.commit()
command = {
    "commandId": "nature-monthly-local-test",
    "viewId": "nature",
    "publisherId": "nature-publisher",
    "issuedAt": NOW.isoformat(),
    "mode": "all",
    "customRequest": PROFILE["editorialProfile"]["defaultCustomRequest"]
}
OUTPUT = ROOT / "published" / "nature"
result = engine.run_engine(connection, PROFILE, command, OUTPUT, NOW)
connection.close()
assert result["windowMode"] == "calendar-month", result
assert result["coverageStart"] == "2026-10-01T00:00:00Z", result
assert result["coverageEnd"] == "2026-11-01T00:00:00Z", result
assert result["eligibleStoryCount"] == 8, result
assert result["magazine"]["issueId"] == "nature-202610", result

(OUTPUT / "live-feed.json").write_text(json.dumps(result["feed"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
magazine = result["magazine"]
issue = {
    "issueId": result["magazine"]["issueId"],
    "title": magazine["title"],
    "publishedAt": result["generatedAt"],
    "coverageStart": result["coverageStart"],
    "coverageEnd": result["coverageEnd"],
    "windowHours": result["windowHours"],
    "pdfUrl": "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/published/nature/" + magazine["relativePath"],
    "pages": magazine["pages"],
    "bytes": magazine["bytes"],
    "sha256": magazine["sha256"],
    "storyCount": result["eligibleStoryCount"],
    "customRequest": magazine.get("customRequest", ""),
    "customRequestReceipt": magazine.get("customRequestReceipt", {})
}
catalog = {
    "schemaVersion": 1,
    "viewId": "nature",
    "publisherId": "nature-publisher",
    "generatedAt": result["generatedAt"],
    "coverageStart": result["coverageStart"],
    "coverageEnd": result["coverageEnd"],
    "windowMode": result["windowMode"],
    "issues": [issue]
}
(OUTPUT / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
# Keep a concise, portable build record next to the fixture; do not expose
# temporary container paths or internal SQLite handles in the test package.
build_record = {
    "engineVersion": result["engineVersion"],
    "viewId": result["viewId"],
    "publisherId": result["publisherId"],
    "generatedAt": result["generatedAt"],
    "windowMode": result["windowMode"],
    "windowLabel": result["windowLabel"],
    "coverageStart": result["coverageStart"],
    "coverageEnd": result["coverageEnd"],
    "windowHours": result["windowHours"],
    "eligibleStoryCount": result["eligibleStoryCount"],
    "magazine": {
        "issueId": magazine["issueId"],
        "title": magazine["title"],
        "path": "published/nature/" + magazine["relativePath"],
        "pages": magazine["pages"],
        "bytes": magazine["bytes"],
        "sha256": magazine["sha256"],
        "customRequestReceipt": magazine.get("customRequestReceipt", {})
    }
}
(ROOT / "tests" / "nature-monthly" / "build-result.json").write_text(
    json.dumps(build_record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps({
    "checks": "PASS — complete previous UTC calendar month, isolated Nature database, 8 source-linked records",
    "engineVersion": result["engineVersion"],
    "viewId": result["viewId"],
    "windowMode": result["windowMode"],
    "coverageStart": result["coverageStart"],
    "coverageEnd": result["coverageEnd"],
    "windowHours": result["windowHours"],
    "storyCount": result["eligibleStoryCount"],
    "issueId": issue["issueId"],
    "pages": issue["pages"],
    "bytes": issue["bytes"],
    "sha256": issue["sha256"]
}, indent=2))
