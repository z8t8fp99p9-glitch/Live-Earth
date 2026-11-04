from __future__ import annotations
import copy, hashlib, json, sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent.parent
sys.path.insert(0,str(HERE.parent))
sys.path.insert(0,str(ROOT/"editorial-engine"))
# The real repository already has this configuration. Create only a minimal
# profile fixture when running the isolated offline stub harness.
_profile_path=ROOT/"global_collection_manager"/"config"/"view-collection-profiles.json"
if not _profile_path.exists():
    _profile_path.parent.mkdir(parents=True, exist_ok=True)
    _profile_path.write_text(json.dumps({"schemaVersion":1,"profiles":[{
        "viewId":"nature","enabled":True,"profileId":"nature-collection-profile",
        "destinationDatabaseId":"nature-sqlite",
        "destinationDatabasePath":".publisher-data/nature/nature.sqlite3",
        "collectorEntrypoint":"global_collector",
        "collectorWorkflow":".github/workflows/nature-publisher.yml"
    }]}), encoding="utf-8")
import global_checker_v2 as checker
import live_feed_editor as editor
from section13_final_verification import finalize_post_editorial_review, Section13Error, REQUIRED_SECTION_KEYS


def digest(value):
    payload=json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(",",":"),default=str)
    return hashlib.sha256(payload.encode()).hexdigest()


