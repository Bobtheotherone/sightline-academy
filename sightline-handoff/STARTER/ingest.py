"""Reference implementation: corpus -> ChromaDB ingestion (ADR-004).

Copy to server/app/ingest/ingest.py and adapt imports/config to the app's
settings module. The shape below is the contract:

- One corpus file == one Chroma document (never re-chunk).
- Document id == front-matter `id`; metadata carries title/topic/tags/
  module_refs (Chroma metadata values must be scalars, so lists are joined).
- Embeddings: sentence-transformers all-MiniLM-L6-v2, computed locally.
- Idempotent: called at every boot; re-ingests only when the collection count
  doesn't match the corpus file count (SPEC-002 startup sequence). SEED_FORCE=1
  wipes and reloads.
- Fail loudly: a malformed corpus file stops the boot with a message naming the
  file and the problem (ADR-006).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions

CORPUS_DIR = Path("content/corpus")          # ADR-002 layout
CHROMA_DIR = Path("data/chroma")             # inside the sightline-data volume
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


def ingest(force: bool = False) -> int:
    files = sorted(CORPUS_DIR.glob("*.md"))
    if not files:
        raise CorpusError(f"[corpus] no .md files in {CORPUS_DIR} — content missing?")

    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    embedder = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBED_MODEL
    )

    if force:
        try:
            client.delete_collection(COLLECTION)
        except Exception:
            pass
    coll = client.get_or_create_collection(COLLECTION, embedding_function=embedder)

    if coll.count() == len(files) and not force:
        print(f"[corpus] up to date ({coll.count()} chunks)")
        return coll.count()

    ids, docs, metas = [], [], []
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
    print(f"[corpus] ingested {len(ids)} chunks into '{COLLECTION}'")
    return len(ids)


if __name__ == "__main__":
    ingest(force="--force" in sys.argv)
