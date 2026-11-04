"""LIVE // EARTH Global Checker v2.1.1.
Creates Sections 5–8 from immutable Collector Sections 1–4, then independently
adds Section 10 after the Image Engine appends Section 9.
No network, image downloads, database writes, or publication.
"""
from __future__ import annotations
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from typing import Any
import json, re, copy

CHECKER_NAME = "LIVE // EARTH Global Checker"
CHECKER_VERSION = "2.1.1"
SECTION_ORDER = ["managerIdCard", "fullArticle", "originalImageRecords", "sourceRightsEvidence", "imageUrlCheckerAndFinalImage", "allChecks", "textApprovalChecks", "imageApprovalChecks", "imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission", "finalImageVerificationAndApproval", "postEngineAuditAndFinalDecision"]

def _s(v, n=4000):
    if v is None: return ""
    if isinstance(v,(dict,list)): return json.dumps(v,ensure_ascii=False,sort_keys=True)[:n]
    return re.sub(r"\s+"," ",str(v)).strip()[:n]
def _d(v): return v if isinstance(v,dict) else {}
def _l(v): return v if isinstance(v,list) else []
def _host(u):
    try:
        p=urlsplit(_s(u,8000))
        return p.hostname.lower().rstrip(".") if p.scheme.lower()=="https" and p.hostname and not p.username and not p.password else ""
    except ValueError: return ""
def _norm(u):
    try:
        p=urlsplit(_s(u,8000)); h=_host(u)
        if not h:return ""
        port=f":{p.port}" if p.port and p.port!=443 else ""
        q=[(k,v) for k,v in parse_qsl(p.query,keep_blank_values=True) if not k.lower().startswith("utm_") and k.lower() not in {"fbclid","gclid","mc_cid","mc_eid"}]
        return urlunsplit(("https",h+port,p.path or "/",urlencode(q,doseq=True),""))
    except (ValueError,TypeError): return ""
def _words(v):
    stop={"the","and","for","with","from","that","this","into","about","image","photo","news","report"}
    return {x for x in re.findall(r"[a-z0-9]{3,}",_s(v).lower()) if x not in stop}
def _check(cid,name,passed,evidence=None,reason=""):
    # YES/NO = actual execution and outcome. UNKNOWN is never silently passed.
    result="UNKNOWN" if passed is None else "PASS" if passed else "FAIL"
    return {"checkId":cid,"checkName":name,"executed":"YES","passed":"YES" if passed is True else "NO","result":result,"evidence":evidence or {},"reason":reason or ("Verified." if result=="PASS" else "Evidence insufficient." if result=="UNKNOWN" else "Requirement not met.")}
def _outcome(checks):
    r=[x["result"] for x in checks]
    return "NO" if "FAIL" in r else "UNKNOWN" if "UNKNOWN" in r or not r else "YES"
def _permission(p,k):
    v=_d(p).get(k)
    if v is True or v in ("allowed","YES"):return True
    if v is False or v in ("prohibited","denied","NO"):return False
    return None

def _restrictive_rights(value):
    text = _s(value, 5000).casefold()
    markers = ("all rights reserved", "used with permission", "permission required", "do not reproduce", "not for reuse", "third-party content", "third party content", "rights managed", "rights-managed", "reuters", "associated press", "getty images", "afp", "alamy", "shutterstock", "istock")
    return any(marker in text for marker in markers)

def _canonical_hash(value):
    payload = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=str)
    return sha256(payload.encode("utf-8")).hexdigest()

def _collector_section(raw, section_name):
    """Build a read-only view of one section from either Collector layout.

    The live Collector stores Sections 2–4 as fields on each item in the
    shared ``collectorSections.posts`` array. Older integrations supplied
    those sections as separate objects with their own ``posts`` arrays.
    This adapter supports both shapes without changing the Collector payload.
    """
    direct = _d(raw.get(section_name))
    if direct:
        return copy.deepcopy(direct)

    section_posts = []
    for collector_post in _l(raw.get("posts")):
        if not isinstance(collector_post, dict) or section_name not in collector_post:
            continue
        section_post = {
            "postId": _s(collector_post.get("postId"), 160),
            section_name: copy.deepcopy(collector_post.get(section_name)),
        }
        if section_name == "originalImageRecords":
            for key in ("sourceId", "sourceName", "sourceWebsiteUrl", "sourceFeedUrl"):
                if collector_post.get(key) not in (None, "", [], {}):
                    section_post[key] = copy.deepcopy(collector_post[key])
        section_posts.append(section_post)
    return {"schemaVersion": raw.get("schemaVersion", 1), "posts": section_posts}


def _positive_int(value, default, maximum):
    try:
        parsed = int(value)
    except (TypeError, ValueError, OverflowError):
        return default
    return min(max(parsed, 1), maximum)

