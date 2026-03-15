#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-3022}"
REDIS_DB="${REDIS_DB:-10}"
SECRET_KEY="${SECRET_KEY:-demo}"
MODE="api-local"
. "$ROOT_DIR/test/functional/common.sh"

cleanup() {
  stop_local_server
}

trap cleanup EXIT

cd "$ROOT_DIR"
start_local_server

BASE_URL="http://localhost:$PORT" \
MODE="$MODE" \
SECRET_KEY="$SECRET_KEY" \
REDIS_DB="$REDIS_DB" \
bash "$ROOT_DIR/test/functional/smoke-api.sh"
