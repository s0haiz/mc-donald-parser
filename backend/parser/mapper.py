"""
3-tier field-name mapping.

    Tier 1 — exact alias match  (confidence 1.0, method 'alias_match')
    Tier 2 — fuzzy match        (confidence 0.70-0.99, method 'fuzzy_match')
    Tier 3 — LLM fallback       (confidence from model, method 'llm_fallback')

Anything that still falls through becomes method 'unknown' and is
appended to the reviewQueue for human approval.

Tier 3 uses the OpenAI API when OPENAI_API_KEY is set. If not set,
it returns None so the caller marks the field 'unknown' — this keeps
the demo deterministic and offline-runnable.
"""
from __future__ import annotations

import difflib
import os
import re
from dataclasses import dataclass
from typing import Any

from .canonical import CanonicalKey, ALIAS_INDEX, canonical_keys_for


@dataclass
class MappingResult:
    canonical_name: str | None   # None when unknown
    method: str                  # 'alias_match' | 'fuzzy_match' | 'llm_fallback' | 'unknown'
    confidence: float
    source_field: str
    canonical_key: CanonicalKey | None = None


# ------------------------------------------------------------------ Tier 1

def _tier1_alias(raw_field: str) -> MappingResult | None:
    key = raw_field.strip().lower()
    ck = ALIAS_INDEX.get(key)
    if ck is None:
        return None
    return MappingResult(
        canonical_name=ck.canonical_name,
        method="alias_match",
        confidence=1.0,
        source_field=raw_field,
        canonical_key=ck,
    )


# ------------------------------------------------------------------ Tier 2

_STRIP_RE = re.compile(r"[\s_\-\.]+")


def _normalize_key(s: str) -> str:
    """Lowercase + strip separators for fuzzy comparison."""
    return _STRIP_RE.sub("", s.lower())


def _tier2_fuzzy(raw_field: str, tool_type: str | None) -> MappingResult | None:
    norm_raw = _normalize_key(raw_field)
    if not norm_raw:
        return None

    # Build candidate pool (tool-scoped + shared)
    candidates: list[tuple[str, CanonicalKey]] = []
    for ck in canonical_keys_for(tool_type):
        candidates.append((_normalize_key(ck.canonical_name), ck))
        for a in ck.aliases:
            candidates.append((_normalize_key(a), ck))

    best_ck: CanonicalKey | None = None
    best_score = 0.0
    for norm_cand, ck in candidates:
        if not norm_cand:
            continue
        ratio = difflib.SequenceMatcher(None, norm_raw, norm_cand).ratio()
        # containment bonus: if one is a substring of the other, boost a bit
        if norm_cand in norm_raw or norm_raw in norm_cand:
            ratio = max(ratio, 0.88)
        if ratio > best_score:
            best_score = ratio
            best_ck = ck

    if best_ck is None or best_score < 0.70:
        return None

    return MappingResult(
        canonical_name=best_ck.canonical_name,
        method="fuzzy_match",
        confidence=round(min(best_score, 0.99), 4),
        source_field=raw_field,
        canonical_key=best_ck,
    )


# ------------------------------------------------------------------ Tier 3 (LLM)

def _tier3_llm(
    raw_field: str,
    sample_value: Any,
    tool_type: str | None,
    vendor: str | None,
    neighbors: list[str] | None = None,
) -> MappingResult | None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None  # offline / demo path

    try:
        # Lazy import so offline demos don't need openai installed
        from openai import OpenAI  # type: ignore
    except Exception:
        return None

    candidate_rows = [
        f"- {ck.canonical_name} ({ck.unit or 'n/a'}): {ck.description}"
        for ck in canonical_keys_for(tool_type)
    ]
    candidates_str = "\n".join(candidate_rows)

    prompt = f"""You are a semiconductor tool log schema mapper.
Map the raw field below to ONE canonical field from the list, or reply
"unknown" if no reasonable match exists.

Tool type : {tool_type or 'unknown'}
Vendor    : {vendor or 'unknown'}
Raw field : {raw_field}
Sample value: {sample_value!r}
Neighbors : {neighbors or []}

Candidate canonical fields:
{candidates_str}

Return JSON only:
{{"canonical": "<name or unknown>", "confidence": <0..1>}}
"""
    try:
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0,
        )
        import json
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
        name = (data.get("canonical") or "").strip()
        conf = float(data.get("confidence") or 0)
    except Exception:
        return None

    if not name or name.lower() == "unknown":
        return None
    ck = ALIAS_INDEX.get(name.lower())
    if ck is None:
        return None
    return MappingResult(
        canonical_name=ck.canonical_name,
        method="llm_fallback",
        confidence=round(conf, 4),
        source_field=raw_field,
        canonical_key=ck,
    )


# ------------------------------------------------------------------ Entry point

def map_field(
    raw_field: str,
    sample_value: Any = None,
    tool_type: str | None = None,
    vendor: str | None = None,
    neighbors: list[str] | None = None,
) -> MappingResult:
    """Run the 3-tier cascade. Always returns a MappingResult."""
    for fn in (_tier1_alias,):
        r = fn(raw_field)
        if r:
            return r
    r = _tier2_fuzzy(raw_field, tool_type)
    if r:
        return r
    r = _tier3_llm(raw_field, sample_value, tool_type, vendor, neighbors)
    if r:
        return r
    return MappingResult(
        canonical_name=None, method="unknown", confidence=0.0,
        source_field=raw_field, canonical_key=None,
    )