def make_report():
    job={
        "jobId":"job-nature-test-001","idempotencyKey":"nature-job-001","viewId":"nature",
        "profileId":"nature-collection-profile","assignmentIds":["assignment-1"],"sourceIds":["nasa"],
        "feedUrls":["https://www.nasa.gov/feed/"],"collectorEntrypoint":"global_collector",
        "collectorWorkflow":".github/workflows/nature-publisher.yml","destinationDatabaseId":"nature-sqlite",
        "destinationDatabasePath":".publisher-data/nature/nature.sqlite3",
        "scheduledAt":"2026-11-04T10:00:00Z","requestWindowHours":24,"configVersion":"1.0.0","trigger":"scheduled",
    }
    source=("NASA scientists reported new observations from a spacecraft mission. "
            "The team described the instruments and explained how the measurements were collected. "
            "Researchers said the results will guide additional analysis during the coming months. "
            "The agency noted that the observations remain part of an ongoing scientific programme. "
            "Further details were shared in the original mission update published by the agency.")
    title="NASA mission reports new observations from spacecraft"
    url="https://www.nasa.gov/missions/example-update/"
    image_url="https://images.nasa.gov/example/mission-original.jpg"
    img_hash="a"*64
    media_id="media-"+"1"*24
    final_image={
        "mediaId":media_id,"candidateId":"candidate-nasa-001","sourceImageUrl":image_url,"sha256":img_hash,
        "mimeType":"image/jpeg","width":1600,"height":900,"altText":"Spacecraft above Earth",
        "caption":"A spacecraft observes Earth.","credit":"NASA/JPL-Caltech","creator":"NASA/JPL-Caltech",
        "sourcePage":"https://images.nasa.gov/details/example","licenseName":"NASA Media Usage Guidelines",
        "licenseUrl":"https://www.nasa.gov/nasa-brand-center/images-and-media/","originType":"NASA",
        "stagedPath":".image-engine-staging/nature/mission.jpg","fileSizeBytes":123456,
    }
    rights={"creator":"NASA/JPL-Caltech","credit":"NASA/JPL-Caltech","licenseName":"NASA Media Usage Guidelines","licenseUrl":"https://www.nasa.gov/nasa-brand-center/images-and-media/","rightsBasis":"NASA public media policy"}
    original_post={"postId":"post-nasa-001","sourceId":"nasa","canonicalUrl":url,"title":title}
    sections={
        "managerIdCard":{"payload":job,"sha256":digest(job)},
        "fullArticle":{"posts":[{"postId":"post-nasa-001","fullArticle":{"title":title,"fullText":source,"articleUrl":url,"sourceName":"NASA","sourceFeedUrl":"https://www.nasa.gov/feed/","publishedAt":"2026-11-04T09:00:00Z"}}]},
        "originalImageRecords":{"posts":[{"postId":"post-nasa-001","originalImageRecords":[{"mediaId":media_id,"originalUrl":image_url}]}]},
        "sourceRightsEvidence":{"posts":[{"postId":"post-nasa-001","sourceRightsEvidence":{"sourceIdentity":{"sourceName":"NASA","sourceId":"nasa"},"imageRightsEvidence":[{"mediaId":media_id,"originalUrl":image_url,"creator":rights["creator"],"credit":rights["credit"],"licenseName":rights["licenseName"],"licenseUrl":rights["licenseUrl"]}]}}]},
        "imageUrlCheckerAndFinalImage":{"posts":[{"postId":"post-nasa-001","selectedImageUrl":image_url}]},
        "allChecks":{"posts":[{"postId":"post-nasa-001","executionComplete":True}]},
        "textApprovalChecks":{"posts":[{"postId":"post-nasa-001","decision":"YES","approved":True,"checks":[{"checkId":f"T{i:02d}","executed":"YES","result":"PASS"} for i in range(1,12)]}]},
        "imageApprovalChecks":{"posts":[{"postId":"post-nasa-001","decision":"YES","approved":True,"rightsEvidence":rights}]},
        "imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission":{"section":9,"posts":[{"postId":"post-nasa-001","decision":"READY_FOR_CHECKER_REVIEW","finalImage":final_image,"lineage":{"postId":"post-nasa-001","jobId":job["jobId"],"viewId":"nature","sourceId":"nasa","managerJob":job}}]},
    }
    prior_keys=REQUIRED_SECTION_KEYS[:9]
    prior_hashes={key:checker._canonical_hash(sections[key]) for key in prior_keys}
    section10_checks=[{"checkId":f"E10-{i:02d}","executed":"YES","result":"PASS"} for i in range(1,4)]
    sec10={"section":10,"postId":"post-nasa-001","candidateUrl":image_url,"candidateSha256":img_hash,"decision":"YES","approved":True,"checks":section10_checks,"checksSummary":{"executed":3,"passed":3,"failed":0,"unknown":0,"allExecuted":True}}
    sections["finalImageVerificationAndApproval"]={"section":10,"posts":[sec10],"statistics":{"postsReviewed":1,"imagesApproved":1}}
    section11_checks=[{"checkId":f"N11-0{i}","executed":"YES","result":"PASS","reason":"Verified."} for i in range(1,7)]
    section11={
        "section":11,"postId":"post-nasa-001","decision":"APPROVE_FOR_EDITORIAL","editorialEligibility":"EDITORIAL_READY","releaseToEditorial":True,
        "checks":section11_checks,"sourceDecisions":{"section7TextDecision":"YES","section8OriginalImageRightsDecision":"YES","section9ImageEngineDecision":"READY_FOR_CHECKER_REVIEW","section10FinalImageDecision":"YES"},
        "auditContinuation":{"priorSectionHashes":prior_hashes,"originalPostRecordSha256":checker._canonical_hash(original_post),"noPriorSectionRewritten":True,"originalPostRecordsUnchanged":True},"reasons":[],
    }
    sections["postEngineAuditAndFinalDecision"]={"section":11,"posts":[section11],"statistics":{"postsReviewed":1,"approvedForEditorial":1,"held":0}}
    summary=editor._make_live_summary(source,title)
    image=editor._image_for_live(sections["imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission"]["posts"][0],sec10,sections["imageApprovalChecks"]["posts"][0])
    public=image["public"]
    live={"title":title,"summary":summary["text"],"image":public,"sourceUrl":url,"sourceName":"NASA","sourceFeedUrl":"https://www.nasa.gov/feed/","publishedAt":"2026-11-04T09:00:00Z"}
    sections["liveFeedOutput"]={
        "section":12,"title":"Live Feed Output","editorVersion":"1.0.0",
        "posts":[{"section":12,"postId":"post-nasa-001","status":"READY","headline":title,"summary":summary["text"],"summaryWordCount":summary["wordCount"],"summaryStatus":summary["status"],"summaryMethod":summary["method"],"summarySourceSha256":summary["sourceSha256"],"summarySha256":summary["summarySha256"],"sentenceTrace":summary["sentenceTrace"],"image":public,"privateImageProcessing":image["privateProcessing"],"sourceUrl":url,"liveFeed":live,"inputReferences":{"section2":"fullArticle","section8":"imageApprovalChecks","section9":"imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission","section10":"finalImageVerificationAndApproval","section11":"postEngineAuditAndFinalDecision"}}],
        "statistics":{"checkerPostsReceived":1,"liveFeedPackagesReady":1,"postsHeld":0},
    }
    return {"schemaVersion":2,"checker":checker.CHECKER_NAME,"checkerVersion":checker.CHECKER_VERSION,"jobId":job["jobId"],"viewId":"nature","checkedAt":"2026-11-04T10:01:00Z","posts":[original_post],"sectionOrder":list(REQUIRED_SECTION_KEYS),"sections":sections}


