#!/usr/bin/env python3
"""Local, deterministic text-intelligence helpers for LIVE // EARTH Editorial.

No network access, external packages, hosted models, or third-party services.
The module produces extractive summaries: selected source sentences are kept
verbatim and returned in their original order.
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
    "by", "did", "do", "does", "during", "each", "for",
    "from", "had", "has", "have", "he", "her", "here", "hers", "him",
    "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself",
    "just", "more", "most", "of",
    "on", "once", "only", "or", "other", "our", "ours", "out", "over",
    "said", "same", "she", "should", "since", "so", "some", "such", "than",
    "that", "the", "their", "them", "then", "there", "these", "they",
    "this", "those", "through", "to", "too", "under", "up", "was", "we",
    "were", "what", "when", "where", "which", "while", "who",
    "with", "you", "your",
}

_ABBREVIATIONS = (
    "Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Sr.", "Jr.", "St.", "vs.",
    "e.g.", "i.e.", "etc.", "No.", "Fig.", "Eq.", "U.S.", "U.K.",
)

_NUMBER_OR_MEASUREMENT = re.compile(
    r"(?<!\w)(?:\d{1,4}(?:,\d{3})*(?:\.\d+)?%?|\d{1,2}:\d{2}|"
    r"\d{4}-\d{2}-\d{2})(?!\w)|"
    r"\b(?:km|kilomet(?:er|re)s?|miles?|meters?|metres?|cm|mm|"
    r"kg|grams?|mg|°c|°f|kelvin|seconds?|minutes?|hours?|days?|years?|"
    r"million|billion|trillion|percent|per cent)\b",
    re.IGNORECASE,
)
_QUOTED = re.compile(r"(?:\"[^\"]{8,}\"|“[^”]{8,}”|'[^']{12,}')")
_WORDS = re.compile(r"[a-z0-9]+(?:['’-][a-z0-9]+)?", re.IGNORECASE)


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
        pattern = re.compile(re.escape(abbreviation), re.IGNORECASE)
        protected, count = pattern.subn(token, protected)
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
    if not left_norm or not right_norm:
        return 0.0
    return dot / (left_norm * right_norm)


def _textrank(sentences: list[str]) -> list[float]:
    """Small weighted TextRank implementation using TF-IDF cosine edges."""
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
            # Ignore weak lexical overlap; it is usually noise for short feeds.
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
    if not tokens or not title_tokens:
        return 0.0
    return len(tokens & title_tokens) / max(1, len(title_tokens))


def _fact_density(sentence: str) -> float:
    tokens = _tokens(sentence)
    if not tokens:
        return 0.0
    anchors = len(_NUMBER_OR_MEASUREMENT.findall(sentence))
    named_phrases = re.findall(r"\b[A-Z][a-zA-Z'’-]{2,}(?:\s+[A-Z][a-zA-Z'’-]{2,}){0,3}", sentence)
    # Bounded contribution: this is a prioritisation hint, not fact verification.
    return min(1.0, (anchors * 0.22 + min(2, len(named_phrases)) * 0.08))


def _sentence_scores(sentences: list[str], title: str) -> list[float]:
    if not sentences:
        return []
    graph_scores = _textrank(sentences)
    title_tokens = set(_tokens(title))
    total = len(sentences)
    scores = []
    for index, sentence in enumerate(sentences):
        title_score = _title_relevance(sentence, title_tokens)
        # Early sentences often contain the lead, but position never dominates.
        position_score = 1.0 / (1.0 + index * 0.03)
        fact_score = _fact_density(sentence)
        quote_score = 0.12 if _QUOTED.search(sentence) else 0.0
        # Mix network centrality, title relevance, factual density and a modest
        # lead preference. All features are deterministic and local.
        score = (
            0.56 * graph_scores[index]
            + 0.19 * title_score
            + 0.13 * position_score
            + 0.09 * fact_score
            + 0.03 * quote_score
        )
        scores.append(score)
    maximum = max(scores) or 1.0
    return [score / maximum for score in scores]


def _select_mmr(
    sentences: list[str],
    scores: list[float],
    target_min: int = SUMMARY_MIN_WORDS,
    target_max: int = SUMMARY_MAX_WORDS,
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
            if size > target_max:
                continue
            if total_words + size > target_max:
                continue
            similarity = max(
                (_cosine(vectors[index], vectors[chosen], idf) for chosen in selected),
                default=0.0,
            )
            # Do not re-add near-duplicate sentences just to meet a word target.
            if similarity >= 0.88:
                continue
            # MMR: preserve relevance, penalise repeated content. A small
            # novelty bonus helps cover facts not represented by selected text.
            novelty = 1.0 - similarity
            combined = 0.72 * scores[index] + 0.28 * novelty
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
    """Remove repeated sentences without collapsing changed numbers or quotes."""
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
                # Only collapse very close paraphrase-like duplicates. The
                # original sentence is retained; no wording is generated.
                if _cosine(vector, prior_vector, {token: 1.0 for token in set(vector) | set(prior_vector)}) >= 0.94:
                    duplicate = True
                    break
        if not duplicate:
            kept.append(sentence)
            kept_vectors.append(vector)
    return kept


def build_editorial_summary(source_summary: str, source_title: str = "") -> dict[str, Any]:
    """Create an extractive summary with graph ranking and redundancy control.

    Distinct text at or below 500 words is preserved after normalisation;
    repeated sentences are removed. Longer sources are selected from complete
    source sentences. The calling Editorial Engine preserves the original record.
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
        # Conservative fallback: take the source opening, without adding text.
        chosen = words[:SUMMARY_MAX_WORDS]
        summary = " ".join(chosen)
        method = "source-opening-fallback-v1"
        status = "EXTRACTED_BOUNDARY_FALLBACK"
    else:
        summary = " ".join(sentences[index] for index in selected)
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
