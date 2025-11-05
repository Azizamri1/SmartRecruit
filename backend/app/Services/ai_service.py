import os
import re
import unicodedata
from typing import Dict, Iterable, List, Optional, Set

import numpy as np
from sentence_transformers import CrossEncoder, SentenceTransformer, util


# --- Accent stripping utility ---
def _strip_accents(s: str) -> str:
    # fold accents: "Intégration" -> "Integration", "Développement" -> "Developpement"
    # keeps ASCII letters/digits/#+. (no external deps)
    if not s:
        return ""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch))


_AI_MODEL_NAME = os.getenv("BI_ENCODER_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
_CROSS_ENCODER_NAME = os.getenv(
    "CROSS_ENCODER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"
)
_bi_encoder: SentenceTransformer | None = None
_cross_encoder: CrossEncoder | None = None
_embeddings_cache: Dict[str, np.ndarray] = {}


def get_bi_encoder() -> SentenceTransformer:
    global _bi_encoder
    if _bi_encoder is None:
        _bi_encoder = SentenceTransformer(_AI_MODEL_NAME)
    return _bi_encoder


def get_cross_encoder() -> CrossEncoder:
    global _cross_encoder
    if _cross_encoder is None:
        _cross_encoder = CrossEncoder(_CROSS_ENCODER_NAME)
    return _cross_encoder


def compute_deterministic_score(a: str, b: str) -> float:
    """
    Returns cosine similarity in [-1, 1] using public API only.
    """
    m = get_bi_encoder()
    ea = m.encode([a or ""], normalize_embeddings=True, convert_to_numpy=True)[0]
    eb = m.encode([b or ""], normalize_embeddings=True, convert_to_numpy=True)[0]
    return float(util.cos_sim(ea, eb).item())


def warmup():
    # Safe warmup that never accesses private attributes
    _ = compute_deterministic_score("warmup", "warmup")


class AIService:
    """Legacy compatibility class that wraps the module-level functions"""

    def compute_application_score(
        self, application_data: dict, job_data: dict
    ) -> float:
        # Build application text
        app_parts = []
        if application_data.get("education_level"):
            app_parts.append(f"Education: {application_data['education_level']}")
        if application_data.get("years_experience"):
            app_parts.append(
                f"Experience: {application_data['years_experience']} years"
            )
        if application_data.get("cover_letter"):
            app_parts.append(f"Cover Letter: {application_data['cover_letter']}")

        # Build job text
        job_parts = []
        if job_data.get("title"):
            job_parts.append(f"Job Title: {job_data['title']}")
        if job_data.get("description"):
            job_parts.append(f"Job Description: {job_data['description']}")
        if job_data.get("requirements"):
            if isinstance(job_data["requirements"], list):
                job_parts.append(
                    f"Requirements: {' -- '.join(job_data['requirements'])}"
                )
            else:
                job_parts.append(f"Requirements: {job_data['requirements']}")

        application_text = " ".join(app_parts)
        job_text = " ".join(job_parts)

        # Use safe deterministic scoring
        bi_score = compute_deterministic_score(application_text, job_text)

        # Enhanced scoring with cross-encoder if enabled
        use_cross = os.getenv("USE_CROSS_ENCODER", "true").lower() in {
            "1",
            "true",
            "yes",
        }
        if (
            use_cross
            and len(application_text.split()) > 10
            and len(job_text.split()) > 10
        ):
            try:
                cross_encoder = get_cross_encoder()
                raw = cross_encoder.predict([(application_text, job_text)])[0]
                cross_score = 1 / (1 + np.exp(-raw))
                # Blend scores: 70% cross-encoder, 30% bi-encoder
                return float(max(0.0, min(1.0, 0.7 * cross_score + 0.3 * bi_score)))
            except Exception:
                pass


def map_cosine_to_0_100(sim: float) -> float:
    """
    Maps cosine similarity in [-1, 1] to a 0-100 scale.

    Specs: Clamp sim to [-1, 1], then (sim + 1.0) * 50.0, clamp result to [0, 100].
    Returns: float in [0, 100]
    """
    if sim is None:
        return 0.0
    # clamp to [-1, 1]
    if sim < -1.0:
        sim = -1.0
    elif sim > 1.0:
        sim = 1.0
    score = (sim + 1.0) * 50.0
    # clamp to [0, 100]
    if score < 0.0:
        return 0.0
    if score > 100.0:
        return 100.0
    return float(score)


# new component scorer
_TOKEN_RE = re.compile(r"[a-z0-9\+\.\#]+", re.IGNORECASE)


def _tok(s: str) -> List[str]:
    s = _strip_accents((s or "").lower())
    return _TOKEN_RE.findall(s)


def _norm_items(items: Optional[Iterable[str]]) -> List[str]:
    out: List[str] = []
    if not items:
        return out
    for it in items:
        it = str(it or "").strip()
        if it:
            out.append(it)
    return out


# --- Canonicalization map for common tech terms ---
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
    # front-end / variants
    "front-end": "frontend",
    "front": "frontend",
    "front end": "frontend",
    "frontend": "frontend",
    # Web stack
    "html5": "html",
    "css3": "css",
    # Data/ML variants
    "scikit-learn": "sklearn",
    "scikitlearn": "sklearn",
}


