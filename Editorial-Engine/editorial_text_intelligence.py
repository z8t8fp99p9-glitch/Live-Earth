#!/usr/bin/env python3
"""Local, deterministic text-intelligence helpers for LIVE // EARTH Editorial.

Phase 1 selects source sentences locally with TF-IDF/TextRank/MMR.
Phase 2 structures long selections into readable paragraphs without changing
sentence wording or source order.
Phase 3 assembles a source-locked editorial draft: source headline retained,
first selected sentence used as the lead, and remaining source sentences kept
verbatim in the body. No free-form paraphrasing, external services, hosted
models, network access, or third-party packages are used.

The public build_editorial_summary() return contract remains unchanged so the
existing Newsroom adapter and Checker hand-off continue to work.
"""
from __future__ import annotations

from collections import Counter
from math import log, sqrt
import hashlib
import html
import re
from typing import Any

SUMMARY_MIN_WORDS = 200
SUMMARY_MAX_WORDS = 500

_STOP_WORDS = {
    "a", "about", "after", "all", "also", "an", "and", "are", "as", "at",
    "be", "because", "been", "before", "being", "between", "both", "but",
    "by", "did", "do", "does", "during", "each", "for", "from", "had",
    "has", "have", "he", "her", "here", "hers", "him", "his", "how",
    "i", "if", "in", "into", "is", "it", "its", "itself", "just", "more",
    "most", "of", "on", "once", "only", "or", "other", "our", "ours",
    "out", "over", "said", "same", "she", "should", "since", "so", "some",
    "such", "than", "that", "the", "their", "them", "then", "there",
    "these", "they", "this", "those", "through", "to", "too", "under",
    "up", "was", "we", "were", "what", "when", "where", "which", "while",
    "who", "with", "you", "your",
}

_ABBREVIATIONS = (
    "Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Sr.", "Jr.", "St.", "vs.",
    "e.g.", "i.e.", "etc.", "No.", "Fig.", "Eq.", "U.S.", "U.K.",
)
_NUMBER_OR_MEASUREMENT = re.compile(
    r"(?<!\w)(?:\d{1,4}(?:,\d{3})*(?:\.\d+)?%?|\d{1,2}:\d{2}|"
    r"\d{4}-\d{2}-\d{2})(?!\w)|"
    r"\b(?:km|kilomet(?:er|re)s?|miles?|meters?|metres?|cm|mm|kg|grams?|mg|"
    r"°c|°f|kelvin|seconds?|minutes?|hours?|days?|years?|million|billion|"
    r"trillion|percent|per cent)\b",
    re.IGNORECASE,
)
_QUOTED = re.compile(r"(?:\"[^\"]{8,}\"|“[^”]{8,}”|'[^']{12,}')")
_WORDS = re.compile(r"[a-z0-9]+(?:['’-][a-z0-9]+)?", re.IGNORECASE)
_NEGATION = re.compile(r"\b(?:not|no|never|neither|nor|cannot|can't|doesn't|didn't|won't|without)\b", re.IGNORECASE)
_UNCERTAINTY = re.compile(r"\b(?:may|might|could|possibly|potentially|preliminary|suggests?|appears?|estimated|approximately|uncertain|not\s+clear)\b", re.IGNORECASE)


def _clean(value: Any, limit: int = 30000) -> str:
    if value is None:
        return ""
    raw = str(value).replace("\u00a0", " ")
    raw = re.sub(r"<\s*br\s*/?\s*>", " ", raw, flags=re.IGNORECASE)
    raw = re.sub(r"</\s*(p|div|li|h[1-6])\s*>", " ", raw, flags=re.IGNORECASE)
    raw = re.sub(r"<[^>]*>", " ", raw)
    raw = html.unescape(raw)
    return re.sub(r"\s+", " ", raw).strip()[:limit]


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _split_sentences(value: str) -> list[str]:
    """Split conservatively while protecting common abbreviations and decimals."""
    protected = value
    replacements: dict[str, str] = {}
    for index, abbreviation in enumerate(_ABBREVIATIONS):
        token = f"\u0001ABBR{index}\u0001"
        protected, count = re.subn(re.escape(abbreviation), token, protected, flags=re.IGNORECASE)
        if count:
            replacements[token] = abbreviation
    protected = re.sub(r"(?<=\d)\.(?=\d)", "\u0001DECIMAL\u0001", protected)
    pieces = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'‘“(])", protected)
    output = []
    for piece in pieces:
        for token, original in replacements.items():
            piece = piece.replace(token, original)
        piece = piece.replace("\u0001DECIMAL\u0001", ".").strip()
        if piece:
            output.append(piece)
    return output