def test_happy_path_approves_database_and_is_append_only():
    report=make_report(); before=copy.deepcopy(report)
    result=finalize_post_editorial_review(report)
    post=result["sections"]["postEditorialFinalVerification"]["posts"][0]
    assert post["decision"]=="APPROVE_FOR_DATABASE"
    assert report==before
    for key in REQUIRED_SECTION_KEYS:
        assert result["sections"][key]==before["sections"][key]
    assert result["posts"]==before["posts"]
    assert len(result["sectionOrder"])==13
    assert result["sections"]["postEditorialFinalVerification"]["statistics"]["approvedForDatabase"]==1


def test_mutated_summary_is_held():
    report=make_report(); report["sections"]["liveFeedOutput"]["posts"][0]["summary"] += " Unsupported extra claim."
    result=finalize_post_editorial_review(report)
    post=result["sections"]["postEditorialFinalVerification"]["posts"][0]
    assert post["decision"]=="HOLD"
    assert any(x["checkId"]=="C13-04" and x["result"]=="FAIL" for x in post["checks"])


def test_altered_image_url_is_held():
    report=make_report(); report["sections"]["liveFeedOutput"]["posts"][0]["image"]["url"]="https://images.example/replacement.jpg"
    result=finalize_post_editorial_review(report)
    post=result["sections"]["postEditorialFinalVerification"]["posts"][0]
    assert post["decision"]=="HOLD"
    assert any(x["checkId"]=="C13-08" and x["result"]=="FAIL" for x in post["checks"])


def test_section11_hold_is_not_promoted_and_is_reported_as_hold():
    report=make_report()
    sec11=report["sections"]["postEngineAuditAndFinalDecision"]
    item=sec11["posts"][0]; item["decision"]="HOLD"; item["editorialEligibility"]="HOLD"; item["releaseToEditorial"]=False
    item["checks"][1]["result"]="FAIL"; item["reasons"]=[{"checkId":"N11-02","result":"FAIL","reason":"Text approval failed."}]
    sec11["statistics"]={"postsReviewed":1,"approvedForEditorial":0,"held":1}
    section12=report["sections"]["liveFeedOutput"]
    section12["posts"][0]={"section":12,"postId":"post-nasa-001","status":"HOLD","reason":"Section 11 did not release this post.","liveFeed":None}
    section12["statistics"]={"checkerPostsReceived":1,"liveFeedPackagesReady":0,"postsHeld":1}
    result=finalize_post_editorial_review(report)
    post=result["sections"]["postEditorialFinalVerification"]["posts"][0]
    assert post["decision"]=="HOLD"
    assert any(x["result"]=="HOLD" for x in post["checks"])
    assert post["upstreamHoldReasons"][0]["checkId"]=="N11-02"


def test_section1_manager_tampering_fails_closed():
    report=make_report(); report["sections"]["managerIdCard"]["payload"]["viewId"]="alien-world"
    result=finalize_post_editorial_review(report)
    post=result["sections"]["postEditorialFinalVerification"]["posts"][0]
    assert post["decision"]=="HOLD"
    assert any(x["checkId"]=="C13-11" and x["result"]=="FAIL" for x in post["checks"])


def test_missing_section12_and_attempted_overwrite_are_rejected():
    report=make_report(); del report["sections"]["liveFeedOutput"]
    try: finalize_post_editorial_review(report)
    except Section13Error: pass
    else: raise AssertionError("missing Section 12 must be rejected")
    report=make_report(); report["sections"]["postEditorialFinalVerification"]={}
    try: finalize_post_editorial_review(report)
    except Section13Error: pass
    else: raise AssertionError("overwrite must be rejected")


def test_short_source_exception_is_not_padded():
    report=make_report()
    post=finalize_post_editorial_review(report)["sections"]["postEditorialFinalVerification"]["posts"][0]
    word_check=next(x for x in post["checks"] if x["checkId"]=="C13-05")
    assert word_check["result"]=="PASS"
    assert word_check["actual"]["shortSourceException"] is True


