from __future__ import annotations

import sys
from pathlib import Path
import unittest

ENGINE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ENGINE_DIR))
import editorial_text_intelligence as editorial


def _repeat_sentence(sentence: str, count: int) -> str:
    return " ".join(sentence for _ in range(count))


class EditorialTextIntelligenceTests(unittest.TestCase):
    def test_short_source_is_preserved_without_padding(self):
        source = "Researchers observed a change in the atmosphere. The team will continue monitoring the region."
        result = editorial.build_editorial_summary(source, "Atmospheric observation")
        self.assertEqual(result["text"], source)
        self.assertEqual(result["status"], "SOURCE_UNDER_200_WORDS")
        self.assertEqual(result["method"], "source-preserved-no-padding")

    def test_distinct_source_at_or_below_500_words_is_preserved(self):
        source = " ".join([
            "The research team measured ocean temperature across the western survey region.",
            "Autonomous instruments transmitted hourly readings to the vessel during the expedition.",
            "Scientists compared the new observations with records collected during earlier surveys.",
            "The report describes calibration procedures and identifies each monitoring location.",
            "Researchers cautioned that the short observation period does not establish a long term trend.",
        ])
        result = editorial.build_editorial_summary(source, "Ocean temperature survey")
        self.assertEqual(result["text"], source)
        self.assertEqual(result["method"], "source-preserved-no-padding")

    def test_near_duplicate_sentences_are_removed_from_short_sources(self):
        repeated = "Researchers measured ocean temperatures across the northern survey region during the expedition."
        source = " ".join([repeated, repeated, repeated, "The report says further observations are needed before drawing conclusions."])
        result = editorial.build_editorial_summary(source, "Northern ocean temperature survey")
        self.assertEqual(result["text"].count(repeated), 1)
        self.assertEqual(result["method"], "near-duplicate-reduction-v2")

    def test_changed_numeric_values_are_not_collapsed_as_duplicates(self):
        first = "The team measured a temperature increase of 1.4 degrees Celsius at the northern station."
        second = "The team measured a temperature increase of 1.7 degrees Celsius at the northern station."
        source = " ".join([first, second])
        result = editorial.build_editorial_summary(source, "Northern station temperature")
        self.assertIn("1.4 degrees Celsius", result["text"])
        self.assertIn("1.7 degrees Celsius", result["text"])

    def test_long_source_returns_200_to_500_words(self):
        sentences = [
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
        source = " ".join(sentences)
        # Increase source length without making all source sentences identical.
        source = " ".join(sentences + [s.replace("The ", "Additional ", 1) for s in sentences])
        result = editorial.build_editorial_summary(source, "North Atlantic ocean temperature measurements")
        self.assertGreaterEqual(result["wordCount"], 200)
        self.assertLessEqual(result["wordCount"], 500)
        self.assertEqual(result["method"], "textrank-mmr-extractive-v2")
        self.assertEqual(result["status"], "WITHIN_TARGET")

    def test_repeated_source_content_is_not_duplicated_to_reach_word_target(self):
        unique = [
            "Scientists measured a 2.6 degree change at the northern station during the latest survey.",
            "Researchers compared the results with records collected in 2005 and 2015.",
            "The authors say the measurements remain preliminary and do not establish causation.",
            "Additional observations are planned for the 2027 field season.",
        ]
        source = " ".join(unique * 30)
        result = editorial.build_editorial_summary(source, "Northern station measurement results")
        self.assertLess(result["wordCount"], 200)
        self.assertEqual(result["status"], "SOURCE_UNDER_200_WORDS")
        self.assertEqual(result["text"].count(unique[0]), 1)

    def test_selected_text_is_extractive_and_source_order_is_preserved(self):
        sentences = [
            "The discovery was announced by the research team on Monday morning.",
            "Measurements showed a 2.6 percent change across the monitored region.",
            "The report explains how instruments were calibrated before deployment.",
            "Researchers said the result remains preliminary and requires further study.",
            "The team will publish additional observations after the next survey.",
        ]
        source = " ".join(sentences * 22)
        result = editorial.build_editorial_summary(source, "Research team reports regional measurement")
        selected = result["text"]
        positions = [source.find(sentence) for sentence in sentences if sentence in selected]
        self.assertEqual(positions, sorted(positions))
        for sentence in selected.split(". "):
            self.assertTrue(sentence.strip())

    def test_summary_preserves_numeric_claims_from_selected_sentences(self):
        sentences = [
            "The research team measured 2.6 degrees Celsius at the northern station during the survey.",
            "Scientists compared these measurements with a baseline recorded in 2005.",
            "The report identifies the instruments and calibration process used during the study.",
            "The authors said the findings remain preliminary and do not establish causation.",
            "Further measurements are planned for the 2027 observation season.",
        ]
        source = " ".join(sentences * 24)
        result = editorial.build_editorial_summary(source, "Northern station temperature measurements")
        self.assertIn("2.6 degrees Celsius", result["text"])
        self.assertTrue(any(year in result["text"] for year in ("2005", "2027")))

    def test_negation_is_preserved_as_meaningful_information(self):
        first = "The current measurements do not confirm that the northern shelf is warming."
        second = "The current measurements confirm that the northern shelf is warming."
        source = " ".join([first, second])
        result = editorial.build_editorial_summary(source, "Northern shelf measurements")
        self.assertIn(first, result["text"])
        self.assertIn(second, result["text"])

    def test_uncertainty_and_modal_language_are_not_collapsed(self):
        cautious = "The early measurements may indicate a change in the northern current."
        certain = "The early measurements indicate a change in the northern current."
        source = " ".join([cautious, certain])
        result = editorial.build_editorial_summary(source, "Northern current measurements")
        self.assertIn(cautious, result["text"])
        self.assertIn(certain, result["text"])

    def test_different_quoted_statements_are_not_collapsed(self):
        first = 'The lead researcher said, "The results are preliminary and need review."'
        second = 'The lead researcher said, "The results are conclusive after review."'
        result = editorial.build_editorial_summary(first + " " + second, "Research results")
        self.assertIn(first, result["text"])
        self.assertIn(second, result["text"])

    def test_empty_source_is_rejected(self):
        with self.assertRaises(ValueError):
            editorial.build_editorial_summary("   ")

    def test_result_is_deterministic(self):
        source = " ".join([
            "Researchers documented a change in the polar environment during the latest field campaign.",
            "The report describes the instruments and the method used to collect observations.",
            "The team measured a 12 percent difference compared with the previous survey.",
            "The authors caution that more observations are needed before drawing conclusions.",
        ] * 24)
        first = editorial.build_editorial_summary(source, "Polar environment field campaign")
        second = editorial.build_editorial_summary(source, "Polar environment field campaign")
        self.assertEqual(first, second)

    def test_no_third_party_runtime_dependencies(self):
        self.assertEqual(editorial.__name__, "editorial_text_intelligence")
        self.assertFalse(hasattr(editorial, "requests"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
