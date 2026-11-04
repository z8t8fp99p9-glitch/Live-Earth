import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from checker_report_archive import archive_report, prune_archive, CheckerArchiveError


def fixture():
    names = [f"section{i}" for i in range(1, 14)]
    names[1] = "fullArticle"
    names[2] = "originalImageRecords"
    names[3] = "sourceRightsEvidence"
    names[11] = "liveFeedOutput"
    names[12] = "postEditorialFinalVerification"
    return {
        "schemaVersion": 2, "jobId": "job-123", "viewId": "nature", "checkerVersion": "2.1.1",
        "sectionOrder": names,
        "sections": {
            **{name: {"section": i + 1, "posts": []} for i, name in enumerate(names)},
            "fullArticle": {"section": 2, "posts": [{"postId": "p1", "title": "Headline", "text": "Full article body with facts.", "fullArticle": {"feedSummary": "Raw feed summary also stays transient."}}]},
            "liveFeedOutput": {"section": 12, "posts": [{"postId": "p1", "summary": "A concise derived summary."}]},
            "postEditorialFinalVerification": {"section": 13, "posts": [{"postId": "p1", "decision": "APPROVE_FOR_DATABASE"}]},
        },
    }


def test_archives_complete_13_section_report_and_redacts_article(tmp_path):
    report = fixture()
    result = archive_report(report, tmp_path, "nature")
    saved = json.loads(Path(result["path"]).read_text())
    assert result["archived"] is True
    assert saved["sectionCount"] == 13
    assert saved["report"]["sections"]["fullArticle"]["posts"][0]["title"] == "Headline"
    assert "text" not in saved["report"]["sections"]["fullArticle"]["posts"][0]
    assert "feedSummary" not in saved["report"]["sections"]["fullArticle"]["posts"][0]["fullArticle"]
    assert len(saved["sourceArticleIntegrityReceipts"]) == 2
    assert saved["sourceArticleIntegrityReceipts"][0]["wordCount"] == 5
    assert saved["archivePolicy"]["viewDatabaseWritten"] is False
    assert "text" in report["sections"]["fullArticle"]["posts"][0]  # input remains unchanged


def test_rejects_report_without_section13(tmp_path):
    report = fixture()
    report["sections"].pop("postEditorialFinalVerification")
    with __import__("pytest").raises(CheckerArchiveError):
        archive_report(report, tmp_path, "nature")


def test_rejects_wrong_view(tmp_path):
    with __import__("pytest").raises(CheckerArchiveError):
        archive_report(fixture(), tmp_path, "shared")


def test_refuses_overwrite(tmp_path):
    report = fixture()
    report["reportId"] = "stable-report"
    archive_report(report, tmp_path, "nature")
    with __import__("pytest").raises(CheckerArchiveError):
        archive_report(report, tmp_path, "nature")


def test_prunes_only_old_archive_records(tmp_path):
    old = {
        "recordType": "global-checker-final-report",
        "archivedAt": (datetime.now(timezone.utc) - timedelta(days=40)).isoformat(),
    }
    keep = {"recordType": "global-checker-final-report", "archivedAt": datetime.now(timezone.utc).isoformat()}
    (tmp_path / "old.json").write_text(json.dumps(old))
    (tmp_path / "new.json").write_text(json.dumps(keep))
    (tmp_path / "unreadable.json").write_text("not json")
    result = prune_archive(tmp_path, 32)
    assert result == {"scanned": 3, "deleted": 1}
    assert not (tmp_path / "old.json").exists()
    assert (tmp_path / "new.json").exists()
    assert (tmp_path / "unreadable.json").exists()


def test_archive_redacts_collector_section_duplicates_but_preserves_image_captions(tmp_path):
    report = fixture()
    report["collectorSections"] = {
        "fullArticle": {"posts": [{"postId": "p1", "fullArticle": {
            "feedSummary": "A transient permitted feed summary.",
            "fullText": "A transient full body copy.",
        }}]},
        "sourceRightsEvidence": {"posts": [{"postId": "p1", "sourceRightsEvidence": {
            "sourceMetadata": {"summary": "Another raw summary copy."},
        }}]},
        "originalImageRecords": {"posts": [{"postId": "p1", "images": [
            {"caption": "Keep the image caption.", "description": "Keep image description metadata."}
        ]}]},
    }
    report["sections"]["sourceRightsEvidence"] = report["collectorSections"]["sourceRightsEvidence"]
    report["sections"]["originalImageRecords"] = report["collectorSections"]["originalImageRecords"]
    result = archive_report(report, tmp_path, "nature")
    saved = json.loads(Path(result["path"]).read_text())
    archived = saved["report"]
    full = archived["collectorSections"]["fullArticle"]["posts"][0]["fullArticle"]
    assert "feedSummary" not in full and "fullText" not in full
    source_metadata = archived["collectorSections"]["sourceRightsEvidence"]["posts"][0]["sourceRightsEvidence"]["sourceMetadata"]
    assert "summary" not in source_metadata
    image_record = archived["collectorSections"]["originalImageRecords"]["posts"][0]["images"][0]
    assert image_record["caption"] == "Keep the image caption."
    assert image_record["description"] == "Keep image description metadata."
    assert len(saved["sourceArticleIntegrityReceipts"]) >= 5
