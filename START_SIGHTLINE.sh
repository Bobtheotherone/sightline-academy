#!/bin/bash
# =============================================================================
#  Sightline Safety Academy — start the whole site on THIS computer.
#
#  Double-click START_SIGHTLINE.command (macOS) or run ./START_SIGHTLINE.sh
#  (Linux). It sets everything up the first time and simply starts the site
#  every time after that. Running it twice is safe.
#
#  This is your own private copy of the Academy. Nothing it does touches the
#  live site on the internet.
#
#  To stop it again, use STOP_SIGHTLINE.
#
#  Optional settings, only needed if the usual ports are already taken:
#      SIGHTLINE_API_PORT           default 8000
#      SIGHTLINE_WEB_PORT           default 8080
#      SIGHTLINE_NONINTERACTIVE=1   never ask any questions
#      SIGHTLINE_NO_NODE=1          use the prebuilt site, ignore Node.js
# =============================================================================

set -u

# --- Where we are ------------------------------------------------------------
# `readlink -f` does not exist on macOS, so find the folder the plain way.
ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT" || exit 1

API_PORT="${SIGHTLINE_API_PORT:-8000}"
WEB_PORT="${SIGHTLINE_WEB_PORT:-8080}"
SITE_URL="http://localhost:${WEB_PORT}"

DATA_DIR_ABS="$ROOT/data"
CONTENT_DIR_ABS="$ROOT/content"
LOG_DIR="$DATA_DIR_ABS/logs"
RUN_DIR="$DATA_DIR_ABS/run"
API_LOG="$LOG_DIR/api.log"
WEB_LOG="$LOG_DIR/web.log"
API_PID_FILE="$RUN_DIR/api.pid"
WEB_PID_FILE="$RUN_DIR/web.pid"
PORTS_FILE="$RUN_DIR/ports.env"
MODE_FILE="$RUN_DIR/mode"

INTERACTIVE=1
if [ "${SIGHTLINE_NONINTERACTIVE:-0}" = "1" ] || [ ! -t 0 ]; then
    INTERACTIVE=0
fi

case "$(uname -s 2>/dev/null || echo unknown)" in
    Darwin) STOP_NAME="STOP_SIGHTLINE.command" ; KEY_NAME="ADD_RANGER_KEY.command" ;;
    *)      STOP_NAME="STOP_SIGHTLINE.sh"      ; KEY_NAME="ADD_RANGER_KEY.sh" ;;
esac

