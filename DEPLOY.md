# Deploying Sightline ATV Safety Academy

Goal: **anyone with the link can take the course, from anywhere, at any time —
and nothing depends on a laptop staying switched on.**

This document is the runbook. Follow it top to bottom; each step says what you
need, what to run, and how to tell it worked.

---

## 0. What only you can do

Everything in this repository is finished and tested. The steps below need
accounts, cards and DNS, which no amount of code can supply:

| # | Needed | Why | Roughly |
|---|--------|-----|---------|
| 1 | A host that accepts a **4.3 GB** container image | The API bundles PyTorch + the embedding model so the tutor works offline on first boot | $5–25/mo |
| 2 | A **managed Postgres** database | This is the step that takes the database off your computer | $0–20/mo |
| 3 | A **domain name** + DNS control | The link people will use | ~$12/yr |
| 4 | A **Stripe account** | Receives the money. **Create it in Osama's name** — see §5 | free, ~2.9% + 30¢/txn |
| 5 | The **Anthropic API key** | Ranger's live answers | usage-based |

> ⚠️ **The image size is the constraint that decides your host.** `sightline-api`
> is 4.29 GB. Render's free tier and most "hobby" plans cap well below that.
> Hosts that work as-is: **Fly.io**, **Railway**, **Hetzner/DigitalOcean VPS**,
> or any plain VM with Docker. If you need it smaller, replacing
> sentence-transformers with an ONNX runtime cuts roughly 3 GB — that is a
> real project with retrieval-quality retuning attached, not a config change,
> so it is deliberately not done here.

---

## 1. Pick the shape

The SPA and the API **must be served from one origin.** The frontend calls
`/api/...` relative, the CSP is `default-src 'self'`, and the session cookie is
`SameSite=Lax` with no domain set. Splitting static hosting from the API breaks
login in three separate ways, and it breaks it *after* deploy, not at build.

The bundled `ops/docker-compose.yml` already gets this right: nginx serves the
SPA and proxies `/api` to uvicorn over a private network. Deploy that pair as
one unit.

**Recommended: a small VPS.** It is the least moving parts, it matches what has
already been tested locally, and it has no image-size ceiling.

---

## 2. Provision the database first

Create a managed Postgres instance (Neon, Supabase, Fly Postgres, RDS,
DigitalOcean — any of them). Copy the connection URL.

```
DATABASE_URL=postgresql://user:password@host:5432/sightline
```

`postgres://`-style URLs are normalised automatically, so paste whatever the
provider gives you.

**Check it:** the app logs `environment: ... database=postgres` at boot. If it
says `sqlite (local file)`, `DATABASE_URL` did not reach the container and you
are one restart away from losing every learner's progress.

> Turning this on is the single change that satisfies "the database must not be
> reliant on my computer". Everything else here is hardening around it.

---

## 3. Host setup (VPS path)

```bash
# On a fresh Ubuntu box
sudo apt update && sudo apt install -y docker.io docker-compose-plugin caddy
sudo usermod -aG docker "$USER" && newgrp docker

git clone <your-repo-url> sightline && cd sightline
```

### Secrets — not in a file next to the code

```bash
sudo install -m 600 -o root -g root /dev/null /etc/sightline.env
sudo -e /etc/sightline.env      # paste the values from §4
```

`0600` and root-owned: a secret sitting world-readable beside the app ends up in
every backup and every `docker cp`. Load it only for the deploy command:

```bash
set -a; . /etc/sightline.env; set +a
docker compose -f ops/docker-compose.yml -f ops/docker-compose.prod.yml up -d --build
```

The production overlay binds the web container to `127.0.0.1:8080` only, so
plain HTTP is never reachable from outside the machine.

### TLS

Edit `ops/Caddyfile`, replace `atv.example.edu` with your hostname, then:

```bash
sudo cp ops/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy obtains and renews the certificate itself. Point an `A` record at the
box first, or the certificate request fails.

---

## 4. Configuration

Every variable is documented in `.env.example`. The ones that matter most:

```bash
APP_ENV=production
PUBLIC_BASE_URL=https://atv.example.edu
SESSION_SECRET=<python -c "import secrets; print(secrets.token_hex(32))">
SECURE_COOKIES=1
TRUSTED_PROXY_HOPS=1
DATABASE_URL=postgresql://...

