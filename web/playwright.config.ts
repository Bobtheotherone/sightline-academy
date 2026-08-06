/* Playwright config for the QA-002 functional journeys (J1–J3).
 *
 * `npm run e2e` EXPECTS BOTH SERVERS ALREADY RUNNING (it never boots them):
 *   1. API on :8021 with FIXTURES=1 and a fresh scratch DATA_DIR, e.g.
 *        cd server && FIXTURES=1 DATA_DIR=%TEMP%\sightline-e2e ANTHROPIC_API_KEY= \
 *          uv run uvicorn app.main:app --port 8021
 *      (FIXTURES=1 mounts the /api/dev/complete-module helper J2 uses and
 *      rebuilds the mid@crawl.test fixture J3 logs in as; no ANTHROPIC_API_KEY
 *      keeps Ranger on the deterministic extractive provider per QA-002.)
 *   2. Vite on :5181 proxying to it:
 *        cd web && VITE_API_TARGET=http://localhost:8021 npm run dev -- --port 5181
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