def _tokens(value: str) -> list[str]:
    return [
        match.group(0).casefold().replace("’", "'")
        for match in _WORDS.finditer(value)
        if len(match.group(0)) > 1 and match.group(0).casefold() not in _STOP_WORDS
    ]


def _term_vectors(sentences: list[str]) -> tuple[list[Counter[str]], dict[str, float]]:
    vectors = [Counter(_tokens(sentence)) for sentence in sentences]
    document_frequency: Counter[str] = Counter()
    for vector in vectors:
        document_frequency.update(vector.keys())
    total = max(1, len(vectors))
    inverse_frequency = {
        token: log(1.0 + (total / (1.0 + frequency))) + 1.0
        for token, frequency in document_frequency.items()
    }
    return vectors, inverse_frequency


def _cosine(left: Counter[str], right: Counter[str], idf: dict[str, float]) -> float:
    if not left or not right:
        return 0.0
    common = set(left) & set(right)
    if not common:
        return 0.0
    dot = sum(left[token] * right[token] * idf.get(token, 1.0) ** 2 for token in common)
    left_norm = sqrt(sum(count * count * idf.get(token, 1.0) ** 2 for token, count in left.items()))
    right_norm = sqrt(sum(count * count * idf.get(token, 1.0) ** 2 for token, count in right.items()))
    return dot / (left_norm * right_norm) if left_norm and right_norm else 0.0


def _textrank(sentences: list[str]) -> list[float]:
    """Weighted TextRank using TF-IDF cosine sentence similarity."""
    count = len(sentences)
    if count == 0:
        return []
    if count == 1:
        return [1.0]
    vectors, idf = _term_vectors(sentences)
    graph: list[dict[int, float]] = [dict() for _ in sentences]
    for left in range(count):
        for right in range(left + 1, count):
            weight = _cosine(vectors[left], vectors[right], idf)
            if weight >= 0.08:
                graph[left][right] = weight
                graph[right][left] = weight
    ranks = [1.0 / count] * count
    damping = 0.85
    for _ in range(35):
        updated = [(1.0 - damping) / count] * count
        dangling = sum(ranks[index] for index, edges in enumerate(graph) if not edges)
        base = damping * dangling / count
        updated = [value + base for value in updated]
        for source, edges in enumerate(graph):
            total_weight = sum(edges.values())
            if not total_weight:
                continue
            contribution = damping * ranks[source] / total_weight
            for target, weight in edges.items():
                updated[target] += contribution * weight
        delta = sum(abs(updated[i] - ranks[i]) for i in range(count))
        ranks = updated
        if delta < 1e-9:
            break
    maximum = max(ranks) or 1.0
    return [score / maximum for score in ranks]


def _title_relevance(sentence: str, title_tokens: set[str]) -> float:
    tokens = set(_tokens(sentence))
    return len(tokens & title_tokens) / max(1, len(title_tokens)) if tokens and title_tokens else 0.0


def _fact_density(sentence: str) -> float:
    tokens = _tokens(sentence)
    if not tokens:
        return 0.0
    anchors = len(_NUMBER_OR_MEASUREMENT.findall(sentence))
    named_phrases = re.findall(r"\b[A-Z][a-zA-Z'’-]{2,}(?:\s+[A-Z][a-zA-Z'’-]{2,}){0,3}", sentence)
    return min(1.0, anchors * 0.22 + min(2, len(named_phrases)) * 0.08)


