from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ENGINE_DIR))
import universal_editorial_engine_newsroom as editorial

MANAGER_FIELDS = (
    "jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds",
    "sourceIds", "feedUrls", "collectorEntrypoint", "collectorWorkflow",
    "destinationDatabaseId", "destinationDatabasePath", "scheduledAt",
    "requestWindowHours", "configVersion", "trigger",
)
MEDIA_LINEAGE_FIELDS = (
    "postId", "viewId", "sourceId", "jobId", "profileId", "assignmentIds",
    "idempotencyKey", "configVersion", "destinationDatabaseId", "destinationDatabasePath",
)
UNIVERSAL_MEDIA_FIELDS = (
    "mediaId", "mediaType", "url", "originalUrl", "thumbnailUrl", "title",
    "caption", "altText", "creator", "credit", "licenseName", "licenseUrl",
    "rightsNotice", "mimeType", "width", "height", "durationSeconds",
    "fileSizeBytes", "sourcePage", "position", "metadata", "postId", "viewId",
    "sourceId", "jobId", "profileId", "assignmentIds", "idempotencyKey",
    "configVersion", "destinationDatabaseId", "destinationDatabasePath",
)
UNIVERSAL_POST_FIELDS = (
    "schemaVersion", "postId", "sourcePostId", "viewId", "sourceId",
    "sourceName", "sourcePlatform", "sourceType", "sourceFeedUrl",
    "sourceWebsiteUrl", "originalUrl", "canonicalUrl", "title", "subtitle",
    "summary", "excerpt", "fullText", "fullTextHtml", "authorName",
    "authorId", "authorUrl", "contributors", "publishedAt", "updatedAt",
    "collectedAt", "language", "categories", "tags", "topics", "location",
    "media", "attachments", "links", "engagement", "rightsMetadata",
    "provenance", "sourceMetadata", "collectionContext",
)


def _write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value), encoding="utf-8")


def _make_summary(words: int) -> str:
    base = [
        "Researchers describe a measured change across the monitored environment.",
        "The report explains how the observation was collected and compared.",
        "The findings include dates, locations, methods, and relevant limitations.",
        "The authors note that further observations are needed to confirm patterns.",
        "The published material identifies the institutions and teams involved.",
    ]
    output = []
    count = 0
    while count < words:
        sentence = base[len(output) % len(base)]
        output.append(sentence)
        count += len(sentence.split())
    return " ".join(output)


class EditorialNewsroomTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        checker_dir = cls.root / "global-checker"
        checker_dir.mkdir(parents=True)
        checker_stub = "\n".join([
            f"MANAGER_FIELDS = {MANAGER_FIELDS!r}",
            f"MEDIA_LINEAGE_FIELDS = {MEDIA_LINEAGE_FIELDS!r}",
            f"UNIVERSAL_MEDIA_FIELDS = {UNIVERSAL_MEDIA_FIELDS!r}",
            f"UNIVERSAL_POST_FIELDS = {UNIVERSAL_POST_FIELDS!r}",
            "UNIVERSAL_RECORD_SCHEMA = 'LIVE_EARTH_UNIVERSAL_POST_V1'",
            "def _same(a, b):",
            "    if isinstance(a, list) or isinstance(b, list): return isinstance(a, list) and isinstance(b, list) and a == b",
            "    return a == b",
            "def _manager_job_errors(job):",
            "    return [field for field in MANAGER_FIELDS if field not in job or job[field] in (None, '', [])]",
            "",
        ])
        (checker_dir / "universal_checker.py").write_text(checker_stub, encoding="utf-8")
        sys.path.insert(0, str(checker_dir))

        _write_json(cls.root / "global_collection_manager/config/view-collection-profiles.json", {
            "schemaVersion": 1,
            "profiles": [{
                "profileId": "future-profile", "viewId": "future-view",
                "viewName": "Future View", "enabled": True,
                "destinationDatabaseId": "future-db",
                "destinationDatabasePath": ".publisher-data/future/future.sqlite3",
                "topicsAndCategories": ["example topic"],
            }],
        })
        _write_json(cls.root / "global_collection_manager/config/source-registry.json", {
            "schemaVersion": 1, "registryVersion": "manager-test-1", "sources": [],
        })
        _write_json(checker_dir / "source-registry.json", {
            "schemaVersion": 1, "registryVersion": "checker-test-1", "policies": [],
        })

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.handoff = self.make_handoff()

    def make_handoff(self, summary_words: int = 260):
        job = {
            "jobId": "job-123", "idempotencyKey": "idem-123",
            "viewId": "future-view", "profileId": "future-profile",
            "assignmentIds": ["assignment-1"], "sourceIds": ["source-1"],
            "feedUrls": ["https://source.example/feed.xml"],
            "collectorEntrypoint": "global_collector",
            "collectorWorkflow": ".github/workflows/future.yml",
            "destinationDatabaseId": "future-db",
            "destinationDatabasePath": ".publisher-data/future/future.sqlite3",
            "scheduledAt": "2026-11-03T00:00:00Z", "requestWindowHours": 24,
            "configVersion": "future-config-v1", "trigger": "manual",
        }
        post_id = "post-123"
        media = {
            "mediaId": "media-123", "mediaType": "image",
            "url": "https://raw.githubusercontent.com/example/repo/main/future-view/published/assets/image.jpg",
            "originalUrl": "https://commons.wikimedia.org/wiki/File:Example.jpg",
            "thumbnailUrl": "https://raw.githubusercontent.com/example/repo/main/future-view/published/assets/image.jpg",
            "title": "Contextual image", "caption": "An image related to the report.",
            "altText": "An image related to the report.", "creator": "Example Creator",
            "credit": "Example Creator / CC BY 4.0", "licenseName": "CC BY 4.0",
            "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
            "rightsNotice": "Contextual image candidate reviewed by Checker.",
            "mimeType": "image/jpeg", "width": 1200, "height": 800,
            "durationSeconds": None, "fileSizeBytes": 180000,
            "sourcePage": "https://commons.wikimedia.org/wiki/File:Example.jpg",
            "position": 0,
            "metadata": {"originType": "commons-external-image", "engine": "LIVE // EARTH Global Image Engine",
                         "engineVersion": "0.2.0", "checkerStatus": "PENDING_CHECKER_REVIEW",
                         "assetPublished": False, "sha256": "a" * 64},
            "postId": post_id, "viewId": job["viewId"], "sourceId": "source-1",
            "jobId": job["jobId"], "profileId": job["profileId"],
            "assignmentIds": job["assignmentIds"], "idempotencyKey": job["idempotencyKey"],
            "configVersion": job["configVersion"],
            "destinationDatabaseId": job["destinationDatabaseId"],
            "destinationDatabasePath": job["destinationDatabasePath"],
        }
        post = {
            "schemaVersion": 1, "postId": post_id, "sourcePostId": "origin-123",
            "viewId": job["viewId"], "sourceId": "source-1",
            "sourceName": "Example Science Agency", "sourcePlatform": "rss",
            "sourceType": "feed", "sourceFeedUrl": job["feedUrls"][0],
            "sourceWebsiteUrl": "https://source.example/", "originalUrl": "https://source.example/report/123",
            "canonicalUrl": "https://source.example/report/123", "title": "A measured environmental discovery",
            "subtitle": "A source supplied subheading", "summary": _make_summary(summary_words),
            "excerpt": "", "fullText": "", "fullTextHtml": "", "authorName": "Research Team",
            "authorId": "author-1", "authorUrl": "https://source.example/team",
            "contributors": ["Research Team"], "publishedAt": "2026-11-02T00:00:00Z",
            "updatedAt": "2026-11-02T04:00:00Z", "collectedAt": "2026-11-03T00:00:00Z",
            "language": "en", "categories": ["Research"], "tags": ["environment"],
            "topics": ["example topic"], "location": {"name": "Example Bay"},
            "media": [media], "attachments": [], "links": [{"rel": "source", "url": "https://source.example/report/123"}],
            "engagement": {}, "rightsMetadata": {"credit": "Example Science Agency"},
            "provenance": {"assignmentId": "assignment-1"}, "sourceMetadata": {"feedGuid": "origin-123"},
            "collectionContext": dict(job),
        }
        checker_post = {
            "postId": post_id, "status": "PASS", "lineage": {"passed": True, "errors": []},
            "text": {"allowed": True, "summaryAllowed": True, "decisionId": "text-decision-1", "policyId": "policy-1"},
            "image": {"mediaId": media["mediaId"], "allowed": True, "verdict": "GREEN", "decisionId": "image-decision-1"},
            "fieldRestrictions": [],
        }
        checker_review = {
            "checkerMode": "universal-view-independent", "checkerVersion": "2.0.0",
            "reportVisibility": "INTERNAL_ONLY_NOT_FOR_PUBLICATION",
            "viewId": job["viewId"], "jobId": job["jobId"],
            "managerRegistryVersion": "manager-test-1", "posts": [checker_post],
        }
        collector = {
            "schemaVersion": 1, "recordSchema": "LIVE_EARTH_UNIVERSAL_POST_V1",
            "managerRegistryVersion": "manager-test-1", "job": job, "records": [post],
        }
        return {
            "schemaVersion": 1,
            "handoff": "LIVE // EARTH Global Checker Image Engine Bridge",
            "handoffVersion": "1.0.0", "checker": "LIVE // EARTH Global Content Rights & Provenance Checker",
            "checkerVersion": "2.0.0", "phase": "checker-image-review-complete",
            "viewId": job["viewId"], "jobId": job["jobId"],
            "managerRegistryVersion": "manager-test-1",
            "checkerRegistryVersion": "checker-test-1",
            "checkerReview": checker_review,
            "collectorResultWithCheckerReviewedImages": collector,
            "editorialEligiblePostIds": [post_id],
        }

    def build(self, handoff=None):
        return editorial.produce_editorial_package(handoff or self.handoff, repository_root=self.root)

    def test_engine_is_global_and_accepts_a_future_registered_view(self):
        result = self.build()
        self.assertEqual(result["viewId"], "future-view")
        self.assertEqual(result["profileId"], "future-profile")
        self.assertFalse(hasattr(editorial, "ALLOWED_VIEWS"))

    def test_checker_is_the_only_editorial_input_authority(self):
        bad = json.loads(json.dumps(self.handoff))
        bad["phase"] = "image-engine-candidate-return"
        with self.assertRaises(editorial.UniversalEditorialNewsroomError):
            self.build(bad)

    def test_summary_is_200_to_500_words_when_source_contains_enough_material(self):
        handoff = self.make_handoff(260)
        distinct_sentences = [
            "Scientists measured ocean temperatures at twelve stations across the North Atlantic during the 2025 expedition.",
            "The northern stations recorded an average increase of 1.4 degrees Celsius compared with earlier seasonal readings.",
            "Researchers compared the new measurements with observations collected by vessels over the previous twenty years.",
            "The report describes how autonomous instruments transmitted readings while ships crossed the survey boundary.",
            "Coastal waters showed a different temperature pattern from readings gathered in the deep open ocean.",
            "The research team published station coordinates and calibration notes with the temperature observations.",
            "Researchers said the measurements do not establish a single cause for the regional differences.",
            "The study identifies wind conditions as one factor requiring additional scientific investigation.",
            "Oceanographers compared the readings with satellite observations collected during the same measurement period.",
            "The satellite comparison identified areas where surface conditions differed from deeper water readings.",
            "Scientists noted that short observation periods can make long term patterns difficult to interpret.",
            "The report includes separate tables for coastal stations, offshore instruments, and the northern survey route.",
            "Researchers plan to repeat the measurements during the next two seasonal observation periods.",
            "The expedition also carried sensors designed to record salinity, pressure, and water movement at each station.",
            "Scientists reviewed the instrument readings for missing values before preparing the final comparisons.",
            "Several monitoring stations were revisited so the team could compare measurements under different conditions.",
        ]
        handoff["collectorResultWithCheckerReviewedImages"]["records"][0]["summary"] = " ".join(distinct_sentences)
        result = self.build(handoff)
        story = result["stories"][0]
        self.assertGreaterEqual(story["summaryWordCount"], 200)
        self.assertLessEqual(story["summaryWordCount"], 500)
        self.assertEqual(story["summaryStatus"], "WITHIN_TARGET")
        self.assertEqual(story["summaryMethod"], "source-preserved-within-target")

    def test_long_repetitive_source_is_reduced_without_losing_original_record(self):
        handoff = self.make_handoff(850)
        result = self.build(handoff)
        story = result["stories"][0]
        self.assertLess(story["summaryWordCount"], 200)
        self.assertEqual(story["summaryStatus"], "SOURCE_UNDER_200_WORDS")
        original = handoff["collectorResultWithCheckerReviewedImages"]["records"][0]["summary"]
        self.assertEqual(story["sourceRecord"]["summary"], original)

    def test_short_source_is_preserved_without_padding_or_fabrication(self):
        handoff = self.make_handoff(70)
        original = (
            "The research vessel left the harbour before dawn and reached the northern survey region on Tuesday. "
            "Technicians deployed autonomous instruments at six stations and checked their calibration before collecting observations. "
            "The team recorded water temperature, salinity, and depth during each measurement period. "
            "Researchers will compare the readings with records from the previous expedition."
        )
        handoff["collectorResultWithCheckerReviewedImages"]["records"][0]["summary"] = original
        result = self.build(handoff)
        story = result["stories"][0]
        self.assertEqual(story["summary"], original)
        self.assertEqual(story["summaryStatus"], "SOURCE_UNDER_200_WORDS")
        self.assertEqual(story["summaryWordCount"], len(original.split()))

    def test_long_repetitive_source_keeps_distinct_content_without_padding(self):
        long_handoff = self.make_handoff(850)
        result = self.build(long_handoff)
        story = result["stories"][0]
        self.assertLess(story["summaryWordCount"], 200)
        self.assertEqual(story["summaryStatus"], "SOURCE_UNDER_200_WORDS")
        source_summary = long_handoff["collectorResultWithCheckerReviewedImages"]["records"][0]["summary"]
        self.assertEqual(story["sourceRecord"]["summary"], source_summary)
        self.assertEqual(result["evidence"][0]["summaryExcerpt"], source_summary)

    def test_all_manager_and_media_ids_are_preserved(self):
        result = self.build()
        story = result["stories"][0]
        job = self.handoff["collectorResultWithCheckerReviewedImages"]["job"]
        for field in MANAGER_FIELDS:
            self.assertEqual(story[field], job[field], field)
            self.assertEqual(story["managerLineage"][field], job[field], field)
        self.assertEqual(story["postId"], "post-123")
        self.assertEqual(story["mediaId"], "media-123")
        self.assertEqual(story["image"]["postId"], story["postId"])

    def test_same_preserved_image_is_used_in_live_feed_and_magazine_layouts(self):
        story = self.build()["stories"][0]
        self.assertEqual(story["layout"]["imageCount"], 1)
        self.assertEqual(story["layout"]["liveFeed"]["imageMediaId"], "media-123")
        self.assertEqual(story["layout"]["magazine"]["imageMediaId"], "media-123")

    def test_complete_checker_post_decision_is_carried_forward_as_internal_data(self):
        result = self.build()
        story = result["stories"][0]
        original_check = self.handoff["checkerReview"]["posts"][0]
        self.assertEqual(story["checkerRecord"], original_check)
        self.assertEqual(story["checkerReportVisibility"], "INTERNAL_ONLY_NOT_FOR_PUBLICATION")

    def test_missing_image_is_not_replaced_or_created_by_editorial(self):
        bad = json.loads(json.dumps(self.handoff))
        post = bad["collectorResultWithCheckerReviewedImages"]["records"][0]
        post["media"] = []
        bad["checkerReview"]["posts"][0]["image"]["mediaId"] = ""
        with self.assertRaises(editorial.UniversalEditorialNewsroomError):
            self.build(bad)

    def test_non_pass_checker_decision_is_not_rejudged_by_editorial(self):
        bad = json.loads(json.dumps(self.handoff))
        bad["checkerReview"]["posts"][0]["status"] = "HOLD"
        with self.assertRaises(editorial.UniversalEditorialNewsroomError):
            self.build(bad)

    def test_multiple_collector_images_do_not_replace_checker_selection(self):
        bad = json.loads(json.dumps(self.handoff))
        post = bad["collectorResultWithCheckerReviewedImages"]["records"][0]
        second = json.loads(json.dumps(post["media"][0]))
        second["mediaId"] = "media-456"
        post["attachments"] = [second]
        story = self.build(bad)["stories"][0]
        self.assertEqual(story["mediaId"], "media-123")
        self.assertEqual(story["image"]["mediaId"], "media-123")

    def test_registry_change_after_checker_review_holds_editorial_input(self):
        bad = json.loads(json.dumps(self.handoff))
        bad["checkerRegistryVersion"] = "stale-registry"
        with self.assertRaises(editorial.UniversalEditorialNewsroomError):
            self.build(bad)

    def test_summary_output_contract_keys_remain_unchanged(self):
        summary = editorial.build_editorial_summary("A short approved source summary.", "Source headline")
        self.assertEqual(set(summary), {"text", "wordCount", "status", "method", "sourceSha256"})

    def test_source_post_is_never_modified(self):
        before = json.dumps(self.handoff, sort_keys=True)
        self.build()
        after = json.dumps(self.handoff, sort_keys=True)
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main(verbosity=2)