def test_incomplete_sentence_trace_is_held():
    report=make_report(); report["sections"]["liveFeedOutput"]["posts"][0]["sentenceTrace"]=[]
    result=finalize_post_editorial_review(report)
    post=result["sections"]["postEditorialFinalVerification"]["posts"][0]
    assert post["decision"]=="HOLD"
    assert any(x["checkId"]=="C13-04" and x["result"]=="FAIL" for x in post["checks"])


def test_explicit_privacy_flag_holds_post():
    report=make_report(); report["posts"][0]["privacyIssue"]=True
    report["sections"]["postEngineAuditAndFinalDecision"]["posts"][0]["auditContinuation"]["originalPostRecordSha256"]=checker._canonical_hash(report["posts"][0])
    result=finalize_post_editorial_review(report)
    post=result["sections"]["postEditorialFinalVerification"]["posts"][0]
    assert post["decision"]=="HOLD"
    assert any(x["checkId"]=="C13-14" and x["result"]=="FAIL" for x in post["checks"])


def test_missing_writer_source_name_holds_post():
    report=make_report()
    report["sections"]["liveFeedOutput"]["posts"][0]["liveFeed"]["sourceName"]=""
    result=finalize_post_editorial_review(report)
    post=result["sections"]["postEditorialFinalVerification"]["posts"][0]
    assert post["decision"]=="HOLD"
    assert any(x["checkId"]=="C13-12" and x["result"]=="FAIL" for x in post["checks"])


def test_raw_article_body_leak_into_section12_is_held():
    report=make_report()
    report["sections"]["liveFeedOutput"]["posts"][0]["articleBody"]="Private source article body"
    result=finalize_post_editorial_review(report)
    post=result["sections"]["postEditorialFinalVerification"]["posts"][0]
    assert post["decision"]=="HOLD"
    assert any(x["checkId"]=="C13-17" and x["result"]=="FAIL" for x in post["checks"])


def test_cross_view_destination_is_held():
    report=make_report()
    report["sections"]["managerIdCard"]["payload"]["destinationDatabasePath"]=".publisher-data/alien-world/alien-world.sqlite3"
    report["sections"]["managerIdCard"]["sha256"]=checker._canonical_hash(report["sections"]["managerIdCard"]["payload"])
    report["sections"]["imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission"]["posts"][0]["lineage"]["managerJob"]=copy.deepcopy(report["sections"]["managerIdCard"]["payload"])
    result=finalize_post_editorial_review(report)
    post=result["sections"]["postEditorialFinalVerification"]["posts"][0]
    assert post["decision"]=="HOLD"
    assert any(x["checkId"]=="C13-11" and x["result"]=="FAIL" for x in post["checks"])


def test_section13_is_attached_to_same_global_checker_class():
    instance=checker.GlobalChecker()
    assert type(instance) is checker.GlobalChecker
    assert callable(getattr(instance,"finalize_post_editorial_review",None))
    result=instance.finalize_post_editorial_review(make_report())
    assert result["sections"]["postEditorialFinalVerification"]["posts"][0]["decision"]=="APPROVE_FOR_DATABASE"


def test_editor_hold_for_previously_eligible_post_does_not_fail_whole_batch_stats():
    report=make_report()
    section12=report["sections"]["liveFeedOutput"]
    section12["posts"][0]={"section":12,"postId":"post-nasa-001","status":"HOLD","reason":"Editor could not build a compliant summary.","liveFeed":None}
    section12["statistics"]={"checkerPostsReceived":1,"liveFeedPackagesReady":0,"postsHeld":1}
    result=finalize_post_editorial_review(report)
    integrity=result["sections"]["postEditorialFinalVerification"]["integrityChecks"]
    stats_check=next(item for item in integrity if item["checkId"]=="C13-G04")
    assert stats_check["result"]=="PASS"
    assert result["sections"]["postEditorialFinalVerification"]["posts"][0]["decision"]=="HOLD"


def test_source_lineage_mismatch_holds_post():
    report=make_report()
    report["sections"]["imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission"]["posts"][0]["lineage"]["sourceId"]="different-source"
    result=finalize_post_editorial_review(report)
    post=result["sections"]["postEditorialFinalVerification"]["posts"][0]
    assert post["decision"]=="HOLD"
    check=next(x for x in post["checks"] if x["checkId"]=="C13-11")
    assert check["actual"]["sourceId"]["collector"]=="nasa"
    assert check["actual"]["sourceId"]["section9"]=="different-source"
