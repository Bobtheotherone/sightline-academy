"""Corpus -> ChromaDB ingestion (ADR-004; adapted from STARTER/ingest.py).

- One corpus file == one Chroma document (never re-chunk).
- Document id == front-matter `id`; metadata carries title/topic/tags/
  module_refs (Chroma metadata values must be scalars, so lists are joined).
- Embeddings: sentence-transformers all-MiniLM-L6-v2, computed locally.
- The collection is created with {"hnsw:space": "cosine"} — Chroma defaults to
  l2, and the tutor pipeline's SOFT_FLOOR is cosine similarity (1 - distance).
- Idempotent: called at every boot; re-ingests only when the collection count
  doesn't match the corpus file count (SPEC-002). SEED_FORCE=1 wipes and reloads.
- Fail loudly: a malformed corpus file stops the boot naming file + problem.

chromadb / sentence-transformers imports are deferred into functions so that
importing the app (tests, tooling) stays fast.
"""

from __future__ import annotations

import logging
import re
import sys
from functools import lru_cache
from pathlib import Path

from ..config import get_settings

logger = logging.getLogger("sightline.corpus")

COLLECTION = "sightline_corpus"
EMBED_MODEL = "all-MiniLM-L6-v2"

FRONT_MATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.S)
REQUIRED_KEYS = ("id", "title", "topic", "tags", "module_refs", "source_basis")


class CorpusError(SystemExit):
    """Boot-stopping corpus problem. Message names file + issue."""


def parse_chunk(path: Path) -> tuple[str, str, dict]:
    text = path.read_text(encoding="utf-8")
    m = FRONT_MATTER_RE.match(text)
    if not m:
        raise CorpusError(f"[corpus] {path.name}: missing front-matter fences")
    fm_raw, body = m.groups()

    fm: dict[str, str] = {}
    for line in fm_raw.splitlines():
        if ":" not in line:
            raise CorpusError(f"[corpus] {path.name}: bad front-matter line {line!r}")
        key, _, val = line.partition(":")
        fm[key.strip()] = val.strip()

    missing = [k for k in REQUIRED_KEYS if k not in fm]
    if missing:
        raise CorpusError(f"[corpus] {path.name}: missing keys {missing}")

    words = len(body.split())
    if not 100 <= words <= 500:  # authored target 150-400; hard rails wider
        raise CorpusError(f"[corpus] {path.name}: body is {words} words (rails: 100-500)")

    def as_list(raw: str) -> list[str]:
        return [x.strip() for x in raw.strip("[]").split(",") if x.strip()]

    meta = {
        "title": fm["title"],
        "topic": fm["topic"],
        "tags": ",".join(as_list(fm["tags"])),           # scalar for Chroma
        "module_refs": ",".join(as_list(fm["module_refs"])),
        "source_basis": fm["source_basis"],
    }
    # Embed title + tags with the body: cheap, measurable retrieval win for
    # short keyword questions ("T-CLOC?", "tire pressure").
    embed_text = f"{fm['title']}\n{meta['tags']}\n{body.strip()}"
    return fm["id"], embed_text, meta


@lru_cache
def _client():
    import chromadb

    return chromadb.PersistentClient(path=str(get_settings().chroma_path))


@lru_cache
def _embedder():
    from chromadb.utils import embedding_functions

    return embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMBED_MODEL)


def get_collection():
    """The corpus collection, cosine-configured (metadata applies at creation)."""
    return _client().get_or_create_collection(
        COLLECTION,
        embedding_function=_embedder(),
        metadata={"hnsw:space": "cosine"},
    )


def doc_count() -> int:
    """Current corpus doc count for /meta/health; 0 when the store is absent."""
    try:
        return get_collection().count()
    except Exception:  # pragma: no cover - only on storage failure
        return 0


def warm_embedder() -> None:
    """One dummy encode so the first real request doesn't pay model load."""
    _embedder()(["sightline warm-up"])
    logger.info("embed model warmed (%s)", EMBED_MODEL)


def ingest(force: bool = False) -> int:
    corpus_dir = get_settings().corpus_path
    files = sorted(corpus_dir.glob("*.md"))
    if not files:
        raise CorpusError(f"[corpus] no .md files in {corpus_dir} — content missing?")

    if force:
        try:
            _client().delete_collection(COLLECTION)
        except Exception:
            pass
    coll = get_collection()

    if coll.count() == len(files) and not force:
        logger.info("corpus up to date (%d chunks)", coll.count())
        return coll.count()

    ids: list[str] = []
    docs: list[str] = []
    metas: list[dict] = []
    for path in files:
        cid, text, meta = parse_chunk(path)
        if cid in ids:
            raise CorpusError(f"[corpus] duplicate id {cid!r} ({path.name})")
        ids.append(cid)
        docs.append(text)
        metas.append(meta)

    # Rebuild wholesale — the corpus is small and correctness beats cleverness.
    existing = coll.get()["ids"]
    if existing:
        coll.delete(ids=existing)
    coll.add(ids=ids, documents=docs, metadatas=metas)
    logger.info("corpus: ingested %d chunks into '%s'", len(ids), COLLECTION)
    return len(ids)


def ingest_if_needed(force: bool = False) -> int:
    """SPEC-002 startup step 4: ingest when collection count != corpus files."""
    return ingest(force=force)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    ingest(force="--force" in sys.argv)
