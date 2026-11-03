from __future__ import annotations
import json
import sqlite3
import sys
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import universal_checker as uc
from internal_audit import query_audit, summarize_audit


def job():
    return {
        "jobId": "gcm-test-001", "idempotencyKey": "idem-001", "viewId": "future-view-001",
        "profileId": "profile-future-001", "assignmentIds": ["assign-001"],
        "sourceIds": ["source-001"], "feedUrls": ["https://example.org/feed.json"],
        "collectorEntrypoint": "global_collector", "collectorWorkflow": "shared-newsroom.yml",
        "destinationDatabaseId": "db-future-001", "destinationDatabasePath": ".publisher-data/future-view-001/posts.sqlite3",
        "scheduledAt": "2026-11-03T00:00:00Z", "requestWindowHours": 24,
        "configVersion": "cfg-001", "trigger": "manual",
    }


def post():
    j = job()
    lineage = {k: j[k] for k in uc.POST_LINEAGE_FIELDS}
    return {
        "schemaVersion": 1, "postId": "post-001", "sourcePostId": "external-001",
        "viewId": j["viewId"], "sourceId": "source-001", "sourceName": "Example Source",
        "sourcePlatform": "", "sourceType": "json", "sourceFeedUrl": j["feedUrls"][0],
        "sourceWebsiteUrl": "https://example.org", "originalUrl": "https://example.org/article/1",
        "canonicalUrl": "https://example.org/article/1", "title": "A test educational report",
        "subtitle": "", "summary": "This is a sufficiently detailed source summary containing more than eighteen words and enough characters to pass the meaningful text threshold for this unit test.",
        "excerpt": "", "fullText": "", "fullTextHtml": "", "authorName": "Example Author",
        "authorId": "", "authorUrl": "", "contributors": [], "publishedAt": "", "updatedAt": "",
        "collectedAt": "2026-11-03T00:00:00Z", "language": "en", "categories": [], "tags": [],
        "topics": [], "location": {}, "media": [], "attachments": [], "links": [], "engagement": {},
        "rightsMetadata": {"licenseName": "", "licenseUrl": "", "rightsNotice": "", "creator": "", "credit": ""},
        "provenance": {"assignmentId": "assign-001"}, "sourceMetadata": {}, "collectionContext": lineage,
    }


def media_record(parent):
    image = {field: "" for field in uc.UNIVERSAL_MEDIA_FIELDS}
    image.update({
        "mediaId": "media-001", "mediaType": "image", "url": "https://images.example.org/a.jpg",
        "mimeType": "image/jpeg", "sourcePage": "https://example.org/article/1", "caption": "Contextual image",
        "credit": "Example Author", "position": 0,
        "postId": parent["postId"], "viewId": parent["viewId"], "sourceId": parent["sourceId"],
    })
    image.update({k: parent["collectionContext"][k] for k in (
        "jobId", "profileId", "assignmentIds", "idempotencyKey", "configVersion",
        "destinationDatabaseId", "destinationDatabasePath",
    )})
    return image