def _sentence_scores(sentences: list[str], title: str) -> list[float]:
    if not sentences:
        return []
    graph_scores = _textrank(sentences)
    title_tokens = set(_tokens(title))
    scores = []
    for index, sentence in enumerate(sentences):
        score = (
            0.56 * graph_scores[index]
            + 0.19 * _title_relevance(sentence, title_tokens)
            + 0.13 * (1.0 / (1.0 + index * 0.03))
            + 0.09 * _fact_density(sentence)
            + 0.03 * (0.12 if _QUOTED.search(sentence) else 0.0)
        )
        scores.append(score)
    maximum = max(scores) or 1.0
    return [score / maximum for score in scores]


def _select_mmr(
    sentences: list[str], scores: list[float],
    target_min: int = SUMMARY_MIN_WORDS, target_max: int = SUMMARY_MAX_WORDS,
) -> list[int]:
    """Select relevant, less-redundant sentences, then restore source order."""
    if not sentences:
        return []
    vectors, idf = _term_vectors(sentences)
    word_counts = [len(sentence.split()) for sentence in sentences]
    selected: list[int] = []
    remaining = set(range(len(sentences)))
    total_words = 0
    while remaining:
        best_index = None
        best_score = float("-inf")
        for index in remaining:
            size = word_counts[index]
            if size > target_max or total_words + size > target_max:
                continue
            similarity = max((_cosine(vectors[index], vectors[chosen], idf) for chosen in selected), default=0.0)
            if similarity >= 0.88:
                continue
            combined = 0.72 * scores[index] + 0.28 * (1.0 - similarity)
            if combined > best_score:
                best_score = combined
                best_index = index
        if best_index is None:
            break
        selected.append(best_index)
        remaining.remove(best_index)
        total_words += word_counts[best_index]
        if total_words >= target_min and (not remaining or total_words >= target_min + 80):
            break
    return sorted(selected)


def _remove_near_duplicate_sentences(sentences: list[str]) -> list[str]:
    """Remove close duplicates only when numeric and quoted material is identical."""
    kept: list[str] = []
    kept_vectors: list[Counter[str]] = []
    for sentence in sentences:
        vector = Counter(_tokens(sentence))
        normalized = " ".join(_tokens(sentence))
        number_markers = sorted(match.casefold() for match in _NUMBER_OR_MEASUREMENT.findall(sentence))
        quote_markers = _QUOTED.findall(sentence)
        duplicate = False
        for prior, prior_vector in zip(kept, kept_vectors):
            prior_normalized = " ".join(_tokens(prior))
            prior_numbers = sorted(match.casefold() for match in _NUMBER_OR_MEASUREMENT.findall(prior))
            prior_quotes = _QUOTED.findall(prior)
            if number_markers != prior_numbers or quote_markers != prior_quotes:
                continue
            if normalized and normalized == prior_normalized:
                duplicate = True
                break
            if len(vector) >= 6 and len(prior_vector) >= 6:
                common_idf = {token: 1.0 for token in set(vector) | set(prior_vector)}
                if _cosine(vector, prior_vector, common_idf) >= 0.94:
                    duplicate = True
                    break
        if not duplicate:
            kept.append(sentence)
            kept_vectors.append(vector)
    return kept


# --------------------------- Phase 2: structure ---------------------------

_CONTEXT_CUES = re.compile(r"\b(?:previous|earlier|historical|history|background|baseline|previously|in\s+\d{4})\b", re.I)
_LIMITATION_CUES = re.compile(r"\b(?:preliminary|uncertain|unclear|cannot|can\s+not|does\s+not\s+establish|do\s+not\s+establish|not\s+confirm|may|might|could|further\s+study|caution(?:ed)?)\b", re.I)
_NEXT_CUES = re.compile(r"\b(?:plan|plans|planned|will\s+continue|next\s+season|next\s+year|future|further\s+observations|expected\s+to|intend(?:s)?)\b", re.I)


