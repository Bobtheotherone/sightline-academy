# Operating the live site

The public Sightline site runs from Rad's Linux laptop. There is no server, no Docker and no
cloud account behind it today — the laptop serves the site and an ngrok tunnel publishes it.
That is a deliberate interim arrangement; `DEPLOY.md` is the path off it.

Consequence to say out loud: the site is up while that laptop is powered on, awake and online.
It survives reboots and sign-outs. It does not survive the machine being shut down.

## What is running

Three `systemd --user` units, defined in `~/.config/systemd/user/` on that laptop — not in
this repository. All three are enabled at boot, and user lingering is on so they keep running
when nobody is signed in.

| Unit | What it does |
|---|---|
| `sightline-api` | uvicorn on 127.0.0.1:8000, from `server/`. Sets `SECURE_COOKIES=1`, `PUBLIC_BASE_URL` to the tunnel address, and absolute `DATA_DIR` / `CONTENT_DIR`. |
| `sightline-web` | `vite preview` on 127.0.0.1:8080, serving the built site in `web/dist`, proxying `/api` to 8000. |
| `sightline-ngrok` | `tools/ngrok http 8080` on a reserved free-tier URL. Its control panel is 127.0.0.1:4040. |

Neither the API nor the web server is reachable from outside the machine. Everything the
public sees arrives through the tunnel.

## Day to day

```sh
tools/check-site.sh              # both ends; exit 0 when everything is up
tools/check-site.sh local        # just this machine
tools/check-site.sh live         # just the public URL
```

It is read-only — every call is a GET and the database is opened read-only — so it is safe to
run at any time or from a cron job. It reports the API, the tunnel, the public site, the
database size and account count, all three units, and whether lingering is on.

```sh
tools/live/START_SIGHTLINE_LINUX.sh    # start all three, wait for health, open the site
tools/live/STOP_SIGHTLINE_LINUX.sh     # stop all three
```

`START_SIGHTLINE_LINUX.sh` writes the public address into `SIGHTLINE_LINK.txt` at the repo
root once it has confirmed the tunnel is answering. That file is the one place the current
link is recorded; the professor's copy of it is in `HANDOFF_OSAMA.md`.

Individual units, when you need finer control:

```sh
systemctl --user restart sightline-api.service      # after a curriculum edit
systemctl --user restart sightline-web.service      # after `cd web && npm run build`
systemctl --user status sightline-ngrok.service --no-pager
```

The API takes about ten seconds to come back: it re-parses the curriculum, checks the corpus
index and warms the embedding model before it answers. Part of that is a revalidation of the
embedding model against huggingface.co; with no network it falls back to the local cache and
starts anyway, just more slowly.

## Health and logs

```sh
curl -s http://127.0.0.1:8080/api/meta/health
curl -s -H 'ngrok-skip-browser-warning: 1' \
  https://unfixable-escapade-democrat.ngrok-free.dev/api/meta/health
```

A healthy response is `status: ok`, `db: ok`, `chroma.docs: 33`, and a `tutor` block with
`provider: anthropic`, `keyWellFormed: true`, `degradedReason: null`. The `version` field is
the content hash — if it did not change after a curriculum edit, the edit did not land.

```sh
journalctl --user -u sightline-api.service -n 80 --no-pager
journalctl --user -u sightline-api.service -f            # follow
journalctl --user -u sightline-ngrok.service -n 50 --no-pager
```

The boot lines worth knowing on sight:

```
environment: app_env=development database=sqlite (local file) paywall=OFF
seed: 6 modules / 22 lessons / 59 steps seeded (version f8684330f789)
seed: content unchanged (version f8684330f789) — no-op
corpus up to date (33 chunks)
```

## The ngrok interstitial

On the free tier, the first visit from any given browser lands on a grey ngrok page headed
"You are about to visit…" with a **Visit Site** button. It is ngrok's page, not ours; its
warning text is boilerplate shown on every free-tier link; and it appears once per browser and
never again on that device. Machine-to-machine calls skip it with the
`ngrok-skip-browser-warning: 1` header, which is why the health checks above carry it.