# --- Small helpers -----------------------------------------------------------
say()  { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
note() { printf '   %s\n' "$*"; }

die() {
    printf '\n' >&2
    printf 'Sightline could not start.\n' >&2
    while [ "$#" -gt 0 ]; do printf '%s\n' "$1" >&2; shift; done
    printf '\n' >&2
    exit 1
}

have() { command -v "$1" >/dev/null 2>&1; }

BOX_W=64
box_rule() {
    _i=0
    printf '  +'
    while [ "$_i" -lt $((BOX_W + 2)) ]; do printf '-'; _i=$((_i + 1)); done
    printf '+\n'
}
box_line() { printf '  | %-*s |\n' "$BOX_W" "${1:-}"; }

# Fetch a URL to standard output. Quiet; fails on HTTP errors.
http_get() {
    if have curl; then
        curl -fsS --max-time 8 "$1" 2>/dev/null
    elif have wget; then
        wget -qO- --timeout=8 "$1" 2>/dev/null
    else
        return 1
    fi
}

# Is anything already listening on this port of this computer?
port_in_use() {
    (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1 && return 0
    return 1
}

pid_alive() { [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null; }

read_pid_file() {
    [ -f "$1" ] || return 1
    tr -dc '0-9' < "$1"
}

random_hex_64() {
    if have openssl; then
        openssl rand -hex 32 2>/dev/null && return 0
    fi
    if [ -r /dev/urandom ] && have od; then
        od -An -tx1 -N32 /dev/urandom 2>/dev/null | tr -d ' \n' && return 0
    fi
    if have python3; then
        python3 -c 'import secrets;print(secrets.token_hex(32))' 2>/dev/null && return 0
    fi
    return 1
}

# Print the closing summary. Reads HEALTH_JSON.
print_summary() {
    _provider=$(printf '%s' "${HEALTH_JSON:-}" | sed -n 's/.*"provider":"\([a-z]*\)".*/\1/p' | head -1)
    if [ "$_provider" = "anthropic" ]; then
        _ranger="Ranger is on the live model."
    else
        _ranger="Ranger is answering from the course text only."
        _ranger2="Run $KEY_NAME to add a key."
    fi
    say ""
    box_rule
    box_line "Sightline Safety Academy is running."
    box_line ""
    box_line "Open it here:   $SITE_URL"
    box_line ""
    box_line "Your copy of the course lives in:  data/sightline.db"
    box_line "Nothing here touches the live site."
    box_line ""
    box_line "$_ranger"
    if [ "$_provider" != "anthropic" ]; then box_line "${_ranger2:-}"; fi
    box_line ""
    box_line "To stop:  $STOP_NAME"
    box_rule
    say ""
}

say ""
say "Sightline Safety Academy — starting on this computer"
say "---------------------------------------------------"
say "Your own copy. Nothing here touches the live site."

if ! have curl && ! have wget; then
    die "This computer has neither 'curl' nor 'wget', and the start-up check needs one of them." \
        "On Linux run:  sudo apt install curl" \
        "On macOS curl is built in; if it is missing, reinstall the command line tools with:" \
        "  xcode-select --install"
fi

mkdir -p "$LOG_DIR" "$RUN_DIR" || die \
    "Could not create the folder $DATA_DIR_ABS." \
    "Check that you are allowed to write inside this folder."

HEALTH_JSON=""

# =============================================================================
# 0. Already running? Then there is nothing to do.
# =============================================================================
# How many programs to look for depends on how it was started last time, so
# read that back instead of guessing: one program in "single" mode, two in
# "two". Same for the port the course server actually answers on.
RECORDED_MODE=""
if [ -f "$MODE_FILE" ]; then
    RECORDED_MODE=$(tr -dc 'a-z' < "$MODE_FILE" 2>/dev/null) || RECORDED_MODE=""
fi
RECORDED_API_PORT=""
if [ -f "$PORTS_FILE" ]; then
    RECORDED_API_PORT=$(sed -n 's/^API_PORT=//p' "$PORTS_FILE" | head -1 | tr -dc '0-9')
fi
[ -n "$RECORDED_API_PORT" ] || RECORDED_API_PORT="$API_PORT"

EXISTING_API=$(read_pid_file "$API_PID_FILE" 2>/dev/null) || EXISTING_API=""
EXISTING_WEB=$(read_pid_file "$WEB_PID_FILE" 2>/dev/null) || EXISTING_WEB=""
STILL_UP=0
if pid_alive "$EXISTING_API"; then
    if [ "$RECORDED_MODE" = "single" ] || pid_alive "$EXISTING_WEB"; then
        STILL_UP=1
    fi
fi
if [ "$STILL_UP" -eq 1 ]; then
    HEALTH_JSON=$(http_get "http://127.0.0.1:${RECORDED_API_PORT}/api/meta/health") || HEALTH_JSON=""
    case "$HEALTH_JSON" in
        *'"status":"ok"'*)
            say ""
            say "Sightline is already running on this computer; nothing to do."
            print_summary
            exit 0
            ;;
    esac
fi

# =============================================================================
# 1. Python, through uv
# =============================================================================
step "Step 1 of 6 — checking the Python tools"

# uv installs itself into ~/.local/bin (older versions used ~/.cargo/bin).
PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
export PATH

if have uv; then
    note "uv is already installed."
else
    note "Installing 'uv', the tool that manages Python for this project."
    if have curl; then
        curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1
    else
        wget -qO- https://astral.sh/uv/install.sh | sh >/dev/null 2>&1
    fi
    PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
    export PATH
    have uv || die \
        "The Python tool 'uv' could not be installed automatically." \
        "Install it by hand from https://docs.astral.sh/uv/getting-started/installation/" \
        "and then run this script again."
    note "Installed uv."
fi

UV=$(command -v uv)

if ! "$UV" python find 3.12 >/dev/null 2>&1; then
    note "Getting Python 3.12 — this project needs exactly that version."
    "$UV" python install 3.12 || die \
        "Python 3.12 could not be downloaded." \
        "Check that this computer is connected to the internet, then run this script again."
fi

step "Step 2 of 6 — preparing the course server"
if [ ! -d "$ROOT/server/.venv" ]; then
    say ""
    say "   First run installs about 2 GB and takes 5-15 minutes. Later runs are fast."
    say "   You can leave it working; it prints a line when it is done."
    say ""
fi
( cd "$ROOT/server" && "$UV" sync ) || die \
    "The course server's Python packages could not be installed." \
    "This is almost always a dropped internet connection." \
    "Reconnect and run this script again."
note "Course server ready."

# =============================================================================
# 2. Node.js, packages, and the built web pages
# =============================================================================
step "Step 3 of 6 — preparing the web pages"

case "$(uname -s 2>/dev/null || echo unknown)" in
    Darwin) NODE_HELP="  macOS: install the LTS version from https://nodejs.org  (or run: brew install node)" ;;
    Linux)  NODE_HELP="  Linux: install the LTS version from https://nodejs.org  (the version in older
         Ubuntu package lists is usually too old)" ;;
    *)      NODE_HELP="  Windows: run  winget install OpenJS.NodeJS.LTS  or install the LTS version from https://nodejs.org" ;;
