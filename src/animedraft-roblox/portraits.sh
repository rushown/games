#!/bin/bash
# One command: shrink portraits, upload them to Roblox, wire them into the game, rebuild the place files.
#   ROBLOX_API_KEY=xxxx ROBLOX_USER_ID=1234567 ./portraits.sh
# (Only upload images you have the rights to use. Setup steps: top of scripts/upload-portraits.py)
set -e
cd "$(dirname "$0")"
python3 scripts/upload-portraits.py
python3 scripts/build-place.py
echo
echo "Now update the live game: open it in Studio, replace Loading/Shared/Server/Client with build/*.rbxmx"
echo "(or open build/AnimeDraft.rbxlx), then File -> Publish. Details: README.md, 'Updating the live game'."
