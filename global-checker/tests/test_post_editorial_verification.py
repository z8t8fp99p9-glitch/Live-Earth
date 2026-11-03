from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

CHECKER_DIR = Path(__file__).resolve().parents[1]
if str(CHECKER_DIR) not in sys.path:
    sys.path.insert(0, str(CHECKER_DIR))

import post_editorial_verification as gate
from universal_checker import (
    MANAGER_FIELDS, MEDIA_LINEAGE_FIELDS, UNIVERSAL_MEDIA_FIELDS,
    UNIVERSAL_POST_FIELDS, UNIVERSAL_RECORD_SCHEMA,
)


class PostEditorialVerificationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "global-checker").mkdir()
        (self.root / "global_collection_manager" / "config").mkdir(parents=True)
        self.manager_version = "manager-test-v1"
        self.checker_version = "checker-test-v1"
        self.profile = {
            "viewId": "nature", "profileId": "nature-profile", "enabled": True,
            "destinationDatabaseId": "nature-db",
            "destinationDatabasePath": ".publisher-data/nature/newsroom.sqlite",
            "viewName": "Nature",
        }
        (self.root / "global_collection_manager" / "config" / "view-collection-profiles.json").write_text(
            json.dumps({"schemaVersion": 1, "profiles": [self.profile]}), encoding="utf-8"
        )
        (self.root / "global_collection_manager" / "config" / "source-registry.json").write_text(
            json.dumps({"registryVersion": self.manager_version}), encoding="utf-8"
        )
        (self.root / "global-checker" / "source-registry.json").write_text(
            json.dumps({"registryVersion": self.checker_version}), encoding="utf-8"
        )
        self.handoff, self.package = self.make_pair(260)

    def tearDown(self):
        self.temp.cleanup()

    def make_job(self):
        return {
            "jobId": "job-001", "idempotencyKey": "idem-001", "viewId": "nature",
            "profileId": "nature-profile", "assignmentIds": ["assignment-001"],
            "sourceIds": ["source-001"], "feedUrls": ["https://example.org/feed.xml"],
            "collectorEntrypoint": "global_collector", "collectorWorkflow": "collector-v1",
            "destinationDatabaseId": "nature-db",
            "destinationDatabasePath": ".publisher-data/nature/newsroom.sqlite",
            "scheduledAt": "2026-11-03T00:00:00Z", "requestWindowHours": 6,
            "configVersion": "cfg-1", "trigger": "manual",
        }

    def make_summary(self, count):
        return " ".join(
            f"Event {i} describes measurable changes across the coastal region during research."
            for i in range(count)
        )

    def make_pair(self, source_words):
        job = self.make_job()
        # Each generated sentence has 11 whitespace-delimited words.
        summary = self.make_summary(max(1, (source_words + 10) // 11))
        post = {field: None for field in UNIVERSAL_POST_FIELDS}
        post.update({
            "schemaVersion": 1, "postId": "post-001", "sourcePostId": "source-post-001",
            "viewId": "nature", "sourceId": "source-001", "sourceName": "Example Source",
            "sourcePlatform": "rss", "sourceType": "feed", "sourceFeedUrl": job["feedUrls"][0],
            "sourceWebsiteUrl": "https://example.org", "originalUrl": "https://example.org/story/1",
            "canonicalUrl": "https://example.org/story/1", "title": "Test source story",
            "subtitle": "", "summary": summary, "excerpt": "", "fullText": "",
            "fullTextHtml": "", "authorName": "Example Author", "authorId": "author-1",
            "authorUrl": "https://example.org/author", "contributors": [], "publishedAt": "2026-11-02T10:00:00Z",
            "updatedAt": None, "collectedAt": "2026-11-03T00:00:00Z", "language": "en",
            "categories": ["science"], "tags": ["coast"], "topics": ["ocean"], "location": "Coast",
            "media": [], "attachments": [], "links": [], "engagement": {}, "rightsMetadata": {},
            "provenance": {"assignmentId": "assignment-001"}, "sourceMetadata": {},
            "collectionContext": copy.deepcopy(job),
        })
        image = {field: None for field in UNIVERSAL_MEDIA_FIELDS}
        image.update({
            "mediaId": "media-001", "mediaType": "image", "url": "https://example.org/image.png",
            "originalUrl": "https://example.org/image.png", "thumbnailUrl": "", "title": "Coast image",
            "caption": "Approved coastal image", "altText": "Coast", "creator": "Creator",
            "credit": "Creator / Example", "licenseName": "CC BY 4.0",
            "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "rightsNotice": "Attribution required",
            "mimeType": "image/png", "width": 1200, "height": 800, "durationSeconds": None,
            "fileSizeBytes": 1000, "sourcePage": "https://example.org/story/1", "position": 0,
            "metadata": {"checkerStatus": "APPROVED_BY_GLOBAL_CHECKER"},
            "postId": "post-001", "viewId": "nature", "sourceId": "source-001",
            "jobId": job["jobId"], "profileId": job["profileId"], "assignmentIds": job["assignmentIds"],
            "idempotencyKey": job["idempotencyKey"], "configVersion": job["configVersion"],
            "destinationDatabaseId": job["destinationDatabaseId"],
            "destinationDatabasePath": job["destinationDatabasePath"],
        })
        post["media"] = [image]
        check = {
            "postId": "post-001", "viewId": "nature", "sourceId": "source-001", "status": "PASS",
            "lineage": {"passed": True, "errors": []},
            "text": {"allowed": True, "summaryAllowed": True, "decisionId": "text-d1", "policyId": "policy-1", "reasons": []},
            "image": {"mediaId": "media-001", "allowed": True, "decisionId": "image-d1", "policyId": "image-policy-1", "reasons": []},
            "fieldRestrictions": [], "meaningfulText": True, "publishEligible": True, "reasons": [],
        }
        collector = {
            "schemaVersion": 1, "recordSchema": UNIVERSAL_RECORD_SCHEMA,
            "recordFields": list(UNIVERSAL_POST_FIELDS), "job": copy.deepcopy(job),
            "managerRegistryVersion": self.manager_version, "records": [copy.deepcopy(post)],
        }
        checker_review = {
            "schemaVersion": 1, "checker": gate.CHECKER_NAME, "checkerMode": "universal-view-independent",
            "checkerVersion": gate.CHECKER_VERSION, "reportVisibility": "INTERNAL_ONLY_NOT_FOR_PUBLICATION",
            "viewId": "nature", "jobId": job["jobId"], "configVersion": job["configVersion"],
            "managerRegistryVersion": self.manager_version,
            "statistics": {}, "posts": [copy.deepcopy(check)], "contentMutationPerformed": False,
            "editorialChangesPerformed": False,
        }
        handoff = {
            "schemaVersion": 1, "handoff": gate.HANDOFF_NAME, "handoffVersion": gate.HANDOFF_VERSION,
            "phase": "checker-image-review-complete", "checker": gate.CHECKER_NAME,
            "checkerVersion": gate.CHECKER_VERSION, "jobId": job["jobId"], "viewId": "nature",
            "managerRegistryVersion": self.manager_version, "checkerRegistryVersion": self.checker_version,
            "checkerReview": checker_review, "collectorResultWithCheckerReviewedImages": collector,
            "editorialEligiblePostIds": ["post-001"],
        }
        clean_source = gate._clean(summary, 30000)
        actual_words = len(clean_source.split())
        if actual_words <= 500:
            out_summary = clean_source
            status = "WITHIN_TARGET" if actual_words >= 200 else "SOURCE_UNDER_200_WORDS"
            method = "source-preserved-within-target" if status == "WITHIN_TARGET" else "source-preserved-no-padding"
        else:
            sentences = gate._sentences(clean_source)
            chosen = []
            wc = 0
            for sentence in sentences:
                if wc + len(sentence.split()) > 500:
                    break
                chosen.append(sentence)
                wc += len(sentence.split())
                if wc >= 200:
                    break
            out_summary = " ".join(chosen)
            status = "WITHIN_TARGET"
            method = "deterministic-extractive-v1"
        out_count = len(out_summary.split())
        digest = gate._sha256(clean_source)
        story = {
            "id": "post-001", "postId": "post-001", "mediaId": "media-001", "viewId": "nature",
            "sourceId": "source-001", **copy.deepcopy(job),
            "sourceTitle": post["title"], "title": post["title"], "sourceName": "Example Source",
            "sourceFeedUrl": job["feedUrls"][0], "sourceUrl": "https://example.org/story/1",
            "publishedAt": post["publishedAt"], "updatedAt": post["updatedAt"], "language": post["language"],
            "categories": post["categories"], "tags": post["tags"], "topics": post["topics"], "location": post["location"],
            "sourceSummarySha256": digest, "summary": out_summary, "summaryWordCount": out_count,
            "summaryStatus": status, "summaryMethod": method, "summaryBasisSha256": digest,
            "image": copy.deepcopy(image), "imageCredit": image["credit"], "imageCaption": image["caption"],
            "imageSourcePage": image["sourcePage"], "imageRightsNotice": image["rightsNotice"],
            "imageLicenseName": image["licenseName"], "imageLicenseUrl": image["licenseUrl"],
            "sourceRecord": copy.deepcopy(post), "managerLineage": copy.deepcopy(job),
            "checkerDecisions": {k: copy.deepcopy(check[k]) for k in ("text", "image", "lineage")},
            "checkerRecord": copy.deepcopy(check), "checkerReportVisibility": "INTERNAL_ONLY_NOT_FOR_PUBLICATION",
            "layout": {
                "imageCount": 1, "imageMediaId": "media-001",
                "liveFeed": {"title": post["title"], "summary": out_summary, "imageMediaId": "media-001"},
                "magazine": {"headline": post["title"], "body": out_summary, "imageMediaId": "media-001"},
            },
        }
        evidence = {
            "evidenceId": "post-001-source-summary-" + digest[:16], "postId": "post-001", "mediaId": "media-001",
            "sourceUrl": "https://example.org/story/1", "sourcePolicyId": "policy-1", "sourceDecisionId": "text-d1",
            "summaryExcerpt": clean_source, "summaryExcerptSha256": digest,
            "generatedSummarySha256": gate._sha256(out_summary), "visibility": "TRANSIENT_CHECKER_EVIDENCE_ONLY",
        }
        package = {
            "schemaVersion": 1, "engine": gate.EDITORIAL_ENGINE_NAME,
            "coreEngineVersion": gate.EDITORIAL_CORE_VERSION,
            "newsroomAdapterVersion": gate.EDITORIAL_ADAPTER_VERSION,
            "phase": "editorial-production", "inputAuthority": "Global Checker only",
            "viewId": "nature", "profileId": "nature-profile", "viewName": "Nature",
            "jobId": job["jobId"], "managerJob": copy.deepcopy(job),
            "managerRegistryVersion": self.manager_version, "checkerRegistryVersion": self.checker_version,
            "publicationModes": ["live-feed", "magazine"],
            "privacyAndOwnership": {
                "sourceWebsitesFetched": False, "hostedAIOrInferenceUsed": False,
                "sourceRecordsModified": False, "sourceRecordsDiscarded": False,
                "sourceTextPersisted": False, "checkerDecisionsCreatedOrChanged": False,
                "rightsOrEligibilityJudgedByEditorial": False, "viewDatabaseOpenedOrWritten": False,
                "feedOrPdfWritten": False, "publicationPerformed": False, "viewDatabasesMixed": False,
            },
            "stories": [story], "evidence": [evidence],
        }
        return handoff, package

    def verify(self, handoff=None, package=None):
        return gate.review_editorial_package(
            handoff if handoff is not None else self.handoff,
            package if package is not None else self.package,
            repository_root=self.root,
        )

    def test_valid_package_passes_and_releases_exact_story_id(self):
        result = self.verify()
        self.assertEqual(result["verdict"], "PASS")
        self.assertTrue(result["releaseForPublisher"])
        self.assertEqual(result["approvedStoryIds"], ["post-001"])
        self.assertEqual(result["posts"][0]["mediaId"], "media-001")

    def test_long_source_summary_is_verified_as_ordered_extractive_text(self):
        handoff, package = self.make_pair(900)
        result = self.verify(handoff, package)
        self.assertEqual(result["verdict"], "PASS")
        self.assertTrue(200 <= result["posts"][0]["summaryWordCount"] <= 500)

    def test_short_source_is_preserved_without_padding(self):
        handoff, package = self.make_pair(100)
        story = package["stories"][0]
        self.assertEqual(story["summaryStatus"], "SOURCE_UNDER_200_WORDS")
        result = self.verify(handoff, package)
        self.assertEqual(result["verdict"], "PASS")
        self.assertEqual(story["summary"], story["sourceRecord"]["summary"])

    def test_fabricated_summary_is_held(self):
        package = copy.deepcopy(self.package)
        story = package["stories"][0]
        story["summary"] = story["summary"].replace("coastal", "invented")
        story["summaryWordCount"] = len(story["summary"].split())
        result = self.verify(package=package)
        self.assertEqual(result["verdict"], "HOLD")
        self.assertFalse(result["releaseForPublisher"])
        self.assertEqual(result["approvedStoryIds"], [])

    def test_manager_id_mutation_is_held(self):
        package = copy.deepcopy(self.package)
        package["stories"][0]["jobId"] = "different-job"
        result = self.verify(package=package)
        self.assertEqual(result["verdict"], "HOLD")
        self.assertIn("jobId", result["posts"][0]["reasons"][0])

    def test_source_record_mutation_is_held(self):
        package = copy.deepcopy(self.package)
        package["stories"][0]["sourceRecord"]["title"] = "Altered"
        result = self.verify(package=package)
        self.assertEqual(result["verdict"], "HOLD")

    def test_changed_image_or_media_id_is_held(self):
        package = copy.deepcopy(self.package)
        package["stories"][0]["image"]["mediaId"] = "other-media"
        result = self.verify(package=package)
        self.assertEqual(result["verdict"], "HOLD")

    def test_image_credit_or_license_metadata_cannot_be_changed(self):
        package = copy.deepcopy(self.package)
        package["stories"][0]["imageCredit"] = "Different credit"
        result = self.verify(package=package)
        self.assertEqual(result["verdict"], "HOLD")

    def test_source_url_cannot_be_changed(self):
        package = copy.deepcopy(self.package)
        package["stories"][0]["sourceUrl"] = "https://other.example/story"
        result = self.verify(package=package)
        self.assertEqual(result["verdict"], "HOLD")

    def test_word_count_must_match_summary_text(self):
        package = copy.deepcopy(self.package)
        package["stories"][0]["summaryWordCount"] += 1
        result = self.verify(package=package)
        self.assertEqual(result["verdict"], "HOLD")

    def test_checker_decision_cannot_be_replaced_by_editorial(self):
        package = copy.deepcopy(self.package)
        package["stories"][0]["checkerRecord"]["status"] = "PASS_WITH_EDIT"
        result = self.verify(package=package)
        self.assertEqual(result["verdict"], "HOLD")

    def test_registry_drift_is_held(self):
        package = copy.deepcopy(self.package)
        package["checkerRegistryVersion"] = "stale-version"
        result = self.verify(package=package)
        self.assertEqual(result["verdict"], "HOLD")
        self.assertFalse(result["releaseForPublisher"])

    def test_editorial_story_set_must_equal_checker_eligible_ids(self):
        package = copy.deepcopy(self.package)
        package["stories"] = []
        result = self.verify(package=package)
        self.assertEqual(result["verdict"], "HOLD")

    def test_checker_hold_cannot_be_released(self):
        handoff = copy.deepcopy(self.handoff)
        handoff["checkerReview"]["posts"][0]["status"] = "HOLD"
        result = self.verify(handoff=handoff)
        self.assertEqual(result["verdict"], "HOLD")

    def test_duplicate_image_is_held(self):
        handoff = copy.deepcopy(self.handoff)
        image = copy.deepcopy(handoff["collectorResultWithCheckerReviewedImages"]["records"][0]["media"][0])
        image["mediaId"] = "media-002"
        handoff["collectorResultWithCheckerReviewedImages"]["records"][0]["attachments"] = [image]
        result = self.verify(handoff=handoff)
        self.assertEqual(result["verdict"], "HOLD")

    def test_inputs_are_never_mutated(self):
        handoff = copy.deepcopy(self.handoff)
        package = copy.deepcopy(self.package)
        before_handoff = copy.deepcopy(handoff)
        before_package = copy.deepcopy(package)
        result = self.verify(handoff, package)
        self.assertEqual(result["verdict"], "PASS")
        self.assertEqual(handoff, before_handoff)
        self.assertEqual(package, before_package)
        self.assertTrue(result["inputPackagesUnchanged"])

    def test_final_gate_does_not_create_new_rights_decisions(self):
        result = self.verify()
        self.assertFalse(result["decisionBoundary"]["newRightsOrCopyrightDecisionCreated"])
        self.assertTrue(result["decisionBoundary"]["priorCheckerRightsAndEligibilityDecisionsRemainAuthoritative"])

    def test_editorial_title_edit_is_allowed_when_source_title_is_preserved(self):
        package = copy.deepcopy(self.package)
        story = package["stories"][0]
        story["title"] = "Editorially refined headline"
        story["layout"]["liveFeed"]["title"] = story["title"]
        story["layout"]["magazine"]["headline"] = story["title"]
        result = self.verify(package=package)
        self.assertEqual(result["verdict"], "PASS")
        self.assertEqual(story["sourceTitle"], story["sourceRecord"]["title"])

    def test_one_held_post_does_not_block_an_independent_passing_post(self):
        handoff = copy.deepcopy(self.handoff)
        package = copy.deepcopy(self.package)
        source2 = copy.deepcopy(handoff["collectorResultWithCheckerReviewedImages"]["records"][0])
        source2["postId"] = "post-002"
        source2["sourcePostId"] = "source-post-002"
        image2 = copy.deepcopy(source2["media"][0])
        image2["postId"] = "post-002"
        image2["mediaId"] = "media-002"
        source2["media"] = [image2]
        handoff["collectorResultWithCheckerReviewedImages"]["records"].append(source2)

        check2 = copy.deepcopy(handoff["checkerReview"]["posts"][0])
        check2["postId"] = "post-002"
        check2["image"]["mediaId"] = "media-002"
        handoff["checkerReview"]["posts"].append(check2)
        handoff["editorialEligiblePostIds"].append("post-002")

        story2 = copy.deepcopy(package["stories"][0])
        story2["id"] = story2["postId"] = "post-002"
        story2["mediaId"] = "media-002"
        story2["sourceRecord"] = copy.deepcopy(source2)
        story2["image"] = copy.deepcopy(image2)
        story2["checkerRecord"] = copy.deepcopy(check2)
        story2["checkerDecisions"] = {k: copy.deepcopy(check2[k]) for k in ("text", "image", "lineage")}
        story2["layout"]["imageMediaId"] = "media-002"
        story2["layout"]["liveFeed"]["imageMediaId"] = "media-002"
        story2["layout"]["magazine"]["imageMediaId"] = "media-002"
        package["stories"].append(story2)
        evidence2 = copy.deepcopy(package["evidence"][0])
        evidence2["evidenceId"] = "post-002-source-summary-" + evidence2["summaryExcerptSha256"][:16]
        evidence2["postId"] = "post-002"
        evidence2["mediaId"] = "media-002"
        package["evidence"].append(evidence2)

        # The first post has a broken image reference; the second remains intact.
        package["stories"][0]["mediaId"] = "wrong-media"
        result = self.verify(handoff, package)
        self.assertEqual(result["verdict"], "PARTIAL")
        self.assertTrue(result["releaseForPublisher"])
        self.assertEqual(result["approvedStoryIds"], ["post-002"])
        self.assertEqual(result["statistics"]["storiesHeld"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
