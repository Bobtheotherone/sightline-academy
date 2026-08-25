#!/usr/bin/env bash
# Read-only status check for the Sightline ATV Safety Academy.
#
#   tools/check-site.sh            both local and live
#   tools/check-site.sh local      the machine's own services only
#   tools/check-site.sh live       the public ngrok URL only
#
# Touches nothing: every call is a GET, and the database is opened read-only.
# Exits 0 when everything it checked is up, 1 when anything is down — so it is
# safe to drop into a cron job or a pre-flight check.
#
# Portable between Linux and macOS: no GNU-only stat/timeout/grep flags.

set -uo pipefail

TARGET="${1:-both}"
case "$TARGET" in
  local|live|both) ;;
  -h|--help|help)  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) echo "usage: $(basename "$0") [local|live]" >&2; exit 2 ;;
esac

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_API="http://127.0.0.1:8000"
LOCAL_WEB="http://127.0.0.1:8080"
NGROK_API="http://127.0.0.1:4040/api/tunnels"
DB="${SIGHTLINE_DB:-$REPO/data/sightline.db}"
CURL=(curl -sS --max-time 20 -H 'ngrok-skip-browser-warning: 1')

FAILURES=0
if [ -t 1 ]; then B=$'\033[1m'; G=$'\033[32m'; R=$'\033[31m'; Y=$'\033[33m'; Z=$'\033[0m'
else B=""; G=""; R=""; Y=""; Z=""; fi

ok()   { printf '  %sPASS%s  %s\n' "$G" "$Z" "$1"; }
bad()  { printf '  %sDOWN%s  %s\n' "$R" "$Z" "$1"; FAILURES=$((FAILURES + 1)); }
warn() { printf '  %s----%s  %s\n' "$Y" "$Z" "$1"; }
section() { printf '\n%s%s%s\n' "$B" "$1" "$Z"; }

have() { command -v "$1" >/dev/null 2>&1; }

# --- health -----------------------------------------------------------------
# Prints the tutor lines out of /api/meta/health and reports whether Ranger is
# on the live model. A reachable API with a degraded tutor is still a failure:
# "Ranger should always be working" is the requirement being checked.
check_health() {
  local label="$1" base="$2" body
  body="$("${CURL[@]}" "$base/api/meta/health" 2>/dev/null)"
  if [ -z "$body" ]; then
    bad "$label API unreachable at $base"
    return
  fi
  if ! have python3; then
    ok "$label API responded (install python3 for the parsed detail)"
    return
  fi
  local parsed
  parsed="$(printf '%s' "$body" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("ERR|unparseable response"); raise SystemExit
t = d.get("tutor") or {}
reason = t.get("degradedReason")
print("|".join([
    "OK",
    str(d.get("status")),
    str(d.get("db")),
    str((d.get("chroma") or {}).get("docs")),
    str(t.get("provider")),
    str(t.get("model")),
    "yes" if t.get("keyPresent") else "no",
    reason if reason else "",
    str(d.get("version"))[:12],
]))
' 2>/dev/null)"
  local kind; kind="${parsed%%|*}"
  if [ "$kind" != "OK" ]; then bad "$label API returned something that is not health JSON"; return; fi
  local IFS='|'; read -r _ status db docs provider model keyp reason version <<EOF
$parsed
EOF
  unset IFS
  ok "$label API $base — status=$status db=$db corpus=$docs docs (build ${version})"
  printf '        tutor: provider=%s model=%s key=%s\n' "$provider" "$model" "$keyp"
  if [ -n "$reason" ]; then
    bad "$label Ranger is degraded: $reason"
  elif [ "$provider" != "anthropic" ]; then
    bad "$label Ranger is on the '$provider' provider, not the live model"
  else
    ok "$label Ranger is on the live model"
  fi
  [ "$status" = "ok" ] || bad "$label API reports status=$status"
}

check_web() {
  local label="$1" url="$2" code
  code="$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$url" 2>/dev/null)"
  case "$code" in
    200) ok "$label web $url — HTTP 200" ;;
    "" | 000) bad "$label web unreachable at $url" ;;
    *) bad "$label web $url — HTTP $code" ;;
  esac
}

