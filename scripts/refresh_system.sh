#!/usr/bin/env bash

set -euo pipefail

echo "開始執行 neuroquest-ai 重置流程..."

# 1. 關閉正在運行的 neuroquest-ai 容器
echo "正在停止容器 neuroquest-ai ..."
docker stop neuroquest-ai >/dev/null 2>&1 || true

# 2. 移除容器 neuroquest-ai
echo "正在移除容器 neuroquest-ai ..."
docker rm neuroquest-ai >/dev/null 2>&1 || true

# 3. 移除 volume neuroquest-ai_postgres_data
echo "正在刪除 volume neuroquest-ai_postgres_data ..."
docker volume rm neuroquest-ai_postgres_data >/dev/null 2>&1 || true

# 4. 在當前目錄執行 docker compose up (背景執行)
echo "啟動 docker compose up (detached mode) ..."
docker compose up -d --quiet-pull

# 5. 等待 8 秒
echo "等待 5 秒讓服務啟動..."
sleep 5

# 7. run
echo "開啟系統 ..."
npm run dev