def _sentence_role(sentence: str) -> str:
    """Assign a soft paragraph role; this is structure, never fact verification."""
    if _LIMITATION_CUES.search(sentence):
        return "limitations"
    if _NEXT_CUES.search(sentence):
        return "next-steps"
    if _CONTEXT_CUES.search(sentence):
        return "context"
    if _NUMBER_OR_MEASUREMENT.search(sentence) or re.search(r"\b(?:measured|recorded|found|reported|observed|showed|identified)\b", sentence, re.I):
        return "core-reporting"
    return "core-reporting"


def phase2_structure(sentences: list[str], *, max_sentences: int = 3, max_words: int = 85) -> dict[str, Any]:
    """Group intact source sentences into readable paragraphs in source order.

    A paragraph boundary is introduced when the soft role changes after at
    least one sentence, or a conservative length limit is reached. The method
    never changes sentence wording, adds headings, or reorders chronology.
    """
    if not sentences:
        return {"paragraphs": [], "text": "", "method": "source-order-editorial-paragraph-structure-v1", "sentenceOrderPreserved": True}
    paragraphs: list[list[str]] = []
    current: list[str] = []
    current_words = 0
    current_role = _sentence_role(sentences[0])
    for sentence in sentences:
        role = _sentence_role(sentence)
        count = len(sentence.split())
        role_change = bool(current) and role != current_role and len(current) >= 2
        size_limit = bool(current) and (len(current) >= max_sentences or current_words + count > max_words)
        if role_change or size_limit:
            paragraphs.append(current)
            current = []
            current_words = 0
        current.append(sentence)
        current_words += count
        current_role = role
    if current:
        paragraphs.append(current)
    text = "\n\n".join(" ".join(group) for group in paragraphs)
    flattened = [sentence for group in paragraphs for sentence in group]
    return {
        "paragraphs": paragraphs,
        "text": text,
        "method": "source-order-editorial-paragraph-structure-v1",
        "sentenceOrderPreserved": flattened == sentences,
        "paragraphCount": len(paragraphs),
    }


# ------------------------- Phase 3: composition ---------------------------


def phase3_compose(source_title: str, structure: dict[str, Any], source_sentences: list[str]) -> dict[str, Any]:
    """Create a traceable, source-locked editorial draft without invented prose.

    The original source headline is retained. The first selected source
    sentence becomes the lead; all remaining sentences stay verbatim in the
    body. This is deterministic editorial assembly, not AI paraphrasing or an
    assertion that the underlying source claims have been independently proven.
    """
    paragraphs = structure.get("paragraphs", [])
    selected = [sentence for paragraph in paragraphs for sentence in paragraph]
    source_positions: dict[str, list[int]] = {}
    for index, sentence in enumerate(source_sentences):
        source_positions.setdefault(sentence, []).append(index)
    ledger = []
    used: dict[str, int] = {}
    previous_source_index = -1
    for sentence in selected:
        seen = used.get(sentence, 0)
        positions = source_positions.get(sentence, [])
        if seen >= len(positions):
            raise ValueError("Editorial composition contains a sentence not present in the source record.")
        source_index = positions[seen]
        if source_index < previous_source_index:
            raise ValueError("Editorial composition changed the original source sentence order.")
        previous_source_index = source_index
        used[sentence] = seen + 1
        ledger.append({
            "sourceSentenceIndex": source_index,
            "sentenceSha256": _sha256(sentence),
            "numericAnchors": _NUMBER_OR_MEASUREMENT.findall(sentence),
            "quotedText": _QUOTED.findall(sentence),
            "negationMarkers": _NEGATION.findall(sentence),
            "uncertaintyMarkers": _UNCERTAINTY.findall(sentence),
        })
    headline = _clean(source_title, 500)
    lead = selected[0] if selected else ""
    body = "\n\n".join(" ".join(paragraph) for paragraph in paragraphs)
    if body != structure.get("text", ""):
        raise ValueError("Editorial body differs from the exact Phase 2 sentence structure.")
    return {
        "headline": headline,
        "headlineSource": "source-title-preserved" if headline else "no-source-title",
        "lead": lead,
        "body": body,
        "text": body,
        "method": "source-locked-editorial-assembly-v1",
        "writingMode": "EXTRACTIVE_ASSEMBLY_NO_PARAPHRASE",
        "traceability": {
            "sourceSentenceCount": len(source_sentences),
            "selectedSentenceCount": len(selected),
            "claimLedger": ledger,
            "allSelectedSentencesVerbatim": True,
            "unsupportedClaimsAdded": 0,
            "numbersQuotesNegationAndUncertaintyRecorded": True,
            "independentFactVerificationPerformed": False,
            "globalCheckerReviewRequired": True,
        },
    }


