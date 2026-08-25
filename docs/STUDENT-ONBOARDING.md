# Your first day on Sightline

You are picking up a finished, live product, not a scaffold. The course is written, the art
is drawn, the tutor works, and the site is being used. Most of what you will do is careful
editing inside conventions that already exist. This page gets you from an empty folder to a
change you can see, in about an hour, most of which is downloads.

## 1. Get the code

The illustrations are stored in Git LFS. Install LFS **before** you clone, or you will get
130-byte text pointers where the artwork should be and every plate will render as a
placeholder.

```sh
git lfs install
git clone https://github.com/Bobtheotherone/sightline-academy.git
cd sightline-academy
```

Already cloned without it? `git lfs install && git lfs pull` fixes it in place.

You also need [Node.js](https://nodejs.org) 20 or newer, the LTS build; the launcher checks
and stops if it is older. Install 22 rather than 20 — one of the checks below needs it.

Check your machine is supported before you start: the server's PyTorch wheels exist for
Windows x64, Apple Silicon Macs on macOS 14 or newer, and Linux x64, and nowhere else. On an
Intel Mac, Windows on ARM or an older macOS the install cannot complete at all — work against
the live site, or put a copy on a small VPS following `DEPLOY.md`. Everything else the
launcher installs for you.

## 2. Run it

Double-click `START_SIGHTLINE.bat` (Windows) or `START_SIGHTLINE.command` (macOS), or run
`./START_SIGHTLINE.sh` (Linux). First run takes 5-15 minutes and downloads about 2 GB: uv,
Python 3.12, the server packages, the web packages. Later runs take seconds.

It ends by opening <http://localhost:8080> and printing an email and a one-time password.
`STOP_SIGHTLINE` shuts it down again. Your local database is `data/sightline.db`; deleting
`data/` gives you a clean slate and affects nothing else.

## 3. Log in and look around

Sign in with the account it printed. Open **Course** and play the first lesson of Module 1
end to end, then open **Ranger** and ask it something the course covers ("what is T-CLOC?").
If you never entered an Anthropic key, Ranger answers from the course text only and says so
in the chat header — that is a supported mode, not a fault.

Then read `README.md` §Where things are. Ten minutes there saves an afternoon of grepping.

## 4. Change the course and watch it change

1. Open `content/curriculum/module-04-reading-the-terrain.md`.
2. Find `tagline:` in the front matter at the top and change one word.
3. `STOP_SIGHTLINE`, then `START_SIGHTLINE`.
4. Watch `data/logs/api.log` — you want
   `seed: 6 modules / 22 lessons / 59 steps seeded (version …)`. If it says
   `content unchanged … no-op`, your edit did not save.
5. Reload the Course page. Module 4's tagline is your word.

That is the whole content loop: edit markdown, restart the API, reload. The seed hashes the
curriculum files on every boot and rewrites the course tables when the hash moved. Learner
progress is keyed separately and survives.

Put the word back when you are done. The live site serves this same content.

## 5. Run the checks

Each of these starts from the repo root, so run them in a subshell or `cd` back between them.

```sh
(cd web && npm run build)                                       # typecheck + bundle
(cd web && npx eslint src)
(cd server && uv run pytest)                                    # 174 tests
(cd web && node src/activities/lab_objective/stabilityRun.check.ts)   # needs Node 22+
(cd web/src/assets && python3 lint_assets.py)
```

All five are fast and all five are green on `main` right now. If one is red before you have
touched anything, say so before you start — that is information, not your fault.

Two heavier gates exist. Both want a browser installed once — `npx playwright install
chromium` for the journeys, `pip install playwright && playwright install chromium` for the
crawl — and both expect the servers to be up already; each names its exact boot recipe at the
top of its own file. The journeys are `cd web && npx playwright test`, configured in
`web/playwright.config.ts`; the crawl is `python qa/visual_crawl.py` with `--base`,
`--manifest` and `--out`, and it produces screenshots for a human to look at rather than a
pass/fail.

## 6. Read the specs, in this order

`sightline-handoff/` is the package this product was built from. It is still the reference
for how anything is meant to behave. Do not duplicate it into new documents; point at it.

1. `PROJECT_BRIEF.md` — what this is and who it is for.
2. `NON_GOALS.md` — what it deliberately is not. Binding.
3. `DECISIONS/` — nine ADRs. These are settled; read them before proposing an alternative.
4. `SPECS/SPEC-002-architecture.md` — how the pieces fit.
5. `SPECS/SPEC-006-learning-engine.md` and `SPEC-007-activity-renderers.md` — the heart of it.
6. `SPECS/SPEC-008-rag-tutor.md` — Ranger, end to end.
7. `DESIGN/DESIGN-001-brand-and-tokens.md`, then `DESIGN-006-anti-generic-checklist.md` —
   the second one is the definition of done for any screen.
8. `QA/QA-003-verification-budget.md` — what is worth testing here, and what is not.

Then `docs/HOW-THE-COURSE-IS-BUILT.md` for the content and art formats, and
`docs/OPERATIONS.md` if you will ever be the one keeping the live site up.

`BUILDLOG.md` at the repo root is the decision log: one line per real decision or deviation,
oldest first. When you make a call that a future reader would otherwise have to reverse
engineer, add a line. That is the entire governance apparatus; there is no other one.

## 7. Who to ask

Rad (`rnmercado@alaska.edu`) is the developer and admin, and owns the live site. Osama
(`oabaza@alaska.edu`) is the faculty owner: he decides what the course says and what it costs,
not how it is built. Ask Rad about code, hosting, and accounts; ask Osama about content,
teaching and money.

## Ten things that will bite you

1. **Python must be 3.12, exactly.** `server/pyproject.toml` pins `>=3.12,<3.13` and
   `.python-version` says `3.12`. A 3.13 interpreter will not resolve the dependency set. Let
   uv fetch 3.12 rather than pointing the venv at whatever the system has.
2. **Node 18 fails in a way that does not name Node.** On 18, `npm ci` silently skips
   Tailwind's native `oxide` binding and the build dies with "Cannot find native binding" —
   nothing in that message says the Node version is the cause. Playwright also refuses below
   20, and the physics check is a TypeScript file run straight through Node and needs 22+.
   Install 22 and none of this comes up.
3. **Secure cookies mean login only works over HTTPS.** The live tunnel's unit sets
   `SECURE_COOKIES=1`, which is correct there. Locally over plain http it must be `0` or the
   browser silently drops the session cookie and login looks broken with no error anywhere.
4. **The corpus re-ingests only when the file count changes.** Rewrite the body of an existing
   file in `content/corpus/` and Ranger will keep quoting the old text forever. Boot once with
   `SEED_FORCE=1` to wipe and rebuild the index. Adding or deleting a file is picked up.
5. **A malformed payload stops the boot.** That is deliberate — a content typo should break
   loudly, not drop a lesson quietly. The message names the file and the step id; fix that.
6. **Hotspot coordinates belong to their plate.** The `x`/`y` numbers in a `hotspot_list` or
   `hotspot_figure` payload are percentages of the artwork as presented, and they were measured
   against one specific crop of one specific image. Changing the plate, or the ratio it is
   displayed at, moves every marker off its cue. The crop and the numbers are one contract —
   the manifest note on each hotspot slot records which crop.
7. **The stability lab's physics check is the acceptance bar.**
   `web/src/activities/lab_objective/stabilityRun.check.ts` drives 415 simulated runs and
   asserts monotonic lean sweeps, margins and outcomes. If you touch the lab, that has to
   still pass and still print "Every criterion above holds." Do not tune numbers to make a
   screenshot look better.
8. **The plates are Git LFS objects.** 757 files. Clone without LFS and you get pointers, and
   the site renders placeholder panels that look like a code bug.
9. **Crawl and journey tests want the built site, not the dev server.** The dev server serves
   every one of ~1000 art files as its own module on every page load, which exhausts Chromium's
   connection budget mid-crawl and produces failures that look exactly like product failures.
   Both harnesses say this at the top of their files; believe them.
10. **Three things you need are not in the repo.** The systemd units that run the live site
    live in `~/.config/systemd/user/` on Rad's laptop. `.env` is gitignored and holds real
    secrets. And nothing you leave in `/tmp` survives — work goes in the repo or under `data/`.
