"""Clean eight-section LIVE // EARTH Global Checker v2.
Reads Collector Sections 1–4 without mutating them; creates Checker Sections 5–8.
No network, image downloads, database writes, editing, or publication.
"""
from __future__ import annotations
from datetime import datetime, timezone
from hashlib import sha256
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from typing import Any
import json, re

CHECKER_NAME = "LIVE // EARTH Global Checker"
CHECKER_VERSION = "2.0.0"
SECTION_ORDER = ["managerIdCard", "fullArticle", "originalImageRecords", "sourceRightsEvidence", "imageUrlCheckerAndFinalImage", "allChecks", "textApprovalChecks", "imageApprovalChecks"]

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

class GlobalChecker:
    def run(self, collector_batch:dict, *, text_policy=None, image_policies=None, image_engine_candidates=None):
        if not isinstance(collector_batch,dict): raise TypeError("Collector batch must be an object")
        src=json.loads(json.dumps(collector_batch,ensure_ascii=False,default=str))
        job=_d(src.get("job")); posts=_l(src.get("records")); raw=_d(src.get("collectorSections"))
        # Sections 1–4 are passed through unchanged; they are never mutated.
        s1=_d(raw.get("managerIdCard")); s2=_d(raw.get("fullArticle")); s3=_d(raw.get("originalImageRecords")); s4=_d(raw.get("sourceRightsEvidence"))
        tp=_d(text_policy); ip=_d(image_policies); ie=_d(image_engine_candidates)
        results=[]
        for n,p0 in enumerate(posts):
            p=_d(p0); pid=_s(p.get("postId") or p.get("id") or f"record-{n+1}")
            article=_s(p.get("canonicalUrl") or p.get("originalUrl") or p.get("url")); title=_s(p.get("title"))
            full=self._article(pid,s2); candidates=self._candidates(pid,p,s3,ie)
            sec5=self._image_selection(pid,title,article,candidates)
            sec7=self._text(pid,p,full,tp,s4)
            sec8=self._image_rights(pid,sec5,ip)
            sec6=self._all_checks(pid,sec5,sec7,sec8)
            image_state="YES" if sec8["decision"]=="YES" else "NO" if sec5["selectedImageUrl"] else "NO IMAGE SELECTED"
            overall="YES" if sec7["decision"]=="YES" and (not sec5["selectedImageUrl"] or image_state=="YES") else "NO"
            results.append({"postId":pid,"section5":sec5,"section6":sec6,"section7":sec7,"section8":sec8,"decision":{"text":sec7["decision"],"image":image_state,"overall":overall}})
        sections={"managerIdCard":s1,"fullArticle":s2,"originalImageRecords":s3,"sourceRightsEvidence":s4,
          "imageUrlCheckerAndFinalImage":{"owner":CHECKER_NAME,"posts":[x["section5"] for x in results]},
          "allChecks":{"owner":CHECKER_NAME,"posts":[x["section6"] for x in results]},
          "textApprovalChecks":{"owner":CHECKER_NAME,"posts":[x["section7"] for x in results]},
          "imageApprovalChecks":{"owner":CHECKER_NAME,"posts":[x["section8"] for x in results]}}
        return {"schemaVersion":2,"checker":CHECKER_NAME,"checkerVersion":CHECKER_VERSION,"checkedAt":datetime.now(timezone.utc).isoformat(),"jobId":job.get("jobId",""),"viewId":job.get("viewId",""),"sectionOrder":SECTION_ORDER,"sections":sections,"posts":results,
          "summary":{"postsReceived":len(posts),"textApproved":sum(x["section7"]["decision"]=="YES" for x in results),"imagesSelected":sum(bool(x["section5"]["selectedImageUrl"]) for x in results),"imagesApproved":sum(x["section8"]["decision"]=="YES" for x in results),"postsApproved":sum(x["decision"]["overall"]=="YES" for x in results),"postsHeld":sum(x["decision"]["overall"]!="YES" for x in results)},
          "boundaries":{"collectorSections1To4Modified":False,"checkerFetchesWebsites":False,"checkerDownloadsImages":False,"imageEngineCanApproveRights":False,"checkerWritesDatabase":False,"checkerPublishes":False}}

    @staticmethod
    def _article(pid,full):
        for x in _l(full.get("posts")):
            if isinstance(x,dict) and _s(x.get("postId"))==pid:return x
        return _d(full.get(pid))

    @staticmethod
    def _candidates(pid,p,images,engine):
        allc=[dict(x) for x in _l(p.get("mediaCandidates"))+_l(p.get("media")) if isinstance(x,dict)]
        for group in _l(images.get("posts")):
            if isinstance(group,dict) and _s(group.get("postId"))==pid: allc += [dict(x) for x in _l(group.get("images")) if isinstance(x,dict)]
        allc += [dict(x) for x in _l(engine.get(pid)) if isinstance(x,dict)]
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
        src=_d(p.get("sourceRightsEvidence"))
        if not src:
            for item in _l(section4.get("posts")):
                if isinstance(item,dict) and _s(item.get("postId"))==pid:
                    src=item; break
        if not src: src=_d(section4.get(pid)) or _d(section4.get(_s(p.get("sourceId"))))
        perms=_d(policy.get("permissions")); full=_s(article.get("text") or article.get("fullText") or article.get("fullArticleText")); summary=_s(p.get("summary")); title=_s(p.get("title"))
        checks=[_check("T01","Source identity is evidenced",bool(_s(src.get("sourceId") or p.get("sourceId"))),{"sourceId":src.get("sourceId") or p.get("sourceId")}),
          _check("T02","Article URL is valid HTTPS",bool(_host(p.get("canonicalUrl") or p.get("originalUrl"))),{"url":p.get("canonicalUrl") or p.get("originalUrl")}),
          _check("T03","Source/feed URL is valid HTTPS",bool(_host(p.get("sourceFeedUrl") or p.get("sourceUrl"))),{"url":p.get("sourceFeedUrl") or p.get("sourceUrl")}),
          _check("T04","Source policy explicitly matches this source",bool(policy.get("policyId") and policy.get("sourceMatch") is True),{"policyId":policy.get("policyId"),"sourceMatch":policy.get("sourceMatch")},"A named policy without explicit sourceMatch is not enough.")]
        for code,key,label in [("T05","temporaryProcessing","Temporary processing permission"),("T06","transformation","Transformation permission"),("T07","derivedOutputStorage","Derived-output storage permission"),("T08","derivedOutputDisplay","Derived-output display permission")]:checks.append(_check(code,label,_permission(perms,key),{"permission":perms.get(key)},"Each use permission must be explicitly allowed."))
        checks += [_check("T09","Full-article use is separately authorized",None if not full else _permission(_d(policy.get("fullArticlePermissions")),"temporaryProcessing"),{"fullArticlePresent":bool(full),"permissions":policy.get("fullArticlePermissions",{})},"A feed-summary permission never implies full-article permission."),
          _check("T10","Headline and summary are present",bool(title and summary),{"headlinePresent":bool(title),"summaryPresent":bool(summary)}),
          _check("T11","No restrictive or third-party text-rights signal",not bool(src.get("restrictiveNotice") or src.get("thirdPartyRights")),{"restrictiveNotice":src.get("restrictiveNotice"),"thirdPartyRights":src.get("thirdPartyRights")})]
        result=_outcome(checks)
        return {"section":7,"title":"Text Approval Checks","postId":pid,"decision":result,"approved":result=="YES","checks":checks}

    def _image_rights(self,pid,sec5,policies):
        c=_d(sec5.get("selectedCandidate")); url=_s(sec5.get("selectedImageUrl")); policy=_d(policies.get(pid)); ev=_d(c.get("rightsEvidence")); perms=_d(policy.get("permissions"))
        checks=[_check("I01","Exact image URL selected",bool(url),{"url":url}),
          _check("I02","Creator/source identity evidenced",bool(_s(ev.get("creator") or c.get("creator"))),{"creator":ev.get("creator") or c.get("creator")}),
          _check("I03","Licence or public-domain basis evidenced",bool(_s(ev.get("licenseName") or ev.get("licenseUrl") or ev.get("rightsBasis"))),{"licenseName":ev.get("licenseName"),"licenseUrl":ev.get("licenseUrl"),"rightsBasis":ev.get("rightsBasis")}),
          _check("I04","Image policy explicitly matches exact candidate",bool(policy.get("policyMatch") is True and policy.get("policyId")),{"policyId":policy.get("policyId"),"policyMatch":policy.get("policyMatch")})]
        for code,key,label in [("I05","editorialUse","Editorial-use permission"),("I06","attribution","Attribution permission"),("I07","modification","Modification permission"),("I08","storage","Image storage permission")]:checks.append(_check(code,label,_permission(perms,key),{"permission":perms.get(key)},"Permission must be explicit."))
        checks += [_check("I09","No third-party or restrictive image-rights signal",not bool(ev.get("restrictiveNotice") or ev.get("thirdPartyRights")),{"restrictiveNotice":ev.get("restrictiveNotice"),"thirdPartyRights":ev.get("thirdPartyRights")}),
          _check("I10","Required credit is available",None if _permission(perms,"attribution") is None else (not _permission(perms,"attribution") or bool(_s(ev.get("credit") or c.get("credit") or ev.get("creator")))),{"credit":ev.get("credit") or c.get("credit"),"creator":ev.get("creator")})]
        result=_outcome(checks)
        return {"section":8,"title":"Image Approval Checks","postId":pid,"selectedImageUrl":url,"decision":result,"approved":result=="YES","checks":checks}

    @staticmethod
    def _all_checks(pid,s5,s7,s8):
        allc=[]
        for c in s5["candidateReviews"]:allc.extend(c["checks"])
        allc.append(s5["selectionCheck"]);allc.extend(s7["checks"]);allc.extend(s8["checks"])
        return {"section":6,"title":"All the Checks","postId":pid,"checksExecuted":len(allc),"checksPassed":sum(x["result"]=="PASS" for x in allc),"checksFailed":sum(x["result"]=="FAIL" for x in allc),"checksUnknown":sum(x["result"]=="UNKNOWN" for x in allc),"allChecks":allc,"executionComplete":all(x["executed"]=="YES" for x in allc)}

def run_global_checker(collector_batch,**kwargs):return GlobalChecker().run(collector_batch,**kwargs)
