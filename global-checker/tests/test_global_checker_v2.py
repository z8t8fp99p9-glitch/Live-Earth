"""Focused contract tests for the clean Global Checker v2.1.1 implementation."""
import copy
import hashlib
import json
import unittest

from global_checker_v2 import GlobalChecker, CHECKER_VERSION


class CheckerV2Tests(unittest.TestCase):
    def batch(self):
        image_url = "https://images.nasa.gov/mars-delta.jpg"
        article_url = "https://www.nasa.gov/story/1"
        candidate = {
            "candidateId": "img1", "mediaId": "img1", "sourceId": "nasa",
            "url": image_url, "originalUrl": image_url, "mediaType": "image", "mimeType": "image/jpeg",
            "sourcePage": article_url, "title": "Mars rover ancient river delta discovery",
            "caption": "Mars rover ancient river delta", "creator": "NASA", "credit": "NASA",
            "licenseName": "Public domain", "rightsEvidence": {"creator": "NASA", "licenseName": "Public domain", "rightsBasis": "US government work", "credit": "NASA"},
        }
        job = {
            "jobId": "job-1", "idempotencyKey": "job-key-1", "viewId": "alien-world",
            "profileId": "alien-profile", "assignmentIds": ["assignment-1"],
            "sourceIds": ["nasa"], "feedUrls": ["https://www.nasa.gov/feed/"],
            "collectorEntrypoint": "global_collector", "collectorWorkflow": "alien-world-collector",
            "destinationDatabaseId": "alien-db", "destinationDatabasePath": ".publisher-data/alien-world/data.db",
            "scheduledAt": "2026-11-04T04:00:00Z", "requestWindowHours": 48,
            "configVersion": "1", "trigger": "manual",
        }
        manager_hash = hashlib.sha256(json.dumps(job, sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=str).encode("utf-8")).hexdigest()
        return {
            "job": job,
            "collectorSections": {
                "managerIdCard": {"payload": copy.deepcopy(job), "sha256": manager_hash, "integrityRule": "exact-manager-payload-copy; collector-does-not-mutate-or-regenerate"},
                "fullArticle": {"posts": [{"postId": "p1", "fullArticle": {"articleUrl": article_url, "title": "Mars rover discovers ancient river delta", "fullText": "A long article body."}}]},
                "originalImageRecords": {"posts": [{"postId": "p1", "sourceId": "nasa", "originalImageRecords": [copy.deepcopy(candidate)]}]},
                "sourceRightsEvidence": {"posts": [{"postId": "p1", "sourceRightsEvidence": {"sourceIdentity": {"sourceId": "nasa"}, "imageRightsEvidence": [{"mediaId": "img1", "url": image_url, "originalUrl": image_url, "sourcePage": article_url, "creator": "NASA", "credit": "NASA", "licenseName": "Public domain"}]}}]},
            },
            "records": [{
                "postId": "p1", "sourceId": "nasa", "sourceFeedUrl": "https://www.nasa.gov/feed/",
                "canonicalUrl": article_url, "title": "Mars rover discovers ancient river delta",
                "summary": "NASA reports that a Mars rover discovered an ancient river delta.",
                "mediaCandidates": [copy.deepcopy(candidate)],
            }],
        }

    def text_policy(self):
        return {"policyId": "nasa-text", "sourceMatch": True,
                "permissions": {"temporaryProcessing": "allowed", "transformation": "allowed", "derivedOutputStorage": "allowed", "derivedOutputDisplay": "allowed"},
                "fullArticlePermissions": {"temporaryProcessing": "allowed"}}

    def image_policy(self):
        return {"p1": {"policyId": "nasa-image", "policyMatch": True,
                       "candidateUrl": "https://images.nasa.gov/mars-delta.jpg",
                       "permissions": {"editorialUse": "allowed", "attribution": "allowed", "modification": "allowed", "storage": "allowed"}}}

    def test_sections_5_to_8_and_collector_immutability(self):
        batch = self.batch()
        before = copy.deepcopy(batch["collectorSections"])
        report = GlobalChecker().run(batch, text_policy=self.text_policy(), image_policies=self.image_policy())
        self.assertEqual(CHECKER_VERSION, "2.1.1")
        self.assertEqual(len(report["sectionOrder"]), 8)
        self.assertEqual(report["posts"][0]["section5"]["selectionResult"], "SELECTED")
        self.assertEqual(report["posts"][0]["section7"]["decision"], "YES")
        self.assertEqual(report["posts"][0]["section8"]["decision"], "YES")
        self.assertEqual(batch["collectorSections"], before)
        self.assertEqual(report["sections"]["managerIdCard"], before["managerIdCard"])

    def test_no_candidate_is_explicit_and_text_policy_is_independent(self):
        batch = self.batch()
        batch["records"][0]["mediaCandidates"] = []
        batch["collectorSections"]["originalImageRecords"]["posts"][0]["originalImageRecords"] = []
        report = GlobalChecker().run(batch, text_policy=self.text_policy())
        self.assertEqual(report["posts"][0]["section5"]["selectionResult"], "NO IMAGE SELECTED")
        self.assertEqual(report["posts"][0]["section8"]["decision"], "NO")
        self.assertEqual(report["posts"][0]["section7"]["decision"], "YES")

    def test_exact_image_policy_is_required(self):
        batch = self.batch()
        policy = self.image_policy()
        del policy["p1"]["candidateUrl"]
        report = GlobalChecker().run(batch, text_policy=self.text_policy(), image_policies=policy)
        self.assertNotEqual(report["posts"][0]["section8"]["decision"], "YES")

    def test_unverified_policies_fail_closed(self):
        report = GlobalChecker().run(self.batch())
        self.assertNotEqual(report["posts"][0]["section7"]["decision"], "YES")
        self.assertNotEqual(report["posts"][0]["section8"]["decision"], "YES")

    def test_live_collector_unified_posts_schema_is_read_correctly(self):
        batch = self.batch()
        old = batch["collectorSections"]
        full_article = old["fullArticle"]["posts"][0]["fullArticle"]
        image_rows = old["originalImageRecords"]["posts"][0]["originalImageRecords"]
        source_evidence = old["sourceRightsEvidence"]["posts"][0]["sourceRightsEvidence"]
        # This is the actual Global Collector wire shape: Sections 2–4 are
        # nested in collectorSections.posts[], not separate top-level objects.
        batch["collectorSections"] = {
            "schemaVersion": 1,
            "sectionOrder": ["managerIdCard", "fullArticle", "originalImageRecords", "sourceRightsEvidence"],
            "managerIdCard": copy.deepcopy(old["managerIdCard"]),
            "posts": [{
                "postId": "p1",
                "managerIdCardSha256": old["managerIdCard"]["sha256"],
                "fullArticle": copy.deepcopy(full_article),
                "originalImageRecords": copy.deepcopy(image_rows),
                "sourceRightsEvidence": copy.deepcopy(source_evidence),
            }],
        }
        before = copy.deepcopy(batch["collectorSections"])
        report = GlobalChecker().run(batch, text_policy=self.text_policy(), image_policies=self.image_policy())
        self.assertEqual(report["posts"][0]["section5"]["selectionResult"], "SELECTED")
        self.assertEqual(report["posts"][0]["section7"]["decision"], "YES")
        self.assertEqual(report["posts"][0]["section8"]["decision"], "YES")
        self.assertEqual(report["sections"]["fullArticle"]["posts"][0]["fullArticle"], full_article)
        self.assertEqual(report["sections"]["originalImageRecords"]["posts"][0]["originalImageRecords"], image_rows)
        self.assertEqual(report["sections"]["sourceRightsEvidence"]["posts"][0]["sourceRightsEvidence"], source_evidence)
        self.assertEqual(batch["collectorSections"], before)
        self.assertEqual(report["collectorSections"], before)

    def test_wrong_article_image_is_rejected(self):
        batch = self.batch()
        batch["records"][0]["mediaCandidates"][0]["sourcePage"] = "https://www.nasa.gov/other-story"
        batch["collectorSections"]["originalImageRecords"]["posts"][0]["originalImageRecords"][0]["sourcePage"] = "https://www.nasa.gov/other-story"
        report = GlobalChecker().run(batch)
        self.assertEqual(report["posts"][0]["section5"]["selectionResult"], "NO IMAGE SELECTED")


if __name__ == "__main__":
    unittest.main()
