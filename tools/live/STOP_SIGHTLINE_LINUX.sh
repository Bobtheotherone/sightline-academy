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

systemctl --user stop sightline-ngrok.service sightline-web.service sightline-api.service
echo "Stopped Sightline Safety Academy and its public tunnel."
