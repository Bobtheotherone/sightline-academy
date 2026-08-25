#!/usr/bin/env bash
# Build the "unzip and double-click" package: the tracked source tree with the
# real illustrations (not LFS pointers), the prebuilt web/dist so no Node.js is
# needed, and the launchers. Run from anywhere; the zip lands in dist-release/.
#
#   tools/make-release-zip.sh            -> dist-release/Sightline-Academy.zip
#   tools/make-release-zip.sh v1.2       -> dist-release/Sightline-Academy-v1.2.zip
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
tag=${1:-}
name="Sightline-Academy${tag:+-$tag}"
out="$root/dist-release"
stage="$out/$name"

cd "$root"
if git lfs ls-files 2>/dev/null | grep -q '^[0-9a-f]* -' ; then
  echo "Some illustrations are still LFS pointers; run: git lfs pull" >&2; exit 1
fi
echo "Building the site (needs Node 20+; the package itself will not)…"
( cd web && npm run build >/dev/null )

rm -rf "$stage" && mkdir -p "$stage"
# Tracked files only (so nothing local or secret rides along), then the build.
git ls-files -z | grep -zv -E '^(artifacts/|artgen/|output/|qa/|\.github/|\.claude/)' \
  | tar --null -T - -cf - | tar -xf - -C "$stage"
mkdir -p "$stage/web" && cp -R web/dist "$stage/web/dist"
cp tools/README-FIRST.txt "$stage/READ ME FIRST.txt"
chmod +x "$stage"/START_SIGHTLINE.sh "$stage"/START_SIGHTLINE.command "$stage"/STOP_SIGHTLINE.sh \
         "$stage"/STOP_SIGHTLINE.command "$stage"/ADD_RANGER_KEY.sh "$stage"/ADD_RANGER_KEY.command 2>/dev/null || true

rm -f "$out/$name.zip"
( cd "$out" && zip -qr "$name.zip" "$name" )
rm -rf "$stage"
echo "Wrote $out/$name.zip ($(du -h "$out/$name.zip" | cut -f1))"
