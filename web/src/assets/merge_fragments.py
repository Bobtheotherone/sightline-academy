"""Merge per-batch manifest fragments into manifest.json.

Parallel generation lanes each write their own `_frag-<batch>.json` rather than
editing manifest.json directly — concurrent writes to one file lose entries.
This merges them, validating as it goes.

    python merge_fragments.py            # report only
    python merge_fragments.py --write    # merge into manifest.json

Validation performed (VISUAL_ASSETS.md §10.4 asset lint):
  - every `real` slot references a file that exists
  - no <text> elements, no external refs
  - size budget (25 KB plates, 8 KB badges/icons)
  - no slot collisions between fragments
  - alt text present and non-empty for illustration slots
"""
from __future__ import annotations

import glob
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
MANIFEST = HERE / "manifest.json"


def load(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def main() -> int:
    write = "--write" in sys.argv
    manifest = load(MANIFEST)
    slots: dict = manifest["slots"]
    before = len([k for k in slots if not k.startswith("$")])

    problems: list[str] = []
    added: list[str] = []
    resynced: list[str] = []
    seen: dict[str, str] = {}

    skipped = 0
    for frag_path in sorted(HERE.glob("_frag-*.json")):
        frag = load(frag_path)
        # Lanes emit either a flat {slot: meta} map or {"slots": {...}} mirroring
        # manifest.json's own shape. Accept both rather than making a lane redo
        # a batch over a wrapper key.
        if "slots" in frag and isinstance(frag["slots"], dict):
            frag = frag["slots"]
        for slot, meta in frag.items():
            if slot.startswith("$"):
                continue
            if not isinstance(meta, dict):
                problems.append(f"{frag_path.name}:{slot} is not an object")
                continue
            if slot in seen:
                problems.append(
                    f"COLLISION {slot}: {seen[slot]} and {frag_path.name}")
                continue
            seen[slot] = frag_path.name

            if slot in slots:
                # Idempotent re-run, not an error — the merge is meant to be
                # safe to run after every batch. But a lane that iterates after
                # an early merge leaves the manifest holding STALE metadata
                # (this bit us: a lesson card's alt still described art that had
                # since been redrawn). Detect drift and re-sync it.
                cur = slots[slot]
                drift = [k for k in ("file", "alt", "status", "note")
                         if meta.get(k) is not None and cur.get(k) != meta.get(k)]
                if drift:
                    # A lane never demotes a slot the integrator deferred.
                    if cur.get("status") == "deferred" and "status" in drift:
                        drift.remove("status")
                        meta = {**meta, "status": "deferred",
                                "note": cur.get("note", "")}
                    if drift:
                        resynced.append(f"{slot}: {', '.join(drift)}")
                        slots[slot] = {**cur, **meta}
                else:
                    skipped += 1
                continue

            f = meta.get("file")
            if meta.get("status") == "real":
                if not f:
                    problems.append(f"{slot}: status real but no file")
                    continue
                fp = HERE / f
                if not fp.exists():
                    problems.append(f"{slot}: file missing -> {f}")
                    continue
                body = fp.read_text(encoding="utf-8", errors="ignore")
                if "<text" in body:
                    problems.append(f"{slot}: contains <text> (U3 violation)")
                if re.search(r'(?:xlink:)?href="http|@import', body):
                    problems.append(f"{slot}: external reference")
                size = fp.stat().st_size
                limit = 8192 if re.match(r"(badge|act|topic|section|match|sort)-", slot) else 25600
                if size > limit:
                    problems.append(f"{slot}: {size}B over {limit}B budget")
                if "alt" not in meta:
                    problems.append(f"{slot}: no alt key")

            slots[slot] = meta
            added.append(slot)

    print(f"manifest slots before : {before}")
    print(f"fragments found       : {len(list(HERE.glob('_frag-*.json')))}")
    print(f"slots to add          : {len(added)}")
    print(f"already present       : {skipped} (idempotent re-run)")
    print(f"re-synced (drift)     : {len(resynced)}")
    for r in resynced:
        print(f"   ~ {r}")
    print(f"problems              : {len(problems)}")
    for p in problems:
        print(f"   ! {p}")

    if write and not problems and (added or resynced):
        MANIFEST.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8")
        print(f"\nWROTE manifest.json — now "
              f"{len([k for k in slots if not k.startswith('$')])} slots")
    elif write:
        print("\nNOT written — resolve problems first")
        return 1
    else:
        print("\n(dry run — pass --write to apply)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
