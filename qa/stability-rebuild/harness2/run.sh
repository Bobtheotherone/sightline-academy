#!/bin/bash
set -e
DIR=/tmp/claude-1000/-home-rnmercado-Projects-Sightline-Saftey-Academy/10d57e09-47dc-4d87-810c-8a78747c1de4/scratchpad/harness2
WEB=/home/rnmercado/Projects/Sightline_Saftey_Academy/web
export PATH="/usr/lib/chatgpt/resources/cua_node/bin:$PATH"
cd "$WEB"
"$WEB/node_modules/.bin/esbuild" "$DIR/entry.tsx" \
  --bundle --platform=node --format=cjs --jsx=automatic \
  --loader:.png=dataurl --outfile="$DIR/bundle.cjs" --log-level=warning
node "$DIR/bundle.cjs" > "$DIR/page.html"
node "$DIR/shot.mjs"
ls -la "$DIR/out" | head -20
