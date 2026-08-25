"""The API can serve the built SPA itself (WEB_DIST_DIR) — the laptop mode that
needs no Node.js. Routes are checked without the startup lifespan: none of
them touch the database, and the smoke test already covers boot.
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi.testclient import TestClient

from app import config as config_mod


def _app_serving(dist: Path):
    os.environ["WEB_DIST_DIR"] = str(dist)
    config_mod.get_settings.cache_clear()
    try:
        from app.main import create_app

        return create_app()
    finally:
        os.environ.pop("WEB_DIST_DIR", None)
        config_mod.get_settings.cache_clear()


def test_built_site_is_served_behind_the_api(tmp_path: Path) -> None:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>Sightline</title>")
    (dist / "assets" / "app-abc123.js").write_text("console.log(1)")
    (dist / "favicon.svg").write_text("<svg/>")

    client = TestClient(_app_serving(dist))

    home = client.get("/")
    assert home.status_code == 200 and "<title>Sightline" in home.text
    assert home.headers["content-security-policy"].startswith("default-src 'self'")
    assert home.headers["cache-control"] == "no-cache"

    # Client-side routes fall back to the app, not to a 404.
    assert client.get("/course/m1-riders-mindset").text == home.text
    assert client.get("/favicon.svg").status_code == 200
    head = client.head("/")
    assert head.status_code == 200 and head.content == b""

    bundle = client.get("/assets/app-abc123.js")
    assert bundle.status_code == 200
    assert "immutable" in bundle.headers["cache-control"]

    # The API keeps its own 404 envelope and its strict policy.
    missing = client.get("/api/nonexistent")
    assert missing.status_code == 404 and missing.json()["error"]["code"] == "not_found"
    assert missing.headers["content-security-policy"].startswith("default-src 'none'")

    # No path tricks out of the dist directory.
    assert client.get("/../pyproject.toml").status_code == 200  # normalised to the app shell
    assert "<title>Sightline" in client.get("/%2e%2e/%2e%2e/etc/passwd").text


def test_without_web_dist_dir_unknown_paths_are_404() -> None:
    config_mod.get_settings.cache_clear()
    from app.main import create_app

    client = TestClient(create_app())
    assert client.get("/course/m1-riders-mindset").status_code == 404
