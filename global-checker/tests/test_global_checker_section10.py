import copy
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "global-checker"))
sys.path.insert(0, str(ROOT / "image-engine"))

from global_checker_v2 import GlobalChecker, CHECKER_VERSION
from image_engine_section9 import ImageEngineSection9


def section10_post(report):
    return report["sections"]["finalImageVerificationAndApproval"]["posts"][0]


def section11_post(report):
    return report["sections"]["postEngineAuditAndFinalDecision"]["posts"][0]


def manager_job_fixture():
    return {
        "jobId": "job-001", "idempotencyKey": "job-key-001", "viewId": "alien-world",
        "profileId": "alien-world-profile", "assignmentIds": ["assignment-001"],
        "sourceIds": ["nasa"], "feedUrls": ["https://www.nasa.gov/feed/"],
        "collectorEntrypoint": "global_collector", "collectorWorkflow": "alien-world-collector",
        "destinationDatabaseId": "alien-world-db", "destinationDatabasePath": ".publisher-data/alien-world/data.db",
        "scheduledAt": "2026-11-04T04:00:00Z", "requestWindowHours": 48,
        "configVersion": "1", "trigger": "manual",
    }


def manager_card_fixture(job):
    payload = json.dumps(job, sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=str)
    return {"payload": copy.deepcopy(job), "sha256": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
            "integrityRule": "exact-manager-payload-copy; collector-does-not-mutate-or-regenerate"}


class FakeVisualInspector:
    def inspect(self, *, image_path, context, candidate):
        return {
            "status": "PASS",
            "inspectedBy": "TEST-VISION-ADAPTER",
            "description": "A Mars rover beside layered ancient river delta terrain.",
            "visibleEntities": ["Mars rover", "layered terrain"],
            "eventContext": "A rover landscape scene.",
            "articleRelevance": "YES",
            "misrepresentationWarnings": [],
            "confidence": 0.96,
        }


def jpeg_bytes(size=(640, 480), color=(40, 90, 130)):
    image = Image.new("RGB", size, color)
    output = io.BytesIO()
    image.save(output, "JPEG", quality=91)
    return output.getvalue()


