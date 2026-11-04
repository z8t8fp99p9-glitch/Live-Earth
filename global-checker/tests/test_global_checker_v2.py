import copy
import unittest
from global_checker_v2 import GlobalChecker

class CheckerV2Tests(unittest.TestCase):
    def batch(self):
        return {
            "job":{"jobId":"job-1","viewId":"alien-world"},
            "collectorSections":{
                "managerIdCard":{"jobId":"job-1","immutable":True},
                "fullArticle":{"posts":[{"postId":"p1","text":"A long article body"}]},
                "originalImageRecords":{"posts":[]},
                "sourceRightsEvidence":{"p1":{"sourceId":"nasa"}},
            },
            "records":[{
                "postId":"p1","sourceId":"nasa","sourceFeedUrl":"https://www.nasa.gov/feed/",
                "canonicalUrl":"https://www.nasa.gov/story/1","title":"Mars rover discovers ancient river delta",
                "summary":"NASA reports that the Mars rover has discovered evidence of an ancient river delta.",
                "mediaCandidates":[{
                    "candidateId":"img1","url":"https://images.nasa.gov/mars-delta.jpg","originalUrl":"https://images.nasa.gov/mars-delta.jpg",
                    "mediaType":"image","mimeType":"image/jpeg","sourcePage":"https://www.nasa.gov/story/1",
                    "title":"Mars rover ancient river delta discovery","creator":"NASA","credit":"NASA",
                    "rightsEvidence":{"creator":"NASA","licenseName":"Public domain","rightsBasis":"US government work","credit":"NASA"}
                }]
            }]
        }
    def test_sections_and_immutability(self):
        b=self.batch(); before=copy.deepcopy(b)
        r=GlobalChecker().run(b,
            text_policy={"policyId":"nasa-text","sourceMatch":True,"permissions":{"temporaryProcessing":"allowed","transformation":"allowed","derivedOutputStorage":"allowed","derivedOutputDisplay":"allowed"},"fullArticlePermissions":{"temporaryProcessing":"allowed"}},
            image_policies={"p1":{"policyId":"nasa-image","policyMatch":True,"permissions":{"editorialUse":"allowed","attribution":"allowed","modification":"allowed","storage":"allowed"}}})
        self.assertEqual(b,before)
        self.assertEqual(len(r["sectionOrder"]),8)
        self.assertEqual(r["posts"][0]["section5"]["selectionResult"],"SELECTED")
        self.assertEqual(r["posts"][0]["section7"]["decision"],"YES")
        self.assertEqual(r["posts"][0]["section8"]["decision"],"YES")
        self.assertTrue(r["posts"][0]["section6"]["executionComplete"])
    def test_no_candidate_means_no_image_selected(self):
        b=self.batch(); b["records"][0]["mediaCandidates"]=[]
        r=GlobalChecker().run(b,text_policy={"policyId":"x","sourceMatch":True,"permissions":{"temporaryProcessing":"allowed","transformation":"allowed","derivedOutputStorage":"allowed","derivedOutputDisplay":"allowed"}})
        self.assertEqual(r["posts"][0]["section5"]["selectionResult"],"NO IMAGE SELECTED")
        self.assertEqual(r["posts"][0]["section8"]["decision"],"NO")
    def test_unverified_policy_fails_closed(self):
        b=self.batch()
        r=GlobalChecker().run(b)
        self.assertNotEqual(r["posts"][0]["section7"]["decision"],"YES")
        self.assertNotEqual(r["posts"][0]["section8"]["decision"],"YES")
    def test_candidate_from_wrong_article_is_rejected(self):
        b=self.batch(); b["records"][0]["mediaCandidates"][0]["sourcePage"]="https://www.nasa.gov/other-story"
        r=GlobalChecker().run(b)
        self.assertEqual(r["posts"][0]["section5"]["selectionResult"],"NO IMAGE SELECTED")

if __name__=="__main__":unittest.main()