def _canon_token(t: str) -> str:
    return _CANON_MAP.get(t, t)


def _canonize_tokens(tokens: Iterable[str]) -> List[str]:
    toks = list(tokens)
    out: List[str] = []
    i = 0
    while i < len(toks):
        t = toks[i]
        # join 'front' + 'end' → 'frontend'
        if t == "front" and i + 1 < len(toks) and toks[i + 1] == "end":
            out.append("frontend")
            i += 2
            continue
        out.append(_canon_token(t))
        i += 1
    return out


# === CV Scoring: production profile (27_10 decision) ===
# Rationale: industry-style balance; semantically driven with equal secondary emphasis
# on explicit skills & requirements. No length penalty for normal 1–2 page CVs.
W_SIM = 0.40
W_SKILLS = 0.25
W_REQUIREMENTS = 0.25  # from missions + parsed hard requirements
W_PROFILE = 0.10  # softer, nice-to-haves


def _length_penalty(total_token_count: int) -> float:
    """Penalty based on total (not unique) token count."""
    if total_token_count < 150:
        return 10.0
    if total_token_count < 280:  # <= 279 gets a small hit
        return 5.0
    return 0.0  # 280+ no penalty


def _ratio_hit(cv_tokens: Set[str], items: List[str]) -> float:
    """% of items present in cv_tokens (after canonicalization)."""
    if not items:
        return 50.0
    need = [t for t in {i.lower().strip() for i in items} if t]
    if not need:
        return 50.0
    hits = 0
    for raw in need:
        subtoks = _canonize_tokens(_tok(raw))
        if subtoks and set(subtoks).issubset(cv_tokens):
            hits += 1
    return (hits / len(need)) * 100.0


# --- Language aliases + normalizer (used by parse_profile_requirements) ---
_LANG_ALIASES = {
    "english": {"english", "en", "anglais", "inglés"},
    "french": {"french", "fr", "français", "francais"},
    "arabic": {"arabic", "ar", "arabe", "العربية"},
    "spanish": {"spanish", "es", "español", "espanol"},
    "german": {"german", "de", "deutsch", "allemand"},
    "italian": {"italian", "it", "italiano"},
}


def _lang_normalize(tokens: Set[str]) -> Set[str]:
    found = set()
    for canon, aliases in _LANG_ALIASES.items():
        if aliases & tokens:
            found.add(canon)
    return found


_MUST_PAT = re.compile(
    r"\b(must|mandatory|required|obligatoire|nécessaire|necessaire|requis)\b", re.I
)


