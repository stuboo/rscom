#!/usr/bin/env bash
# Notify IndexNow (Bing, and thus ChatGPT's index) of changed/new pages.
# Usage: scripts/indexnow-ping.sh <changed-file.md> [more.md ...]
# Pass the list of changed content files; the script reads each file's
# `permalink:` and submits the resulting live URLs. No-op if the list is empty.
set -euo pipefail

HOST="ryanstewart.com"
KEY="7bb6fa6e13e023047d089bee3dc05ea1"          # public by design; served at /$KEY.txt
KEY_LOCATION="https://${HOST}/${KEY}.txt"
ENDPOINT="https://api.indexnow.org/indexnow"

urls=()
for f in "$@"; do
  [[ "$f" == *.md ]] || continue
  [[ -f "$f" ]] || continue                       # skip deletions
  # first permalink line in front matter
  permalink=$(grep -m1 -E '^permalink:' "$f" | sed -E 's/^permalink:[[:space:]]*//; s/^["'\'']//; s/["'\'']$//' || true)
  [[ -n "$permalink" ]] || continue
  [[ "$permalink" == /* ]] || permalink="/$permalink"
  urls+=("https://${HOST}${permalink}")
done

if [[ ${#urls[@]} -eq 0 ]]; then
  echo "IndexNow: no content URLs to submit."; exit 0
fi

# Build JSON url list
list=$(printf '"%s",' "${urls[@]}"); list="[${list%,}]"
payload=$(printf '{"host":"%s","key":"%s","keyLocation":"%s","urlList":%s}' \
  "$HOST" "$KEY" "$KEY_LOCATION" "$list")

echo "IndexNow: submitting ${#urls[@]} URL(s):"; printf '  %s\n' "${urls[@]}"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$ENDPOINT" \
  -H 'Content-Type: application/json; charset=utf-8' --data "$payload")
echo "IndexNow: HTTP $code"
# 200 = accepted, 202 = accepted pending validation. Anything else is a failure.
[[ "$code" == "200" || "$code" == "202" ]]