def _compose_long_source(source: str, source_title: str, sentences: list[str]) -> str:
    """Apply Phase 2 and 3 to long-source summaries; preserve the public API."""
    structure = phase2_structure(sentences)
    if not structure.get("sentenceOrderPreserved"):
        raise ValueError("Phase 2 attempted to change source sentence order.")
    draft = phase3_compose(source_title, structure, _split_sentences(source))
    if not draft["traceability"]["allSelectedSentencesVerbatim"]:
        raise ValueError("Phase 3 could not prove exact source-sentence lineage.")
    if draft["traceability"]["unsupportedClaimsAdded"] != 0:
        raise ValueError("Phase 3 produced unsupported editorial claims.")
    return draft["text"]


def build_editorial_summary(source_summary: str, source_title: str = "") -> dict[str, Any]:
    """Create a locally selected summary, then structure long-source output.

    Sources of 500 words or fewer retain the existing exact source-preservation
    behavior (after safe HTML/whitespace normalization and duplicate removal).
    Longer inputs use Phase 1 selection followed by Phase 2 paragraph structure
    and Phase 3 source-locked composition. No text is padded to meet a target.
    """
    source = _clean(source_summary, 30000)
    words = source.split()
    if not source:
        raise ValueError("Checker-cleared post has no permitted summary text.")
    if len(words) <= SUMMARY_MAX_WORDS:
        sentences = _split_sentences(source)
        distinct_sentences = _remove_near_duplicate_sentences(sentences)
        if len(distinct_sentences) < len(sentences):
            cleaned_summary = " ".join(distinct_sentences)
            count = len(cleaned_summary.split())
            return {
                "text": cleaned_summary,
                "wordCount": count,
                "status": "WITHIN_TARGET" if count >= SUMMARY_MIN_WORDS else "SOURCE_UNDER_200_WORDS",
                "method": "near-duplicate-reduction-v2",
                "sourceSha256": _sha256(source),
            }
        status = "WITHIN_TARGET" if len(words) >= SUMMARY_MIN_WORDS else "SOURCE_UNDER_200_WORDS"
        return {
            "text": source,
            "wordCount": len(words),
            "status": status,
            "method": "source-preserved-within-target" if status == "WITHIN_TARGET" else "source-preserved-no-padding",
            "sourceSha256": _sha256(source),
        }

    sentences = _split_sentences(source)
    if not sentences:
        sentences = [source]
    scores = _sentence_scores(sentences, _clean(source_title, 500))
    selected = _select_mmr(sentences, scores)
    if not selected:
        chosen = words[:SUMMARY_MAX_WORDS]
        summary = " ".join(chosen)
        method = "source-opening-fallback-v1"
        status = "EXTRACTED_BOUNDARY_FALLBACK"
    else:
        selected_sentences = [sentences[index] for index in selected]
        summary = _compose_long_source(source, source_title, selected_sentences)
        count = len(summary.split())
        method = "textrank-mmr-extractive-v2"
        status = "WITHIN_TARGET" if count >= SUMMARY_MIN_WORDS else "SOURCE_UNDER_200_WORDS"
    return {
        "text": summary,
        "wordCount": len(summary.split()),
        "status": status,
        "method": method,
        "sourceSha256": _sha256(source),
    }
