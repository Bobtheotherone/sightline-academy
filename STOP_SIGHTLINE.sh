#!/bin/bash
# =============================================================================
#  Sightline Safety Academy — stop the copy running on THIS computer.
#
#  Double-click STOP_SIGHTLINE.command (macOS) or run ./STOP_SIGHTLINE.sh
#  (Linux). It only stops the two programs that START_SIGHTLINE started here.
#  It leaves your course material, your account and your progress untouched,
#  and it does not affect the live site on the internet.
# =============================================================================

set -u

ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT" || exit 1

RUN_DIR="$ROOT/data/run"

say()  { printf '%s\n' "$*"; }
note() { printf '   %s\n' "$*"; }

have() { command -v "$1" >/dev/null 2>&1; }

children_of() {
    if have pgrep; then
        pgrep -P "$1" 2>/dev/null
    else
        ps -A -o pid=,ppid= 2>/dev/null | awk -v p="$1" '$2 == p { print $1 }'
    fi
}

# List a process and everything it started, deepest last. Collected BEFORE
# anything is killed, because children are re-parented the moment a parent goes.
collect_tree() {
    printf '%s\n' "$1"
    for _child in $(children_of "$1"); do
        collect_tree "$_child"
    done
}

# A safety catch: a leftover id file could name a process number that the
# computer has since handed to something completely unrelated. Only ever stop
# something that looks like part of Sightline.
looks_like_ours() {
    _cmd=$(ps -o command= -p "$1" 2>/dev/null || ps -o args= -p "$1" 2>/dev/null)
    case "$_cmd" in
        *uvicorn*|*uv\ run*|*vite*|*node*|*python*) return 0 ;;
        *) return 1 ;;
    esac
}

stop_one() {
    _file="$RUN_DIR/$1"
    _label="$2"

    if [ ! -f "$_file" ]; then
        note "$_label was not running."
        return 0
    fi

    _pid=$(tr -dc '0-9' < "$_file")
    rm -f "$_file"

    if [ -z "$_pid" ] || ! kill -0 "$_pid" 2>/dev/null; then
        note "$_label was not running."
        return 0
    fi

    if ! looks_like_ours "$_pid"; then
        note "$_label was not running any more; left the other program alone."
        return 0
    fi

    _tree=$(collect_tree "$_pid")

    for _p in $_tree; do kill "$_p" 2>/dev/null; done

    _waited=0
    while [ "$_waited" -lt 10 ]; do
        _left=0
        for _p in $_tree; do
            if kill -0 "$_p" 2>/dev/null; then _left=1; fi
        done
        [ "$_left" -eq 0 ] && break
        sleep 1
        _waited=$((_waited + 1))
    done

    for _p in $_tree; do
        if kill -0 "$_p" 2>/dev/null; then kill -9 "$_p" 2>/dev/null; fi
    done

    note "Stopped $_label."
    return 0
}

say ""
say "Sightline Safety Academy — stopping"
say "-----------------------------------"

# START records which shape it used. In "single" there is one program serving
# both the pages and the course; in "two" there are the pages and the course
# server. Looking for a second program that was never started would only
# produce a puzzling line about something that "was not running".
RUN_MODE=""
if [ -f "$RUN_DIR/mode" ]; then
    RUN_MODE=$(tr -dc 'a-z' < "$RUN_DIR/mode" 2>/dev/null) || RUN_MODE=""
fi

if [ "$RUN_MODE" = "single" ]; then
    stop_one "api.pid" "the site"
else
    stop_one "web.pid" "the web pages"
    stop_one "api.pid" "the course server"
fi

rm -f "$RUN_DIR/ports.env" "$RUN_DIR/mode"

say ""
say "Sightline is stopped on this computer."
say "Your course material, your account and your progress are all still in place."
say "Start it again any time with START_SIGHTLINE."
say ""
exit 0