class CheckerSection10Tests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.engine_root = self.root / "image-engine-stage"
        self.provider_root = self.engine_root / "provider-staging"
        self.provider_root.mkdir(parents=True)
        self.source_path = self.provider_root / "source.jpg"
        self.source_path.write_bytes(jpeg_bytes())
        self.url = "https://images.nasa.gov/mars-rover-delta.jpg"
        self.article_url = "https://www.nasa.gov/story/mars-rover-delta/"
        self.candidate = {
            "mediaId": "nasa-original-1",
            "candidateId": "nasa-original-1",
            "mediaType": "image",
            "mimeType": "image/jpeg",
            "url": self.url,
            "originalUrl": self.url,
            "sourceMediaUrl": self.url,
            "sourcePage": self.article_url,
            "title": "Mars rover ancient river delta",
            "caption": "Mars rover explores an ancient river delta.",
            "altText": "Mars rover and layered delta terrain.",
            "creator": "NASA",
            "credit": "NASA",
            "licenseName": "Public domain",
            "rightsEvidence": {"creator": "NASA", "rightsBasis": "US government work", "credit": "NASA", "licenseName": "Public domain"},
            "stagedPath": str(self.source_path),
            "sha256": hashlib.sha256(self.source_path.read_bytes()).hexdigest(),
            "mime": "image/jpeg",
            "sourceId": "nasa",
        }
        manager_job = manager_job_fixture()
        self.batch = {
            "job": manager_job,
            "collectorSections": {
                "managerIdCard": manager_card_fixture(manager_job),
                "fullArticle": {"posts": [{"postId": "post-1", "fullArticle": {"articleUrl": self.article_url, "title": "Mars rover ancient river delta", "fullText": "The rover explored layered deposits in an ancient Martian river delta."}}]},
                "originalImageRecords": {"posts": [{"postId": "post-1", "sourceId": "nasa", "originalImageRecords": [copy.deepcopy(self.candidate)]}]},
                "sourceRightsEvidence": {"posts": [{"postId": "post-1", "sourceRightsEvidence": {"sourceIdentity": {"sourceId": "nasa"}, "imageRightsEvidence": [{key: self.candidate.get(key, "") for key in ("mediaId", "url", "originalUrl", "sourcePage", "creator", "credit", "caption", "altText", "licenseName", "licenseUrl", "rightsNotice", "mimeType")} ]}}]},
            },
            "records": [{
                "postId": "post-1", "sourceId": "nasa", "sourceFeedUrl": "https://www.nasa.gov/feed/",
                "canonicalUrl": self.article_url, "title": "Mars rover ancient river delta",
                "summary": "NASA reports the rover explored an ancient Martian river delta.",
                "mediaCandidates": [copy.deepcopy(self.candidate)],
            }],
        }

    def tearDown(self):
        self.temp.cleanup()

    def initial_checker_report(self):
        return GlobalChecker().run(
            self.batch,
            text_policy={
                "policyId": "nasa-text-v1", "sourceMatch": True,
                "permissions": {"temporaryProcessing": "allowed", "transformation": "allowed", "derivedOutputStorage": "allowed", "derivedOutputDisplay": "allowed"},
                "fullArticlePermissions": {"temporaryProcessing": "allowed"},
            },
            image_policies={"post-1": {"policyId": "nasa-image-v1", "policyMatch": True, "candidateUrl": self.url,
                "permissions": {"editorialUse": "allowed", "attribution": "allowed", "modification": "allowed", "storage": "allowed"}}},
            image_engine_dispatch={"post-1": {"allowedHosts": ["images.nasa.gov"], "temporaryProcessingAllowed": True}},
        )

    def run_image_engine(self, report, visual=True, discoveries=None, policy=None):
        inspector = FakeVisualInspector() if visual else None
        engine = ImageEngineSection9(self.engine_root, visual_inspector=inspector)
        route = {"post-1": policy or {"allowedHosts": ["images.nasa.gov"], "temporaryProcessingAllowed": True}}
        return engine.run(report, route_policies=route, discovered_candidates=discoveries)

    def test_original_approved_image_is_rechecked_and_section10_approves_exact_original(self):
        report = self.initial_checker_report()
        nine = self.run_image_engine(report)
        frozen_sections = copy.deepcopy(nine["sections"])
        frozen_posts = copy.deepcopy(nine["posts"])
        frozen_order = list(nine["sectionOrder"])
        final = GlobalChecker().finalize_image_review(nine, staging_root=self.engine_root)
        self.assertEqual(final["sectionOrder"][:len(frozen_order)], frozen_order)
        self.assertEqual(final["sectionOrder"][-2:], ["finalImageVerificationAndApproval", "postEngineAuditAndFinalDecision"])
        self.assertEqual(section10_post(final)["decision"], "YES")
        self.assertEqual(section11_post(final)["decision"], "APPROVE_FOR_EDITORIAL")
        self.assertEqual(section11_post(final)["editorialEligibility"], "EDITORIAL_READY")
        self.assertEqual(section10_post(final)["candidateUrl"], self.url)
        # Strict append-only guarantee: every original section and post record
        # remains equal to the Section 9 report. In particular Section 6 is not extended.
        for key, value in frozen_sections.items():
            self.assertEqual(final["sections"][key], value, key)
        self.assertEqual(final["posts"], frozen_posts)
        for key, value in nine.items():
            if key not in {"sections", "sectionOrder"}:
                self.assertEqual(final[key], value, key)
        self.assertEqual(final["sections"]["allChecks"], frozen_sections["allChecks"])
        self.assertFalse(section11_post(final)["auditContinuation"]["section6Modified"])
        self.assertTrue(section11_post(final)["auditContinuation"]["noPriorSectionRewritten"])
        section6_ids = [x["checkId"] for x in final["posts"][0]["section6"]["allChecks"]]
        self.assertFalse(any(x.startswith("E10-") for x in section6_ids))
        self.assertTrue(all(check["executed"] == "YES" for check in section10_post(final)["checks"]))

    def test_live_collector_wire_shape_runs_through_sections_9_and_10(self):
        old = self.batch["collectorSections"]
        self.batch["collectorSections"] = {
            "schemaVersion": 1,
            "sectionOrder": ["managerIdCard", "fullArticle", "originalImageRecords", "sourceRightsEvidence"],
            "managerIdCard": copy.deepcopy(old["managerIdCard"]),
            "posts": [{
                "postId": "post-1",
                "managerIdCardSha256": old["managerIdCard"]["sha256"],
                "fullArticle": copy.deepcopy(old["fullArticle"]["posts"][0]["fullArticle"]),
                "originalImageRecords": copy.deepcopy(old["originalImageRecords"]["posts"][0]["originalImageRecords"]),
                "sourceRightsEvidence": copy.deepcopy(old["sourceRightsEvidence"]["posts"][0]["sourceRightsEvidence"]),
            }],
        }
        report = self.initial_checker_report()
        self.assertEqual(report["posts"][0]["section8"]["decision"], "YES")
        nine = self.run_image_engine(report)
        before_sections = copy.deepcopy(nine["sections"])
        before_posts = copy.deepcopy(nine["posts"])
        final = GlobalChecker().finalize_image_review(nine, staging_root=self.engine_root)
        for key, value in before_sections.items():
            self.assertEqual(final["sections"][key], value, key)
        self.assertEqual(final["posts"], before_posts)
        self.assertEqual(section10_post(final)["decision"], "YES")
        self.assertEqual(section11_post(final)["editorialEligibility"], "EDITORIAL_READY")
        self.assertEqual(final["sections"]["fullArticle"]["posts"][0]["fullArticle"]["articleUrl"], self.article_url)
        self.assertEqual(final["sections"]["originalImageRecords"]["posts"][0]["originalImageRecords"][0]["mediaId"], "nasa-original-1")
        self.assertEqual(final["sections"]["sourceRightsEvidence"]["posts"][0]["sourceRightsEvidence"]["imageRightsEvidence"][0]["mediaId"], "nasa-original-1")

    def test_missing_semantic_vision_fails_closed_and_holds_post(self):
        nine = self.run_image_engine(self.initial_checker_report(), visual=False)
        final = GlobalChecker().finalize_image_review(nine, staging_root=self.engine_root)
        self.assertEqual(section10_post(final)["decision"], "UNKNOWN")
        self.assertEqual(section11_post(final)["editorialEligibility"], "HOLD")
        check = next(x for x in section10_post(final)["checks"] if x["checkId"] == "E10-20")
        self.assertEqual(check["result"], "UNKNOWN")

    def test_alternative_requires_exact_fresh_policy_and_can_be_approved(self):
        report = self.initial_checker_report()
        # Make initial image rights fail so the Engine cannot reuse the original.
        report["posts"][0]["section8"]["decision"] = "NO"
        report["posts"][0]["section8"]["approved"] = False
        alt_path = self.provider_root / "alternative.jpg"
        alt_path.write_bytes(jpeg_bytes(color=(80, 100, 40)))
        alternative = copy.deepcopy(self.candidate)
        alternative.update({
            "candidateId": "commons-alt-1", "url": "https://upload.wikimedia.org/example/mars-delta.jpg",
            "originalUrl": "https://upload.wikimedia.org/example/mars-delta.jpg", "sourceMediaUrl": "https://upload.wikimedia.org/example/mars-delta.jpg",
            "sourcePage": "https://commons.wikimedia.org/wiki/File:Mars_delta.jpg", "stagedPath": str(alt_path),
            "sha256": hashlib.sha256(alt_path.read_bytes()).hexdigest(),
            "rightsEvidence": {"creator": "Example Creator", "licenseName": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "credit": "Example Creator"},
            "creator": "Example Creator", "credit": "Example Creator", "licenseName": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
        })
        nine = self.run_image_engine(report, discoveries={"post-1": [alternative]}, policy={"allowedHosts": ["upload.wikimedia.org"], "temporaryProcessingAllowed": True})
        exact_policy = {"post-1": {"policyId": "commons-image-v1", "policyMatch": True, "candidateUrl": alternative["url"], "allowedHosts": ["upload.wikimedia.org"], "permissions": {"editorialUse": "allowed", "attribution": "allowed", "storage": "allowed", "modification": "denied"}}}
        final = GlobalChecker().finalize_image_review(nine, final_image_policies=exact_policy, staging_root=self.engine_root)
        self.assertEqual(section10_post(final)["decision"], "YES")
        self.assertEqual(section10_post(final)["candidateUrl"], alternative["url"])

    def test_staged_image_hash_tampering_rejects_candidate(self):
        nine = self.run_image_engine(self.initial_checker_report())
        stage = Path(nine["checkerHandoff"]["posts"][0]["candidate"]["stagedPath"])
        stage.write_bytes(jpeg_bytes(color=(200, 10, 10)))
        final = GlobalChecker().finalize_image_review(nine, staging_root=self.engine_root)
        self.assertEqual(section10_post(final)["decision"], "NO")
        check = next(x for x in section10_post(final)["checks"] if x["checkId"] == "E10-08")
        self.assertEqual(check["result"], "FAIL")

    def test_no_image_selected_returns_explicit_no_image_and_holds_post(self):
        report = self.initial_checker_report()
        report["posts"][0]["section5"]["selectedImageUrl"] = ""
        report["posts"][0]["section5"]["selectedCandidate"] = None
        report["posts"][0]["section5"]["selectionResult"] = "NO IMAGE SELECTED"
        report["posts"][0]["section8"]["decision"] = "NO"
        report["posts"][0]["section8"]["approved"] = False
        nine = self.run_image_engine(report, policy={"allowedHosts": []})
        final = GlobalChecker().finalize_image_review(nine, staging_root=self.engine_root)
        self.assertEqual(section10_post(final)["decision"], "NO IMAGE SELECTED")
        self.assertEqual(section11_post(final)["editorialEligibility"], "HOLD")

    def test_approved_original_that_fails_technical_review_is_replaced_and_rechecked(self):
        report = self.initial_checker_report()
        # Simulate a source image whose Section 8 permissions passed but whose
        # downloaded/staged bytes no longer match the recorded source digest.
        self.source_path.write_bytes(b"corrupt image bytes")
        alt_path = self.provider_root / "replacement.jpg"
        alt_path.write_bytes(jpeg_bytes(color=(90, 40, 150)))
        alternative = copy.deepcopy(self.candidate)
        alternative.update({
            "candidateId": "commons-replacement",
            "url": "https://upload.wikimedia.org/example/replacement.jpg",
            "originalUrl": "https://upload.wikimedia.org/example/replacement.jpg",
            "sourceMediaUrl": "https://upload.wikimedia.org/example/replacement.jpg",
            "sourcePage": "https://commons.wikimedia.org/wiki/File:Replacement.jpg",
            "stagedPath": str(alt_path),
            "sha256": hashlib.sha256(alt_path.read_bytes()).hexdigest(),
            "rightsEvidence": {"creator": "Replacement Creator", "licenseName": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "credit": "Replacement Creator"},
            "creator": "Replacement Creator", "credit": "Replacement Creator", "licenseName": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
        })
        nine = self.run_image_engine(
            report,
            discoveries={"post-1": [alternative]},
            policy={"allowedHosts": ["images.nasa.gov", "upload.wikimedia.org"], "temporaryProcessingAllowed": True},
        )
        sec9 = nine["sections"]["imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission"]["posts"][0]
        self.assertTrue(sec9["originalImageAlreadyApproved"])
        self.assertFalse(sec9["finalImageUsesApprovedOriginal"])
        self.assertEqual(sec9["processingRoute"], "ALTERNATIVE_OR_GENERATED")
        alt_policy = {"post-1": {"policyId": "commons-replacement-policy", "policyMatch": True, "candidateUrl": alternative["url"], "allowedHosts": ["upload.wikimedia.org"], "permissions": {"editorialUse": "allowed", "attribution": "allowed", "storage": "allowed", "modification": "denied"}}}
        final = GlobalChecker().finalize_image_review(nine, final_image_policies=alt_policy, staging_root=self.engine_root)
        self.assertEqual(section10_post(final)["decision"], "YES")
        self.assertEqual(section10_post(final)["candidateUrl"], alternative["url"])

    def test_alternative_without_exact_policy_is_not_approved(self):
        report = self.initial_checker_report()
        report["posts"][0]["section8"]["decision"] = "NO"
        report["posts"][0]["section8"]["approved"] = False
        alt_path = self.provider_root / "alternative.jpg"
        alt_path.write_bytes(jpeg_bytes(color=(30, 170, 80)))
        alternative = copy.deepcopy(self.candidate)
        alternative.update({"url":"https://upload.wikimedia.org/example.jpg","originalUrl":"https://upload.wikimedia.org/example.jpg","sourceMediaUrl":"https://upload.wikimedia.org/example.jpg","sourcePage":"https://commons.wikimedia.org/wiki/File:Example.jpg","stagedPath":str(alt_path),"sha256":hashlib.sha256(alt_path.read_bytes()).hexdigest()})
        nine = self.run_image_engine(report, discoveries={"post-1":[alternative]}, policy={"allowedHosts":["upload.wikimedia.org"],"temporaryProcessingAllowed":True})
        final = GlobalChecker().finalize_image_review(nine, staging_root=self.engine_root)
        self.assertNotEqual(section10_post(final)["decision"], "YES")

    def test_staging_root_is_mandatory(self):
        nine = self.run_image_engine(self.initial_checker_report())
        with self.assertRaises(ValueError):
            GlobalChecker().finalize_image_review(nine)

    def test_section10_requires_explicit_host_allowlist_even_for_approved_original(self):
        nine = self.run_image_engine(self.initial_checker_report())
        nine["imageEngineDispatch"]["post-1"]["allowedHosts"] = []
        final = GlobalChecker().finalize_image_review(nine, staging_root=self.engine_root)
        self.assertEqual(section10_post(final)["decision"], "NO")
        check = next(x for x in section10_post(final)["checks"] if x["checkId"] == "E10-06")
        self.assertEqual(check["result"], "FAIL")

    def test_section10_rejects_manager_id_card_lineage_tampering(self):
        nine = self.run_image_engine(self.initial_checker_report())
        nine["checkerHandoff"]["posts"][0]["lineage"]["managerJob"]["destinationDatabaseId"] = "wrong-database"
        final = GlobalChecker().finalize_image_review(nine, staging_root=self.engine_root)
        check = next(x for x in section10_post(final)["checks"] if x["checkId"] == "E10-26")
        self.assertEqual(check["result"], "FAIL")
        self.assertNotEqual(section10_post(final)["decision"], "YES")

    def test_section10_rejects_source_id_outside_manager_assignment(self):
        nine = self.run_image_engine(self.initial_checker_report())
        nine["checkerHandoff"]["posts"][0]["lineage"]["sourceId"] = "other-source"
        nine["sections"]["imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission"]["posts"][0]["lineage"]["sourceId"] = "other-source"
        final = GlobalChecker().finalize_image_review(nine, staging_root=self.engine_root)
        check = next(x for x in section10_post(final)["checks"] if x["checkId"] == "E10-27")
        self.assertEqual(check["result"], "FAIL")
        self.assertNotEqual(section10_post(final)["decision"], "YES")


if __name__ == "__main__":
    unittest.main()