OWNER_EMAIL=osama@alaska.edu         # the ONLY account with funds access
ADMIN_EMAILS=rad@alaska.edu          # full admin, deliberately no funds access
INSTRUCTOR_EMAILS=
DEVELOPER_EMAILS=

ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STANDARD=price_...   # $10/mo
STRIPE_PRICE_ID_LAUNCH=price_...     # $5/mo
LAUNCH_SALE_ACTIVE=1
```

**The app refuses to start in production if any of these are unsafe.** That is
on purpose — a site that boots looking healthy while being insecure is worse
than one that does not boot. You will see, e.g.:

```
CRITICAL PRODUCTION CHECK FAILED: SECURE_COOKIES=0 in production: ...
RuntimeError: Refusing to start in production with 2 unsafe setting(s)
```

`TRUSTED_PROXY_HOPS` deserves a note: it is how many proxies **you** run.
`1` is correct for the bundled nginx. Raise it to `2` only if you add a CDN.
Setting it too high re-opens the rate-limit bypass, so change it with the
topology and never independently.

---

## 5. Stripe — where the money goes

**Create the Stripe account in Osama's name, with his details and his bank
account.** This is the step that actually decides who receives funds. Stripe
pays out to the bank account on the Stripe account; nothing in this codebase
can redirect that, and nothing in this codebase should be trusted to.

The application-level rule (`can_access_funds`, held by exactly one user) keeps
revenue *reporting* restricted to Osama's login. Both halves are needed:

| Layer | Control | Enforced by |
|---|---|---|
| Money | Which bank account is paid | The Stripe account itself — Osama's |
| Keys | Who can charge cards | `STRIPE_SECRET_KEY`, in the host secret store |
| App | Who can read revenue / grant fund access | `can_access_funds`, one account |

### Setup

1. **Products → add product** → "Sightline ATV Safety Academy".
   Add two recurring monthly prices: **$10.00** (standard) and **$5.00**
   (launch). Copy both `price_...` ids.
2. **Developers → Webhooks → Add endpoint**
   URL: `https://atv.example.edu/api/billing/webhook`
   Events: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Test locally first with the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:8080/api/billing/webhook
   stripe trigger checkout.session.completed
   ```

The webhook is the **only** thing that grants paid access. A learner who closes
the tab after paying still gets in; someone who hand-crafts a request to the
success URL does not. Signature verification is mandatory and cannot be
disabled.

> If Stripe is not fully configured, the paywall **switches itself off** rather
> than locking everyone out. That is intentional: refusing entry to people who
> have paid, because of our own misconfiguration, is the worse failure. Watch
> for `BILLING NOT CONFIGURED` in the boot log.

---

## 6. First run — claim the owner account

Funds access cannot be granted through the admin API — only an account that
already holds it may confer it — so the first holder is created by a shipped
bootstrap tool. That tool is the *only* path that mints one.

1. Deploy with `OWNER_EMAIL` and `ADMIN_EMAILS` set.
2. Preview, then apply:
   ```bash
   docker compose -f ops/docker-compose.yml exec -T api        python /app/ops/bootstrap_accounts.py --dry-run
   docker compose -f ops/docker-compose.yml exec -T api        python /app/ops/bootstrap_accounts.py
   ```
   It creates any missing account with a random password printed **once**, and
   aligns the role of any account that already exists without touching its
   password. Safe to re-run. Every change is written to the audit log.

   *(On Git Bash for Windows, prefix with `MSYS_NO_PATHCONV=1` or the container
   path gets rewritten into a Windows one.)*
3. Anyone who forgets their password:
   ```bash
   docker compose -f ops/docker-compose.yml exec -T api        python /app/ops/bootstrap_accounts.py --reset-password someone@alaska.edu
   ```
4. Verify:
   ```bash
   curl -s https://atv.example.edu/api/admin/me/permissions -b cookies.txt | jq
   ```
   Osama's response has `"canAccessFunds": true` and `instructor` among
   `grantableRoles`. Rad's has `false` and only `["developer","learner"]`.

### Creating accounts for other student workers

Either of them can do this; only Osama can create faculty:

```bash
curl -X POST https://atv.example.edu/api/admin/accounts \
  -H 'content-type: application/json' -b cookies.txt \
  -d '{"email":"worker@alaska.edu","displayName":"New Worker","role":"developer"}'