class UniversalCheckerStructureTests(unittest.TestCase):
    def test_future_view_needs_no_view_code_branch(self):
        errors = uc._validate_post_lineage(job(), post())
        self.assertEqual(errors, [])

    def test_missing_manager_id_holds_post(self):
        value = post()
        del value["collectionContext"]["idempotencyKey"]
        errors = uc._validate_post_lineage(job(), value)
        self.assertTrue(any("idempotencyKey" in x for x in errors))

    def test_mismatched_image_manager_id_is_detected(self):
        value = post()
        image = media_record(value)
        image["idempotencyKey"] = "wrong"
        errors = uc._validate_image_lineage(job(), value, image)
        self.assertTrue(any("idempotencyKey" in error for error in errors))

    def test_multiple_image_candidates_are_preserved_for_checker_review(self):
        value = post()
        first = media_record(value)
        second = media_record(value)
        second["mediaId"] = "media-002"
        second["url"] = "https://images.example.org/b.jpg"
        value["media"] = [first, second]
        images, errors = uc._image_candidates(value)
        self.assertEqual([item["mediaId"] for item in images], ["media-001", "media-002"])
        self.assertEqual(errors, [])

    def test_checker_selects_an_approved_image_from_multiple_candidates(self):
        value = post()
        first = media_record(value)
        second = media_record(value)
        second["mediaId"] = "media-002"
        second["url"] = "https://images.example.org/b.jpg"
        value["media"] = [first, second]
        payload = {"schemaVersion": 1, "recordSchema": uc.UNIVERSAL_RECORD_SCHEMA,
                   "recordFields": list(uc.UNIVERSAL_POST_FIELDS),
                   "managerRegistryVersion": "manager-reg-001", "job": job(), "records": [value]}
        text_decision = {
            "decisionId": "text-decision", "viewId": job()["viewId"], "storyId": value["postId"],
            "contentKind": "text", "verdict": "GREEN", "allowed": True,
            "allowedUse": "test", "summaryAllowed": True, "policyId": "test-policy",
            "policyVersion": "1", "checkedAt": "2026-11-03T00:00:00Z",
            "attribution": "Example", "evidence": {}, "reasons": [],
        }
        def image_decision(view_id, parent, image):
            allowed = image["mediaId"] == "media-002"
            return {"decisionId": "image-decision", "verdict": "GREEN" if allowed else "UNKNOWN",
                    "allowed": allowed, "policyId": "test-image-policy", "reasons": []}
        with (mock.patch.object(uc.core, "evaluate_text", return_value=text_decision),
              mock.patch.object(uc.core, "load_registry", return_value={"policies": [], "publicationEligibility": {"minimumTextChars": 80, "minimumTextWords": 12}}),
              mock.patch.object(uc, "_image_decision", side_effect=image_decision)):
            report = uc.check_collection(payload)
        result = report["posts"][0]
        self.assertTrue(result["lineage"]["passed"])
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["image"]["mediaId"], "media-002")
        self.assertEqual(result["image"]["candidatesChecked"], 2)

    def test_audit_rows_are_append_only_and_filterable(self):
        connection = sqlite3.connect(":memory:")
        value = post()
        j = job()
        uc._audit(connection, j, value, "text", "GREEN", True, {"reason": "passed"})
        uc._audit(connection, j, value, "text", "AMBER", True, {"reason": "limited route"})
        rows = query_audit(connection, post_id="post-001", job_id="gcm-test-001")
        self.assertEqual(len(rows), 2)
        self.assertEqual(summarize_audit(rows)["visibility"], "INTERNAL_ONLY")
        connection.close()

    def test_universal_report_is_internal_and_does_not_mutate_post(self):
        value = post()
        original = json.dumps(value, sort_keys=True)
        payload = {"schemaVersion": 1, "recordSchema": uc.UNIVERSAL_RECORD_SCHEMA,
                   "recordFields": list(uc.UNIVERSAL_POST_FIELDS),
                   "managerRegistryVersion": "manager-reg-001", "job": job(), "records": [value]}
        connection = sqlite3.connect(":memory:")
        decision = {
            "checker": "test", "checkerVersion": "test", "decisionId": "text-decision-001",
            "viewId": job()["viewId"], "storyId": value["postId"], "contentKind": "text",
            "verdict": "GREEN", "allowed": True, "allowedUse": "test", "summaryAllowed": True,
            "policyId": "test-policy", "policyVersion": "1", "checkedAt": "2026-11-03T00:00:00Z",
            "attribution": "Example Source", "evidence": {}, "reasons": [],
        }
        with mock.patch.object(uc.core, "evaluate_text", return_value=decision), \
             mock.patch.object(uc.core, "load_registry", return_value={"policies": [], "publicationEligibility": {"minimumTextChars": 80, "minimumTextWords": 12}}):
            report = uc.check_collection(payload, audit_connection=connection)
        self.assertEqual(report["reportVisibility"], "INTERNAL_ONLY_NOT_FOR_PUBLICATION")
        self.assertEqual(report["purposeContext"]["appliesToViews"], ["*"])
        self.assertFalse(report["contentMutationPerformed"])
        self.assertEqual(json.dumps(value, sort_keys=True), original)
        rows = query_audit(connection, post_id="post-001")
        self.assertGreaterEqual(len(rows), 4)
        self.assertIn("NOT_PROVIDED", {row["verdict"] for row in rows if row["stage"] == "image"})
        self.assertEqual({row["job_id"] for row in rows}, {"gcm-test-001"})
        connection.close()

    def test_restricted_source_payload_copies_are_flagged_without_editing(self):
        value = post()
        value["summary"] = "Restricted excerpt"
        value["fullText"] = "A full article body that is not cleared for storage."
        value["sourceMetadata"] = {
            "description": "Restricted feed summary copy",
            "content": {"text": "Full article text copy"},
        }
        policy = {"text": {
            "allowSummary": False,
            "sourceMaterialPermissions": {"fullArticleTemporaryProcessing": "unknown"},
            "usePermissions": {"rawTextStorage": "prohibited"},
        }}
        restrictions = uc._field_restrictions(value, policy, {"summaryAllowed": False})
        paths = {item["field"] for item in restrictions}
        self.assertIn("summary", paths)
        self.assertIn("fullText", paths)
        self.assertIn("sourceMetadata.description", paths)
        self.assertIn("sourceMetadata.content", paths)
        self.assertEqual(value["summary"], "Restricted excerpt")

    def test_policy_selector_honours_wildcard_only_when_registry_says_so(self):
        fake_registry = {"policies": [{
            "policyId": "global-test", "views": ["*"], "articleDomains": ["example.org"],
            "feedDomains": ["example.org"], "sourceNameContains": ["Example"],
            "allowedFeedUrls": ["https://example.org/feed.json"],
        }]}
        with mock.patch.object(uc.core, "load_registry", return_value=fake_registry), \
             mock.patch.object(uc.core, "_policy_for_story", wraps=uc.core._policy_for_story):
            # Test the generic matcher directly without replacing production policy data.
            story = {"url": "https://example.org/article/1", "sourceUrl": "https://example.org/feed.json", "sourceName": "Example Source"}
            matched = uc._lookup_text_policy("future-view-001", story)
            self.assertEqual(matched["policyId"], "global-test")


if __name__ == "__main__":
    unittest.main(verbosity=2)