esac

NODE_VERSION=""
NODE_MAJOR=0
if have node && have npm; then
    NODE_VERSION=$(node --version 2>/dev/null | tr -d 'v')
    NODE_MAJOR=${NODE_VERSION%%.*}
    case "$NODE_MAJOR" in
        ''|*[!0-9]*) NODE_MAJOR=0 ;;
    esac
fi

DIST_DIR="$ROOT/web/dist"
PREBUILT=0
[ -f "$DIST_DIR/index.html" ] && PREBUILT=1

# There are two ways to run, and this is where it is decided.
#
#   single  The pages are already built, and the course server hands them out
#           itself. Nothing else is installed and nothing else runs. This is
#           what a released copy of the folder gets.
#   two     Node builds the pages and serves them, which is what you want while
#           the pages are being changed.
#
# The absence of web/node_modules is what tells a released copy from somebody's
# working checkout. A release ships the built pages and nothing to build them
# with, so it should start straight away even on a computer that happens to
# have Node installed — otherwise "unzip and double-click" quietly turns into a
# 200 MB download and a build. A checkout that has run npm install keeps the
# behaviour its owner expects.
#
# 20, not 18, is the Node cut-off: the page styling tool (@tailwindcss/oxide)
# declares "node >= 20", and npm quietly SKIPS its compiled part on anything
# older. The install then looks like it worked and the build fails later with
# "Cannot find native binding", which is a miserable thing to hand to somebody.
MODE=two
if [ "$PREBUILT" -eq 1 ]; then
    if [ "${SIGHTLINE_NO_NODE:-0}" = "1" ] \
        || [ "$NODE_MAJOR" -lt 20 ] \
        || [ ! -d "$ROOT/web/node_modules" ]; then
        MODE=single
    fi
fi

if [ "$MODE" = "single" ]; then
    note "Using the prebuilt site (no Node.js needed)."
    note "Delete web/dist or run npm install in web/ to develop the pages."
else

if [ "${SIGHTLINE_NO_NODE:-0}" = "1" ]; then
    die "The pages have not been built yet, so Node.js is needed to build them once." \
        "" \
        "Install it, then run this script again:" \
        "$NODE_HELP"
