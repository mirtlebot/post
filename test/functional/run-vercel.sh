#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
. "$ROOT_DIR/test/functional/common.sh"
LOG_FILE="$(mktemp)"
SERVER_PID=""
PORT="${PORT:-3020}"

cleanup() {
  stop_local_server
}

trap cleanup EXIT

cd "$ROOT_DIR"

echo "[vercel] 启动 vercel dev"
vercel dev --listen "$PORT" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

wait_for_ready "http://localhost:$PORT/admin/" "$LOG_FILE"
echo "[vercel] 服务已就绪"

BASE_URL="http://localhost:$PORT" MODE="vercel" bash "$ROOT_DIR/test/functional/test-functional.sh"
