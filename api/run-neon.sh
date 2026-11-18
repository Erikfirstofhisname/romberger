#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Missing api/.env — copy .env.example and fill in Neon credentials."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

./gradlew bootRun
