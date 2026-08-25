#!/bin/bash
# =============================================================================
#  Sightline Safety Academy — give Ranger, the course tutor, its API key.
#
#  Ranger works without a key: it answers from the course text only. With an
#  Anthropic key it answers on the live model instead. This script stores that
#  key on this computer and nowhere else.
#
#  What you paste is never shown on screen, never written to your command
#  history, and never sent anywhere except this computer's own settings file.
#
#  Double-click ADD_RANGER_KEY.command (macOS), or run ./ADD_RANGER_KEY.sh
#  (Linux). This is the plain-shell twin of ADD_RANGER_KEY.ps1.
# =============================================================================

set -u

ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT" || exit 1

ENV_FILE="$ROOT/.env"
RUN_DIR="$ROOT/data/run"

# Whatever ports the running copy actually chose. Read them BEFORE anything
# stops, because stopping removes the file that records them, and a restart on
# the wrong ports would look like the key had failed.
API_PORT="${SIGHTLINE_API_PORT:-8000}"
WEB_PORT="${SIGHTLINE_WEB_PORT:-8080}"
if [ -f "$RUN_DIR/ports.env" ]; then
    _p=$(sed -n 's/^API_PORT=//p' "$RUN_DIR/ports.env" | head -1 | tr -dc '0-9')
    [ -n "$_p" ] && API_PORT="$_p"
    _p=$(sed -n 's/^WEB_PORT=//p' "$RUN_DIR/ports.env" | head -1 | tr -dc '0-9')
    [ -n "$_p" ] && WEB_PORT="$_p"
fi

case "$(uname -s 2>/dev/null || echo unknown)" in
    Darwin) START_NAME="START_SIGHTLINE.command" ;;
    *)      START_NAME="START_SIGHTLINE.sh"      ;;
esac

say()  { printf '%s\n' "$*"; }
note() { printf '   %s\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

die() {
    printf '\n' >&2
    while [ "$#" -gt 0 ]; do printf '%s\n' "$1" >&2; shift; done
    printf '\n' >&2
    exit 1
}

http_get() {
    if have curl; then
        curl -fsS --max-time 8 "$1" 2>/dev/null
    elif have wget; then
        wget -qO- --timeout=8 "$1" 2>/dev/null
    else
        return 1
    fi
}

say ""
say "Sightline — Ranger's API key"
say "----------------------------"

# --- Refuse to write a secret anywhere git might pick it up ------------------
if have git && [ -d "$ROOT/.git" ]; then
    if ! git -C "$ROOT" check-ignore -q .env 2>/dev/null; then
        die "Stopping: the settings file .env is not on git's ignore list." \
            "A key written there could be uploaded by accident." \
            "Nothing was written. Tell Rad about this message."
    fi
    if git -C "$ROOT" ls-files --error-unmatch .env >/dev/null 2>&1; then
        die "Stopping: the settings file .env is tracked by git." \
            "A key written there could be uploaded by accident." \
            "Nothing was written. Tell Rad about this message."
    fi
fi

if [ ! -f "$ENV_FILE" ]; then
    die "There is no settings file yet." \
        "Run $START_NAME once first; it creates one. Then run this again."
fi
note "The settings file is private to this computer and safe to write to."

if [ ! -t 0 ]; then
    die "This script has to be run in a terminal window so the key can be typed" \
        "without being displayed. Double-click ADD_RANGER_KEY.command, or run" \
        "./ADD_RANGER_KEY.sh from a terminal."
fi

# --- Ask for the key. Hidden input, so it never reaches the screen or history -
say ""
say "Paste the Anthropic API key for Ranger. It will not be shown as you type."
say "Press Return on an empty line to cancel."
say ""
printf 'Anthropic API key: '
KEY=""
read -rs KEY
printf '\n'
KEY=$(printf '%s' "$KEY" | tr -d ' \t\r\n')

if [ -z "$KEY" ]; then
    die "Nothing was entered, so nothing was changed."
fi
if [ "${KEY#sk-ant-}" = "$KEY" ]; then
    KEY=""
    die "That does not look like an Anthropic key — they begin with sk-ant-." \
        "Nothing was written, and nothing was displayed."
fi
if [ ${#KEY} -lt 40 ]; then
    KEY=""
    die "That key looks cut short. Copy the whole line and try again." \
        "Nothing was written."
fi
note "Accepted a key of ${#KEY} characters beginning sk-ant-. The value is never displayed."

# --- Rewrite only the one line; every other setting is kept exactly as it is --
TMP="$ROOT/.env.new.$$"
( umask 077; : > "$TMP" ) || die "Could not write into $ROOT. Check the folder permissions."
REPLACED=0
while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
        ANTHROPIC_API_KEY=*)
            printf 'ANTHROPIC_API_KEY=%s\n' "$KEY" >> "$TMP"
            REPLACED=1
            ;;
        *) printf '%s\n' "$line" >> "$TMP" ;;
    esac
done < "$ENV_FILE"
[ "$REPLACED" -eq 1 ] || printf 'ANTHROPIC_API_KEY=%s\n' "$KEY" >> "$TMP"
mv "$TMP" "$ENV_FILE" || die "Could not save the settings file. Nothing was changed."
chmod 600 "$ENV_FILE" 2>/dev/null
KEY=""
note "Saved. Every other setting was left exactly as it was."
note "The file is now readable only by you."

# --- Restart, if the site is running, so the key is actually picked up -------
API_PID=""
[ -f "$RUN_DIR/api.pid" ] && API_PID=$(tr -dc '0-9' < "$RUN_DIR/api.pid")
if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
    say ""
    say "Restarting the site so Ranger picks the key up."
    /bin/bash "$ROOT/STOP_SIGHTLINE.sh" >/dev/null 2>&1
    SIGHTLINE_NONINTERACTIVE=1 \
    SIGHTLINE_API_PORT="$API_PORT" \
    SIGHTLINE_WEB_PORT="$WEB_PORT" \
        /bin/bash "$ROOT/START_SIGHTLINE.sh" >/dev/null 2>&1
else
    say ""
    say "The site is not running at the moment."
    say "Start it with $START_NAME and Ranger will use the new key."
    say ""
    exit 0
fi

# --- Ask the server itself, so success is confirmed without printing the key --
HEALTH=$(http_get "http://127.0.0.1:${API_PORT}/api/meta/health") || HEALTH=""
PROVIDER=$(printf '%s' "$HEALTH" | sed -n 's/.*"provider":"\([a-z]*\)".*/\1/p' | head -1)

say ""
if [ "$PROVIDER" = "anthropic" ]; then
    say "Ranger is on the live model. The server confirmed it; the key was never printed."
elif [ "$PROVIDER" = "extractive" ]; then
    say "Ranger is still answering from the course text only."
    say "The key did not take effect. Check that the line ANTHROPIC_API_KEY= in the"
    say ".env file has your key after the equals sign, then run this again."
else
    say "Could not reach the site to confirm. Run $START_NAME and check the page."
fi
say ""
exit 0
