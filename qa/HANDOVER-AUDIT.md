# Handover audit — Sightline ATV Safety Academy

Run by Module V (verification + safeguards) on 2026-08-24, immediately before
the working tree was committed and pushed to GitHub.

Two questions decide whether this repo is safe to hand over:

1. Does anything secret leave this laptop when the push happens?
2. Is Ranger actually working, and does the site come back by itself?

Both are answered below with the command that produced the evidence, so the
next person can re-run any line rather than trust this file.

---

## Summary

| # | Check | Result |
|---|---|---|
| 1 | No secrets in the commit set | **PASS** |
| 2 | `.gitignore` covers every sensitive path | **PASS** |
| 3 | Live site healthy | **PASS** |
| 4 | Ranger answers from the live model, with sources | **PASS** |
| 5 | UI tells the learner when Ranger is degraded | **PASS** (fixed during this audit) |
| 6 | Services restart on failure | **PASS** |
| 7 | Linger enabled | **PASS** |
| 8 | Survives reboot | **PASS** |
| 9 | Curriculum edits go live on API restart | **PASS** |
| 10 | Corpus edits need `SEED_FORCE=1` | **PASS, with a caveat you must read** |
| 11 | Real accounts only, no test fixtures | **PASS** |
| 12 | Illustration library present via Git LFS | **PASS** |
| 13 | Test suites, build, lint, physics check | **PASS** |

