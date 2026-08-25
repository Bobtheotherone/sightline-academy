#!/bin/bash
# macOS double-click wrapper. Runs ADD_RANGER_KEY.sh from this same folder.
cd "$(dirname "$0")" || exit 1
/bin/bash "./ADD_RANGER_KEY.sh"
status=$?
printf '\n'
printf 'Press Return to close this window.\n'
read -r _
exit $status
