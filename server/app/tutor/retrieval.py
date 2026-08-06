"""Retrieval + shaping (ADR-004): Chroma top-k, soft floor, topic dedupe, cap.

`shape_retrieval` and `grounding_label` are PURE functions and the QA-003
retrieval unit target. `query_chroma` imports chromadb lazily so the pure
functions can be tested (and imported) without touching the vector store.
"""

from dataclasses import dataclass, field

from ..config import get_settings

TOP_K = 6
# Cosine-similarity floor (score = 1 - distance), tuned ONCE against the
# SPEC-008 acceptance set (wire lane). Observed all-MiniLM-L6-v2 ranges on this
# corpus: directly-on-topic chunks 0.455-0.715, secondary/noise 0.131-0.411,
# off-topic tops out ~0.18. 0.43 sits in the gap between those bands so chips
# only cite chunks genuinely on topic. The floor is SOFT (ADR-005): an empty
# result changes the grounding label, never the willingness to answer.
SOFT_FLOOR = 0.43
MAX_PER_TOPIC = 2
MAX_KEPT = 4

COLLECTION = "sightline_corpus"
EMBED_MODEL = "all-MiniLM-L6-v2"

_collection = None  # lazily-built Chroma collection handle (per-process)


@dataclass
class Chunk:
    id: str
    title: str
    topic: str
    body: str
    score: float
    module_refs: list[str] = field(default_factory=list)


def _get_collection():
    """Chroma collection with the same client path + embedder the ingester uses."""
    global _collection
    if _collection is None:
        import chromadb
        from chromadb.utils import embedding_functions

        client = chromadb.PersistentClient(path=str(get_settings().chroma_path))
        embedder = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBED_MODEL
        )
        _collection = client.get_or_create_collection(
            COLLECTION,
            embedding_function=embedder,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def _strip_embed_prefix(document: str, meta: dict) -> str:
    """Undo the ingester's `title\\ntags\\nbody` embed text back to authored body."""
    lines = document.split("\n")
    if lines and lines[0].strip() == str(meta.get("title", "")).strip():
        lines = lines[1:]
        if lines and lines[0].strip() == str(meta.get("tags", "")).strip():
            lines = lines[1:]
    return "\n".join(lines).strip()


def query_chroma(text: str, k: int = TOP_K) -> list[Chunk]:
    """Embed the message and return the top-k corpus chunks with cosine scores."""
    coll = _get_collection()
    res = coll.query(
        query_texts=[text],
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )
    chunks: list[Chunk] = []
    rows = zip(
        res["ids"][0], res["documents"][0], res["metadatas"][0], res["distances"][0],
        strict=True,
    )
    for chunk_id, document, meta, distance in rows:
        chunks.append(
            Chunk(
                id=chunk_id,
                title=str(meta.get("title", chunk_id)),
                topic=str(meta.get("topic", "general")),
                body=_strip_embed_prefix(document, meta),
                score=1.0 - float(distance),
                module_refs=[
                    ref for ref in str(meta.get("module_refs", "")).split(",") if ref
                ],
            )
        )
    return chunks


def shape_retrieval(raw: list[Chunk]) -> list[Chunk]:
    """top-k in -> floored, topic-deduped, capped out. Pure; unit-test target."""
    floored = [c for c in raw if c.score >= SOFT_FLOOR]
    kept: list[Chunk] = []
    per_topic: dict[str, int] = {}
    for c in sorted(floored, key=lambda c: c.score, reverse=True):
        if per_topic.get(c.topic, 0) >= MAX_PER_TOPIC:
            continue
        kept.append(c)
        per_topic[c.topic] = per_topic.get(c.topic, 0) + 1
        if len(kept) == MAX_KEPT:
            break
    return kept


def grounding_label(kept: list[Chunk]) -> str:
    """Unit-test target (QA-003 #3): 2+ curriculum / 1 mixed / 0 general."""
    if len(kept) >= 2:
        return "curriculum"
    if len(kept) == 1:
        return "mixed"
    return "general"
