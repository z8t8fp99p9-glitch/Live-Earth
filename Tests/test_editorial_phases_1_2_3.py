from __future__ import annotations

import sys
from pathlib import Path
import unittest

ENGINE_DIR = Path(__file__).resolve().parents[1] / "Editorial-Engine"
sys.path.insert(0, str(ENGINE_DIR))
import editorial_text_intelligence as editorial


class EditorialPhasesTwoAndThreeTests(unittest.TestCase):
    def setUp(self):
        self.sentences = [
            "Researchers measured ocean temperatures at twelve stations during the 2025 expedition.",
            "The northern stations recorded an average increase of 1.4 degrees Celsius compared with earlier seasonal readings.",
            "Scientists compared the new measurements with observations collected by vessels over the previous twenty years.",
            "The report describes how autonomous instruments transmitted readings while ships crossed the western survey boundary.",
            "The authors said, \"These results remain preliminary and require further observations.\"",
            "Researchers said the measurements do not establish a single cause for the regional differences.",
            "The team plans to repeat the measurements during the 2027 observation season.",
        ]

    def test_phase_two_builds_paragraphs_without_rewriting_or_reordering(self):
        result = editorial.phase2_structure(self.sentences, max_sentences=2, max_words=60)
        flattened = [sentence for paragraph in result["paragraphs"] for sentence in paragraph]
        self.assertEqual(flattened, self.sentences)
        self.assertTrue(result["sentenceOrderPreserved"])
        self.assertGreater(result["paragraphCount"], 1)
        for sentence in self.sentences:
            self.assertIn(sentence, result["text"])

    def test_phase_three_retains_source_headline_and_exact_lead(self):
        structure = editorial.phase2_structure(self.sentences)
        draft = editorial.phase3_compose(
            "North Atlantic temperature observations", structure, self.sentences
        )
        self.assertEqual(draft["headline"], "North Atlantic temperature observations")
        self.assertEqual(draft["headlineSource"], "source-title-preserved")
        self.assertEqual(draft["lead"], self.sentences[0])
        self.assertEqual(draft["body"], structure["text"])
        self.assertEqual(draft["writingMode"], "EXTRACTIVE_ASSEMBLY_NO_PARAPHRASE")

    def test_phase_three_claim_ledger_preserves_numbers_quotes_negation_and_uncertainty(self):
        structure = editorial.phase2_structure(self.sentences)
        draft = editorial.phase3_compose("Temperature report", structure, self.sentences)
        ledger = draft["traceability"]["claimLedger"]
        ledger_text = repr(ledger)
        self.assertIn("1.4", ledger_text)
        self.assertIn("2025", ledger_text)
        self.assertIn("2027", ledger_text)
        self.assertIn("These results remain preliminary and require further observations.", ledger_text)
        self.assertIn("not", ledger_text)
        self.assertTrue(draft["traceability"]["allSelectedSentencesVerbatim"])
        self.assertEqual(draft["traceability"]["unsupportedClaimsAdded"], 0)
        self.assertFalse(draft["traceability"]["independentFactVerificationPerformed"])
        self.assertTrue(draft["traceability"]["globalCheckerReviewRequired"])

    def test_phase_three_rejects_a_sentence_not_in_the_source(self):
        structure = editorial.phase2_structure(self.sentences)
        structure["paragraphs"][0][0] = "An unsupported discovery was confirmed today."
        with self.assertRaises(ValueError):
            editorial.phase3_compose("Source title", structure, self.sentences)

    def test_long_source_runs_all_three_phases_through_existing_summary_api(self):
        base = [
            "Researchers measured ocean temperatures across the North Atlantic during the field campaign.",
            "The vessel deployed autonomous instruments near the northern continental shelf during spring.",
            "Scientists compared the measurements with historical observations from earlier research expeditions.",
            "The survey team recorded salinity, pressure, water depth, and temperature at multiple stations.",
            "The authors said, \"The current measurements remain preliminary and need additional analysis.\"",
            "Researchers said the available observations do not establish a single cause for the changes.",
            "The programme plans another measurement campaign during the next seasonal observation period.",
        ]
        unique = [sentence[:-1] + f" at survey station {i}." for i, sentence in enumerate(base * 6, start=1)]
        source = " ".join(unique)
        result = editorial.build_editorial_summary(source, "North Atlantic temperature observations")
        self.assertEqual(set(result), {"text", "wordCount", "status", "method", "sourceSha256"})
        self.assertIn("\n\n", result["text"])
        self.assertLessEqual(result["wordCount"], 500)
        # Repeated feed material is not duplicated to force a 200-word target.
        self.assertEqual(result["status"], "SOURCE_UNDER_200_WORDS")
        self.assertEqual(result["method"], "textrank-mmr-extractive-v2")
        self.assertEqual(result["sourceSha256"], editorial._sha256(source))

    def test_short_source_keeps_existing_no_padding_and_preservation_contract(self):
        source = "Researchers observed a change in the atmosphere. The team will continue monitoring the region."
        result = editorial.build_editorial_summary(source, "Atmospheric observation")
        self.assertEqual(result["text"], source)
        self.assertEqual(result["status"], "SOURCE_UNDER_200_WORDS")
        self.assertEqual(result["method"], "source-preserved-no-padding")

    def test_phase_one_short_source_is_preserved_without_padding(self):
        source = "Researchers observed a change in the atmosphere. The team will continue monitoring the region."
        result = editorial.build_editorial_summary(source, "Atmospheric observation")
        self.assertEqual(result["text"], source)
        self.assertEqual(result["status"], "SOURCE_UNDER_200_WORDS")
        self.assertEqual(result["method"], "source-preserved-no-padding")

    def test_phase_one_deduplicates_but_preserves_changed_numbers(self):
        repeated = "Researchers measured ocean temperatures across the northern survey region during the expedition."
        source = " ".join([repeated, repeated, "The report says further observations are needed before drawing conclusions."])
        result = editorial.build_editorial_summary(source, "Northern ocean temperature survey")
        self.assertEqual(result["text"].count(repeated), 1)
        first = "The team measured a temperature increase of 1.4 degrees Celsius at the northern station."
        second = "The team measured a temperature increase of 1.7 degrees Celsius at the northern station."
        values = editorial.build_editorial_summary(first + " " + second, "Northern station temperature")
        self.assertIn("1.4 degrees Celsius", values["text"])
        self.assertIn("1.7 degrees Celsius", values["text"])

    def test_phase_one_long_source_selection_stays_within_word_limit_and_keeps_source_order(self):
        source_sentences = [
            "Researchers measured ocean temperatures at twelve monitoring stations across the North Atlantic during the 2025 expedition.",
            "The northern stations recorded an average increase of 1.4 degrees Celsius compared with their previous seasonal readings.",
            "Scientists compared the new measurements with observations collected by research vessels over the previous twenty years.",
            "The report describes how autonomous instruments transmitted readings while ships crossed the western survey boundary.",
            "Coastal waters showed a different temperature pattern from measurements gathered in the deeper open ocean.",
            "The research team published station coordinates and calibration notes alongside the temperature observations.",
            "Researchers said the measurements do not establish a single cause for the regional differences.",
            "The study identifies changes in wind conditions as one factor requiring further investigation.",
            "Oceanographers also compared the readings with satellite observations collected during the same measurement period.",
            "The satellite comparison helped identify several areas where surface conditions differed from deeper water readings.",
            "Scientists noted that short observation periods can make long term patterns difficult to interpret.",
            "The report includes separate tables for coastal stations, offshore instruments, and the northern survey route.",
            "Researchers plan to repeat the measurements during the next two seasonal observation periods.",
            "The next expedition is expected to include additional instruments near the eastern boundary of the survey area.",
            "Data from the latest survey will be made available with the study methods and supporting documentation.",
            "The authors describe the findings as preliminary and say further observations are needed before broader conclusions.",
            "The research programme combines ship based measurements with autonomous instruments and satellite records.",
            "Teams checked the instruments before deployment and repeated calibration tests after each survey leg.",
            "The comparison found the largest differences at stations located beyond the continental shelf.",
            "Researchers said the regional pattern was not uniform and varied across the monitored locations.",
            "The report lists the dates, equipment specifications, and procedures used for each observation campaign.",
            "The project will continue collecting measurements to determine whether the observed differences persist over time.",
            "Scientists cautioned that the current dataset cannot explain every variation recorded between stations.",
            "The study was prepared by an international team working across several oceanographic research institutions.",
        ]
        source = " ".join(source_sentences + [item.replace("The ", "Additional ", 1) for item in source_sentences])
        result = editorial.build_editorial_summary(source, "North Atlantic ocean temperature measurements")
        self.assertGreaterEqual(result["wordCount"], 200)
        self.assertLessEqual(result["wordCount"], 500)
        self.assertEqual(result["status"], "WITHIN_TARGET")
        self.assertIn("\n\n", result["text"])
        positions = [source.find(sentence) for sentence in source_sentences if sentence in result["text"]]
        self.assertEqual(positions, sorted(positions))

    def test_phase_one_preserves_negation_and_uncertainty(self):
        cautious = "The early measurements may indicate a change in the northern current."
        certain = "The early measurements indicate a change in the northern current."
        negative = "The current measurements do not confirm that the northern shelf is warming."
        source = " ".join([cautious, certain, negative])
        result = editorial.build_editorial_summary(source, "Northern current measurements")
        for sentence in (cautious, certain, negative):
            self.assertIn(sentence, result["text"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
