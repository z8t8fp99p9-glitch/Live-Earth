import unittest
from global_collector.universal_post import UNIVERSAL_POST_FIELDS, MEDIA_FIELDS, normalize_post


class UniversalPostTests(unittest.TestCase):
    def setUp(self):
        self.job = {"jobId": "job-1", "assignmentIds": ["a-1"], "sourceIds": ["s-1"],
                    "scheduledAt": "2026-11-03T00:00:00Z", "requestWindowHours": 768,
                    "trigger": "scheduled"}
        self.source = {"sourceId": "s-1", "sourceName": "Example", "websiteUrl": "https://example.org/",
                       "connectorType": "auto"}

    def test_every_post_has_identical_fixed_field_set(self):
        a = normalize_post({"title": "One", "url": "https://example.org/1"},
                           view_id="nature", source=self.source, feed_url="https://example.org/feed",
                           job=self.job, collected_at="2026-11-03T00:00:00Z", format_name="json", fetch_evidence={})
        b = normalize_post({"headline": "Two", "url": "https://example.org/2", "image": "https://example.org/x.jpg"},
                           view_id="alien-world", source=self.source, feed_url="https://example.org/feed",
                           job=self.job, collected_at="2026-11-03T00:00:00Z", format_name="json", fetch_evidence={})
        self.assertEqual(tuple(a.keys()), UNIVERSAL_POST_FIELDS)
        self.assertEqual(tuple(b.keys()), UNIVERSAL_POST_FIELDS)
        self.assertEqual(set(a), set(b))
        self.assertEqual(len(UNIVERSAL_POST_FIELDS), 38)

    def test_every_post_carries_complete_manager_lineage(self):
        self.job.update({
            "idempotencyKey": "idem-1", "profileId": "profile-1",
            "configVersion": "config-1", "destinationDatabaseId": "db-1",
            "destinationDatabasePath": ".publisher-data/future-view/db.sqlite3",
            "collectorEntrypoint": "global_collector",
            "collectorWorkflow": ".github/workflows/collect.yml",
            "feedUrls": ["https://example.org/feed"],
        })
        record = normalize_post({"title": "Lineage", "url": "https://example.org/lineage",
                                 "media": ["https://example.org/image.jpg"]},
                                view_id="future-view", source=self.source,
                                feed_url="https://example.org/feed", job=self.job,
                                collected_at="2026-11-03T00:00:00Z", format_name="json", fetch_evidence={})
        context = record["collectionContext"]
        for key in ("jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds",
                    "sourceIds", "feedUrls", "collectorEntrypoint", "collectorWorkflow",
                    "destinationDatabaseId", "destinationDatabasePath", "configVersion"):
            self.assertIn(key, context)
        for media_item in record["media"]:
            self.assertEqual(media_item["postId"], record["postId"])
            self.assertEqual(media_item["jobId"], self.job["jobId"])
            self.assertEqual(media_item["profileId"], self.job["profileId"])

    def test_media_has_fixed_field_set_with_parent_lineage(self):
        record = normalize_post({"title": "Photo post", "url": "https://example.org/1",
                                 "media": [{"url": "https://example.org/a.jpg", "caption": "A photo"}]},
                                view_id="future-view", source=self.source, feed_url="https://example.org/feed",
                                job=self.job, collected_at="2026-11-03T00:00:00Z", format_name="json", fetch_evidence={})
        self.assertEqual(tuple(record["media"][0].keys()), MEDIA_FIELDS)
        self.assertIn("postId", MEDIA_FIELDS)
        self.assertIn("viewId", MEDIA_FIELDS)
        self.assertIn("jobId", MEDIA_FIELDS)
        self.assertEqual(record["media"][0]["postId"], record["postId"])
        self.assertEqual(record["media"][0]["viewId"], "future-view")

    def test_source_metadata_and_rights_information_are_passed_without_verdict(self):
        record = normalize_post({"title": "Post", "url": "https://example.org/1",
                                 "license": "CC BY", "rights": "Credit required", "customField": {"x": 1}},
                                view_id="future-view", source=self.source, feed_url="https://example.org/feed",
                                job=self.job, collected_at="2026-11-03T00:00:00Z", format_name="json", fetch_evidence={})
        self.assertIn("customField", record["sourceMetadata"])
        self.assertEqual(record["rightsMetadata"]["licenseName"], "CC BY")
        self.assertNotIn("verdict", record["rightsMetadata"])
        self.assertNotIn("approvalStatus", record)


if __name__ == "__main__":
    unittest.main()
