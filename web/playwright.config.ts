/* Playwright config for the QA-002 functional journeys (J1–J3).
 *
 * `npm run e2e` EXPECTS BOTH SERVERS ALREADY RUNNING (it never boots them).
 * Verified recipe, bash form (PowerShell: set each var on its own line first,
 * `$env:NAME = "..."`):
 *   1. API on :8022 with FIXTURES=1 and a fresh scratch DATA_DIR:
 *        cd server && FIXTURES=1 DATA_DIR=$TEMP/sightline-e2e ANTHROPIC_API_KEY= \
 *          uv run uvicorn app.main:app --port 8022
 *      (FIXTURES=1 mounts the /api/dev/complete-module helper J2 uses and
 *      rebuilds the mid@crawl.test fixture J3 logs in as; no ANTHROPIC_API_KEY
 *      keeps Ranger on the deterministic extractive provider per QA-002.)
 *   2. The BUILD on :5181, not the dev server — the journeys should exercise
 *      the artifact that ships, and the dev server's eager art globs exhaust
 *      Chromium's connection budget under load (the failure qa/visual_crawl.py
 *      documents). vite preview's proxy defaults to :8022:
 *        cd web && npm run build
 *        cd web && VITE_API_TARGET=http://localhost:8022 \
 *          npx vite preview --port 5181 --strictPort
 *      --strictPort is not optional: without it vite slides to the next free
 *      port and every journey fails against a baseURL nothing is serving.
 *   3. cd web && npx playwright test
 *
 * Chromium only, one worker: the three journeys share one API instance and
 * run in file order (J3 clears the mid fixture's tutor history LAST).
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  retries: 1, // one retry for animation-timing flakes (lane rule: final run green)
  timeout: 300_000, // J2 answers 2×20 assessment questions
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5181",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