fi
if ! have node || ! have npm; then
    die "This computer does not have Node.js, which builds the course web pages." \
        "" \
        "Install it, then run this script again:" \
        "$NODE_HELP"
fi
if [ "$NODE_MAJOR" -lt 20 ]; then
    die "Node.js version $NODE_VERSION is too old. This project needs version 20 or newer." \
        "" \
        "Install a current version, then run this script again:" \
        "$NODE_HELP"
fi
note "Node.js $NODE_VERSION is fine."

# Reinstall packages only when the package list actually changed.
needs_npm_install() {
    [ -d "$ROOT/web/node_modules" ] || return 0
    [ -f "$ROOT/web/node_modules/.package-lock.json" ] || return 0
    [ -f "$ROOT/web/package-lock.json" ] || return 1
    _changed=$(find "$ROOT/web/package-lock.json" \
        -newer "$ROOT/web/node_modules/.package-lock.json" 2>/dev/null | head -1)
    [ -n "$_changed" ]
}

if needs_npm_install; then
    note "Installing the web page packages. A few minutes the first time."
    if [ -f "$ROOT/web/package-lock.json" ]; then
        ( cd "$ROOT/web" && npm ci ) || ( cd "$ROOT/web" && npm install ) || die \
            "The web page packages could not be installed." \
            "This is almost always a dropped internet connection." \
            "Reconnect and run this script again."
    else
        ( cd "$ROOT/web" && npm install ) || die \
            "The web page packages could not be installed." \
            "This is almost always a dropped internet connection." \
            "Reconnect and run this script again."
    fi
else
    note "Web page packages are already installed."
fi

# Rebuild only when something that feeds the build has changed since last time.
BUILD_STAMP="$ROOT/web/dist/.sightline-build-stamp"
needs_build() {
    [ -f "$ROOT/web/dist/index.html" ] || return 0
    [ -f "$BUILD_STAMP" ] || return 0
    _changed=$(find \
        "$ROOT/web/src" \
        "$ROOT/web/public" \
        "$ROOT/web/index.html" \
        "$ROOT/web/package.json" \
        "$ROOT/web/package-lock.json" \
        "$ROOT/web/vite.config.ts" \
        "$ROOT/web/tsconfig.json" \
        -newer "$BUILD_STAMP" 2>/dev/null | head -1)
    [ -n "$_changed" ]
}

if needs_build; then
    note "Building the course web pages. This takes a minute or two."
    ( cd "$ROOT/web" && npm run build ) || die \
        "The course web pages could not be built; the details are above." \
        "If this is a fresh copy of the folder, delete the web/node_modules folder" \
        "and run this script again."
    : > "$BUILD_STAMP"
    note "Web pages built."
else
    note "Web pages are already built and up to date."
fi

fi  # end of two-process preparation

# =============================================================================
# 3. The settings file (.env)
# =============================================================================
step "Step 4 of 6 — settings"

managed_value() {
    case "$1" in
        APP_ENV)              printf 'development' ;;
        PUBLIC_BASE_URL)      printf 'http://localhost:%s' "$WEB_PORT" ;;
        SECURE_COOKIES)       printf '0' ;;
        SESSION_SECRET)       printf '%s' "$NEW_SESSION_SECRET" ;;
        OWNER_EMAIL)          printf 'oabaza@alaska.edu' ;;
        ADMIN_EMAILS)         printf 'rnmercado@alaska.edu' ;;
        REQUIRE_SUBSCRIPTION) printf '0' ;;
        DATA_DIR)             printf '../data' ;;
        CONTENT_DIR)          printf '../content' ;;
        FIXTURES)             printf '0' ;;
        SEED_FORCE)           printf '0' ;;
        TUTOR_MODEL)          printf 'claude-sonnet-4-6' ;;
        *) return 1 ;;
    esac
    return 0
}

