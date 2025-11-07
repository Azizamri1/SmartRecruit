"""
AI-powered CV-job matching services.
Provides text processing, similarity scoring, and job requirement parsing.
"""

from sentence_transformers import SentenceTransformer, util
import numpy as np
import os
import re
import unicodedata
from typing import Dict, Optional, Iterable, List, Set

# Public API exports
__all__ = [
    "parse_profile_requirements",
    "score_components", "score_cv_to_job",
    "compute_deterministic_score", "map_cosine_to_0_100",
    "warmup",
    "_tok", "_canonize_tokens",
    "LEN_TIER_HARD", "LEN_TIER_SOFT", "MUST_CAP_NO_HIT",
]

def _strip_accents(text: str) -> str:
    """Remove accents from text while preserving ASCII characters."""
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(char for char in normalized if not unicodedata.combining(char))

# AI model configuration and caching
_AI_MODEL_NAME = os.getenv("BI_ENCODER_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
_bi_encoder: SentenceTransformer | None = None

def get_bi_encoder() -> SentenceTransformer:
    """Get or create the sentence transformer model instance."""
    global _bi_encoder
    if _bi_encoder is None:
        _bi_encoder = SentenceTransformer(_AI_MODEL_NAME)
    return _bi_encoder

def compute_deterministic_score(text_a: str, text_b: str) -> float:
    """
    Calculate cosine similarity between two texts.

    Returns:
        Similarity score in range [-1, 1]
    """
    model = get_bi_encoder()
    embeddings_a = model.encode([text_a or ""], normalize_embeddings=True, convert_to_numpy=True)[0]
    embeddings_b = model.encode([text_b or ""], normalize_embeddings=True, convert_to_numpy=True)[0]
    return float(util.cos_sim(embeddings_a, embeddings_b).item())

def warmup():
    """Pre-load AI models to reduce first-request latency."""
    _ = compute_deterministic_score("warmup", "warmup")

def map_cosine_to_0_100(similarity: float) -> float:
    """
    Convert cosine similarity to a 0-100 score.

    Clamps input to [-1, 1] then scales to [0, 100].
    """
    if similarity is None:
        return 0.0

    # Ensure similarity is in valid range
    if similarity < -1.0:
        similarity = -1.0
    elif similarity > 1.0:
        similarity = 1.0

    score = (similarity + 1.0) * 50.0

    # Clamp final score to [0, 100]
    if score < 0.0:
        return 0.0
    if score > 100.0:
        return 100.0

    return float(score)

# Text processing utilities
_TOKEN_RE = re.compile(r"[a-z0-9\+\.\#]+", re.IGNORECASE)

def _tok(text: str) -> List[str]:
    """Tokenize text into lowercase words, removing accents."""
    cleaned = _strip_accents((text or "").lower())
    return _TOKEN_RE.findall(cleaned)

def _norm_items(items: Optional[Iterable[str]]) -> List[str]:
    """Normalize a collection of strings, filtering out empty values."""
    result = []
    if not items:
        return result
    for item in items:
        cleaned = str(item or "").strip()
        if cleaned:
            result.append(cleaned)
    return result

# Technology term standardization
_CANON_MAP = {
    # JavaScript ecosystem
    "react.js": "react",
    "reactjs": "react",
    "next.js": "nextjs",
    "nextjs": "nextjs",
    "node.js": "node",
    "nodejs": "node",
    "js": "javascript",
    "javascript": "javascript",
    "ts": "typescript",
    "typescript": "typescript",
    # Frontend variants
    "front-end": "frontend",
    "front": "frontend",
    "front end": "frontend",
    "frontend": "frontend",
    # Web technologies
    "html5": "html",
    "css3": "css",
    # ML/Data science
    "scikit-learn": "sklearn",
    "scikitlearn": "sklearn",
}

def _canon_token(token: str) -> str:
    """Standardize common technology term variants."""
    return _CANON_MAP.get(token, token)

def _canonize_tokens(tokens: Iterable[str]) -> List[str]:
    """Apply term standardization and handle compound terms."""
    token_list = list(tokens)
    result = []
    i = 0
    while i < len(token_list):
        current = token_list[i]
        # Handle "front end" -> "frontend"
        if current == "front" and i + 1 < len(token_list) and token_list[i + 1] == "end":
            result.append("frontend")
            i += 2
            continue
        result.append(_canon_token(current))
        i += 1
    return result

# Common stopwords to filter out
_STOPWORDS = {
    "and", "or", "with", "the", "a", "an", "of", "in", "to", "for", "on", "as", "at", "by", "from",
    "experience", "experiences", "strong", "good", "solid",
    # French stopwords
    "et", "ou", "avec", "le", "la", "les", "de", "des", "du", "un", "une", "dans", "pour", "sur", "en", "par",
}

def _is_keyword(token: str) -> bool:
    """Check if token represents a meaningful skill/keyword."""
    if not token or token in _STOPWORDS:
        return False
    if token.isdigit() or len(token) < 2:
        return False
    return True

# CV-job matching algorithm weights
# Balanced approach favoring semantic similarity with equal emphasis on skills/requirements
W_SIM = 0.40          # Semantic similarity (primary factor)
W_SKILLS = 0.25       # Explicit skills matching
W_REQUIREMENTS = 0.25 # Job requirements matching
W_PROFILE = 0.10      # Profile/nice-to-have matching

# Scoring penalty configuration
LEN_TIER_HARD = 150   # Below this: 10.0 penalty
LEN_TIER_SOFT = 280   # 150-279: 5.0 penalty, 280+: no penalty
PENALTY_HARD = 10.0
PENALTY_SOFT = 5.0
MUST_CAP_NO_HIT = 70.0  # Cap score when must-have requirements missing

def _length_penalty_v2(token_count: int) -> float:
    """Apply length-based penalty based on token count tiers."""
    if token_count < LEN_TIER_HARD:
        return PENALTY_HARD
    if token_count < LEN_TIER_SOFT:
        return PENALTY_SOFT
    return 0.0

def _ratio_hit(cv_tokens: Set[str], required_items: List[str]) -> float:
    """Calculate percentage of required items present in CV tokens."""
    if not required_items:
        return 50.0

    # Normalize and deduplicate requirements
    normalized_needs = [t for t in {item.lower().strip() for item in required_items} if t]
    if not normalized_needs:
        return 50.0

    matches = 0
    for item in normalized_needs:
        item_tokens = _canonize_tokens(_tok(item))
        if item_tokens and set(item_tokens).issubset(cv_tokens):
            matches += 1

    return (matches / len(normalized_needs)) * 100.0

# Language detection mappings
_LANGUAGE_ALIASES = {
    "english": {"english", "en", "anglais", "inglés"},
    "french": {"french", "fr", "français", "francais"},
    "arabic": {"arabic", "ar", "arabe", "العربية"},
    "spanish": {"spanish", "es", "español", "espanol"},
    "german": {"german", "de", "deutsch", "allemand"},
    "italian": {"italian", "it", "italiano"},
}

def _lang_normalize(tokens: Set[str]) -> Set[str]:
    """Extract detected languages from token set."""
    detected = set()
    for language, aliases in _LANGUAGE_ALIASES.items():
        if aliases & tokens:
            detected.add(language)
    return detected

# Pattern for detecting mandatory requirements
_MANDATORY_PATTERN = re.compile(r"\b(must|mandatory|required|obligatoire|nécessaire|necessaire|requis)\b", re.I)

def parse_profile_requirements(text: Optional[str], *, job_skills: Optional[List[str]] = None) -> dict:
    """
    Parse job profile requirements into structured components.

    Extracts profile descriptions, mandatory requirements, and languages.
    Mandatory items are filtered to only include known job skills.
    """
    if not text:
        return {"profile": [], "must_haves": [], "languages": []}

    # Split on common separators
    sections = re.split(r"[\n;•,]+", text)
    sections = [s.strip(" -•\t") for s in sections if s.strip(" -•\t")]

    # Build skill token set for filtering mandatory requirements
    skill_tokens = set()
    if job_skills:
        for skill in job_skills:
            skill_tokens.update(_canonize_tokens(_tok(skill)))

    mandatory_items = []
    profile_items = []

    for section in sections:
        if _MANDATORY_PATTERN.search(section):
            # Extract tokens that match known job skills
            section_tokens = set(_canonize_tokens(_tok(section)))
            matching_skills = sorted((section_tokens & skill_tokens)) if skill_tokens else list(section_tokens)
            mandatory_items.extend(matching_skills)
        else:
            profile_items.append(section)

    # Detect languages from all text
    all_tokens = set(_canonize_tokens(_tok(text)))
    languages = sorted(_lang_normalize(all_tokens))

    # Remove duplicates from mandatory items
    mandatory_items = sorted(set(mandatory_items))

    return {
        "profile": profile_items,
        "must_haves": mandatory_items,
        "languages": languages
    }

def _cap_if_missing_musts(cv_tokens: Set[str], must_haves: List[str]) -> Optional[float]:
    """Return cap value if no mandatory requirements are satisfied."""
    if not must_haves:
        return None

    # Check each mandatory requirement
    satisfied_count = 0
    for requirement in must_haves:
        req_tokens = set(_canonize_tokens(_tok(requirement)))
        if req_tokens and req_tokens.issubset(cv_tokens):
            satisfied_count += 1

    # If at least one requirement is satisfied, no cap
    return None if satisfied_count > 0 else MUST_CAP_NO_HIT

def bi_encoder_similarity_0_100(cv_text: str, job_text: str) -> float:
    """Calculate CV-job similarity on 0-100 scale using embeddings."""
    return map_cosine_to_0_100(compute_deterministic_score(cv_text, job_text))

def score_components(cv_text: str, job_text: str, *, skills=None, requirements=None,
                     profile=None, must_haves=None, languages=None) -> Dict[str, float]:
    """
    Calculate detailed CV-job matching components.

    Returns granular scores for similarity, skills match, requirements match,
    profile match, language match, and applicable penalties/caps.
    """
    # Process and tokenize CV text
    all_tokens = _canonize_tokens(_tok(cv_text))
    cv_keywords = {t for t in all_tokens if _is_keyword(t)}

    # Log tokenization stats
    import logging as _lg
    _lg.getLogger("smartrecruit").info(
        "[penalty-trace] words=%d canon_tokens=%d keywords=%d",
        len((cv_text or "").split()), len(all_tokens), len(cv_keywords)
    )

    # Calculate semantic similarity
    similarity = float(bi_encoder_similarity_0_100(cv_text, job_text))

    # Normalize input lists
    skills = _norm_items(skills)
    requirements = _norm_items(requirements)
    profile = _norm_items([profile] if isinstance(profile, str) else profile)
    must_haves = _norm_items(must_haves)
    languages = _norm_items(languages)

    # Calculate component match percentages
    skills_score = _ratio_hit(cv_keywords, skills)
    requirements_score = _ratio_hit(cv_keywords, requirements)
    profile_score = _ratio_hit(cv_keywords, profile)
    languages_score = _ratio_hit(cv_keywords, languages)

    # Combine weighted scores
    base_score = (
        W_SIM * similarity +
        W_SKILLS * skills_score +
        W_REQUIREMENTS * requirements_score +
        W_PROFILE * profile_score
    )

    # Apply length penalty
    token_count = len(all_tokens)
    length_penalty = _length_penalty_v2(token_count)

    # Validate penalty logic
    if token_count >= LEN_TIER_SOFT and length_penalty != 0.0:
        import logging as _lg
        _lg.getLogger("smartrecruit").warning(
            "[penalty-assert] expected 0.0 for tokens=%d but got %s", token_count, length_penalty
        )

    # Log penalty application
    import logging as _lg
    _lg.getLogger("smartrecruit").info(
        "[penalty-trace] token_count=%d len_penalty=%s", token_count, length_penalty
    )

    # Check for must-have requirement cap
    cap = _cap_if_missing_musts(cv_keywords, must_haves)

    return {
        "sim": similarity,
        "skills": skills_score,
        "requirements": requirements_score,
        "profile": profile_score,
        "langs": languages_score,
        "len_penalty": length_penalty,
        "must_cap": cap,
        "base_before_penalties": round(base_score, 2),
    }

def score_cv_to_job(
    cv_text: str,
    job_text: str,
    *,
    skills: Optional[List[str]] = None,
    requirements: Optional[List[str]] = None,
    profile: Optional[List[str]] = None,
    languages: Optional[List[str]] = None,
    must_haves: Optional[List[str]] = None,
) -> float:
    """
    Calculate final CV-job match score (0-100).

    Applies penalties and caps to base component scores.
    """
    components = score_components(
        cv_text, job_text,
        skills=skills, requirements=requirements, profile=profile,
        languages=languages, must_haves=must_haves,
    )

    # Apply length penalty
    final_score = components["base_before_penalties"] - components["len_penalty"]

    # Apply must-have cap if applicable
    if components["must_cap"] is not None:
        final_score = min(final_score, components["must_cap"])

    # Clamp to valid range
    return round(max(0.0, min(100.0, final_score)), 2)
