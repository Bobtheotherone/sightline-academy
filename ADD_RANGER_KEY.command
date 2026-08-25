#!/bin/bash
# macOS double-click wrapper. Runs ADD_RANGER_KEY.sh from this same folder.
#
# If macOS says this "cannot be opened because Apple cannot check it for
# malicious software", right-click it, choose Open, then Open again. That is
# the download mark macOS puts on files from a zip, not a fault in this file.
# Starting the site once with START_SIGHTLINE clears the mark from the whole
# folder, and this opens on a plain double-click afterwards.
cd "$(dirname "$0")" || exit 1
/bin/bash "./ADD_RANGER_KEY.sh"
status=$?
printf '\n'
printf 'Press Return to close this window.\n'
read -r _
exit $status
