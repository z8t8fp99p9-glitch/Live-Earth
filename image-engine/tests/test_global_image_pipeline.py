import hashlib
import io
import json
import copy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from global_image_pipeline import run_global_image_pipeline


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
            "description": "A Mars rover beside layered ancient river-delta terrain.",
            "visibleEntities": ["Mars rover", "layered terrain"],
            "eventContext": "A rover landscape scene.",
            "articleRelevance": "YES",
            "misrepresentationWarnings": [],
            "confidence": 0.97,
        }


def jpeg_bytes(size=(640, 480), color=(45, 90, 120)):
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, "JPEG", quality=91)
    return buffer.getvalue()


class GlobalImagePipelineTests(unittest.TestCase):
    def test_complete_collector_to_checker10_and11_callable_handoff(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            article_url = "https://www.nasa.gov/story/mars-rover-delta/"
            image_url = "https://images.nasa.gov/mars-rover-delta.jpg"
            media = {
                "mediaId": "nasa-original-1", "mediaType": "image", "mimeType": "image/jpeg",
                "url": image_url, "originalUrl": image_url, "sourcePage": article_url,
                "title": "Mars rover ancient river delta",
                "caption": "Mars rover explores an ancient river delta.",
                "altText": "Mars rover on layered delta terrain.", "creator": "NASA", "credit": "NASA",
                "licenseName": "Public domain", "rightsNotice": "Public domain US government work",
                "sourceId": "nasa", "width": 640, "height": 480,
            }
            manager_job = manager_job_fixture()
            collector_batch = {
                "schemaVersion": 1,
                "job": manager_job,
                "records": [{
                    "postId": "post-1", "sourceId": "nasa", "sourceFeedUrl": "https://www.nasa.gov/feed/",
                    "canonicalUrl": article_url, "originalUrl": article_url,
                    "title": "Mars rover ancient river delta",
                    "summary": "NASA reports a rover exploring an ancient Martian river delta.",
                    "media": [dict(media)],
                }],
                "collectorSections": {
                    "managerIdCard": manager_card_fixture(manager_job),
                    "fullArticle": {"posts": [{"postId": "post-1", "fullArticle": {
                        "articleUrl": article_url, "title": "Mars rover ancient river delta",
                        "fullText": "The rover explored layered deposits in an ancient Martian river delta.",
                    }}]},
                    "originalImageRecords": {"posts": [{"postId": "post-1", "sourceId": "nasa", "originalImageRecords": [dict(media)]}]},
                    "sourceRightsEvidence": {"posts": [{"postId": "post-1", "sourceRightsEvidence": {
                        "sourceIdentity": {"sourceId": "nasa"},
                        "imageRightsEvidence": [{key: media.get(key, "") for key in (
                            "mediaId", "url", "originalUrl", "sourcePage", "creator", "credit", "caption",
                            "altText", "licenseName", "licenseUrl", "rightsNotice", "mimeType",
                        )}],
                    }}]},
                },
            }
            payload = jpeg_bytes()
            text_policy = {
                "policyId": "nasa-text-policy-v1", "sourceMatch": True,
                "permissions": {
                    "temporaryProcessing": "allowed", "transformation": "allowed",
                    "derivedOutputStorage": "allowed", "derivedOutputDisplay": "allowed",
                },
                "fullArticlePermissions": {"temporaryProcessing": "allowed"},
            }
            image_policies = {"post-1": {
                "policyId": "nasa-image-policy-v1", "policyMatch": True, "candidateUrl": image_url,
                "permissions": {
                    "editorialUse": "allowed", "attribution": "allowed",
                    "modification": "allowed", "storage": "allowed",
                },
            }}
            dispatch = {"post-1": {"allowedHosts": ["images.nasa.gov"], "temporaryProcessingAllowed": True}}
            with patch("image_engine_section9._download", return_value=(payload, image_url, "image/jpeg")):
                final = run_global_image_pipeline(
                    collector_batch,
                    staging_dir=root / "image-stage",
                    text_policy=text_policy,
                    image_policies=image_policies,
                    image_engine_dispatch=dispatch,
                    visual_inspector=FakeVisualInspector(),
                )

            self.assertEqual(final["sectionOrder"], [
                "managerIdCard", "fullArticle", "originalImageRecords", "sourceRightsEvidence",
                "imageUrlCheckerAndFinalImage", "allChecks", "textApprovalChecks", "imageApprovalChecks",
                "imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission", "finalImageVerificationAndApproval",
                "postEngineAuditAndFinalDecision",
            ])
            section10 = final["sections"]["finalImageVerificationAndApproval"]["posts"][0]
            section11 = final["sections"]["postEngineAuditAndFinalDecision"]["posts"][0]
            self.assertEqual(section10["decision"], "YES")
            self.assertEqual(section11["decision"], "APPROVE_FOR_EDITORIAL")
            self.assertEqual(section11["editorialEligibility"], "EDITORIAL_READY")
            self.assertEqual(section10["candidateUrl"], image_url)
            manager_check = next(x for x in section10["checks"] if x["checkId"] == "E10-26")
            self.assertEqual(manager_check["result"], "PASS")
            self.assertEqual(final["sections"]["imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission"]["posts"][0]["lineage"]["managerJob"], manager_job)
            self.assertEqual(len(final["sections"]["finalImageVerificationAndApproval"]["posts"]), 1)
            self.assertEqual(final["sections"]["imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission"]["posts"][0]["decision"], "READY_FOR_CHECKER_REVIEW")
            self.assertFalse(final["boundaries"]["collectorSections1To4Modified"])
            # Section 6 and the per-post original record are frozen after Section 9.
            self.assertFalse(any(x["checkId"].startswith("E10-") for x in final["posts"][0]["section6"]["allChecks"]))
            self.assertFalse(section11["auditContinuation"]["section6Modified"])
            self.assertTrue(section11["auditContinuation"]["noPriorSectionRewritten"])
            self.assertEqual(final["sections"]["postEngineAuditAndFinalDecision"]["statistics"]["approvedForEditorial"], 1)


if __name__ == "__main__":
    unittest.main()