MANAGED_KEYS="APP_ENV PUBLIC_BASE_URL SECURE_COOKIES SESSION_SECRET OWNER_EMAIL ADMIN_EMAILS REQUIRE_SUBSCRIPTION DATA_DIR CONTENT_DIR FIXTURES SEED_FORCE TUTOR_MODEL"
NEW_SESSION_SECRET=""

if [ ! -f "$ROOT/.env" ]; then
    [ -f "$ROOT/.env.example" ] || die \
        "The settings template .env.example is missing from this folder." \
        "Get a fresh copy of the project folder and try again."

    NEW_SESSION_SECRET=$(random_hex_64)
    [ -n "$NEW_SESSION_SECRET" ] || die \
        "This computer could not generate the random sign-in key the site needs." \
        "Install OpenSSL — macOS and Linux normally have it — and run this script again."

    TMP_ENV="$ROOT/.env.new.$$"
    ( umask 077; : > "$TMP_ENV" ) || die \
        "Could not write into $ROOT. Check the folder permissions."
    SEEN=" "
    while IFS= read -r line || [ -n "$line" ]; do
        key=""
        case "$line" in
            [A-Z]*=*) key="${line%%=*}" ;;
        esac
        if [ -n "$key" ] && value=$(managed_value "$key"); then
            printf '%s=%s\n' "$key" "$value" >> "$TMP_ENV"
            SEEN="$SEEN$key "
        else
            printf '%s\n' "$line" >> "$TMP_ENV"
        fi
    done < "$ROOT/.env.example"

    for key in $MANAGED_KEYS; do
        case "$SEEN" in
            *" $key "*) ;;
            *) printf '%s=%s\n' "$key" "$(managed_value "$key")" >> "$TMP_ENV" ;;
        esac
    done
    grep -q '^ANTHROPIC_API_KEY=' "$TMP_ENV" || printf 'ANTHROPIC_API_KEY=\n' >> "$TMP_ENV"

    mv "$TMP_ENV" "$ROOT/.env" || die "Could not save the settings file $ROOT/.env."
    chmod 600 "$ROOT/.env" 2>/dev/null
    NEW_SESSION_SECRET=""
    note "Created your settings file (.env) with a fresh private sign-in key."
else
    note "Settings file already exists; leaving it exactly as it is."
fi

# The settings file holds a private key, so make sure git can never pick it up.
if have git && [ -d "$ROOT/.git" ]; then
    if ! git -C "$ROOT" check-ignore -q .env 2>/dev/null; then
        note "Note: .env is not on git's ignore list. Do not upload or share that file."
    fi
fi

current_key() {
    [ -f "$ROOT/.env" ] || return 0
    sed -n 's/^ANTHROPIC_API_KEY=//p' "$ROOT/.env" | head -1 | tr -d '\r'
}

set_key_in_env() {
    _tmp="$ROOT/.env.new.$$"
    ( umask 077; : > "$_tmp" ) || return 1
    _replaced=0
    while IFS= read -r _line || [ -n "$_line" ]; do
        case "$_line" in
            ANTHROPIC_API_KEY=*)
                printf 'ANTHROPIC_API_KEY=%s\n' "$1" >> "$_tmp"
                _replaced=1
                ;;
            *) printf '%s\n' "$_line" >> "$_tmp" ;;
        esac
    done < "$ROOT/.env"
    [ "$_replaced" -eq 1 ] || printf 'ANTHROPIC_API_KEY=%s\n' "$1" >> "$_tmp"
    mv "$_tmp" "$ROOT/.env" || return 1
    chmod 600 "$ROOT/.env" 2>/dev/null
    return 0
}

