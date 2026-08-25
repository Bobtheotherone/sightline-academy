#!/bin/bash
# macOS double-click wrapper. Runs STOP_SIGHTLINE.sh from this same folder.
cd "$(dirname "$0")" || exit 1
/bin/bash "./STOP_SIGHTLINE.sh"
status=$?
printf '\n'
printf 'Press Return to close this window.\n'
read -r _
exit $status
