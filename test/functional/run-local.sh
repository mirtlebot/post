#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
. "$ROOT_DIR/test/functional/common.sh"
LOG_FILE="$(mktemp)"
SERVER_PID=""
PORT="${PORT:-3000}"

cleanup() {
  stop_local_server
}

trap cleanup EXIT

cd "$ROOT_DIR"

echo "[local] 启动 npm start"
PORT="$PORT" npm start >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

wait_for_ready "http://localhost:$PORT/admin" "$LOG_FILE" 60
echo "[local] 服务已就绪"

BASE_URL="http://localhost:$PORT" MODE="local" bash "$ROOT_DIR/test/functional/test-functional.sh"