No blocking failures. One caveat (#10) is a property of the design, not a
defect, and is written up in full below.

---

## 1. Secrets — PASS

The scan covered the exact set of files a commit would include: everything
`git ls-files` tracks plus everything `git ls-files --others --exclude-standard`
would add. 1352 files.

Searched for `sk-ant-`, `sk_live_`, `sk_test_`, `whsec_`, ngrok authtokens,
private-key headers, `password`/`secret`/`token` assignments, and — most
directly — the literal values currently sitting in `.env`.

```
xargs -0 -a <commit-set> grep -IlnF "$ANTHROPIC_API_KEY_VALUE"   -> no hits
xargs -0 -a <commit-set> grep -IlnF "$SESSION_SECRET_VALUE"      -> no hits
xargs -0 -a <commit-set> grep -Iln  'tiiJfHQ6ZCcDm8py'           -> no hits
xargs -0 -a <commit-set> grep -InE  'sk-ant-[A-Za-z0-9_-]{20,}'  -> no hits
```

**The one real secret found in the tree** was not in the commit set only
because this audit put it out of reach:

| Path | Line | What |
|---|---|---|
| `HANDOFF_OSAMA.md` | 38 | The owner's plaintext sign-in — `oabaza@alaska.edu` / a 16-character password. Untracked, and **was not ignored** before this audit. It would have been committed. |

It is now ignored (see §2). The file itself was left on disk untouched — it is
the document Osama needs, and it is delivered by hand.

Every other hit was a placeholder or a test fixture, and all are safe:

| Path | Line | Why it is fine |
|---|---|---|
| `DEPLOY.md` | 130-132 | `sk-ant-...`, `sk_live_...`, `whsec_...` — documentation ellipses, no values |
| `server/tests/test_paywall_and_admin.py` | 57-58 | `sk_test_dummy`, `whsec_dummy` — literals invented for the test |
| `server/tests/test_access_control.py` | 188-189, 369-370, 405, 410 | `sk_test_x`, `whsec_x`, `sk-ant-xxxx…` — same |
| `server/app/routers/meta.py` | 48 | compares a prefix; the endpoint returns booleans only, never key material |
| `server/app/config.py` | 243-244 | prefix validation |
| `ops/set-anthropic-key.ps1` | 96-107 | **verified to contain no key.** It reads one interactively, checks the prefix, and reports only its length — the value is never echoed or written into the script |
| `sightline-handoff/STARTER/visual_crawl.py`, `qa/visual_crawl.py` | 17, 414-510 | crawl-harness fixture logins (`*@crawl.test` / `crawl-pass`); the matching accounts do not exist in the live database |

Also checked and clean: no `ngrok` authtoken anywhere in the tree (it lives in
`~/.config/ngrok/`, outside the repo); no private keys; no `.env` copy other
than the real `.env`, which was already ignored; `git ls-files` contains no
`.env`, no database, and no backup.

**One low-severity note for the coordinator.** `START_SIGHTLINE.sh:319-320`
(Module L's file, not edited here) hard-codes `oabaza@alaska.edu` and
`rnmercado@alaska.edu` as the default `OWNER_EMAIL` / `ADMIN_EMAILS`. Those are
public university addresses used as configuration, not credentials, and the
script generates a fresh `SESSION_SECRET` rather than shipping one. Publishing
them is a judgement call for the owner, not a security failure.

## 2. `.gitignore` — PASS

Added, and verified with `git check-ignore -v` on each path:

```
# Env & secrets. .env.example is the tracked template and stays.
.env.*            !.env.example     *.pem  *.key  *.p12  *.jar  id_rsa*

# Handover documents that carry the owner's sign-in.
HANDOFF_OSAMA.md  OSAMA-EMAIL.txt

# Live database snapshots. Real learner emails and password hashes.
backups/  *.sqlite3  *.db  *.db-wal  *.db-shm

# Local build + tool artifacts that are rebuilt, not reviewed.
web/dist-preview/  tools/ngrok

# Scratch drops that landed in qa/ by hand.
qa/ChatGPT Image*.png   qa/svg/_live.html
```

Confirmed ignored: `.env`, `HANDOFF_OSAMA.md`, `OSAMA-EMAIL.txt`,
`backups/pre-handoff-20260824/sightline.db`, `data/`, both stray
`qa/ChatGPT Image *.png` drops, `qa/svg/_live.html` (generated by
`qa/svg/_gallery.py`), `web/dist-preview/`, `tools/ngrok` (a 32 MB binary).

Confirmed **still tracked**, as intended: `.env.example`, `SIGHTLINE_LINK.txt`.

The patterns were checked for collateral damage — this must stay empty:

```
$ git ls-files | git check-ignore --stdin -v
(no output)
```

Nothing already tracked became ignored. In particular `qa/*.png` was
deliberately **not** used: `qa/stability-rebuild/harness2/out/*.png` is tracked
and must stay. The narrower `qa/ChatGPT Image*.png` was used instead.

## 3. Live health — PASS

```
$ curl -H 'ngrok-skip-browser-warning: 1' \
    https://unfixable-escapade-democrat.ngrok-free.dev/api/meta/health
{"status":"ok","db":"ok","chroma":{"docs":33},"provider":"anthropic",
 "tutor":{"provider":"anthropic","model":"claude-sonnet-4-6",
          "keyPresent":true,"keyWellFormed":true,"degradedReason":null},
 "version":"f8684330f789…"}
```

## 4. Ranger answers — PASS

Registered a throwaway learner through the public URL, asked Ranger a real
question, then deleted the account.

* `POST /api/auth/register` -> `201`, `access.allowed = true`,
  `reason = "paywall_disabled"` — a new learner gets the whole course free, as
  intended for review.
* `POST /api/tutor/ask` with `lessonId: m1-l1-why-riders-crash` -> `200` in
  14.0 s. A 1846-character generative answer on side-slope rollover geometry,
  `grounding: "curriculum"`, three follow-up suggestions, and four sources:
  `terrain-stability-cog`, `general-atv-vs-sxs`, `roads-pavement-why`,
  `machine-anatomy-controls`.
* The API log confirms the call reached the model, not the fallback:
  `INFO httpx: HTTP Request: POST https://api.anthropic.com/v1/messages "HTTP/1.1 200 OK"`.

**Cleanup verified.** The test account was removed from the live database with
a read-write `sqlite3` session over `data/sightline.db`: 5 rows across
`sessions` (1), `tutor_messages` (2), `tutor_usage` (1) and `users` (1); all
other per-user tables held nothing for it. Residual rows matching the test id
or email: **0**.

## 5. Degraded-mode notice — PASS (fixed during this audit)

`web/src/pages/tutor/TutorChat.tsx` already carried an `OfflineBadge`, so the
learner was told *something*. Two real gaps were found and closed.

**The bug.** `config.py` derives `provider` as
`"anthropic" if self.anthropic_api_key else "extractive"` — it only asks
whether a key is *present*. `tutor_degraded_reason` is stricter and also
rejects a key that does not start with `sk-ant-`. So a malformed key — a
truncated paste, a stray quote — leaves `provider == "anthropic"` while
`degradedReason` is set. The badge tested `provider === "extractive"`, so it
stayed **hidden in exactly the case where every single ask fails**. There is no
run-time fallback in `server/app/tutor/providers.py`: a bad key means the
request errors, it does not quietly go extractive.

**The fix**, entirely inside `web/src/pages/tutor/TutorChat.tsx`:

* the flag now reads `health.tutor.degradedReason !== null` as well as both
  `provider` fields, so a malformed key raises it;
* `OfflineBadge` takes a `reason` prop and puts it in `title`, so an instructor
  can hover for the configuration detail while the learner reads plain English;
* the copy changed from "Ranger is in offline mode" — which a learner could
  read as the whole site being down — to
  **"Ranger is answering from the course text only right now."**

Placement is unchanged: the existing slot at the top of the chat, in both the
`/tutor` page header and the slide-over. No animation was added, so there is
nothing for reduced-motion to suppress. No server change was needed.

## 6-8. Services, linger, reboot — PASS

`~/.config/systemd/user/sightline-{api,web,ngrok}.service`:

| Unit | Restart | RestartSec | State | At boot | NRestarts |
|---|---|---|---|---|---|
| sightline-api | `on-failure` | 5 | active | enabled | 0 |
| sightline-web | `on-failure` | 3 | active | enabled | 0 |
| sightline-ngrok | `on-failure` | 5 | active | enabled | 0 |

**An invalid tutor key does not stop the API.** `/api/meta/health` returns
`status: "ok"` whenever the database is reachable and the corpus is loaded;
tutor trouble is reported inside `tutor.degradedReason` instead. The comment in
`server/app/routers/meta.py` states the reason plainly — a keyless tutor must
not make an orchestrator cycle an otherwise healthy container. So the unit
boots, serves the course, and says in health why Ranger is reduced. That is the
behaviour the handover wants.

`loginctl show-user rnmercado` -> `Linger=yes`, so the services keep running
when nobody is signed in.

**Reboot survival is observed, not assumed.** `uptime` reports 5h35m since the
last boot; all three units are `active` and `enabled`, and none has restarted
since (`NRestarts=0`). The machine came up and the site came up with it.

**Tutor errors in the last day: none.** `journalctl --user -u sightline-api
--since '1 day ago'` contains zero `ERROR`, `CRITICAL`, `Traceback` or
`Exception` lines, and every `api.anthropic.com` call returned `200 OK`. The
403/404/422 responses in the log are from an earlier crawl against lesson ids
that have since been renamed, and predate the current build.

## 9. Curriculum edits go live — PASS

`server/app/services/seed.py` hashes the curriculum files with SHA-256
(`_content_version`, line 397) and stores the digest as `CourseMeta.version`.
`run_seed` parses on every boot and rewrites the tables when the tables are
empty, when that hash changed, or when `SEED_FORCE=1`.

So the loop for the owner is:

```
edit content/curriculum/*.md   ->   systemctl --user restart sightline-api
```

and the new text is live. Nothing else to run. A typo that breaks the
front-matter stops the boot and names the file, by design (ADR-006), so a bad
edit fails loudly rather than silently serving half a module.

## 10. Corpus caveat — PASS, but read this

**Ranger's retrieval corpus does not follow the same rule, and this is the one
thing most likely to confuse whoever maintains this next.**

`server/app/ingest/ingest.py` is idempotent by *file count*, not by content:

> re-ingests only when the collection count doesn't match the corpus file count

Right now `content/corpus/` holds 33 files and Chroma reports 33 documents, so
the counts agree and boot does nothing.

The consequence: **editing the text inside an existing `content/corpus/*.md`
file and restarting changes nothing for Ranger.** The count still matches, so
the stale embedding is kept and Ranger keeps quoting the old wording.

* Adding or deleting a corpus file changes the count and does trigger a full
  re-ingest.
* Editing one in place requires `SEED_FORCE=1` on the next start, which wipes
  the collection and reloads it.

This does not affect §9 — curriculum text that learners read is hash-checked
and updates on restart. It affects only the corpus Ranger retrieves from.

## 11. Accounts — PASS

Three accounts, all real, no test fixtures:

| Email | Role | Name | Created |
|---|---|---|---|
| `dimento202@gmail.com` | learner | Radames | 2026-08-07 |
| `oabaza@alaska.edu` | **owner** | Osama | 2026-08-24 |
| `rnmercado@alaska.edu` | admin | rnmercado | 2026-08-24 |

No `@crawl.test`, `@smoke.test` or other fixture accounts are present. The
throwaway account from §4 is gone.

## 12. Illustration library — PASS

`git lfs ls-files | wc -l` -> **757** files under Git LFS.

## 13. Checks — PASS

| Check | Command | Result |
|---|---|---|
| Server tests | `cd server && uv run pytest -q` | **174 passed**, 1 warning, 16.67 s, exit 0 |
| Web build | `cd web && npm run build` | built in 2.69 s, exit 0 |
| Lint | `cd web && npx eslint src` | clean, exit 0 |
| Stability physics | `node src/activities/lab_objective/stabilityRun.check.ts` | "Every criterion above holds", exit 0 |

The build warns that one chunk exceeds 500 kB (`index-*.js`, 533 kB raw /
163 kB gzipped). That is a performance note, not a failure.

---

## Re-running any of this

`tools/check-site.sh` was added by this audit and covers checks 3, 6, 7 and 11
in one read-only command:

```
tools/check-site.sh          # local and live
tools/check-site.sh local    # this machine only
tools/check-site.sh live     # the public URL only
```

It prints API health, web status, the ngrok tunnel and public URL, the tutor
provider/model/degraded reason, the database path, size and account count, and
the three unit states plus linger. It exits non-zero if anything is down, so it
can be dropped into cron. It writes nothing: every HTTP call is a GET and the
database is opened with `file:…?mode=ro`.
