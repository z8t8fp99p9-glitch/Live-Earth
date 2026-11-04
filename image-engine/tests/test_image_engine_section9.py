import copy
import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from unittest.mock import patch

import image_engine_section9 as section9_module
from image_engine_section9 import ImageEngineSection9, ImageEngineSection9Error, SECTION_KEY


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
            "description": "A rover beside a layered ancient river delta landscape.",
            "visibleEntities": ["rover", "rock layers", "river delta terrain"],
            "eventContext": "The image depicts a Mars rover landscape.",
            "articleRelevance": "YES",
            "misrepresentationWarnings": [],
            "confidence": 0.94,
        }


def jpeg_bytes(size=(640, 480), color=(45, 90, 120)):
    image = Image.new("RGB", size, color)
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


class ImageEngineSection9Tests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.provider_stage = self.root / "engine-stage" / "provider-staging"
        self.provider_stage.mkdir(parents=True)
        self.source = self.provider_stage / "source.jpg"
        self.source.write_bytes(jpeg_bytes())
        self.candidate = {
            "candidateId": "nasa-original-1",
            "mediaType": "image",
            "mimeType": "image/jpeg",
            "url": "https://images.nasa.gov/mars-river-delta.jpg",
            "originalUrl": "https://images.nasa.gov/mars-river-delta.jpg",
            "sourceMediaUrl": "https://images.nasa.gov/mars-river-delta.jpg",
            "sourcePage": "https://www.nasa.gov/example/mars-river-delta/",
            "title": "Mars rover ancient river delta",
            "caption": "Mars rover explores an ancient river delta landscape.",
            "altText": "Mars rover and layered delta terrain.",
            "creator": "NASA",
            "credit": "NASA",
            "licenseName": "Public domain",
            "rightsEvidence": {"creator": "NASA", "rightsBasis": "US government work", "credit": "NASA"},
            "stagedPath": str(self.source),
            "sha256": __import__("hashlib").sha256(self.source.read_bytes()).hexdigest(),
            "mime": "image/jpeg",
        }

    def tearDown(self):
        self.temp.cleanup()

    def report(self, approved=True):
        section8_checks = [
            {"checkId": "I01", "result": "PASS", "executed": "YES", "passed": "YES"},
            {"checkId": "I05", "result": "PASS", "executed": "YES", "passed": "YES"},
            {"checkId": "I07", "result": "PASS", "executed": "YES", "passed": "YES"},
            {"checkId": "I08", "result": "PASS", "executed": "YES", "passed": "YES"},
        ]
        manager_job = manager_job_fixture()
        return {
            "schemaVersion": 2,
            "checker": "LIVE // EARTH Global Checker",
            "checkerVersion": "2.1.1",
            "jobId": manager_job["jobId"],
            "viewId": manager_job["viewId"],
            "sectionOrder": [
                "managerIdCard", "fullArticle", "originalImageRecords", "sourceRightsEvidence",
                "imageUrlCheckerAndFinalImage", "allChecks", "textApprovalChecks", "imageApprovalChecks",
            ],
            "sections": {
                "managerIdCard": manager_card_fixture(manager_job),
                "fullArticle": {"posts": [{"postId": "post-1", "title": "Mars rover ancient river delta", "summary": "NASA describes the ancient river delta discovered by a rover.", "text": "The rover explored layered deposits in an ancient Martian river delta."}]},
                "originalImageRecords": {"posts": [{"postId": "post-1", "images": [copy.deepcopy(self.candidate)]}]},
                "sourceRightsEvidence": {"posts": [{"postId": "post-1", "sourceId": "nasa"}]},
                "imageUrlCheckerAndFinalImage": {"owner": "LIVE // EARTH Global Checker", "posts": []},
                "allChecks": {"owner": "LIVE // EARTH Global Checker", "posts": []},
                "textApprovalChecks": {"owner": "LIVE // EARTH Global Checker", "posts": []},
                "imageApprovalChecks": {"owner": "LIVE // EARTH Global Checker", "posts": []},
            },
            "posts": [{
                "postId": "post-1",
                "section5": {
                    "selectedImageUrl": self.candidate["url"] if approved else "",
                    "selectedCandidate": copy.deepcopy(self.candidate) if approved else None,
                    "selectionResult": "SELECTED" if approved else "NO IMAGE SELECTED",
                },
                "section6": {"allChecks": []},
                "section7": {"decision": "YES"},
                "section8": {"decision": "YES" if approved else "NO", "checks": section8_checks},
            }],
        }

    def test_approved_original_is_processed_first_and_report_is_appended(self):
        report = self.report(approved=True)
        before_sections = copy.deepcopy(report["sections"])
        before_posts = copy.deepcopy(report["posts"])
        before_order = list(report["sectionOrder"])
        engine = ImageEngineSection9(self.root / "engine-stage", visual_inspector=FakeVisualInspector())
        result = engine.run(report, route_policies={"post-1": {"allowedHosts": ["images.nasa.gov"]}})
        self.assertEqual(result["sectionOrder"][:-1], before_order)
        self.assertEqual(result["posts"], before_posts)
        for key, value in before_sections.items():
            self.assertEqual(result["sections"][key], value, key)
        self.assertEqual(result["sectionOrder"][-1], SECTION_KEY)
        self.assertEqual(result["sections"]["managerIdCard"], before_sections["managerIdCard"])
        self.assertEqual(result["sections"]["fullArticle"], before_sections["fullArticle"])
        self.assertEqual(result["sections"]["originalImageRecords"], before_sections["originalImageRecords"])
        self.assertEqual(result["sections"]["imageApprovalChecks"], before_sections["imageApprovalChecks"])
        section9 = result["sections"][SECTION_KEY]["posts"][0]
        self.assertTrue(section9["originalImageAlreadyApproved"])
        self.assertEqual(section9["decision"], "READY_FOR_CHECKER_REVIEW")
        self.assertEqual(section9["finalImage"]["sourceImageUrl"], self.candidate["url"])
        self.assertEqual(section9["visualIntelligence"]["status"], "PASS")
        self.assertEqual(result["checkerHandoff"]["phase"], "checker-image-final-review")
        self.assertFalse(result["checkerHandoff"]["imageRightsApproved"])
        self.assertEqual(result["checkerHandoff"]["posts"][0]["candidate"]["sha256"], section9["finalImage"]["sha256"])
        self.assertEqual(section9["lineage"]["managerJob"], manager_job_fixture())
        self.assertEqual(section9["lineage"]["managerIdCardSha256"], result["sections"]["managerIdCard"]["sha256"])
        self.assertEqual(section9["finalImage"]["lineage"], section9["lineage"])
        self.assertEqual(section9["lineage"]["mediaLineage"]["destinationDatabaseId"], manager_job_fixture()["destinationDatabaseId"])

    def test_unapproved_original_is_not_reused_but_explicit_alternative_is_submitted(self):
        report = self.report(approved=False)
        alternative = copy.deepcopy(self.candidate)
        alternative.update({"candidateId": "commons-alt-1", "url": "https://upload.wikimedia.org/example.jpg", "originalUrl": "https://upload.wikimedia.org/example.jpg", "sourceMediaUrl": "https://upload.wikimedia.org/example.jpg", "sourcePage": "https://commons.wikimedia.org/wiki/File:Example.jpg", "stagedPath": str(self.source), "rightsEvidence": {"creator": "Example creator", "licenseName": "CC BY 4.0", "credit": "Example creator"}})
        engine = ImageEngineSection9(self.root / "engine-stage", visual_inspector=FakeVisualInspector())
        result = engine.run(
            report,
            route_policies={"post-1": {"allowedHosts": ["upload.wikimedia.org"], "temporaryProcessingAllowed": True}},
            discovered_candidates={"post-1": [alternative]},
        )
        sec9 = result["sections"][SECTION_KEY]["posts"][0]
        self.assertFalse(sec9["originalImageAlreadyApproved"])
        self.assertEqual(sec9["processingRoute"], "ALTERNATIVE_OR_GENERATED")
        self.assertEqual(sec9["decision"], "READY_FOR_CHECKER_REVIEW")
        self.assertEqual(sec9["finalImage"]["sourceImageUrl"], alternative["url"])

    def test_missing_temporary_processing_permission_holds_alternative(self):
        report = self.report(approved=False)
        engine = ImageEngineSection9(self.root / "engine-stage", visual_inspector=FakeVisualInspector())
        result = engine.run(report, route_policies={"post-1": {"allowedHosts": ["images.nasa.gov"]}}, discovered_candidates={"post-1": [self.candidate]})
        sec9 = result["sections"][SECTION_KEY]["posts"][0]
        self.assertEqual(sec9["decision"], "NO IMAGE SELECTED")
        self.assertEqual(sec9["finalImage"]["imageUrl"], "")
        self.assertFalse(result["checkerHandoff"]["imageRightsApproved"])

    def test_approved_original_success_does_not_discover_or_download_alternatives(self):
        report = self.report(approved=True)
        # Force the approved original through the bounded download path so the
        # test can prove that no alternative URL is requested or inspected.
        original = report["posts"][0]["section5"]["selectedCandidate"]
        original.pop("stagedPath", None)
        discovered = copy.deepcopy(self.candidate)
        discovered.update({
            "candidateId": "must-not-be-discovered",
            "url": "https://upload.wikimedia.org/example.jpg",
            "originalUrl": "https://upload.wikimedia.org/example.jpg",
            "sourceMediaUrl": "https://upload.wikimedia.org/example.jpg",
            "sourcePage": "https://commons.wikimedia.org/wiki/File:Example.jpg",
        })
        discover_calls = []
        def discover(**kwargs):
            discover_calls.append(kwargs["post_id"])
            return [discovered]

        engine = ImageEngineSection9(self.root / "engine-stage", visual_inspector=FakeVisualInspector())
        with patch.object(section9_module, "_download", return_value=(jpeg_bytes(), self.candidate["url"], "image/jpeg")) as downloader:
            result = engine.run(
                report,
                route_policies={"post-1": {"allowedHosts": ["images.nasa.gov", "upload.wikimedia.org"], "temporaryProcessingAllowed": True}},
                candidate_discoverer=discover,
            )

        self.assertEqual(downloader.call_count, 1)
        self.assertEqual(discover_calls, [])
        section9 = result["sections"][SECTION_KEY]["posts"][0]
        self.assertEqual(section9["processingRoute"], "APPROVED_ORIGINAL")
        self.assertEqual(section9["finalImage"]["sourceImageUrl"], self.candidate["url"])
        self.assertFalse(any(x.get("candidateId") == "must-not-be-discovered" for x in section9["candidateReviews"]))

    def test_approved_original_does_not_grant_temporary_permission_to_alternative(self):
        report = self.report(approved=True)
        original = report["posts"][0]["section5"]["selectedCandidate"]
        original.pop("stagedPath", None)
        alternative = copy.deepcopy(self.candidate)
        alternative.update({
            "candidateId": "unapproved-alternative",
            "url": "https://upload.wikimedia.org/example.jpg",
            "originalUrl": "https://upload.wikimedia.org/example.jpg",
            "sourceMediaUrl": "https://upload.wikimedia.org/example.jpg",
            "sourcePage": "https://commons.wikimedia.org/wiki/File:Example.jpg",
            "stagedPath": str(self.source),
        })
        discover_calls = []
        def discover(**kwargs):
            discover_calls.append(kwargs["post_id"])
            return [alternative]

        def download_original_only(url, allowed_hosts, max_bytes, timeout):
            if url == self.candidate["url"]:
                raise ImageEngineSection9Error("Original is inaccessible for this controlled test.")
            self.fail("An alternative must not be downloaded without its own temporary-processing permission.")

        engine = ImageEngineSection9(self.root / "engine-stage", visual_inspector=FakeVisualInspector())
        with patch.object(section9_module, "_download", side_effect=download_original_only):
            result = engine.run(
                report,
                route_policies={"post-1": {"allowedHosts": ["images.nasa.gov", "upload.wikimedia.org"], "temporaryProcessingAllowed": False, "discoveryRoutes": {"approvedConnector": {"enabled": True}}}},
                candidate_discoverer=discover,
            )

        self.assertEqual(discover_calls, ["post-1"])
        section9 = result["sections"][SECTION_KEY]["posts"][0]
        self.assertEqual(section9["decision"], "NO IMAGE SELECTED")
        alternative_review = next(x for x in section9["candidateReviews"] if x["candidateId"] == "unapproved-alternative")
        temp_check = next(x for x in alternative_review["checks"] if x["checkId"] == "E9-04")
        self.assertEqual(temp_check["result"], "FAIL")
        self.assertEqual(alternative_review["decision"], "HOLD")

    def test_external_discovery_callback_requires_checker_enabled_route(self):
        report = self.report(approved=False)
        report["sections"]["originalImageRecords"]["posts"][0]["images"] = []
        calls = []
        def discover(**kwargs):
            calls.append(kwargs["post_id"])
            return [self.candidate]

        engine = ImageEngineSection9(self.root / "engine-stage", visual_inspector=FakeVisualInspector())
        result = engine.run(
            report,
            route_policies={"post-1": {"allowedHosts": ["images.nasa.gov"], "temporaryProcessingAllowed": True}},
            candidate_discoverer=discover,
        )
        self.assertEqual(calls, [])
        section9 = result["sections"][SECTION_KEY]["posts"][0]
        self.assertEqual(section9["decision"], "NO IMAGE SELECTED")

    def test_missing_allowed_host_rejects_even_approved_candidate(self):
        report = self.report(approved=True)
        engine = ImageEngineSection9(self.root / "engine-stage", visual_inspector=FakeVisualInspector())
        result = engine.run(report, route_policies={"post-1": {"allowedHosts": []}})
        sec9 = result["sections"][SECTION_KEY]["posts"][0]
        self.assertEqual(sec9["decision"], "NO IMAGE SELECTED")

    def test_checker_enabled_commons_route_uses_route_specific_host_and_processing_policy(self):
        report = self.report(approved=False)
        report["sections"]["originalImageRecords"]["posts"][0]["images"] = []
        report["sections"]["fullArticle"]["posts"][0]["articleUrl"] = self.candidate["sourcePage"]

        class FakeCommonsEngine:
            def __init__(self, staging_dir, **kwargs):
                self.staging_dir = Path(staging_dir)

            def discover_commons(self, query, *, view_id, post_id, article_url, accepted_licenses):
                self.asserted = (view_id, post_id, article_url, accepted_licenses)
                return [{"file": "commons-item"}]

            def prepare_commons_candidate(self, found, *, asset_url_base):
                self.staging_dir.mkdir(parents=True, exist_ok=True)
                path = self.staging_dir / "commons.jpg"
                path.write_bytes(jpeg_bytes(color=(70, 100, 130)))
                return {
                    "candidateId": "commons-engine-1",
                    "url": "https://upload.wikimedia.org/example/mars-delta.jpg",
                    "originalUrl": "https://upload.wikimedia.org/example/mars-delta.jpg",
                    "sourceMediaUrl": "https://upload.wikimedia.org/example/mars-delta.jpg",
                    "sourcePage": "https://commons.wikimedia.org/wiki/File:Mars_delta.jpg",
                    "caption": "Mars rover landscape illustration.",
                    "altText": "A rover in a Mars landscape.",
                    "creator": "Example Creator",
                    "credit": "Example Creator",
                    "licenseName": "CC BY 4.0",
                    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                    "rightsEvidence": {"creator": "Example Creator", "credit": "Example Creator", "licenseName": "CC BY 4.0"},
                    "stagedPath": str(path),
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                    "mime": "image/jpeg",
                    "mimeType": "image/jpeg",
                    "width": 640,
                    "height": 480,
                    "sourceId": "nasa",
                }

        route = {
            "allowedHosts": [],
            "viewId": manager_job_fixture()["viewId"],
            "managerJob": manager_job_fixture(),
            "discoveryRoutes": {
                "wikimediaCommons": {
                    "enabled": True,
                    "acceptedLicenses": ["CC BY 4.0"],
                    "allowedHosts": ["upload.wikimedia.org"],
                    "temporaryProcessingAllowed": True,
                }
            },
        }
        engine = ImageEngineSection9(
            self.root / "engine-stage",
            visual_inspector=FakeVisualInspector(),
            engine_factory=FakeCommonsEngine,
        )
        result = engine.run(report, route_policies={"post-1": route})
        section9 = result["sections"][SECTION_KEY]["posts"][0]
        self.assertEqual(section9["decision"], "READY_FOR_CHECKER_REVIEW")
        self.assertEqual(section9["processingRoute"], "ALTERNATIVE_OR_GENERATED")
        host_check = next(x for x in section9["checks"] if x["checkId"] == "E9-03")
        processing_check = next(x for x in section9["checks"] if x["checkId"] == "E9-04")
        self.assertEqual(host_check["result"], "PASS")
        self.assertEqual(processing_check["result"], "PASS")
        self.assertEqual(section9["finalImage"]["sourceImageUrl"], "https://upload.wikimedia.org/example/mars-delta.jpg")

    def test_checker_enabled_local_illustration_uses_its_internal_host_allowlist(self):
        report = self.report(approved=False)
        report["sections"]["originalImageRecords"]["posts"][0]["images"] = []
        report["sections"]["fullArticle"]["posts"][0]["articleUrl"] = self.candidate["sourcePage"]

        class FakeIllustrationEngine:
            def __init__(self, staging_dir, **kwargs):
                self.staging_dir = Path(staging_dir)

            def create_original_illustration(self, *, post, view_id, asset_url_base, manager_job):
                self.staging_dir.mkdir(parents=True, exist_ok=True)
                path = self.staging_dir / "local-illustration.jpg"
                path.write_bytes(jpeg_bytes(color=(80, 110, 75)))
                return {
                    "candidateId": "local-illustration-1",
                    "assetUrl": "https://raw.githubusercontent.com/example/live-earth/main/nature/published/assets/local-illustration.jpg",
                    "sourcePage": post["articleUrl"],
                    "caption": "Original thematic illustration for a Mars rover story.",
                    "altText": "A stylised Mars rover and river delta landscape.",
                    "creator": "LIVE // EARTH",
                    "credit": "LIVE // EARTH original illustration",
                    "licenseName": "Original local illustration",
                    "rightsEvidence": {"creator": "LIVE // EARTH", "licenseName": "Original local illustration", "rightsBasis": "Created locally by the Image Engine", "credit": "LIVE // EARTH original illustration"},
                    "stagedPath": str(path),
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                    "mime": "image/jpeg",
                    "mimeType": "image/jpeg",
                    "width": 640,
                    "height": 480,
                    "sourceId": "nasa",
                    "originType": "local-original-illustration",
                }

        manager_job = manager_job_fixture()
        route = {
            "allowedHosts": [],
            "temporaryProcessingAllowed": False,
            "viewId": manager_job["viewId"],
            "managerJob": manager_job,
            "discoveryRoutes": {"localIllustration": {"enabled": True}},
        }
        engine = ImageEngineSection9(
            self.root / "engine-stage",
            visual_inspector=FakeVisualInspector(),
            engine_factory=FakeIllustrationEngine,
        )
        result = engine.run(report, route_policies={"post-1": route})
        section9 = result["sections"][SECTION_KEY]["posts"][0]
        self.assertEqual(section9["decision"], "READY_FOR_CHECKER_REVIEW")
        self.assertEqual(section9["processingRoute"], "ALTERNATIVE_OR_GENERATED")
        host_check = next(x for x in section9["checks"] if x["checkId"] == "E9-03")
        self.assertEqual(host_check["result"], "PASS")
        self.assertEqual(section9["finalImage"]["originType"], "local-original-illustration")

    def test_no_visual_adapter_is_reported_as_unknown_not_fabricated(self):
        report = self.report(approved=True)
        engine = ImageEngineSection9(self.root / "engine-stage")
        result = engine.run(report, route_policies={"post-1": {"allowedHosts": ["images.nasa.gov"]}})
        sec9 = result["sections"][SECTION_KEY]["posts"][0]
        self.assertEqual(sec9["decision"], "READY_FOR_CHECKER_REVIEW")
        self.assertEqual(sec9["visualIntelligence"]["status"], "UNKNOWN")
        self.assertIn("No semantic vision adapter", sec9["visualIntelligence"]["reason"])

    def test_manager_card_hash_tampering_is_rejected(self):
        report = self.report(approved=True)
        report["sections"]["managerIdCard"]["sha256"] = "0" * 64
        with self.assertRaises(ImageEngineSection9Error):
            ImageEngineSection9(self.root / "engine-stage").run(report, route_policies={"post-1": {"allowedHosts": ["images.nasa.gov"]}})

    def test_invalid_checker_report_is_rejected(self):
        with self.assertRaises(ImageEngineSection9Error):
            ImageEngineSection9(self.root / "engine-stage").run({"schemaVersion": 2})


if __name__ == "__main__":
    unittest.main()