# --- targets ----------------------------------------------------------------
LIVE_URL=""
resolve_live_url() {
  local body
  body="$(curl -sS --max-time 5 "$NGROK_API" 2>/dev/null)"
  if [ -n "$body" ] && have python3; then
    LIVE_URL="$(printf '%s' "$body" | python3 -c '
import json, sys
try:
    ts = json.load(sys.stdin).get("tunnels") or []
except Exception:
    ts = []
for t in ts:
    u = t.get("public_url") or ""
    if u.startswith("https://"):
        print(u); break
' 2>/dev/null)"
  fi
  if [ -z "$LIVE_URL" ] && [ -f "$REPO/SIGHTLINE_LINK.txt" ]; then
    LIVE_URL="$(tr -d '[:space:]' < "$REPO/SIGHTLINE_LINK.txt")"
  fi
}

if [ "$TARGET" = "local" ] || [ "$TARGET" = "both" ]; then
  section "LOCAL"
  check_health "local " "$LOCAL_API"
  check_web    "local " "$LOCAL_WEB"
fi

if [ "$TARGET" = "live" ] || [ "$TARGET" = "both" ]; then
  section "TUNNEL"
  resolve_live_url
  if curl -sS --max-time 5 -o /dev/null "$NGROK_API" 2>/dev/null; then
    ok "ngrok agent is up (control panel on 127.0.0.1:4040)"
  else
    warn "ngrok agent API not answering on 127.0.0.1:4040 (fine if the tunnel runs elsewhere)"
  fi
  if [ -n "$LIVE_URL" ]; then
    ok "public URL $LIVE_URL"
  else
    bad "no public URL found — ngrok is not running and SIGHTLINE_LINK.txt is missing"
  fi

  section "LIVE"
  if [ -n "$LIVE_URL" ]; then
    check_health "live  " "$LIVE_URL"
    check_web    "live  " "$LIVE_URL/"
  else
    bad "live checks skipped — no public URL"
  fi
fi

# --- database ---------------------------------------------------------------
section "DATABASE"
if [ ! -f "$DB" ]; then
  bad "no database at $DB"
elif ! have python3; then
  warn "python3 not found — cannot read $DB"
else
  db_report="$(SIGHTLINE_DB_PATH="$DB" python3 -c '
import os, sqlite3
p = os.environ["SIGHTLINE_DB_PATH"]
size = os.path.getsize(p) / (1024 * 1024)
try:
    # Read-only URI: this script must never write to the live database.
    c = sqlite3.connect("file:%s?mode=ro" % p, uri=True)
    users = c.execute("select count(*) from users").fetchone()[0]
    staff = c.execute(
        "select count(*) from users where role in (\"owner\",\"admin\",\"instructor\")"
    ).fetchone()[0]
    c.close()
    print("OK|%.1f|%d|%d" % (size, users, staff))
except Exception as e:
    print("ERR|%.1f|%s" % (size, e))
' 2>/dev/null)"
  case "$db_report" in
    OK\|*)
      IFS='|' read -r _ size users staff <<EOF
$db_report
EOF
      ok "$DB — ${size} MB, ${users} accounts (${staff} staff)"
      ;;
    ERR\|*) bad "$DB unreadable: ${db_report#ERR|}" ;;
    *)      bad "$DB could not be inspected" ;;
  esac
fi

# --- services ---------------------------------------------------------------
if have systemctl; then
  section "SERVICES"
  for unit in sightline-api sightline-web sightline-ngrok; do
    state="$(systemctl --user is-active "$unit" 2>/dev/null || true)"
    enabled="$(systemctl --user is-enabled "$unit" 2>/dev/null || true)"
    [ -n "$state" ]   || state="unknown"
    [ -n "$enabled" ] || enabled="unknown"
    if [ "$state" = "active" ]; then
      ok "$unit — active, $enabled at boot"
    else
      bad "$unit — $state ($enabled at boot)"
    fi
  done
  linger="$(loginctl show-user "$(id -un)" 2>/dev/null | sed -n 's/^Linger=//p')"
  case "$linger" in
    yes) ok "linger enabled — services keep running when nobody is signed in" ;;
    no)  bad "linger disabled — services stop when $(id -un) signs out (loginctl enable-linger $(id -un))" ;;
    *)   warn "linger state unknown" ;;
  esac
fi

# --- verdict ----------------------------------------------------------------
section "RESULT"
if [ "$FAILURES" -eq 0 ]; then
  printf '  %sEverything checked is up.%s\n\n' "$G" "$Z"
  exit 0
fi
printf '  %s%d check(s) failed.%s\n\n' "$R" "$FAILURES" "$Z"
exit 1