def parse_profile_requirements(
    text: Optional[str], *, job_skills: Optional[List[str]] = None
) -> dict:
    """
    Returns:
      - profile: generic lines from profile_requirements
      - must_haves: ONLY the tokens that overlap with known job_skills (prevents false caps)
      - languages: inferred languages (accent-folded)
    """
    if not text:
        return {"profile": [], "must_haves": [], "languages": []}

    parts = re.split(r"[\n;•,]+", text)
    parts = [p.strip(" -•\t") for p in parts if p.strip(" -•\t")]

    # Build a normalized set of job skill tokens to intersect with
    job_skill_tokens = set()
    for sk in job_skills or []:
        for t in _canonize_tokens(_tok(sk)):
            job_skill_tokens.add(t)

    must_haves, profile = [], []
    for p in parts:
        if _MUST_PAT.search(p):
            # keep only the overlapping tech tokens as must-haves (avoid generic FR words)
            toks = set(_canonize_tokens(_tok(p)))
            techs = (
                sorted((toks & job_skill_tokens)) if job_skill_tokens else list(toks)
            )
            must_haves.extend(techs)
        else:
            profile.append(p)

    toks_all = set(_canonize_tokens(_tok(text)))
    langs = sorted(_lang_normalize(toks_all))
    # de-duplicate musts
    must_haves = sorted(set(must_haves))
    return {"profile": profile, "must_haves": must_haves, "languages": langs}


def _cap_if_missing_musts(
    cv_tokens: Set[str], must_haves: List[str]
) -> Optional[float]:
    """Cap score only if NONE of the must-haves are present."""
    musts = [t for t in {m.lower().strip() for m in (must_haves or [])} if t]
    if not musts:
        return None
    present = 0
    for m in musts:
        subtoks = set(_canonize_tokens(_tok(m)))
        if subtoks and subtoks.issubset(cv_tokens):
            present += 1
    # If we matched at least one must-have, don't cap
    if present > 0:
        return None
    # Otherwise apply cap
    return 60.0


def bi_encoder_similarity_0_100(cv_text: str, job_text: str) -> float:
    return map_cosine_to_0_100(compute_deterministic_score(cv_text, job_text))


def score_components(
    cv_text: str,
    job_text: str,
    *,
    skills=None,
    requirements=None,
    profile=None,
    must_haves=None,
    languages=None,
) -> Dict[str, float]:
    """Computes granular components of CV-job relevance."""
    # Canonicalize and tokenize CV
    all_tokens = _tok(cv_text)
    cv_tokens: Set[str] = set(_canonize_tokens(all_tokens))

    # Run embedding similarity
    sim = float(bi_encoder_similarity_0_100(cv_text, job_text))

    # Normalize fields
    skills = _norm_items(skills)
    requirements = _norm_items(requirements)
    profile = _norm_items([profile] if isinstance(profile, str) else profile)
    must_haves = _norm_items(must_haves)
    languages = _norm_items(languages)

    # Component ratios
    r_skills = _ratio_hit(cv_tokens, skills)
    r_reqs = _ratio_hit(cv_tokens, requirements)
    r_prof = _ratio_hit(cv_tokens, profile)
    langs_score = _ratio_hit(cv_tokens, languages)

    # Combine weighted base score
    base = (
        W_SIM * sim + W_SKILLS * r_skills + W_REQUIREMENTS * r_reqs + W_PROFILE * r_prof
    )

    len_penalty = _length_penalty(len(all_tokens))
    cap = _cap_if_missing_musts(cv_tokens, must_haves)

    return {
        "sim": sim,
        "skills": r_skills,
        "requirements": r_reqs,
        "profile": r_prof,
        "langs": langs_score,
        "len_penalty": len_penalty,
        "must_cap": cap,
        "base_before_penalties": round(base, 2),
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
    c = score_components(
        cv_text,
        job_text,
        skills=skills,
        requirements=requirements,
        profile=profile,
        languages=languages,
        must_haves=must_haves,
    )
    total = c["base_before_penalties"] - c["len_penalty"]
    if c["must_cap"] is not None:
        total = min(total, c["must_cap"])
    return round(max(0.0, min(100.0, total)), 2)


# Global service instance for backward compatibility
ai_service = AIService()
