"""Provider adapter (ADR-001, SPEC-008): 'anthropic' when keyed, else 'extractive'.

The Anthropic Messages API is called through httpx directly — no SDK dependency.
The extractive fallback keeps the app fully demo-able keyless (ADR-005: with no
chunks it says so honestly and names the nearest course topic, rather than
refusing).
"""

import json
import re
from collections.abc import Iterator

import httpx

from ..config import get_settings
from ..errors import ApiError
from .retrieval import Chunk, NearestTopic

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
GENERATION_TIMEOUT_SECONDS = 30.0
MAX_TOKENS = 1024


class TutorTimeoutError(ApiError):
    """Generation blew the 30 s budget; the router maps this to the DESIGN-005
    tutor-timeout state (Ranger bubble + retry)."""

    def __init__(self) -> None:
        super().__init__(
            504,
            "tutor_timeout",
            "That one took too long on my end. Ask again — I'm still here.",
        )


class TutorUpstreamError(ApiError):
    """The Anthropic API answered with a non-200; surfaced as a retryable 502."""

    def __init__(self, upstream_status: int) -> None:
        super().__init__(
            502,
            "tutor_upstream",
            "Ranger couldn't reach its full brain just now. Give it another try in a moment.",
        )
        self.upstream_status = upstream_status


def active_provider() -> str:
    """'anthropic' when ANTHROPIC_API_KEY is set, else 'extractive'."""
    return get_settings().provider


def generate_anthropic(system: str, history: list[dict], user_message: str) -> str:
    """Non-streaming Messages API call (Wave 1). Returns the raw completion text."""
    settings = get_settings()
    try:
        response = httpx.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": ANTHROPIC_VERSION,
                "content-type": "application/json",
            },
            json={
                "model": settings.tutor_model,
                "max_tokens": MAX_TOKENS,
                "system": system,
                "messages": [*history, {"role": "user", "content": user_message}],
            },
            timeout=GENERATION_TIMEOUT_SECONDS,
        )
    except httpx.TimeoutException as exc:
        raise TutorTimeoutError() from exc
    if response.status_code != 200:
        raise TutorUpstreamError(response.status_code)
    data = response.json()
    return "".join(
        block.get("text", "")
        for block in data.get("content", [])
        if block.get("type") == "text"
    )


def stream_anthropic(system: str, history: list[dict], user_message: str) -> Iterator[str]:
    """Streaming Messages API call (R5.6): yields text deltas as they arrive.

    Parses the API's SSE frames directly (`content_block_delta` / `text_delta`);
    timeout and non-200 map to the same errors as the non-streaming path.
    """
    settings = get_settings()
    try:
        with httpx.stream(
            "POST",
            ANTHROPIC_URL,
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": ANTHROPIC_VERSION,
                "content-type": "application/json",
            },
            json={
                "model": settings.tutor_model,
                "max_tokens": MAX_TOKENS,
                "system": system,
                "messages": [*history, {"role": "user", "content": user_message}],
                "stream": True,
            },
            timeout=GENERATION_TIMEOUT_SECONDS,
        ) as response:
            if response.status_code != 200:
                response.read()
                raise TutorUpstreamError(response.status_code)
            for line in response.iter_lines():
                if not line.startswith("data:"):
                    continue
                try:
                    event = json.loads(line[len("data:"):].strip())
                except json.JSONDecodeError:
                    continue
                if event.get("type") == "content_block_delta":
                    delta = event.get("delta", {})
                    if delta.get("type") == "text_delta" and delta.get("text"):
                        yield delta["text"]
                elif event.get("type") == "error":
                    raise TutorUpstreamError(response.status_code)
    except httpx.TimeoutException as exc:
        raise TutorTimeoutError() from exc


# What each corpus topic is about, in one clause. The zero-chunk answer uses it
# to say where the nearest course material actually goes — orientation drawn
# from the corpus itself, never a fresh safety claim.
_TOPIC_ORIENTATION = {
    "mindset": "how solid riders talk themselves into trouble, and how to head that off",
    "machine": "what a machine needs from you before a ride and between rides",
    "gear": "what protective gear actually does and what rides along every time",
    "terrain": "reading ground — hills, ruts, water — before you commit to it",
    "environment": "weather, cold, ride plans, and what to do when a day goes sideways",
    "roads": "pavement, traffic, crossings, and riding around other people",
    "general": "the ground around riding — machines, training, groups, trail habits",
}
_FALLBACK_ORIENTATION = "riding judgment, machines, terrain, gear, and roads"


def _no_chunk_answer(nearest: NearestTopic | None) -> str:
    """Zero retrieved chunks, keyless (SPEC-008, ADR-005): say plainly that the
    course doesn't reach this, then point at the closest thing it does have —
    a pointer, never a refusal template."""
    if nearest is None:
        return (
            "The course doesn't cover that, and offline I can't reach past the "
            "course notes — so I'll say that straight rather than guess. Ask me "
            "about riding judgment, machines, terrain, gear, or roads and I'll "
            "read you what the notes hold; this one gets a real answer once I'm "
            "back on my full connection."
        )
    where = f", in {nearest.module}" if nearest.module else ""
    orientation = _TOPIC_ORIENTATION.get(nearest.topic, _FALLBACK_ORIENTATION)
    return (
        "The course doesn't cover that, and offline I can't reach past the "
        "course notes — so I'd rather point you somewhere real than guess.\n\n"
        f"The closest thing the course has is “{nearest.title}”{where}, which is "
        f"about {orientation}. If that's the direction you were headed, ask me "
        "straight at it and I'll read you what the notes say. If it isn't, this "
        "one lives outside the course — worth asking again once I'm back on my "
        "full connection."
    )


def extractive_answer(
    message: str, kept: list[Chunk], nearest: NearestTopic | None = None
) -> str:
    """Keyless mode: honest, useful, obviously non-generative (STARTER contract).

    Composes from the retrieved chunks' own prose. With nothing above the floor
    it names `nearest` — the best sub-floor candidate — instead of punting. The
    UI shows the offline-mode header (SPEC-010) so nobody mistakes this for the
    full tutor.
    """
    if not kept:
        return _no_chunk_answer(nearest)
    parts = [
        "I'm in offline mode, so here's what the course notes say directly:"
    ]
    for c in kept[:2]:
        # First 2 sentences of each kept chunk — extractive, not generative.
        sentences = re.split(r"(?<=[.!?])\s+", c.body.strip())
        excerpt = " ".join(sentences[:2])
        parts.append(f"From “{c.title}”: {excerpt}")
    parts.append(
        "That's the extract — the relevant lesson has the full picture, and "
        "the source chips below link what I drew from."
    )
    return "\n\n".join(parts)
