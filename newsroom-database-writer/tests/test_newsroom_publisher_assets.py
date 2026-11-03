from __future__ import annotations

import hashlib
import json
import sqlite3
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from newsroom_publisher_assets import attach_newsroom_images


class PublisherAssetsTests(unittest.TestCase):
    def test_attaches_every_approved_image_within_window_and_keeps_view_scope(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            view = "alien-world"
            private_dir = root / ".publisher-data" / view / "newsroom-assets"
            private_dir.mkdir(parents=True)
            db_path = root / "view.sqlite3"
            connection = sqlite3.connect(db_path)
            connection.row_factory = sqlite3.Row
            connection.execute("""CREATE TABLE newsroom_approved_stories(
                view_id TEXT, story_id TEXT, media_id TEXT, image_stage_path TEXT,
                image_sha256 TEXT, media_metadata_json TEXT, published_at REAL,
                verification_gate_version TEXT)""")
            end = datetime(2026, 11, 3, 1, 0, tzinfo=timezone.utc).timestamp()
            stories = []
            count = 240
            for index in range(count):
                story_id = f"post-{index:04d}"
                media_id = f"media-{index:024x}"
                payload = f"jpeg-payload-{index}".encode()
                staged = private_dir / f"{media_id}.jpg"
                staged.write_bytes(payload)
                digest = hashlib.sha256(payload).hexdigest()
                metadata = {"mediaId": media_id, "sha256": digest,
                            "originType": "local-original-illustration", "creator": "LIVE // EARTH",
                            "credit": "LIVE // EARTH Global Image Engine", "caption": "Original thematic illustration.",
                            "sourcePage": "https://example.org/art", "licenseName": "Original LIVE // EARTH artwork",
                            "licenseUrl": "", "rightsNotice": "Original artwork.", "mimeType": "image/jpeg"}
                relative = staged.relative_to(root).as_posix()
                connection.execute("INSERT INTO newsroom_approved_stories VALUES(?,?,?,?,?,?,?,?)",
                    (view, story_id, media_id, relative, digest, json.dumps(metadata), end - 60, "1.0.0"))
                stories.append({"id": story_id, "title": f"Story {index}", "url": f"https://example.org/{index}"})
            connection.commit()
            feed = {"viewId": view, "generatedAt": "2026-11-03T01:00:00Z", "windowHours": 768,
                    "stories": stories, "storyCount": count}
            output = root / view / "published"
            result = attach_newsroom_images(connection, feed, repository_root=root, view_id=view,
                    output_directory=output, raw_asset_base=f"https://raw.githubusercontent.com/example/Live-Earth/main/{view}/published")
            self.assertEqual(result["attached"], count)
            self.assertEqual(len(result["assetFiles"]), count)
            self.assertEqual(feed["storyCount"], count)
            self.assertEqual(len(feed["stories"]), count)
            self.assertTrue(all(item.get("imageMediaId", "").startswith("media-") for item in feed["stories"]))
            self.assertEqual(len(list((output / "assets").glob("newsroom-*.jpg"))), count)
            self.assertFalse((output / "newsroom-image-rights.json").exists())
            self.assertTrue(all(story.get("imageCredit") and story.get("imageLicense") for story in feed["stories"]))
            connection.close()

    def test_does_not_attach_another_views_private_asset(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            connection = sqlite3.connect(":memory:")
            connection.row_factory = sqlite3.Row
            connection.execute("""CREATE TABLE newsroom_approved_stories(
                view_id TEXT, story_id TEXT, media_id TEXT, image_stage_path TEXT,
                image_sha256 TEXT, media_metadata_json TEXT, published_at REAL,
                verification_gate_version TEXT)""")
            feed = {"viewId": "nature", "generatedAt": "2026-11-03T01:00:00Z", "windowHours": 768, "stories": []}
            result = attach_newsroom_images(connection, feed, repository_root=root, view_id="nature",
                output_directory=root / "nature/published", raw_asset_base="https://raw.githubusercontent.com/example/Live-Earth/main/nature/published")
            self.assertEqual(result["attached"], 0)
            connection.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
