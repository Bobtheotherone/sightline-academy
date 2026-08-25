#!/bin/sh
#
# DEVELOPER'S LIVE-TUNNEL SCRIPT — not the one to hand to anybody else.
#
# This starts/stops the PUBLIC copy of Sightline that runs from Rad's machine:
# three systemd --user units (api, web, ngrok) plus the ngrok tunnel that puts
# it on the internet. It only works on that machine, with those units installed.
#
# To run the site LOCALLY on your own computer — which is what a professor or a
# student worker wants — use START_SIGHTLINE.sh (or START_SIGHTLINE.command /
# START_SIGHTLINE.bat) in the top folder of this project instead. That one
# needs no systemd, no ngrok, and no set-up beyond a double-click.
#
set -eu

# The project root is two levels up now that this script lives in tools/live/,
# so SIGHTLINE_LINK.txt is still written where it always was.
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
public_url="https://unfixable-escapade-democrat.ngrok-free.dev"

systemctl --user start sightline-api.service sightline-web.service sightline-ngrok.service

attempts=0
until curl -fsS http://127.0.0.1:8080/api/meta/health >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 120 ]; then
        echo "Sightline did not start. Run: journalctl --user -u sightline-api.service -n 80" >&2
        exit 1
    fi
    sleep 1
done

attempts=0
until curl -fsS http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -Fq "$public_url"; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then
        echo "The tunnel did not start. Run: journalctl --user -u sightline-ngrok.service -n 50" >&2
        exit 1
    fi
    sleep 1
done

curl -fsS -H 'ngrok-skip-browser-warning: 1' "$public_url/api/meta/health" >/dev/null
printf '%s\n' "$public_url" >"$project_dir/SIGHTLINE_LINK.txt"

printf '\nSightline Safety Academy is live.\n'
printf 'Public site: %s\n' "$public_url"
printf 'Keep this computer powered on, awake, and connected to the internet.\n'

if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$public_url" >/dev/null 2>&1 || true
fi
