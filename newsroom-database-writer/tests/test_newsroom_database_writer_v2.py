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
import newsroom_database_writer as writer


class WriterV2Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "global_collection_manager/config").mkdir(parents=True)
        (self.root / "global-checker").mkdir(parents=True)
        self.view = "nature"
        self.job = {
            "jobId": "job-001", "idempotencyKey": "idem-001", "viewId": self.view,
            "profileId": "nature-profile", "assignmentIds": ["assignment-1"],
            "sourceIds": ["source-1"], "feedUrls": ["https://feed.example.org/rss"],
            "collectorEntrypoint": "global_collector", "collectorWorkflow": ".github/workflows/nature-publisher.yml",
            "destinationDatabaseId": "nature-sqlite", "destinationDatabasePath": ".publisher-data/nature/nature.sqlite3",
            "scheduledAt": "2026-11-03T00:15:00Z", "requestWindowHours": 768,
            "configVersion": "cfg-1", "trigger": "scheduled",
        }
        profile = {"profileId": "nature-profile", "viewId": self.view, "enabled": True,
                   "destinationDatabaseId": "nature-sqlite", "destinationDatabasePath": ".publisher-data/nature/nature.sqlite3"}
        (self.root / "global_collection_manager/config/view-collection-profiles.json").write_text(
            json.dumps({"schemaVersion": 1, "profiles": [profile]}), encoding="utf-8")
        (self.root / "global_collection_manager/config/source-registry.json").write_text(
            json.dumps({"registryVersion": "mgr-1"}), encoding="utf-8")
        (self.root / "global-checker/source-registry.json").write_text(
            json.dumps({"registryVersion": "chk-1"}), encoding="utf-8")
        db = self.root / self.job["destinationDatabasePath"]
        db.parent.mkdir(parents=True)
        con = sqlite3.connect(db)
        con.execute("CREATE TABLE publisher_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)")
        con.execute("INSERT INTO publisher_meta VALUES('view_id','nature')")
        con.execute("INSERT INTO publisher_meta VALUES('publisher_id','nature-publisher')")
        con.execute("CREATE TABLE stories(story_id TEXT PRIMARY KEY)")
        con.execute("INSERT INTO stories VALUES('collector-original')")
        con.commit(); con.close()
        self.image_stage = self.root / ".image-engine-staging" / self.view / "job" / "prepared.jpg"
        self.image_stage.parent.mkdir(parents=True)
        self.image_bytes = b"test-image-bytes-that-are-private-staged"
        self.image_stage.write_bytes(self.image_bytes)
        self.image_sha = hashlib.sha256(self.image_bytes).hexdigest()

    def tearDown(self):
        self.tmp.cleanup()

    def build_payload(self, count=1):
        checker_posts, stories, evidence, gate_posts, approved_ids = [], [], [], [], []
        checked_at = "2026-11-03T01:00:00Z"
        for index in range(count):
            post_id = f"post-{index:04d}"
            media_id = f"media-{index:024x}"
            checker = {
                "postId": post_id, "viewId": self.view, "sourceId": "source-1", "status": "PASS",
                "text": {"allowed": True, "summaryAllowed": True, "policyId": "policy-1", "decisionId": f"text-{index}"},
                "image": {"allowed": True, "mediaId": media_id},
                "lineage": {"passed": True}, "fieldRestrictions": [],
            }
            image = {
                "mediaId": media_id, "postId": post_id, "viewId": self.view, "sourceId": "source-1",
                "mimeType": "image/jpeg", "creator": "LIVE // EARTH Image Engine",
                "credit": "LIVE // EARTH Global Image Engine", "caption": "Original thematic illustration.",
                "sourcePage": "https://example.org/original-artwork", "licenseName": "Original LIVE // EARTH artwork",
                "licenseUrl": "", "rightsNotice": "Original procedural artwork.",
                "metadata": {"stagedPath": str(self.image_stage), "sha256": self.image_sha, "assetPublished": False,
                             "originType": "local-original-illustration", "modificationNote": "Generated locally."},
                "width": 1200, "height": 800,
            }
            title = f"Editorial story {index}"
            article_url = f"https://example.org/articles/{index}"
            summary = ("A verified editorial summary presents the permitted source details clearly. "
                       "It retains the material facts and context supplied for this example. " * 5).strip()
            source_record = {"postId": post_id, "sourceId": "source-1", "canonicalUrl": article_url}
            story = {
                "id": post_id, "postId": post_id, "viewId": self.view, "sourceId": "source-1",
                **self.job, "managerLineage": dict(self.job), "managerJob": dict(self.job),
                "sourceRecord": source_record, "sourceUrl": article_url,
                "sourceFeedUrl": "https://feed.example.org/rss", "sourceName": "Example Source",
                "title": title, "summary": summary, "publishedAt": "2026-11-02T12:00:00Z",
                "mediaId": media_id, "image": image,
                "checkerRecord": checker, "checkerDecisions": {
                    "text": checker["text"], "image": checker["image"], "lineage": checker["lineage"]},
                "sourceTitle": title,
            }
            checker_posts.append(checker)
            stories.append(story)
            evidence.append({"postId": post_id, "mediaId": media_id, "sourceUrl": article_url,
                             "summaryExcerptSha256": hashlib.sha256(b"original source summary").hexdigest()})
            gate_posts.append({"postId": post_id, "mediaId": media_id, "status": "PASS", "reasons": []})
            approved_ids.append(post_id)
        checker_review = {"checkedAt": checked_at, "posts": checker_posts}
        handoff = {"schemaVersion": 1, "phase": "checker-image-review-complete", "handoff": writer.EXPECTED_HANDOFF, "handoffVersion": "1.0.0",
                   "checker": writer.EXPECTED_CHECKER, "checkerVersion": "2.0.0",
                   "managerRegistryVersion": "mgr-1", "checkerRegistryVersion": "chk-1",
                   "collectorResultWithCheckerReviewedImages": {"job": dict(self.job)}, "checkerReview": checker_review}
        package = {"schemaVersion": 1, "engine": writer.EDITORIAL_ENGINE, "coreEngineVersion": writer.EDITORIAL_CORE_VERSION,
                   "newsroomAdapterVersion": writer.EDITORIAL_ADAPTER_VERSION, "phase": "editorial-production",
                   "viewId": self.view, "jobId": self.job["jobId"], "managerJob": dict(self.job),
                   "managerRegistryVersion": "mgr-1", "checkerRegistryVersion": "chk-1",
                   "stories": stories, "evidence": evidence}
        verification = {"schemaVersion": 1, "checker": writer.EXPECTED_CHECKER, "checkerVersion": "2.0.0",
                        "verificationGate": writer.EXPECTED_GATE, "verificationGateVersion": writer.GATE_VERSION,
                        "phase": "post-editorial-verification-complete", "reportVisibility": "INTERNAL_ONLY_NOT_FOR_PUBLICATION",
                        "verdict": "PASS", "releaseForPublisher": True, "viewId": self.view, "jobId": self.job["jobId"],
                        "approvedStoryIds": approved_ids, "posts": gate_posts,
                        "editorialPackageSha256": hashlib.sha256(writer._json(package).encode()).hexdigest()}
        return handoff, package, verification

    def test_writes_every_checker_released_story_without_count_cap(self):
        handoff, package, verification = self.build_payload(220)
        result = writer.write_verified_editorial_stories(handoff, package, verification, repository_root=self.root)
        self.assertEqual(result["statistics"]["approvedStoryIdsReceived"], 220)
        self.assertEqual(result["statistics"]["inserted"], 220)
        self.assertIsNone(result["statistics"]["storyCountCap"])
        self.assertIsNone(result["retention"]["automaticCountCap"])
        db = sqlite3.connect(self.root / self.job["destinationDatabasePath"])
        self.assertEqual(db.execute("SELECT COUNT(*) FROM newsroom_approved_stories").fetchone()[0], 220)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM stories").fetchone()[0], 1)
        row = db.execute("SELECT image_url,image_stage_path,image_sha256,media_id FROM newsroom_approved_stories ORDER BY story_id LIMIT 1").fetchone()
        self.assertIsNone(row[0])  # Shared Engine's legacy columns remain blank; Publisher bridge attaches approved media.
        self.assertIn(".publisher-data/nature/newsroom-assets/", row[1])
        self.assertEqual(row[2], self.image_sha)
        self.assertTrue(row[3].startswith("media-"))
        db.close()

    def test_rejects_hold_and_package_digest_mismatch_before_database_write(self):
        handoff, package, verification = self.build_payload(1)
        verification["posts"][0]["status"] = "HOLD"
        with self.assertRaises(writer.NewsroomDatabaseWriterError):
            writer.write_verified_editorial_stories(handoff, package, verification, repository_root=self.root)
        verification["posts"][0]["status"] = "PASS"
        verification["editorialPackageSha256"] = "0" * 64
        with self.assertRaises(writer.NewsroomDatabaseWriterError):
            writer.write_verified_editorial_stories(handoff, package, verification, repository_root=self.root)
        db = sqlite3.connect(self.root / self.job["destinationDatabasePath"])
        self.assertEqual(db.execute("SELECT COUNT(*) FROM sqlite_master WHERE name='newsroom_approved_stories'").fetchone()[0], 0)
        db.close()


    def test_partial_release_persists_only_individually_passed_posts(self):
        handoff, package, verification = self.build_payload(3)
        held_id = verification["approvedStoryIds"].pop()
        verification["posts"][-1]["status"] = "HOLD"
        verification["verdict"] = "PARTIAL"
        result = writer.write_verified_editorial_stories(handoff, package, verification, repository_root=self.root)
        self.assertEqual(result["statistics"]["approvedStoryIdsReceived"], 2)
        db = sqlite3.connect(self.root / self.job["destinationDatabasePath"])
        saved = {row[0] for row in db.execute("SELECT story_id FROM newsroom_approved_stories").fetchall()}
        self.assertEqual(len(saved), 2)
        self.assertNotIn(held_id, saved)
        db.close()

    def test_rejects_cross_view_job(self):
        handoff, package, verification = self.build_payload(1)
        package["viewId"] = "alien-world"
        verification["editorialPackageSha256"] = hashlib.sha256(writer._json(package).encode()).hexdigest()
        with self.assertRaises(writer.NewsroomDatabaseWriterError):
            writer.write_verified_editorial_stories(handoff, package, verification, repository_root=self.root)


if __name__ == "__main__":
    unittest.main(verbosity=2)
