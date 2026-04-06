#!/usr/bin/env bash
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube
exec node node_modules/next/dist/bin/next dev -p "${PORT:-3000}"
