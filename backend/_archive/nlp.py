# app/utils/nlp.py
from __future__ import annotations

import os
from typing import List, Tuple

import numpy as np
from docx import Document
from pydantic import BaseModel
from pypdf import PdfReader
from sentence_transformers import CrossEncoder, SentenceTransformer, util


# ==== Request body passthrough used in applications router ====
class BaseModelLike(BaseModel):
    pass


# ---- Model loading (singletons) ----
# Fast and good: all-MiniLM-L6-v2 (384-dim). You can switch via env if you want.
BI_ENCODER_MODEL_NAME = os.getenv(
    "BI_ENCODER_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
)
CROSS_ENCODER_MODEL_NAME = os.getenv(
    "CROSS_ENCODER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"
)
USE_CROSS_ENCODER = os.getenv("USE_CROSS_ENCODER", "true").lower() in {
    "1",
    "true",
    "yes",
}

_bi_encoder: SentenceTransformer | None = None
_cross_encoder: CrossEncoder | None = None


def _get_bi_encoder() -> SentenceTransformer:
    global _bi_encoder
    if _bi_encoder is None:
        _bi_encoder = SentenceTransformer(BI_ENCODER_MODEL_NAME)
    return _bi_encoder


def _get_cross_encoder() -> CrossEncoder:
    global _cross_encoder
    if _cross_encoder is None:
        _cross_encoder = CrossEncoder(CROSS_ENCODER_MODEL_NAME)
    return _cross_encoder


# ---- Basic text extraction for CV files ----
def extract_text(path: str) -> str:
    pl = path.lower()
    if pl.endswith(".pdf"):
        reader = PdfReader(path)
        return "\n".join([p.extract_text() or "" for p in reader.pages])
    if pl.endswith(".docx"):
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs)
    if pl.endswith(".txt"):
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    raise ValueError(f"Unsupported file type: {os.path.basename(path)}")


# ---- Normalization (very light) ----
def _normalize(text: str) -> str:
    # Keep it simple; heavy cleanup can hurt semantic models
    return " ".join(text.replace("\r", " ").split())


# ---- Core similarity (bi-encoder + optional cross-encoder) ----
def compute_similarity(cv_text: str, job_text: str) -> float:
    """
    Returns a score in [0,1] using a bi-encoder cosine similarity,
    optionally refined by a cross-encoder reranker.
    """
    cv_text = _normalize(cv_text)
    job_text = _normalize(job_text)

    bi = _get_bi_encoder()

    # Encode (mean pooling by default)
    cv_emb = bi.encode(cv_text, convert_to_tensor=True, normalize_embeddings=True)
    job_emb = bi.encode(job_text, convert_to_tensor=True, normalize_embeddings=True)

    # Cosine similarity -> [-1,1]; clamp to [0,1]
    sim = float(util.cos_sim(cv_emb, job_emb).item())
    bi_score = max(0.0, min(1.0, (sim + 1.0) / 2.0))

    if not USE_CROSS_ENCODER:
        return bi_score

    try:
        cross = _get_cross_encoder()
        # Cross-encoder returns unbounded scores; use sigmoid to map to (0,1)
        raw = cross.predict([(cv_text, job_text)])[0]
        cross_score = 1 / (1 + np.exp(-raw))
        # Blend: cross-encoder dominates but keep bi-encoder as prior
        score = 0.7 * float(cross_score) + 0.3 * float(bi_score)
        return float(max(0.0, min(1.0, score)))
    except Exception:
        # If cross-encoder fails, fall back gracefully
        return bi_score


# ---- Batch helper (useful later if you pre-score many internships) ----
def rank_internships(
    cv_text: str, jobs: List[Tuple[int, str]], top_k: int = 20
) -> List[Tuple[int, float]]:
    """
    jobs: list of (internship_id, job_text)
    Returns [(id, score)] sorted by score desc.
    Uses bi-encoder to get top_k, then optional cross-encoder rerank.
    """
    cv_text_n = _normalize(cv_text)
    job_texts = [_normalize(x[1]) for x in jobs]

    bi = _get_bi_encoder()
    cv_emb = bi.encode(cv_text_n, convert_to_tensor=True, normalize_embeddings=True)
    job_embs = bi.encode(job_texts, convert_to_tensor=True, normalize_embeddings=True)

    cos = util.cos_sim(cv_emb, job_embs)[0].cpu().numpy()  # [-1,1]
    bi_scores = (cos + 1.0) / 2.0  # [0,1]

    idx_sorted = np.argsort(-bi_scores)
    idx_top = idx_sorted[: min(top_k, len(jobs))]

    candidates = [(jobs[i][0], float(bi_scores[i])) for i in idx_top]

    if not USE_CROSS_ENCODER:
        return sorted(candidates, key=lambda x: x[1], reverse=True)

    # Rerank with cross-encoder
    try:
        cross = _get_cross_encoder()
        pairs = [(cv_text_n, job_texts[i]) for i in idx_top]
        raw = cross.predict(pairs)  # list of floats
        cross_scores = 1 / (1 + np.exp(-np.array(raw)))
        blended = [
            (jobs[i][0], float(0.7 * cross_scores[j] + 0.3 * bi_scores[i]))
            for j, i in enumerate(idx_top)
        ]
        return sorted(blended, key=lambda x: x[1], reverse=True)
    except Exception:
        return sorted(candidates, key=lambda x: x[1], reverse=True)
