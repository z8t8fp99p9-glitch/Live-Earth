from __future__ import annotations

import copy
import html
import re
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# The production repository already contains editorial_text_intelligence.py.
# The isolated ZIP-test workspace does not include/rewrite that protected
# existing module, so tests install a small interface-compatible test double
# only when the production module cannot be imported. In the uploaded repo,
# the real implementation is imported instead.
try:
    import editorial_text_intelligence  # noqa: F401
except ImportError:
    fake = types.ModuleType("editorial_text_intelligence")
    fake._clean = lambda value, limit=30000: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", " ", str(value or "")))).strip()[:limit]
    fake._split_sentences = lambda value: [x.strip() for x in re.split(r"(?<=[.!?])\s+", value.strip()) if x.strip()]
    fake._remove_near_duplicate_sentences = lambda values: list(dict.fromkeys(values))
    fake._sentence_scores = lambda sentences, title: [1.0 for _ in sentences]
    def _fake_select(sentences, scores, target_min=120, target_max=150):
        selected, total = [], 0
        for index, sentence in enumerate(sentences):
            count = len(sentence.split())
            if count <= target_max and total + count <= target_max:
                selected.append(index)
                total += count
            if total >= target_min:
                break
        return selected
    fake._select_mmr = _fake_select
    fake._compose_long_source = lambda source, title, sentences: " ".join(sentences)
    fake._NUMBER_OR_MEASUREMENT = re.compile(r"\b\d+(?:\.\d+)?%?\b")
    fake._QUOTED = re.compile(r"(?:\"[^\"]{8,}\"|“[^”]{8,}”)" )
    fake._NEGATION = re.compile(r"\b(?:not|no|never|cannot|without)\b", re.I)
    fake._UNCERTAINTY = re.compile(r"\b(?:may|might|could|preliminary|uncertain)\b", re.I)
    sys.modules["editorial_text_intelligence"] = fake

import live_feed_editor as editor


SENTENCES = [
    "NASA scientists completed a new survey of the northern region after several months of coordinated observations.",
    "The research team compared fresh measurements with earlier records collected by instruments across the same area.",
    "A set of autonomous spacecraft transmitted updated readings while operators monitored the changing environmental conditions.",
    "Researchers reported that several locations showed clear differences from the measurements recorded during the previous survey.",
    "The report describes how the team checked each instrument and removed duplicate readings before comparing the results.",
    "Scientists said the new observations provide additional context but do not establish a single explanation for every change.",
    "The published data includes separate measurements for the northern route, central stations, and the surrounding region.",
    "Researchers also documented the timing of each observation so other teams can compare results across future surveys.",
    "The instruments recorded temperature, pressure, and movement at regular intervals throughout the complete observation period.",
    "The team noted that some readings remain preliminary and will require further analysis before firm conclusions can be drawn.",
    "Scientists reviewed the results against independent observations and identified several areas that need closer examination.",
    "The research group plans to repeat the survey during the next observation period to determine whether the pattern continues.",
    "The report also explains how changing conditions affected the instruments and the timing of measurements at each station.",
    "Researchers published the methods and supporting data alongside the findings to make the process easier to reproduce.",
    "The team said additional observations may help clarify the differences between the northern and central measurement areas.",
    "The study records limitations in the available dataset and advises readers not to treat preliminary patterns as final results.",
    "Several independent teams will review the measurements and compare them with information gathered during earlier field work.",
    "The researchers expect the next survey to add more detail about the conditions observed across the wider region.",
    "The project combines instrument readings, satellite observations, and field reports to build a more complete record.",
    "Scientists will publish further updates when the remaining measurements have been reviewed and the analysis is complete.",
]