Removing it costs about $8/month on a paid ngrok plan, or goes away for good when the site
moves to its own domain.

## Backups

`backups/` at the repo root holds dated snapshots. It is gitignored, because those files
contain real learner emails and password hashes.

```sh
OUT=backups/$(date +%Y%m%d-%H%M%S)
mkdir -p "$OUT"
python3 -c "
import sqlite3, sys
src = sqlite3.connect('data/sightline.db')
dst = sqlite3.connect(sys.argv[1] + '/sightline.db')
src.backup(dst); dst.close(); src.close()
" "$OUT"
```

That uses SQLite's online backup API rather than `cp` on purpose: the database runs in WAL
mode, so copying the file on its own while the API is writing can capture a torn state.
Nothing needs to be stopped for the command above. (There is no `sqlite3` command-line tool on
this machine, which is why it goes through Python.)

The Chroma index under `data/chroma/` does not need backing up. It is derived from
`content/corpus/` and rebuilds itself on boot.

## Accounts

`ops/bootstrap_accounts.py` creates and repairs the owner and admin accounts, and is the only
path that can grant the first funds-access account. On this machine it runs from `server/`
with the venv, not through Docker:

```sh
cd server
DATA_DIR=../data uv run python ../ops/bootstrap_accounts.py --dry-run
DATA_DIR=../data uv run python ../ops/bootstrap_accounts.py
```

It is safe to re-run: it aligns roles, never touches an existing password, and writes every
change to the audit log.

To issue a new password for someone who is locked out:

```sh
cd server
DATA_DIR=../data uv run python ../ops/bootstrap_accounts.py \
  --reset-password someone@alaska.edu
```

The new password is printed once and stored only as an argon2id hash. Send it out of band and
have them change it under Account.

## What to do if

| Symptom | First thing to check | Fix |
|---|---|---|
| The site is down | `tools/check-site.sh` — it names which end failed | If a unit is inactive: `systemctl --user restart <unit>`. If the laptop rebooted and nothing came back, `loginctl show-user $USER -p Linger` should say `Linger=yes`; if not, `loginctl enable-linger`. |
| Ranger says it is answering from the course text only | `curl -s http://127.0.0.1:8080/api/meta/health` and read `tutor.degradedReason` | Usually a missing or malformed `ANTHROPIC_API_KEY` in `.env`, or an expired key. Fix `.env`, then `systemctl --user restart sightline-api.service`. |
| The public link stopped working but the site is fine locally | `journalctl --user -u sightline-ngrok.service -n 50` and `curl -s http://127.0.0.1:4040/api/tunnels` | The reserved URL is pinned in the unit, so it should not drift. If ngrok reports the reserved name is in use, another agent is running: stop it, then restart the unit. |
| A content edit is not showing up | The `version` field in `/api/meta/health`, and the seed line in the API log | Curriculum: restart `sightline-api`. Corpus: file-body edits need one boot with `SEED_FORCE=1`. Frontend: `cd web && npm run build`, then restart `sightline-web`. |
| The API will not start after a content edit | The last lines of `journalctl --user -u sightline-api.service` | A `SeedError` names the file and step id. Fix the payload; the boot is refusing on purpose. |
| Someone's account may be compromised | The audit log, `GET /api/admin/audit` | `POST /api/admin/accounts/{id}/revoke-sessions` signs them out everywhere, then reset the password as above. |

## Cutting a new package for the professor

The "unzip and double-click" package is a GitHub release asset, built from the tracked tree with
the real illustrations and the prebuilt site:

```sh
git lfs pull                                   # make sure no plate is a pointer
tools/make-release-zip.sh v1.1                 # -> dist-release/Sightline-Academy-v1.1.zip
gh release create v1.1 dist-release/Sightline-Academy-v1.1.zip \
  --title "Sightline Academy v1.1" --notes "What changed, in one or two lines."
```

`releases/latest` always points at the newest one, so the link in the professor's email keeps
working. Do not hand anyone GitHub's *Code → Download ZIP* — it ships LFS pointers, not pictures.