if [ -z "$(current_key)" ]; then
    if [ "$INTERACTIVE" -eq 1 ]; then
        say ""
        say "   Ranger is the course's tutor. It works either way: with a key it"
        say "   answers on the live model, without one it answers from the course"
        say "   text only. What you type next is not shown on screen."
        say ""
        printf '   Paste the Anthropic API key for Ranger (from Rad), or press Enter to run without it: '
        RANGER_KEY=""
        read -rs RANGER_KEY
        printf '\n'
        RANGER_KEY=$(printf '%s' "$RANGER_KEY" | tr -d ' \t\r\n')
        if [ -z "$RANGER_KEY" ]; then
            note "No key entered. Ranger will answer from the course text only."
        elif [ "${RANGER_KEY#sk-ant-}" = "$RANGER_KEY" ] || [ ${#RANGER_KEY} -lt 40 ]; then
            RANGER_KEY=""
            note "That did not look like an Anthropic key, so nothing was saved."
            note "Starting without it. You can add one later with $KEY_NAME."
        else
            if set_key_in_env "$RANGER_KEY"; then
                note "Saved the key. It was never printed and is not in your command history."
            else
                note "The key could not be saved. Starting without it; try $KEY_NAME afterwards."
            fi
            RANGER_KEY=""
        fi
    else
        note "No Anthropic key is set. Ranger will answer from the course text only."
    fi
fi

# =============================================================================
# 4. Start the two programs
# =============================================================================
step "Step 5 of 6 — starting the site"

# In single mode the course server answers on the site's own port, so the
# address a person types is http://localhost:8080 either way.
if [ "$MODE" = "single" ]; then
    API_LISTEN_PORT="$WEB_PORT"
else
    API_LISTEN_PORT="$API_PORT"
fi

check_port() {
    if port_in_use "$1"; then
        die "Another program on this computer is already using port $1." \
            "Close that program, or start Sightline on different ports:" \
            "  SIGHTLINE_API_PORT=8001 SIGHTLINE_WEB_PORT=8081 ./START_SIGHTLINE.sh"
    fi
}
check_port "$WEB_PORT"
[ "$MODE" = "single" ] || check_port "$API_PORT"

: > "$API_LOG"
rm -f "$API_PID_FILE" "$WEB_PID_FILE"
[ "$MODE" = "single" ] || : > "$WEB_LOG"

# Only set in single mode. Empty means the course server serves no pages, which
# is what the two-process mode wants: there, Node hands the pages out.
WEB_DIST_FOR_API=""
[ "$MODE" = "single" ] && WEB_DIST_FOR_API="$DIST_DIR"

(
    cd "$ROOT/server" || exit 1
    DATA_DIR="$DATA_DIR_ABS" \
    CONTENT_DIR="$CONTENT_DIR_ABS" \
    PUBLIC_BASE_URL="$SITE_URL" \
    WEB_DIST_DIR="$WEB_DIST_FOR_API" \
    nohup "$UV" run uvicorn app.main:app --host 127.0.0.1 --port "$API_LISTEN_PORT" \
        >>"$API_LOG" 2>&1 </dev/null &
    printf '%s\n' "$!" > "$API_PID_FILE"
)
API_PID=$(read_pid_file "$API_PID_FILE") || API_PID=""
note "The course server is starting. Its notes go to data/logs/api.log"
say ""
say "   Waiting for the course server. The first start takes 2-3 minutes because"
say "   it reads the whole course in. Later starts take seconds."

START_TS=$(date +%s)
LAST_BEAT=$START_TS
TIMEOUT_S=900
while :; do
    body=$(http_get "http://127.0.0.1:${API_LISTEN_PORT}/api/meta/health") || body=""
    case "$body" in
        *'"status":"ok"'*) HEALTH_JSON="$body"; break ;;
    esac

    if ! pid_alive "$API_PID"; then
        say ""
        say "   The last lines of data/logs/api.log:"
        tail -n 20 "$API_LOG" 2>/dev/null | sed 's/^/   | /'
        die "The course server stopped while it was starting up." \
            "The whole record is in this file: $API_LOG"
    fi

    NOW=$(date +%s)
    if [ $((NOW - START_TS)) -ge "$TIMEOUT_S" ]; then
        die "The course server did not finish starting within 15 minutes." \
            "The reason will be at the end of this file: $API_LOG" \
            "Run $STOP_NAME, then try again."
    fi
    if [ $((NOW - LAST_BEAT)) -ge 15 ]; then
        LAST_BEAT=$NOW
        printf '   still working... %s seconds so far\n' "$((NOW - START_TS))"
    fi
    sleep 2
done
note "The course server is up."

if [ "$MODE" = "single" ]; then
    note "The site is being served by the course server itself."
else
    (
        cd "$ROOT/web" || exit 1
        if [ -f "node_modules/vite/bin/vite.js" ]; then
            VITE_API_TARGET="http://127.0.0.1:${API_PORT}" \
            nohup node node_modules/vite/bin/vite.js preview \
                --host 127.0.0.1 --port "$WEB_PORT" --strictPort \
                >>"$WEB_LOG" 2>&1 </dev/null &
        else
            VITE_API_TARGET="http://127.0.0.1:${API_PORT}" \
            nohup npx vite preview \
                --host 127.0.0.1 --port "$WEB_PORT" --strictPort \
                >>"$WEB_LOG" 2>&1 </dev/null &
        fi
        printf '%s\n' "$!" > "$WEB_PID_FILE"
    )
    WEB_PID=$(read_pid_file "$WEB_PID_FILE") || WEB_PID=""

    WEB_START_TS=$(date +%s)
    while :; do
        if http_get "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1; then
            break
        fi
        if ! pid_alive "$WEB_PID"; then
            say ""
            say "   The last lines of data/logs/web.log:"
            tail -n 20 "$WEB_LOG" 2>/dev/null | sed 's/^/   | /'
            die "The web page server stopped while it was starting up." \
                "The whole record is in this file: $WEB_LOG"
        fi
        NOW=$(date +%s)
        if [ $((NOW - WEB_START_TS)) -ge 120 ]; then
            die "The web pages did not come up within two minutes." \
                "The reason will be at the end of this file: $WEB_LOG"
        fi
        sleep 1
    done
    note "The web pages are up."
fi

# What STOP and ADD_RANGER_KEY read back: which shape is running, and where.
{
    printf 'API_PORT=%s\n' "$API_LISTEN_PORT"
    printf 'WEB_PORT=%s\n' "$WEB_PORT"
} > "$PORTS_FILE"
printf '%s\n' "$MODE" > "$MODE_FILE"

# =============================================================================
# 5. Accounts
# =============================================================================
step "Step 6 of 6 — your sign-in"

BOOTSTRAP_OUT=$(
    cd "$ROOT/server" || exit 1
    DATA_DIR="$DATA_DIR_ABS" \
    CONTENT_DIR="$CONTENT_DIR_ABS" \
    "$UV" run python "$ROOT/ops/bootstrap_accounts.py" 2>&1
)
BOOTSTRAP_STATUS=$?
printf '%s\n' "$BOOTSTRAP_OUT"
if [ "$BOOTSTRAP_STATUS" -ne 0 ]; then
    note "The account set-up did not finish. You can still look around the site, but you may"
    note "not be able to sign in. Run $STOP_NAME, then run this script again."
else
    # The password is printed once, on the run that creates the account. On every
    # run after that the account is simply confirmed, and pointing at a password
    # that is not on the screen would only be confusing.
    case "$BOOTSTRAP_OUT" in
        *"ONE-TIME PASSWORDS"*)
            say "Log in with the email and one-time password above; change it under Account."
            ;;
        *)
            say "Your account is already set up. Sign in with the password you were given."
            ;;
    esac
fi

# =============================================================================
# 6. Finish
# =============================================================================
if [ "$INTERACTIVE" -eq 1 ]; then
    if have xdg-open; then
        xdg-open "$SITE_URL" >/dev/null 2>&1 &
    elif have open; then
        open "$SITE_URL" >/dev/null 2>&1 &
    fi
fi

print_summary
say "Leave this window open or close it — the site keeps running either way."
say ""
exit 0