class LiveFeedEditorTests(unittest.TestCase):
    def make_report(self, *, release=True, article_text=None):
        article_text = article_text if article_text is not None else " ".join(SENTENCES)
        image_url = "https://images.nasa.gov/example-live-image.jpg"
        image_hash = "a" * 64
        final_image = {
            "selected": True,
            "candidateId": "nasa-original-01",
            "imageUrl": image_url,
            "sourceImageUrl": image_url,
            "preparedAssetUrl": "",
            "assetPublished": False,
            "sourcePage": "https://www.nasa.gov/news/example/",
            "stagedPath": ".image-engine-staging/job-01/example.jpg",
            "sha256": image_hash,
            "mimeType": "image/jpeg",
            "width": 1600,
            "height": 900,
            "fileSizeBytes": 456789,
            "creator": "NASA",
            "credit": "NASA",
            "caption": "NASA image showing the research location.",
            "altText": "Research location observed by NASA.",
            "licenseName": "Public domain",
            "licenseUrl": "",
            "originType": "source-image",
        }
        sections = {
            "managerIdCard": {"section": 1, "payload": {"jobId": "job-01"}},
            "fullArticle": {"section": 2, "posts": [{"postId": "post-01", "fullArticle": {
                "articleUrl": "https://www.nasa.gov/news/example/",
                "title": "NASA publishes new research observations",
                "fullText": article_text,
                "sourceName": "NASA",
                "publishedAt": "2026-11-04T09:00:00Z",
            }}]},
            "originalImageRecords": {"section": 3, "posts": []},
            "sourceRightsEvidence": {"section": 4, "posts": []},
            "imageUrlCheckerAndFinalImage": {"section": 5, "posts": []},
            "allChecks": {"section": 6, "posts": []},
            "textApprovalChecks": {"section": 7, "posts": []},
            "imageApprovalChecks": {"section": 8, "posts": [{"postId": "post-01", "rightsEvidence": {
                "creator": "NASA", "credit": "NASA", "licenseName": "Public domain",
            }}]},
            "imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission": {"section": 9, "posts": [{
                "postId": "post-01", "finalImage": final_image,
            }]},
            "finalImageVerificationAndApproval": {"section": 10, "posts": [{
                "postId": "post-01", "candidateUrl": image_url, "candidateSha256": image_hash,
                "decision": "YES", "approved": True,
            }]},
            "postEngineAuditAndFinalDecision": {"section": 11, "posts": [{
                "postId": "post-01", "decision": "APPROVE_FOR_EDITORIAL" if release else "HOLD",
                "editorialEligibility": "EDITORIAL_READY" if release else "HOLD",
                "releaseToEditorial": release,
            }]},
        }
        return {
            "schemaVersion": 2,
            "checker": "LIVE // EARTH Global Checker",
            "checkerVersion": "2.1.1",
            "jobId": "job-01",
            "viewId": "nature",
            "sectionOrder": list(editor.REQUIRED_SECTIONS),
            "sections": sections,
            "posts": [{"postId": "post-01", "section5": {"section": 5}}],
            "collectorSections": {"original": "unchanged"},
            "summary": {"postsReceived": 1},
        }

    def test_appends_only_section12_and_outputs_live_package(self):
        report = self.make_report()
        original = copy.deepcopy(report)
        result = editor.append_live_feed_output(report)

        self.assertEqual(report, original, "Editor must not mutate its input")
        for key in editor.REQUIRED_SECTIONS:
            self.assertEqual(result["sections"][key], original["sections"][key], key)
        self.assertEqual(result["posts"], original["posts"])
        self.assertEqual(result["collectorSections"], original["collectorSections"])
        self.assertEqual(result["sectionOrder"][:-1], original["sectionOrder"])
        self.assertEqual(result["sectionOrder"][-1], editor.SECTION_KEY)

        card = result["sections"][editor.SECTION_KEY]
        self.assertEqual(card["section"], 12)
        self.assertEqual(card["title"], "Live Feed Output")
        self.assertNotIn("magazine", card)
        self.assertEqual(card["statistics"]["liveFeedPackagesReady"], 1)
        post = card["posts"][0]
        self.assertEqual(post["status"], "READY")
        self.assertGreaterEqual(post["summaryWordCount"], 100)
        self.assertLessEqual(post["summaryWordCount"], 150)
        self.assertEqual(post["image"]["url"], "https://images.nasa.gov/example-live-image.jpg")
        self.assertEqual(post["image"]["credit"], "NASA")
        self.assertEqual(post["liveFeed"]["summary"], post["summary"])
        self.assertTrue(post["sentenceTrace"])
        self.assertNotIn("fullText", post)

    def test_checker_hold_is_not_promoted_by_editor(self):
        result = editor.append_live_feed_output(self.make_report(release=False))
        post = result["sections"][editor.SECTION_KEY]["posts"][0]
        self.assertEqual(post["status"], "HOLD")
        self.assertIsNone(post["liveFeed"])
        self.assertEqual(result["sections"][editor.SECTION_KEY]["statistics"]["liveFeedPackagesReady"], 0)

    def test_short_source_is_preserved_without_padding(self):
        short = "The observatory completed a short survey on Tuesday. Scientists published the initial measurements. The team plans further analysis."
        result = editor.append_live_feed_output(self.make_report(article_text=short))
        post = result["sections"][editor.SECTION_KEY]["posts"][0]
        self.assertEqual(post["status"], "READY")
        self.assertEqual(post["summary"], short)
        self.assertEqual(post["summaryWordCount"], len(short.split()))
        self.assertEqual(post["summaryStatus"], "SOURCE_SHORT_NO_PADDING")

    def test_section10_section9_image_reference_mismatch_holds_post(self):
        report = self.make_report()
        report["sections"]["finalImageVerificationAndApproval"]["posts"][0]["candidateUrl"] = "https://example.com/different.jpg"
        result = editor.append_live_feed_output(report)
        post = result["sections"][editor.SECTION_KEY]["posts"][0]
        self.assertEqual(post["status"], "HOLD")
        self.assertIsNone(post["liveFeed"])

    def test_missing_full_article_holds_post(self):
        report = self.make_report(article_text="")
        result = editor.append_live_feed_output(report)
        post = result["sections"][editor.SECTION_KEY]["posts"][0]
        self.assertEqual(post["status"], "HOLD")
        self.assertIsNone(post["liveFeed"])

    def test_refuses_to_overwrite_existing_section12(self):
        report = self.make_report()
        report["sections"][editor.SECTION_KEY] = {"section": 12, "title": "Existing card"}
        report["sectionOrder"].append(editor.SECTION_KEY)
        with self.assertRaises(editor.LiveFeedEditorError):
            editor.append_live_feed_output(report)

    def test_rejects_report_without_all_eleven_original_sections(self):
        report = self.make_report()
        del report["sections"]["allChecks"]
        with self.assertRaises(editor.LiveFeedEditorError):
            editor.append_live_feed_output(report)


if __name__ == "__main__":
    unittest.main()
