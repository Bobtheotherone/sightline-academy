#!/bin/bash
# macOS double-click wrapper. Runs START_SIGHTLINE.sh from this same folder.
# Everything that actually happens is in START_SIGHTLINE.sh — read that one.
#
# FIRST TIME ON macOS, YOU MAY SEE THIS
#   "START_SIGHTLINE.command cannot be opened because Apple cannot check it
#    for malicious software."
# Nothing is wrong. macOS marks every file that comes out of a downloaded zip,
# and that mark is what it is complaining about.
#
# The fix, once:
#   Right-click (or Control-click) START_SIGHTLINE.command, choose Open, then
#   choose Open again in the box that appears.
#
# After that this script removes the mark from the whole project folder, so
# STOP_SIGHTLINE and ADD_RANGER_KEY open on a plain double-click from then on.
cd "$(dirname "$0")" || exit 1
xattr -dr com.apple.quarantine "$(pwd)" 2>/dev/null || true
/bin/bash "./START_SIGHTLINE.sh"
status=$?
printf '\n'
printf 'You can close this window now. The site keeps running.\n'
printf 'Press Return to close it.\n'
read -r _
exit $status