class GlobalChecker:
    def run(self, collector_batch:dict, *, text_policy=None, image_policies=None, image_engine_dispatch=None):
        if not isinstance(collector_batch,dict): raise TypeError("Collector batch must be an object")
        src=json.loads(json.dumps(collector_batch,ensure_ascii=False,default=str))
        job=_d(src.get("job")); posts=_l(src.get("records")); raw=_d(src.get("collectorSections"))
        # Sections 1–4 are passed through unchanged; they are never mutated.
        s1=_d(raw.get("managerIdCard"))
        s2=_collector_section(raw, "fullArticle")
        s3=_collector_section(raw, "originalImageRecords")
        s4=_collector_section(raw, "sourceRightsEvidence")
        tp=_d(text_policy); ip=_d(image_policies); dispatch=_d(image_engine_dispatch)
        results=[]
        for n,p0 in enumerate(posts):
            p=_d(p0); pid=_s(p.get("postId") or p.get("id") or f"record-{n+1}")
            article=_s(p.get("canonicalUrl") or p.get("originalUrl") or p.get("url")); title=_s(p.get("title"))
            full=self._article(pid,s2); candidates=self._candidates(pid,p,s3,{})
            sec5=self._image_selection(pid,title,article,candidates)
            sec7=self._text(pid,p,full,tp,s4)
            sec8=self._image_rights(pid,sec5,ip,s4)
            sec6=self._all_checks(pid,sec5,sec7,sec8)
            image_state="YES" if sec8["decision"]=="YES" else "NO" if sec5["selectedImageUrl"] else "NO IMAGE SELECTED"
            overall="YES" if sec7["decision"]=="YES" and (not sec5["selectedImageUrl"] or image_state=="YES") else "NO"
            results.append({"postId":pid,"section5":sec5,"section6":sec6,"section7":sec7,"section8":sec8,"decision":{"text":sec7["decision"],"image":image_state,"overall":overall}})
        sections={"managerIdCard":s1,"fullArticle":s2,"originalImageRecords":s3,"sourceRightsEvidence":s4,
          "imageUrlCheckerAndFinalImage":{"owner":CHECKER_NAME,"posts":[x["section5"] for x in results]},
          "allChecks":{"owner":CHECKER_NAME,"posts":[x["section6"] for x in results]},
          "textApprovalChecks":{"owner":CHECKER_NAME,"posts":[x["section7"] for x in results]},
          "imageApprovalChecks":{"owner":CHECKER_NAME,"posts":[x["section8"] for x in results]}}
        output={"schemaVersion":2,"checker":CHECKER_NAME,"checkerVersion":CHECKER_VERSION,"checkedAt":datetime.now(timezone.utc).isoformat(),"jobId":job.get("jobId",""),"viewId":job.get("viewId",""),"sectionOrder":SECTION_ORDER[:8],"sections":sections,"collectorSections":copy.deepcopy(raw),"posts":results,
          "summary":{"postsReceived":len(posts),"textApproved":sum(x["section7"]["decision"]=="YES" for x in results),"imagesSelected":sum(bool(x["section5"]["selectedImageUrl"]) for x in results),"imagesApproved":sum(x["section8"]["decision"]=="YES" for x in results),"postsApproved":sum(x["decision"]["overall"]=="YES" for x in results),"postsHeld":sum(x["decision"]["overall"]!="YES" for x in results)},
          "boundaries":{"collectorSections1To4Modified":False,"checkerFetchesWebsites":False,"checkerDownloadsImages":False,"imageEngineCanApproveRights":False,"checkerWritesDatabase":False,"checkerPublishes":False}}
        # Dispatch settings are explicit Checker-issued instructions, not inferred
        # from source domains. They are copied for the Image Engine hand-off.
        output["imageEngineDispatch"] = json.loads(json.dumps(dispatch, ensure_ascii=False, default=str))
        # Preserve the real Manager envelope for the registered local illustration
        # route; never reconstruct missing IDs or routing values.
        if isinstance(job, dict) and job:
            for post_policy in output["imageEngineDispatch"].values():
                if isinstance(post_policy, dict):
                    post_policy.setdefault("managerJob", json.loads(json.dumps(job, ensure_ascii=False, default=str)))
                    post_policy.setdefault("viewId", _s(job.get("viewId"), 80))
        return output

    def finalize_image_review(self, nine_section_report: dict, *, final_image_policies=None, staging_root=None):
        """Append Checker-owned Sections 10 and 11 after independently reviewing Section 9.

        The staging root is mandatory: Checker hashes the exact staged bytes and
        refuses paths outside that private directory. Rights for a previously
        approved original may be reused only when Section 9 returns the exact
        Section 5 URL unchanged and Section 8's complete decision is YES.
        Alternatives require a fresh, exact-candidate policy in final_image_policies.
        """
        if not isinstance(nine_section_report, dict):
            raise TypeError("Image Engine report must be an object")
        if nine_section_report.get("checker") != CHECKER_NAME or nine_section_report.get("checkerVersion") != CHECKER_VERSION:
            raise ValueError("Section 10 requires a report issued by this Global Checker version.")
        if nine_section_report.get("schemaVersion") != 2:
            raise ValueError("Checker report schemaVersion must be 2.")
        sections = _d(nine_section_report.get("sections"))
        section9_key = "imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission"
        required = ["managerIdCard", "fullArticle", "originalImageRecords", "sourceRightsEvidence", "imageUrlCheckerAndFinalImage", "allChecks", "textApprovalChecks", "imageApprovalChecks", section9_key]
        missing = [k for k in required if k not in sections]
        if missing:
            raise ValueError("Nine-section report is incomplete: " + ", ".join(missing))
        handoff = _d(nine_section_report.get("checkerHandoff"))
        if handoff.get("phase") != "checker-image-final-review" or handoff.get("imageRightsApproved") is not False:
            raise ValueError("Section 9 must submit a non-approved checker-image-final-review handoff.")
        if staging_root is None:
            raise ValueError("staging_root is required so Checker can independently verify the staged image bytes.")
        root = Path(staging_root).resolve()
        if not root.exists() or not root.is_dir():
            raise ValueError("staging_root must exist and be a directory.")
        posts = _l(nine_section_report.get("posts"))
        frozen_prior_sections = copy.deepcopy({key: sections[key] for key in required})
        frozen_post_records = copy.deepcopy(posts)
        section9_list = [x for x in _l(_d(sections.get(section9_key)).get("posts")) if isinstance(x, dict)]
        handoff_list = [x for x in _l(handoff.get("posts")) if isinstance(x, dict)]
        section9_posts = {_s(x.get("postId")): x for x in section9_list}
        handoff_posts = {_s(x.get("postId")): x for x in handoff_list}
        post_ids = [_s(x.get("postId")) for x in posts if isinstance(x, dict)]
        if len(post_ids) != len(set(post_ids)) or len(handoff_posts) != len(handoff_list) or len(section9_posts) != len(section9_list):
            raise ValueError("Section 9 contains duplicate post identities.")
        if set(post_ids) != set(handoff_posts) or set(post_ids) != set(section9_posts):
            raise ValueError("Section 9 and Checker handoff post identities do not match the original Checker report.")
        policies = _d(final_image_policies)
        dispatch_policies = _d(nine_section_report.get("imageEngineDispatch"))
        section10_posts = []
        section11_posts = []
        for post in posts:
            p = json.loads(json.dumps(_d(post), ensure_ascii=False, default=str))
            pid = _s(p.get("postId"), 160)
            sec9 = _d(section9_posts.get(pid)); submission = _d(handoff_posts.get(pid))
            sec5, sec7, sec8 = _d(p.get("section5")), _d(p.get("section7")), _d(p.get("section8"))
            candidate = _d(submission.get("candidate")); source_candidate = _d(submission.get("sourceCandidate"))
            final_url = _s(candidate.get("sourceImageUrl") or candidate.get("imageUrl"), 4000)
            source_url = _s(source_candidate.get("originalUrl") or source_candidate.get("sourceMediaUrl") or source_candidate.get("url"), 4000)
            section9_final = _d(sec9.get("finalImage"))
            section9_url = _s(section9_final.get("sourceImageUrl") or section9_final.get("imageUrl"), 4000)
            section9_digest = _s(section9_final.get("sha256"), 128).lower()
            stage_value = _s(candidate.get("stagedPath") or sec9.get("finalImage", {}).get("stagedPath"), 4000)
            digest_expected = _s(candidate.get("sha256") or sec9.get("finalImage", {}).get("sha256"), 128).lower()
            policy = _d(policies.get(pid))
            route_policy = _d(dispatch_policies.get(pid))
            rights = _d(candidate.get("rightsEvidence") or source_candidate.get("rightsEvidence"))
            section4_post = {}
            for evidence_post in _l(_d(sections.get("sourceRightsEvidence")).get("posts")):
                if isinstance(evidence_post, dict) and _s(evidence_post.get("postId")) == pid:
                    section4_post = _d(evidence_post.get("sourceRightsEvidence")) or evidence_post
                    break
            media_id = _s(source_candidate.get("mediaId") or candidate.get("candidateId"))
            final_evidence = None
            for evidence_item in _l(section4_post.get("imageRightsEvidence")):
                if not isinstance(evidence_item, dict):
                    continue
                evidence_url = _s(evidence_item.get("originalUrl") or evidence_item.get("url"))
                evidence_media_id = _s(evidence_item.get("mediaId"))
                if (source_url and evidence_url == source_url) or (media_id and evidence_media_id == media_id):
                    final_evidence = evidence_item
                    break
            merged_rights = dict(final_evidence or {})
            # For the exact unchanged Section 5 original, retain the evidence
            # already assembled and checked by Section 8 (including a policy
            # rights basis) as well as the raw Collector Section 4 evidence.
            if sec8.get("decision") == "YES" and _s(sec5.get("selectedImageUrl")) == source_url:
                section8_rights = _d(sec8.get("rightsEvidence"))
                merged_rights.update({k: v for k, v in section8_rights.items() if v not in (None, "", [], {}) and merged_rights.get(k) in (None, "", [], {})})
            merged_rights.update({k: v for k, v in source_candidate.items() if v not in (None, "", [], {}) and merged_rights.get(k) in (None, "", [], {})})
            merged_rights.update({k: v for k, v in rights.items() if v not in (None, "", [], {}) and merged_rights.get(k) in (None, "", [], {})})
            rights = merged_rights
            permissions = _d(policy.get("permissions"))
            original_route = sec9.get("finalImageUsesApprovedOriginal") is True
            no_candidate = submission.get("candidate") is None or sec9.get("decision") == "NO IMAGE SELECTED"
            lineage = _d(submission.get("lineage"))
            manager = _d(sections.get("managerIdCard"))
            source_candidate_id = _s(source_candidate.get("sourceId"))
            lineage_ok = (
                _s(lineage.get("postId")) == pid
                and (not _s(nine_section_report.get("jobId")) or _s(lineage.get("jobId")) == _s(nine_section_report.get("jobId")))
                and (not _s(nine_section_report.get("viewId")) or _s(lineage.get("viewId")) == _s(nine_section_report.get("viewId")))
                and (not source_candidate_id or _s(lineage.get("sourceId")) == source_candidate_id)
                and _s(_d(sec9.get("lineage")).get("postId")) == pid
            )
            manager_card = _d(sections.get("managerIdCard"))
            expected_manager_job = _d(manager_card.get("payload"))
            expected_manager_hash = _s(manager_card.get("sha256"), 128).lower()
            section9_lineage = _d(sec9.get("lineage"))
            manager_job = _d(lineage.get("managerJob"))
            section9_manager_job = _d(section9_lineage.get("managerJob"))
            manager_hash = _s(lineage.get("managerIdCardSha256"), 128).lower()
            section9_manager_hash = _s(section9_lineage.get("managerIdCardSha256"), 128).lower()
            manager_envelope_ok = bool(
                expected_manager_job and expected_manager_hash
                and _canonical_hash(expected_manager_job) == expected_manager_hash
                and manager_job == expected_manager_job
                and section9_manager_job == expected_manager_job
                and manager_hash == expected_manager_hash
                and section9_manager_hash == expected_manager_hash
            )
            expected_media_lineage = _d(lineage.get("mediaLineage"))
            media_lineage_fields = ("jobId", "viewId", "profileId", "assignmentIds", "idempotencyKey", "configVersion", "destinationDatabaseId", "destinationDatabasePath")
            media_lineage_ok = bool(expected_manager_job) and all(
                expected_media_lineage.get(field) == expected_manager_job.get(field)
                for field in media_lineage_fields
            )
            checks = [
                _check("E10-01", "Nine-section Image Engine report is present", bool(sec9 and submission), {"section9Present": bool(sec9), "handoffPostPresent": bool(submission)}),
                _check("E10-02", "Post and Manager lineage match", lineage_ok, {"postId": pid, "lineage": {k: v for k, v in lineage.items() if k not in {"managerJob"}}, "jobId": nine_section_report.get("jobId"), "viewId": nine_section_report.get("viewId")}),
                _check("E10-03", "Exactly one final image candidate is submitted", False if no_candidate else bool(candidate), {"candidatePresent": bool(candidate), "section9Decision": sec9.get("decision")}),
                _check("E10-26", "Complete Manager ID Card and all Manager lineage fields are preserved unchanged", manager_envelope_ok and media_lineage_ok, {"managerEnvelopeMatchesSection1": manager_job == expected_manager_job and section9_manager_job == expected_manager_job, "managerIdCardHashMatches": bool(expected_manager_hash and manager_hash == expected_manager_hash == section9_manager_hash), "mediaLineageFields": media_lineage_fields, "mediaLineageMatchesManager": media_lineage_ok}),
                _check("E10-27", "Post source ID belongs to the original Manager-assigned source list", (_s(lineage.get("sourceId")) in _l(manager_job.get("sourceIds"))) if _s(lineage.get("sourceId")) else (None if no_candidate else False), {"sourceId": lineage.get("sourceId"), "managerSourceIds": manager_job.get("sourceIds", [])}),
            ]
            if no_candidate:
                checks.extend([
                    _check("E10-04", "Final image URL is an HTTPS source URL", False, {"url": final_url}, "Image Engine reported NO IMAGE SELECTED."),
                    _check("E10-05", "Final candidate matches the Section 9 source record", False, {"sourceUrl": source_url, "finalUrl": final_url}),
                    _check("E10-06", "Image bytes are staged inside the private Checker review root", False, {"stagedPath": stage_value}),
                    _check("E10-24", "Staged image is within the configured byte limit", False, {"fileSizeBytes": 0, "maxImageBytes": 7 * 1024 * 1024}),
                    _check("E10-25", "Temporary processing was authorised before image retrieval", False, {"candidatePresent": False}),
                ])
                decision = "NO IMAGE SELECTED"
                stage_hash = ""
                inspection = {}
                original_match = False
                visual = _d(sec9.get("visualIntelligence"))
            else:
                checks.append(_check("E10-04", "Final image URL is valid HTTPS", bool(_host(final_url)), {"url": final_url, "host": _host(final_url)}))
                handoff_candidate_id = _s(candidate.get("candidateId"))
                source_candidate_id = _s(source_candidate.get("candidateId") or source_candidate.get("mediaId"))
                identity_match = not (handoff_candidate_id and source_candidate_id) or handoff_candidate_id == source_candidate_id
                checks.append(_check("E10-05", "Final image URL and candidate identity match both Section 9 records", bool(final_url and source_url and section9_url and final_url == source_url == section9_url and identity_match), {"finalUrl": final_url, "sourceCandidateUrl": source_url, "section9FinalImageUrl": section9_url, "handoffCandidateId": handoff_candidate_id, "sourceCandidateId": source_candidate_id}))
                allowed_hosts = _l(policy.get("allowedHosts")) or _l(route_policy.get("allowedHosts"))
                if original_route and sec8.get("decision") == "YES":
                    # For a previously approved original, re-use the existing
                    # exact Section 8 rights decision only if the URL is unchanged.
                    section5_url = _s(sec5.get("selectedImageUrl"), 4000)
                    host_allowed = bool(allowed_hosts and _host(final_url) and any(_host(final_url) == str(h).lower().strip().rstrip(".") or _host(final_url).endswith("." + str(h).lower().strip().rstrip(".")) for h in allowed_hosts))
                    original_match = bool(section5_url and final_url == section5_url)
                    sec8_check_map = { _s(x.get("checkId")): x for x in _l(sec8.get("checks")) if isinstance(x, dict) }
                    inherited_rights = all(sec8_check_map.get(code, {}).get("result") == "PASS" for code in ("I01","I02","I03","I04","I05","I06","I07","I08","I09","I10"))
                    exact_policy = sec8.get("decision") == "YES" and original_match and inherited_rights
                    policy_match = exact_policy
                    rights_permission_map = {
                        "editorialUse": exact_policy, "attribution": exact_policy,
                        "storage": exact_policy,
                        "modification": (exact_policy if _s(_d(sec9.get("imagePreparation")).get("modificationPerformed"), 20).upper() == "YES" else True),
                    }
                    rights_evidence_ok = bool(_s(rights.get("creator") or candidate.get("creator")) and _s(rights.get("licenseName") or rights.get("licenseUrl") or rights.get("rightsBasis") or candidate.get("licenseName")))
                    credit_ok = bool(_s(rights.get("credit") or candidate.get("credit") or rights.get("creator") or candidate.get("creator")))
                    rights_notice = _s(rights.get("rightsNotice") or candidate.get("rightsNotice"))
                    restrictive = bool(rights.get("restrictiveNotice") or rights.get("thirdPartyRights") or _restrictive_rights(rights_notice))
                    permission_source = "EXACT_SECTION_8_APPROVAL_REUSED"
                else:
                    host_allowed = bool(allowed_hosts and _host(final_url) and any(_host(final_url) == str(h).lower().strip().rstrip(".") or _host(final_url).endswith("." + str(h).lower().strip().rstrip(".")) for h in allowed_hosts))
                    policy_match = bool(policy.get("policyId") and policy.get("policyMatch") is True and _s(policy.get("candidateUrl") or policy.get("imageUrl") or policy.get("approvedUrl")) == final_url)
                    rights_permission_map = {
                        "editorialUse": _permission(permissions, "editorialUse"),
                        "attribution": _permission(permissions, "attribution"),
                        "storage": _permission(permissions, "storage"),
                        "modification": True if _s(_d(sec9.get("imagePreparation")).get("modificationPerformed"), 20).upper() != "YES" else _permission(permissions, "modification"),
                    }
                    rights_evidence_ok = bool(_s(rights.get("creator") or candidate.get("creator")) and _s(rights.get("licenseName") or rights.get("licenseUrl") or rights.get("rightsBasis") or candidate.get("licenseName")))
                    credit_ok = bool(_s(rights.get("credit") or candidate.get("credit") or rights.get("creator") or candidate.get("creator")))
                    rights_notice = _s(rights.get("rightsNotice") or candidate.get("rightsNotice"))
                    restrictive = bool(rights.get("restrictiveNotice") or rights.get("thirdPartyRights") or _restrictive_rights(rights_notice))
                    permission_source = "FRESH_EXACT_IMAGE_POLICY"
                checks.append(_check("E10-06", "Final image source host is authorised", host_allowed, {"host": _host(final_url), "allowedHosts": allowed_hosts, "route": sec9.get("processingRoute")}))
                # Validate exact staged bytes; never trust a path or hash supplied by Image Engine alone.
                safe_stage = False; stage_hash = ""; inspection = {}; inside = False
                max_image_bytes = _positive_int(policy.get("maxImageBytes") or route_policy.get("maxDownloadBytes"), 7 * 1024 * 1024, 50 * 1024 * 1024)
                try:
                    stage_path = Path(stage_value).resolve()
                    stage_path.relative_to(root)
                    inside = True
                    safe_stage = stage_path.is_file() and not stage_path.is_symlink() and stage_path.stat().st_size <= max_image_bytes
                    if safe_stage:
                        payload = stage_path.read_bytes()
                        stage_hash = sha256(payload).hexdigest()
                        from PIL import Image
                        from io import BytesIO
                        with Image.open(BytesIO(payload)) as im:
                            fmt = (im.format or "").upper(); width, height = im.size; im.verify()
                        mime = {"JPEG":"image/jpeg","PNG":"image/png","WEBP":"image/webp"}.get(fmt, "")
                        inspection = {"format":fmt,"mimeType":mime,"width":width,"height":height,"fileSizeBytes":len(payload)}
                except Exception:
                    safe_stage = False
                checks.append(_check("E10-07", "Image bytes exist inside the controlled staging root", bool(inside and safe_stage), {"stagedPath": stage_value, "stagingRoot": str(root), "insideRoot": inside, "fileExists": safe_stage}))
                checks.append(_check("E10-08", "Staged image SHA-256 matches both Section 9 records", bool(safe_stage and digest_expected and section9_digest and stage_hash == digest_expected == section9_digest), {"handoffSha256": digest_expected, "section9Sha256": section9_digest, "actualSha256": stage_hash}))
                checks.append(_check("E10-24", "Staged image is within the configured byte limit", bool(safe_stage and inspection.get("fileSizeBytes", 0) <= max_image_bytes), {"fileSizeBytes": inspection.get("fileSizeBytes"), "maxImageBytes": max_image_bytes}))
                expected_mime = _s(candidate.get("mimeType") or sec9.get("finalImage", {}).get("mimeType"), 100).lower()
                checks.append(_check("E10-09", "Decoded image format matches declared MIME type", bool(inspection and expected_mime and inspection.get("mimeType") == expected_mime), {"decoded": inspection.get("mimeType"), "declared": expected_mime, "format": inspection.get("format")}))
                min_width = _positive_int(policy.get("minimumWidth"), 1, 20000); min_height = _positive_int(policy.get("minimumHeight"), 1, 20000)
                dims_ok = bool(inspection and inspection.get("width", 0) >= min_width and inspection.get("height", 0) >= min_height and inspection.get("width") == candidate.get("width") and inspection.get("height") == candidate.get("height"))
                dims_ok = dims_ok and inspection.get("width") == section9_final.get("width") and inspection.get("height") == section9_final.get("height")
                checks.append(_check("E10-10", "Decoded dimensions match the two reports and minimums", dims_ok, {"decodedWidth": inspection.get("width"), "decodedHeight": inspection.get("height"), "handoffWidth": candidate.get("width"), "handoffHeight": candidate.get("height"), "section9Width": section9_final.get("width"), "section9Height": section9_final.get("height"), "minimumWidth": min_width, "minimumHeight": min_height}))
                source_page = _s(candidate.get("sourcePage") or source_candidate.get("sourcePage"), 4000)
                checks.append(_check("E10-11", "Image source page provenance is present", bool(_host(source_page)), {"sourcePage": source_page, "sourceHost": _host(source_page)}))
                checks.append(_check("E10-12", "Creator identity is evidenced", bool(_s(rights.get("creator") or candidate.get("creator"))), {"creator": rights.get("creator") or candidate.get("creator")}))
                rights_basis = _s(rights.get("licenseName") or rights.get("licenseUrl") or rights.get("rightsBasis") or candidate.get("licenseName"), 1000)
                checks.append(_check("E10-13", "Licence or rights basis is evidenced", bool(rights_basis), {"rightsBasis": rights_basis, "licenseUrl": rights.get("licenseUrl") or candidate.get("licenseUrl")}))
                checks.append(_check("E10-14", "Rights policy matches the exact final image", policy_match, {"permissionSource": permission_source, "policyId": sec8.get("policyId") if original_route else policy.get("policyId"), "candidateUrl": final_url, "section5Url": sec5.get("selectedImageUrl")}))
                checks.append(_check("E10-15", "Editorial display/use permission is explicit", rights_permission_map["editorialUse"], {"permission": rights_permission_map["editorialUse"], "permissionSource": permission_source}))
                checks.append(_check("E10-16", "Attribution permission and credit requirements are satisfied", (rights_permission_map["attribution"] is True and credit_ok), {"permission": rights_permission_map["attribution"], "creditAvailable": credit_ok, "credit": rights.get("credit") or candidate.get("credit")}))
                checks.append(_check("E10-17", "Image storage permission is explicit", rights_permission_map["storage"], {"permission": rights_permission_map["storage"], "permissionSource": permission_source}))
                checks.append(_check("E10-18", "Any image modification is permitted", rights_permission_map["modification"], {"modificationPerformed": _d(sec9.get("imagePreparation")).get("modificationPerformed"), "permission": rights_permission_map["modification"]}))
                checks.append(_check("E10-19", "No restrictive or conflicting third-party rights signal exists", not restrictive, {"restrictiveNotice": rights.get("restrictiveNotice"), "thirdPartyRights": rights.get("thirdPartyRights")}))
                visual = _d(submission.get("visualIntelligence") or sec9.get("visualIntelligence"))
                visual_status = _s(visual.get("status"), 20).upper()
                visual_confidence = visual.get("confidence")
                visual_identity_ok = bool(_s(visual.get("inspectedBy"), 160) and _s(visual.get("description"), 2000) and isinstance(visual_confidence, (int, float)) and 0 <= visual_confidence <= 1)
                visual_inspection_complete = visual_status == "PASS" and visual_identity_ok
                visual_ok = visual_inspection_complete and _s(visual.get("articleRelevance"), 20).upper() == "YES" and not _l(visual.get("misrepresentationWarnings"))
                visual_result = True if visual_ok else False if visual_status == "FAIL" or visual.get("misrepresentationWarnings") or _s(visual.get("articleRelevance"),20).upper() == "NO" else None
                checks.append(_check("E10-20", "Semantic visual inspection is completed with identifiable provider and bounded confidence", True if visual_inspection_complete else False if visual_status == "FAIL" else None, {"status": visual_status, "inspectedBy": visual.get("inspectedBy"), "descriptionPresent": bool(visual.get("description")), "confidence": visual_confidence, "visualIdentityComplete": visual_identity_ok}))
                checks.append(_check("E10-21", "Visual content matches article context without misrepresentation", visual_result, {"articleRelevance": visual.get("articleRelevance"), "misrepresentationWarnings": visual.get("misrepresentationWarnings"), "eventContext": visual.get("eventContext")}))
                engine_record = _d(nine_section_report.get("imageEngine"))
                engine_identity_ok = engine_record.get("version") == "1.0.0" and handoff.get("imageEngineVersion") == "1.0.0" and candidate.get("candidateOnly") is True
                checks.append(_check("E10-22", "Registered Image Engine submitted an unpublished candidate without claiming approval", submission.get("decision") == "READY_FOR_CHECKER_REVIEW" and engine_identity_ok and handoff.get("imageRightsApproved") is False and handoff.get("publicationAuthorized") is False and candidate.get("assetPublished") is False, {"imageEngineVersion": engine_record.get("version"), "handoffEngineVersion": handoff.get("imageEngineVersion"), "candidateOnly": candidate.get("candidateOnly"), "imageRightsApproved": handoff.get("imageRightsApproved"), "publicationAuthorized": handoff.get("publicationAuthorized"), "assetPublished": candidate.get("assetPublished")}))
                section9_checks = [x for x in _l(sec9.get("checks")) if isinstance(x, dict)]
                section9_checks_recorded = bool(section9_checks) and all(_s(x.get("executed"), 5) == "YES" for x in section9_checks)
                checks.append(_check("E10-23", "Section 9 individual checks are recorded", section9_checks_recorded, {"section9CheckCount": len(section9_checks), "allExecuted": section9_checks_recorded}))
                processing_authorised = True if original_route and sec8.get("decision") == "YES" else route_policy.get("temporaryProcessingAllowed") is True
                checks.append(_check("E10-25", "Temporary processing was authorised before image retrieval", processing_authorised, {"approvedOriginalRoute": original_route, "temporaryProcessingAllowed": route_policy.get("temporaryProcessingAllowed")}))
                decision = _outcome(checks)
            # Preserve a no-image result as an explicit state, not as a fake approval.
            if no_candidate:
                checks.append(_check("E10-22", "Image Engine did not claim rights approval or publication authority", handoff.get("imageRightsApproved") is False and handoff.get("publicationAuthorized") is False, {"imageRightsApproved": handoff.get("imageRightsApproved"), "publicationAuthorized": handoff.get("publicationAuthorized")}))
                checks.append(_check("E10-23", "Section 9 no-image decision is explicitly recorded", sec9.get("decision") == "NO IMAGE SELECTED", {"decision": sec9.get("decision")}))
            sec10 = {"section":10,"title":"Final Image Verification & Approval","owner":CHECKER_NAME,"postId":pid,"candidateUrl":final_url,"candidateSha256":digest_expected,"decision":decision,"approved":decision=="YES","checks":checks,"checksSummary":{"executed":len(checks),"passed":sum(x["result"]=="PASS" for x in checks),"failed":sum(x["result"]=="FAIL" for x in checks),"unknown":sum(x["result"]=="UNKNOWN" for x in checks),"allExecuted":all(x["executed"]=="YES" for x in checks)}}
            # Section 10 is a new section only. Do not insert its checks into
            # Section 6, do not rewrite the per-post records, and do not alter
            # any existing section container from Sections 1–9.
            section10_posts.append(sec10)

            # Section 11 is a separate, append-only audit continuation and
            # final editorial gate. It references earlier outcomes; it never
            # edits or re-evaluates their stored decisions.
            text_decision = _s(sec7.get("decision"), 20).upper()
            section8_decision = _s(sec8.get("decision"), 20).upper()
            section9_check_list = [x for x in _l(sec9.get("checks")) if isinstance(x, dict)]
            section10_check_list = [x for x in checks if isinstance(x, dict)]
            preexisting_section_hashes = {
                key: _canonical_hash(sections.get(key))
                for key in required
            }
            all_required_sections_present = all(key in sections for key in required)
            section9_handoff_is_unapproved = (
                handoff.get("imageRightsApproved") is False
                and handoff.get("publicationAuthorized") is False
                and (no_candidate or candidate.get("candidateOnly") is True)
            )
            section10_all_pass = bool(section10_check_list) and all(
                _s(check.get("executed"), 5) == "YES" and _s(check.get("result"), 10) == "PASS"
                for check in section10_check_list
            )
            section11_checks = [
                _check(
                    "N11-01", "Original Sections 1–9 are present and preserved as read-only inputs",
                    all_required_sections_present,
                    {"sectionKeys": required, "sectionHashesBeforeAppend": preexisting_section_hashes,
                     "noExistingSectionWasRebuilt": True},
                    "Section 11 may reference existing sections but cannot modify them.",
                ),
                _check(
                    "N11-02", "Original Section 7 text decision is approved",
                    text_decision == "YES",
                    {"section7Decision": text_decision, "section7CheckIds": [_s(x.get("checkId")) for x in _l(sec7.get("checks")) if isinstance(x, dict)]},
                    "A failed or unknown original text decision holds the post.",
                ),
                _check(
                    "N11-03", "Original Section 8 image-rights decision is retained and referenced",
                    section8_decision in {"YES", "NO", "UNKNOWN"},
                    {"section8Decision": section8_decision, "section8PolicyId": sec8.get("policyId"),
                     "section8CheckIds": [_s(x.get("checkId")) for x in _l(sec8.get("checks")) if isinstance(x, dict)]},
                    "Section 8 remains the original image-rights assessment; Section 11 records it without changing it.",
                ),
                _check(
                    "N11-04", "Section 9 submitted a candidate without claiming approval or publication",
                    section9_handoff_is_unapproved,
                    {"imageRightsApproved": handoff.get("imageRightsApproved"),
                     "publicationAuthorized": handoff.get("publicationAuthorized"),
                     "candidateOnly": candidate.get("candidateOnly") if candidate else None,
                     "section9Decision": sec9.get("decision")},
                ),
                _check(
                    "N11-05", "Section 10 independently approved the exact final image",
                    decision == "YES",
                    {"section10Decision": decision, "candidateUrl": final_url,
                     "candidateSha256": digest_expected},
                    "An image is not eligible for Editorial unless Section 10 returns YES.",
                ),
                _check(
                    "N11-06", "Every Section 10 check completed and passed",
                    section10_all_pass,
                    {"section10CheckCount": len(section10_check_list),
                     "passed": sum(_s(x.get("result"), 10) == "PASS" for x in section10_check_list),
                     "failed": sum(_s(x.get("result"), 10) == "FAIL" for x in section10_check_list),
                     "unknown": sum(_s(x.get("result"), 10) == "UNKNOWN" for x in section10_check_list)},
                    "A failed, unexecuted or UNKNOWN Section 10 check blocks Editorial eligibility.",
                ),
            ]
            final_editorial_approval = all(x.get("result") == "PASS" for x in section11_checks)
            final_decision = "APPROVE_FOR_EDITORIAL" if final_editorial_approval else "HOLD"
            editorial_eligibility = "EDITORIAL_READY" if final_editorial_approval else "HOLD"
            reasons = [
                {"checkId": x.get("checkId"), "result": x.get("result"), "reason": x.get("reason")}
                for x in section11_checks if x.get("result") != "PASS"
            ]
            reasons.extend(
                {"checkId": x.get("checkId"), "result": x.get("result"), "reason": x.get("reason")}
                for x in section10_check_list if x.get("result") != "PASS"
            )
            section11 = {
                "section": 11,
                "title": "Post-Engine Audit & Final Editorial Decision",
                "owner": CHECKER_NAME,
                "postId": pid,
                "sourceDecisions": {
                    "section7TextDecision": text_decision,
                    "section8OriginalImageRightsDecision": section8_decision,
                    "section9ImageEngineDecision": _s(sec9.get("decision"), 80),
                    "section10FinalImageDecision": decision,
                },
                "auditContinuation": {
                    "continuesOriginalAuditFromSection": 6,
                    "section6Modified": False,
                    "section6CheckIds": [_s(x.get("checkId")) for x in _l(_d(p.get("section6")).get("allChecks")) if isinstance(x, dict)],
                    "section9CheckIds": [_s(x.get("checkId")) for x in section9_check_list],
                    "section10CheckIds": [_s(x.get("checkId")) for x in section10_check_list],
                    "section10CheckCount": len(section10_check_list),
                    "section11CheckCount": len(section11_checks),
                    "priorSectionHashes": preexisting_section_hashes,
                    "originalPostRecordSha256": _canonical_hash(_d(post)),
                    "noPriorSectionRewritten": True,
                },
                "checks": section11_checks,
                "decision": final_decision,
                "editorialEligibility": editorial_eligibility,
                "releaseToEditorial": final_editorial_approval,
                "reasons": reasons,
                "decidedAt": datetime.now(timezone.utc).isoformat(),
            }
            section11_posts.append(section11)

        # Deep-copy the nine-section report, then add exactly two new sections.
        # The original Sections 1–9, Section 6 audit, and per-post records are
        # intentionally left byte-for-byte equivalent at the JSON-value level.
        output = json.loads(json.dumps(nine_section_report, ensure_ascii=False, default=str))
        output["sections"]["finalImageVerificationAndApproval"] = {
            "section": 10,
            "title": "Final Image Verification & Approval",
            "owner": CHECKER_NAME,
            "posts": section10_posts,
            "statistics": {
                "postsReviewed": len(section10_posts),
                "imagesApproved": sum(x.get("decision") == "YES" for x in section10_posts),
                "imagesRejected": sum(x.get("decision") == "NO" for x in section10_posts),
                "imagesUnknown": sum(x.get("decision") == "UNKNOWN" for x in section10_posts),
                "noImageSelected": sum(x.get("decision") == "NO IMAGE SELECTED" for x in section10_posts),
            },
        }
        output["sections"]["postEngineAuditAndFinalDecision"] = {
            "section": 11,
            "title": "Post-Engine Audit & Final Editorial Decision",
            "owner": CHECKER_NAME,
            "posts": section11_posts,
            "statistics": {
                "postsReviewed": len(section11_posts),
                "approvedForEditorial": sum(x.get("releaseToEditorial") is True for x in section11_posts),
                "held": sum(x.get("releaseToEditorial") is not True for x in section11_posts),
            },
            "section6Modified": False,
            "priorSectionsModified": False,
        }
        existing_order = list(output.get("sectionOrder") or required)
        for new_key in ("finalImageVerificationAndApproval", "postEngineAuditAndFinalDecision"):
            if new_key not in existing_order:
                existing_order.append(new_key)
        output["sectionOrder"] = existing_order

        # Enforce the immutable-section contract against the completed output,
        # not merely as a documentation promise. A mismatch fails closed and
        # prevents every post from being released to Editorial.
        prior_sections_unchanged = all(
            output["sections"].get(key) == frozen_prior_sections[key]
            for key in required
        )
        original_posts_unchanged = output.get("posts") == frozen_post_records
        for item in section11_posts:
            item["auditContinuation"]["noPriorSectionRewritten"] = prior_sections_unchanged
            item["auditContinuation"]["originalPostRecordsUnchanged"] = original_posts_unchanged
            immutability_check = _check(
                "N11-01",
                "Original Sections 1–9 and original post records are unchanged",
                prior_sections_unchanged and original_posts_unchanged,
                {
                    "priorSectionsCompared": required,
                    "priorSectionsUnchanged": prior_sections_unchanged,
                    "originalPostRecordsUnchanged": original_posts_unchanged,
                    "sectionHashesBeforeAppend": item["auditContinuation"]["priorSectionHashes"],
                },
                "Any mutation to an existing section or original post record blocks release.",
            )
            item["checks"] = [
                immutability_check if check.get("checkId") == "N11-01" else check
                for check in item["checks"]
            ]
            item["auditContinuation"]["section6Modified"] = not (
                output["sections"].get("allChecks") == frozen_prior_sections.get("allChecks")
            )
            release = all(check.get("result") == "PASS" for check in item["checks"])
            item["decision"] = "APPROVE_FOR_EDITORIAL" if release else "HOLD"
            item["editorialEligibility"] = "EDITORIAL_READY" if release else "HOLD"
            item["releaseToEditorial"] = release
            section10_by_post = {x.get("postId"): x for x in section10_posts}
            section10_for_item = _d(section10_by_post.get(item.get("postId")))
            item["reasons"] = [
                {"checkId": check.get("checkId"), "result": check.get("result"), "reason": check.get("reason")}
                for check in item["checks"] if check.get("result") != "PASS"
            ] + [
                {"checkId": check.get("checkId"), "result": check.get("result"), "reason": check.get("reason")}
                for check in _l(section10_for_item.get("checks"))
                if isinstance(check, dict) and check.get("result") != "PASS"
            ]
        # The Section 11 summary is computed after the executable immutability
        # guard so its counts always match the actual release decisions.
        output["sections"]["postEngineAuditAndFinalDecision"]["section6Modified"] = not (
            output["sections"].get("allChecks") == frozen_prior_sections.get("allChecks")
        )
        output["sections"]["postEngineAuditAndFinalDecision"]["priorSectionsModified"] = not prior_sections_unchanged
        output["sections"]["postEngineAuditAndFinalDecision"]["statistics"] = {
            "postsReviewed": len(section11_posts),
            "approvedForEditorial": sum(x.get("releaseToEditorial") is True for x in section11_posts),
            "held": sum(x.get("releaseToEditorial") is not True for x in section11_posts),
        }
        return output

    @staticmethod
    def _article(pid, full):
        for item in _l(full.get("posts")):
            if isinstance(item, dict) and _s(item.get("postId")) == pid:
                nested = _d(item.get("fullArticle"))
                return {**item, **nested} if nested else item
        direct = _d(full.get(pid))
        nested = _d(direct.get("fullArticle"))
        return {**direct, **nested} if nested else direct

    @staticmethod
    def _candidates(pid,p,images,unused=None):
        allc=[dict(x) for x in _l(p.get("mediaCandidates"))+_l(p.get("media")) if isinstance(x,dict)]
        for group in _l(images.get("posts")):
            if isinstance(group, dict) and _s(group.get("postId")) == pid:
                records = _l(group.get("originalImageRecords")) or _l(group.get("images"))
                allc += [dict(x) for x in records if isinstance(x, dict)]
        merged={}
        for c in allc:
            u=_s(c.get("originalUrl") or c.get("url") or c.get("imageUrl")); k=_norm(u) or f"invalid-{len(merged)}"
            if k not in merged: merged[k]=c
            else:
                for f,v in c.items():
                    if v not in (None,"",[],{}) and merged[k].get(f) in (None,"",[],{}):merged[k][f]=v
        return list(merged.values())

    def _image_selection(self,pid,title,article,candidates):
        ah=_host(article); at=_words(title); reviews=[]
        for c in candidates:
            url=_s(c.get("originalUrl") or c.get("url") or c.get("imageUrl")); page=_s(c.get("sourcePage") or c.get("sourceUrl") or c.get("pageUrl")); sh=_host(page)
            desc=" ".join(_s(c.get(k)) for k in ("title","caption","altText","description","filename")); overlap=at&_words(desc)
            exact=bool(_norm(page) and _norm(page)==_norm(article)); family=bool(ah and sh and (sh==ah or sh.endswith("."+ah) or ah.endswith("."+sh)))
            img=_s(c.get("mediaType") or c.get("type")).lower().startswith("image") or _s(c.get("mimeType")).lower().startswith("image/") or bool(re.search(r"\.(jpg|jpeg|png|webp|gif|avif|tif|tiff)(?:$|[?#])",url,re.I))
            derivative=c.get("isDerivative") is True or bool(c.get("derivedFrom")) or c.get("isThumbnail") is True or bool(c.get("thumbnailUrl") and _norm(c.get("thumbnailUrl"))==_norm(url))
            checks=[
             _check("U01","Exact originating article match",exact,{"articleUrl":article,"sourcePage":page},"Candidate must point to the exact article that discovered it."),
             _check("U02","Original source image URL exists",bool(url),{"url":url},"A missing or preview-only URL cannot be selected."),
             _check("U03","Image URL is valid HTTPS",bool(_host(url)),{"url":url},"URL must be HTTPS and have a valid host."),
             _check("U04","Image media identity is confirmed",img,{"mediaType":c.get("mediaType"),"mimeType":c.get("mimeType")},"Image type must be evidenced by type, MIME or extension."),
             _check("U05","Candidate is not a known derivative",not derivative,{"isDerivative":derivative,"derivedFrom":c.get("derivedFrom")},"Known thumbnails and derivatives are excluded from original-image selection."),
             _check("U06","Duplicate URL is resolved",True,{"normalizedUrl":_norm(url)},"Exact normalized URL duplicates are merged before evaluation."),
             _check("U07","Image relevance matches article metadata",bool(overlap),{"matchedTerms":sorted(overlap),"descriptor":desc[:500]},"Metadata relevance only; no visual-pixel inspection is claimed."),
             _check("U08","Image source matches article source",family,{"articleHost":ah,"sourceHost":sh},"Source page must belong to the originating article host family."),
             _check("U09","Candidate qualifies for final selection",None,{},"All U01–U08 checks must pass; computed after U01–U08.")]
            # Rebuild U09 after the first eight checks; explicit individual evaluation.
            checks=checks[:8]+[_check("U09","Candidate qualifies for final selection",all(x["result"]=="PASS" for x in checks[:8]),{"candidateId":c.get("candidateId")},"All U01–U08 checks must pass.")]
            score=len(overlap)*10+(5 if c.get("credit") or c.get("creator") else 0)+(3 if c.get("width") and c.get("height") else 0)
            reviews.append({"candidate":c,"url":url,"score":score,"eligible":all(x["result"]=="PASS" for x in checks),"checks":checks})
        eligible=sorted([x for x in reviews if x["eligible"]],key=lambda x:(-x["score"],_s(x["candidate"].get("candidateId") or x["candidate"].get("mediaId")),x["url"]))
        chosen=eligible[0] if eligible else None
        selection=_check("U10","One best eligible original URL is selected",chosen is not None,{"candidateCount":len(reviews),"eligibleCount":len(eligible),"selectedUrl":chosen["url"] if chosen else ""},"Deterministic metadata ranking; no URL is selected unless U01–U09 pass.")
        return {"section":5,"title":"Image URL Checker & Final Image","postId":pid,"candidateCount":len(reviews),"candidateReviews":[{"candidateId":_s(x["candidate"].get("candidateId") or x["candidate"].get("mediaId")),"url":x["url"],"score":x["score"],"eligible":x["eligible"],"checks":x["checks"]} for x in reviews],"selectionCheck":selection,"selectedImageUrl":chosen["url"] if chosen else "","selectedCandidate":chosen["candidate"] if chosen else None,"selectionResult":"SELECTED" if chosen else "NO IMAGE SELECTED","rightsApproval":"NOT_DECIDED_IN_SECTION_5"}

    def _text(self,pid,p,article,policy,section4):
        src = _d(p.get("sourceRightsEvidence"))
        if not src:
            for item in _l(section4.get("posts")):
                if isinstance(item, dict) and _s(item.get("postId")) == pid:
                    src = _d(item.get("sourceRightsEvidence")) or item
                    break
        if not src:
            src = _d(section4.get(pid)) or _d(section4.get(_s(p.get("sourceId"))))
        identity = _d(src.get("sourceIdentity"))
        source_id = _s(src.get("sourceId") or identity.get("sourceId") or p.get("sourceId"))
        perms=_d(policy.get("permissions")); full=_s(article.get("text") or article.get("fullText") or article.get("fullArticleText")); summary=_s(article.get("feedSummary") or p.get("summary")); title=_s(p.get("title"))
        full_permission = _permission(_d(policy.get("fullArticlePermissions")), "temporaryProcessing")
        summary_permission = _permission(_d(policy.get("feedSummaryPermissions")), "temporaryProcessing")
        source_text_permission = full_permission if full else summary_permission if summary else None
        source_text_basis = "FULL_ARTICLE" if full else "PERMITTED_FEED_SUMMARY" if summary and summary_permission is True else "NO_AUTHORISED_SOURCE_TEXT"
        checks=[_check("T01","Source identity is evidenced",bool(source_id),{"sourceId":source_id}),
          _check("T02","Article URL is valid HTTPS",bool(_host(p.get("canonicalUrl") or p.get("originalUrl"))),{"url":p.get("canonicalUrl") or p.get("originalUrl")}),
          _check("T03","Source/feed URL is valid HTTPS",bool(_host(p.get("sourceFeedUrl") or p.get("sourceUrl"))),{"url":p.get("sourceFeedUrl") or p.get("sourceUrl")}),
          _check("T04","Source policy explicitly matches this source",bool(policy.get("policyId") and policy.get("sourceMatch") is True),{"policyId":policy.get("policyId"),"sourceMatch":policy.get("sourceMatch")},"A named policy without explicit sourceMatch is not enough.")]
        for code,key,label in [("T05","temporaryProcessing","Temporary processing permission"),("T06","transformation","Transformation permission"),("T07","derivedOutputStorage","Derived-output storage permission"),("T08","derivedOutputDisplay","Derived-output display permission")]:checks.append(_check(code,label,_permission(perms,key),{"permission":perms.get(key)},"Each use permission must be explicitly allowed."))
        checks += [_check("T09","Source-text route is explicitly authorized",source_text_permission,{"sourceTextBasis":source_text_basis,"fullArticlePresent":bool(full),"feedSummaryPresent":bool(summary and not full),"fullArticlePermissions":policy.get("fullArticlePermissions",{}),"feedSummaryPermissions":policy.get("feedSummaryPermissions",{})},"Full-article permission and feed-summary permission are separate; only the exact permitted route may pass."),
          _check("T10","Headline and permitted source text are present",bool(title and summary),{"headlinePresent":bool(title),"permittedSourceTextPresent":bool(summary)}),
          _check("T11","No restrictive or third-party text-rights signal",not bool(src.get("restrictiveNotice") or src.get("thirdPartyRights")),{"restrictiveNotice":src.get("restrictiveNotice"),"thirdPartyRights":src.get("thirdPartyRights")})]
        result=_outcome(checks)
        return {"section":7,"title":"Text Approval Checks","postId":pid,"decision":result,"approved":result=="YES","checks":checks}

    def _image_rights(self, pid, sec5, policies, section4=None):
        c = _d(sec5.get("selectedCandidate"))
        url = _s(sec5.get("selectedImageUrl"))
        policy = _d(policies.get(pid))
        candidate_policies = _l(policy.get("candidatePolicies"))
        if candidate_policies:
            policy = next((item for item in candidate_policies
                           if isinstance(item, dict) and _s(item.get("candidateUrl")) == url), {})
        rights = _d(c.get("rightsEvidence"))
        # Collector Section 4 stores image evidence as imageRightsEvidence;
        # match it by the exact URL or stable mediaId, never by list position.
        section4_post = {}
        for item in _l(_d(section4).get("posts")):
            if isinstance(item, dict) and _s(item.get("postId")) == pid:
                section4_post = _d(item.get("sourceRightsEvidence")) or item
                break
        candidate_id = _s(c.get("mediaId") or c.get("candidateId"))
        matched = None
        for evidence in _l(section4_post.get("imageRightsEvidence")):
            if not isinstance(evidence, dict):
                continue
            evidence_url = _s(evidence.get("originalUrl") or evidence.get("url"))
            evidence_id = _s(evidence.get("mediaId"))
            if (url and evidence_url == url) or (candidate_id and evidence_id == candidate_id):
                matched = evidence
                break
        merged = dict(matched or {})
        merged.update({k: v for k, v in c.items() if v not in (None, "", [], {}) and merged.get(k) in (None, "", [], {})})
        merged.update({k: v for k, v in rights.items() if v not in (None, "", [], {}) and merged.get(k) in (None, "", [], {})})
        rights = merged
        policy_rights = _d(policy.get("rightsEvidence"))
        for key, value in policy_rights.items():
            if value not in (None, "", [], {}) and rights.get(key) in (None, "", [], {}):
                rights[key] = value
        perms = _d(policy.get("permissions"))
        exact_policy_url = _s(policy.get("candidateUrl") or policy.get("imageUrl") or policy.get("approvedUrl"))
        exact_policy_match = bool(policy.get("policyMatch") is True and policy.get("policyId") and exact_policy_url == url)
        creator = _s(rights.get("creator") or c.get("creator"))
        license_name = _s(rights.get("licenseName") or c.get("licenseName") or policy.get("rightsBasis") or policy.get("licenseName"))
        license_url = _s(rights.get("licenseUrl") or c.get("licenseUrl") or policy.get("licenseUrl"))
        rights_notice = _s(rights.get("rightsNotice") or c.get("rightsNotice"))
        restrictive = bool(rights.get("restrictiveNotice") or rights.get("thirdPartyRights") or c.get("restrictiveNotice") or c.get("thirdPartyRights") or _restrictive_rights(rights_notice))
        rights.setdefault("rightsBasis", policy.get("rightsBasis") or policy.get("licenseName") or "")
        checks=[_check("I01","Exact image URL selected",bool(url),{"url":url}),
          _check("I02","Creator/source identity evidenced",bool(creator),{"creator":creator,"collectorSection4Matched":bool(matched)}),
          _check("I03","Licence or public-domain basis evidenced",bool(license_name or license_url),{"licenseName":license_name,"licenseUrl":license_url,"rightsBasis":policy.get("rightsBasis")}),
          _check("I04","Image policy explicitly matches exact candidate",exact_policy_match,{"policyId":policy.get("policyId"),"policyMatch":policy.get("policyMatch"),"policyCandidateUrl":exact_policy_url,"selectedUrl":url})]
        for code,key,label in [("I05","editorialUse","Editorial-use permission"),("I06","attribution","Attribution permission")]:checks.append(_check(code,label,_permission(perms,key),{"permission":perms.get(key)},"Permission must be explicit."))
        modification_not_required = policy.get("modificationNotPerformedByPipeline") is True
        modification_permission = True if modification_not_required else _permission(perms, "modification")
        checks.append(_check("I07", "Any image modification is permitted or not performed", modification_permission,
                             {"permission": perms.get("modification"), "modificationNotPerformedByPipeline": modification_not_required},
                             "The pipeline must preserve original bytes unless modification is explicitly authorised."))
        checks.append(_check("I08", "Image storage permission", _permission(perms, "storage"),
                             {"permission": perms.get("storage")}, "Permission must be explicit."))
        checks += [_check("I09","No third-party or restrictive image-rights signal",not restrictive,{"restrictiveNotice":rights.get("restrictiveNotice") or c.get("restrictiveNotice"),"thirdPartyRights":rights.get("thirdPartyRights") or c.get("thirdPartyRights"),"rightsNotice":rights.get("rightsNotice") or c.get("rightsNotice")}),
          _check("I10","Required credit is available",None if _permission(perms,"attribution") is None else (not _permission(perms,"attribution") or bool(_s(rights.get("credit") or c.get("credit") or creator))),{"credit":rights.get("credit") or c.get("credit"),"creator":creator})]
        result=_outcome(checks)
        return {"section":8,"title":"Image Approval Checks","postId":pid,"selectedImageUrl":url,"decision":result,"approved":result=="YES","policyId":policy.get("policyId"),"rightsEvidence":rights,"checks":checks}

    @staticmethod
    def _all_checks(pid,s5,s7,s8):
        allc=[]
        for c in s5["candidateReviews"]:allc.extend(c["checks"])
        allc.append(s5["selectionCheck"]);allc.extend(s7["checks"]);allc.extend(s8["checks"])
        return {"section":6,"title":"All the Checks","postId":pid,"checksExecuted":len(allc),"checksPassed":sum(x["result"]=="PASS" for x in allc),"checksFailed":sum(x["result"]=="FAIL" for x in allc),"checksUnknown":sum(x["result"]=="UNKNOWN" for x in allc),"allChecks":allc,"executionComplete":all(x["executed"]=="YES" for x in allc)}

def run_global_checker(collector_batch,**kwargs):return GlobalChecker().run(collector_batch,**kwargs)