```

The response contains a one-time password. It is shown once and never stored in
plaintext — send it out of band and have them change it.

Every privileged action is written to an append-only audit log:
`GET /api/admin/audit`.

---

## 7. Verify the deployment

```bash
BASE=https://atv.example.edu

# 1. Serving, and on Postgres
curl -s $BASE/api/meta/health | jq
#    status "ok", db "ok", chroma.docs > 0

# 2. Ranger is on the live model
curl -s $BASE/api/meta/health | jq '.tutor'
#    provider "anthropic", keyWellFormed true, degradedReason null

# 3. Pricing is live
curl -s $BASE/api/billing/plan | jq
#    activeCents 500, launchSaleActive true, billingAvailable true

# 4. The paywall actually bites (as a fresh learner, logged in, unpaid)
curl -s -o /dev/null -w '%{http_code}\n' $BASE/api/lessons/m1-l1-why-riders-crash -b learner.txt
#    402

# 5. TLS + headers
curl -sI $BASE | grep -i 'strict-transport\|content-security\|x-frame'

# 6. Certificate
curl -sI $BASE | head -1     # HTTP/2 200
```

Then, by hand: register → pay with Stripe test card `4242 4242 4242 4242` →
land back on `/account` → open a lesson → ask Ranger a question.

---

## 8. Operating it

- **Logs:** `docker compose -f ops/docker-compose.yml logs -f api`
- **Backups:** your Postgres provider's automated backups are the real safety
  net. Turn them on and *restore one once* — an untested backup is a rumour.
- **The Chroma index** on the data volume is derived from `content/` and rebuilds
  itself on boot. It does not need backing up.
- **Rotating the Anthropic key:** update the secret, `docker compose up -d api`,
  then confirm `tutor.degradedReason` is `null`.
- **Suspected account compromise:**
  `POST /api/admin/accounts/{id}/revoke-sessions` signs them out everywhere.
- **Ending the launch sale:** set `LAUNCH_SALE_ACTIVE=0` and restart. Existing
  subscribers keep the price they signed up at — that is Stripe's behaviour,
  not a decision this app makes.

---

## 9. Security posture, briefly

What is in place, mapped to the CIA triad:

**Confidentiality** — TLS everywhere with automatic renewal; `HttpOnly`,
`Secure`, `SameSite=Lax` session cookies; argon2id password hashing; no card
data ever touches this system (Stripe-hosted checkout); secrets read from the
environment, never committed — the repository history has been scanned and is
clean; the API container runs as a non-root user; interactive API docs are
disabled in production.

**Integrity** — Stripe webhooks are signature-verified and applied at most once;
paid access can only be written by that verified webhook, never by a browser
request; an append-only audit log records every role grant, funds-access change
and comp; privilege changes are refused when the caller could not grant that
privilege themselves; cross-origin state-changing requests are rejected.

**Availability** — the database is managed and off any personal machine;
containers restart automatically; brute-force protection now works in two
independent layers (per-IP with correct proxy handling, and per-account, which
cannot be evaded by rotating source addresses); the tutor endpoint is quota'd
per learner so one account cannot exhaust the API budget for everyone; nginx
sheds floods before they reach password hashing; the paywall fails open rather
than locking out paying learners.

### Known and accepted

- **No email verification or password reset.** Roles are granted from a
  configured allowlist rather than from a self-asserted address, so the usual
  consequence of unverified email is contained — but a learner who forgets
  their password currently needs an admin.
- **Rate-limit state is per-process** for the per-IP layer. The per-account
  layer is in the database and holds across replicas; if you scale beyond one
  API container, the per-IP layer becomes best-effort.
- **The 4.3 GB image** makes deploys slow and constrains hosting.
- **`_ensure_late_columns` is a hand-rolled migrator.** It is portable and
  additive-only. Anything beyond adding a column needs a real migration tool.
