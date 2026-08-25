#!/bin/bash
# macOS double-click wrapper. Runs START_SIGHTLINE.sh from this same folder.
# Everything that actually happens is in START_SIGHTLINE.sh — read that one.
cd "$(dirname "$0")" || exit 1
/bin/bash "./START_SIGHTLINE.sh"
status=$?
printf '\n'
printf 'You can close this window now. The site keeps running.\n'
printf 'Press Return to close it.\n'
read -r _
exit $status
