# Sightline ATV Safety Academy

A web course that teaches ATV and road safety by making the learner do things rather than
watch things: six modules, 22 lessons, 59 interactive steps, a field journal built along the
way, a final assessment and a certificate. Ranger, the built-in tutor, answers questions from
a 33-document course corpus. FastAPI + SQLite + Chroma behind, React + Vite + Tailwind in front.

## Run it on your machine

**Requirements.** [Node.js 20 or newer](https://nodejs.org) — the LTS build. On Node 18
`npm ci` silently skips Tailwind's native binding and the build dies with "Cannot find native
binding", so the launchers refuse anything below 20. And a supported platform: Windows x64, an
Apple Silicon Mac on macOS 14 or newer, or Linux x64. Intel Macs, Windows on ARM and older
macOS cannot install the server's PyTorch wheels at all — on those, use the live site or put
it on a small VPS (`DEPLOY.md`). Everything else the launcher fetches itself, Python 3.12
included.

| Your computer | Do this |
|---|---|
| Windows | Double-click `START_SIGHTLINE.bat` |
| macOS | Double-click `START_SIGHTLINE.command` |
| Linux | Run `./START_SIGHTLINE.sh` |

It is safe to run twice; a second run just reports that the site is already up.

**First run** installs uv and Python 3.12, installs the server packages, installs the web
packages, builds the site, writes a `.env` with a fresh session secret, and asks once for the
Anthropic API key. About 2 GB comes down — PyTorch, the npm tree and the embedding model — so
budget 5-15 minutes and stay connected. Later runs take seconds. When it finishes it opens
<http://localhost:8080> and prints a sign-in email and a one-time password from
`ops/bootstrap_accounts.py` — change that password under Account once you are in.

The API revalidates the embedding model against huggingface.co on every boot and falls back to
its local cache when there is no network, so an offline start works after the first one.

**Where the data lives.** Everything the local copy remembers is under `data/`:
`sightline.db` (accounts, progress, journal), `chroma/` (the tutor's index), `logs/api.log`
and `logs/web.log`, and `run/` (process ids). Deleting `data/` resets your local copy and
nothing else. `data/` is gitignored, because it holds real accounts.

**The Ranger key.** Without an Anthropic key Ranger still answers, using only text pulled from
the course corpus, and says so on screen. To add a key later, run `ADD_RANGER_KEY` (`.bat`,
`.ps1`, `.command` or `.sh`) and restart. The key is written to `.env`, which is gitignored.

**To stop:** `STOP_SIGHTLINE`. It stops the two local processes and touches nothing else.

Ports default to 8000 (API) and 8080 (web); override with `SIGHTLINE_API_PORT` and
`SIGHTLINE_WEB_PORT`, and set `SIGHTLINE_NONINTERACTIVE=1` to suppress every prompt.

**On Windows**, keep the folder short and local — `C:\Sightline`, not inside OneDrive and not
nested deep. SmartScreen may stop the first double-click: choose **More info** then **Run
anyway**. A managed university laptop with an AllSigned PowerShell policy needs IT to allow
the script.

## Where things are

| Path | What is in it |
|---|---|
| `server/` | The FastAPI app: auth, course, progress, tutor, admin, billing. uv project, Python 3.12 pinned. |
| `web/` | The React + Vite single-page app. `npm run build` is typecheck plus bundle. |
| `content/curriculum/` | The course itself, as markdown. Six module files, an overview, and the final assessment. Editing these edits the course. |
| `content/corpus/` | The 33 short documents Ranger retrieves from. Separate from the curriculum on purpose. |
| `web/src/activities/` | One folder per activity renderer, twelve of them, plus the shared contracts in `types.ts`. |
| `web/src/assets/` | Illustration slots: `manifest.json` is the register, `svg/` and `raster/` hold the plates, `stability/` holds the lab sprites. Rasters are Git LFS. |
| `artgen/`, `output/` | Untracked source material for the art pipeline — prompt packs, raw renders. Not needed to run or change the site. |
| `qa/` | The visual-crawl harness and its route manifest, the SVG review tooling, and `stability-rebuild/` (how the physics lab was built). |
| `sightline-handoff/` | The spec package this was built from: SPECS, DESIGN, CURRICULUM, DECISIONS, QA. Still the reference for how anything is meant to behave. |
| `tools/live/` | The scripts that publish this laptop's copy to the internet. Developer-only; see `docs/OPERATIONS.md`. |
| `ops/` | Dockerfiles, nginx and Caddy configs, `bootstrap_accounts.py`. For a real server later, not for the laptop. |
| `docs/` | Onboarding, how the course is built, and operations. |
| `backups/` | Local database snapshots. Untracked — they hold real learner emails. |

## Editing the course

1. Edit the markdown in `content/curriculum/`. A module file is YAML front matter, then
   `# Lesson:` headings, then `## Step:` headings each carrying a `yaml step` fence and a
   `json payload` fence. `docs/HOW-THE-COURSE-IS-BUILT.md` explains the format.
2. Restart the API. Locally that is `STOP_SIGHTLINE` then `START_SIGHTLINE`; on the live
   laptop it is `systemctl --user restart sightline-api.service`.
3. On boot the seed hashes the curriculum files and re-seeds when the hash changed. The log
   line tells you which happened:
   `seed: 6 modules / 22 lessons / 59 steps seeded` or `seed: content unchanged — no-op`.
4. Reload the page and read the step you changed. Learner progress survives a re-seed.

A bad payload stops the boot rather than dropping a lesson quietly, naming the file and the
step: `[seed] module-04-reading-the-terrain.md: step m4-l1-s1: payload is not valid JSON`.

**The corpus is different.** `content/corpus/` re-ingests only when the number of files
changes. Editing the text inside an existing corpus file changes nothing until you boot the
API once with `SEED_FORCE=1`, which wipes and rebuilds the index.

## Checks

| What it proves | Command |
|---|---|
| Types and bundle | `cd web && npm run build` |
| Lint | `cd web && npx eslint src` |
| Server behaviour (174 tests) | `cd server && uv run pytest` |
| Stability lab physics | `cd web && node src/activities/lab_objective/stabilityRun.check.ts` |
| Every art slot resolves | `cd web/src/assets && python3 lint_assets.py` |
| The three user journeys | `cd web && npx playwright test` |
| Every route in every state | `python qa/visual_crawl.py --base http://localhost:4173 --manifest qa/route-manifest.json --out qa/crawl-runs` |

The physics check is a TypeScript file run straight through Node and needs Node 22+.

The last two need a browser installed once — `npx playwright install chromium` for the
journeys, `pip install playwright && playwright install chromium` for the crawl — and both
expect the servers to be up already. Each names its exact boot recipe at the top of its own
file: `web/playwright.config.ts` and `qa/visual_crawl.py`. The crawl's output is a folder of
screenshots that a person then looks at, not a pass/fail; reviewed passes are in
`artifacts/crawl/`.

## How the live site is served today

The public site runs from the developer's Linux laptop, not from a rented server and not from
Docker. Three `systemd --user` units do the work: `sightline-api` (uvicorn on 127.0.0.1:8000),
`sightline-web` (`vite preview` serving the built site on 127.0.0.1:8080), and
`sightline-ngrok` (`tools/ngrok` publishing 8080 at a reserved free-tier URL). The units live
in `~/.config/systemd/user/` on that laptop, not in this repository.

`tools/live/START_SIGHTLINE_LINUX.sh` starts all three, waits for health, and writes the
public address into `SIGHTLINE_LINK.txt`. `tools/live/STOP_SIGHTLINE_LINUX.sh` stops them.
`tools/check-site.sh` reports whether the local and public ends are both up.

On the free ngrok tier the first visit from any browser lands on a grey ngrok interstitial
with a **Visit Site** button. It is once per browser, and it is ngrok's page, not ours.

Full runbook, including what to do when something is down: `docs/OPERATIONS.md`.

## Deploying for real

Moving the site off the laptop means a host that can take a 4.3 GB container image, a managed
Postgres, a domain, and TLS. `DEPLOY.md` is the runbook top to bottom — the database first
(the step that actually takes the site off a personal machine), then the compose pair behind
Caddy, the secret file, Stripe, claiming the owner account, and how to verify each part
landed. What it cannot do is open the accounts: the host, the domain and the Stripe account
have to be created by the professor, in his name, with his bank details.

## Accounts and roles

Five roles, assigned when a configured address registers and changed afterwards through the
admin API by someone permitted to grant that role:

- **learner** — takes the course, pays for access.
- **developer** — student worker: free access, no learner data, no admin.
- **instructor** — faculty: free access plus the instructor dashboard and CSV export.
- **admin** — full operations. Can create learner and developer accounts. Never sees funds.
- **owner** — exactly one account, the responsible faculty member. The only role with funds
  access, and the only one that can create instructor or admin accounts.

`OWNER_EMAIL`, `ADMIN_EMAILS`, `INSTRUCTOR_EMAILS` and `DEVELOPER_EMAILS` in `.env` decide who
gets what. `ops/bootstrap_accounts.py` creates the owner and admin accounts and prints a
one-time password for each new one, shown once and stored only as an argon2id hash. It is the
only path that can mint the first funds-access account. `--dry-run` previews;
`--reset-password EMAIL` issues a fresh one. Run it from `server/`:

```sh
cd server
DATA_DIR=../data uv run python ../ops/bootstrap_accounts.py --dry-run
```

## Billing is off

The landing page quotes a monthly price, but no card is ever charged and everyone who
registers gets the whole course. With Stripe unconfigured the paywall disables itself rather
than locking people out, and says so at boot: `BILLING NOT CONFIGURED`. Turning it on needs a
Stripe account in the owner's name with the owner's bank details — `DEPLOY.md` §5.
