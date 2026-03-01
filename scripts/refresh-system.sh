#!/usr/bin/env bash

set -euo pipefail

echo "開始執行 neuroquest-ai 完整重置（加強版）..."

# 強制停止 & 移除容器（不管有沒有在跑）
echo "強制移除容器 neuroquest-ai ..."
docker rm -f neuroquest-ai 2>/dev/null || true

# 移除任何可能還綁定的容器（保險）
echo "清除任何還在使用該 volume 的容器..."
docker rm -f $(docker ps -a --filter volume=neuroquest-ai_postgres_data -q) 2>/dev/null || true

# 移除 volume（先普通再強制）
echo "移除 volume neuroquest-ai_postgres_data ..."
docker volume rm neuroquest-ai_postgres_data 2>/dev/null || \
docker volume rm --force neuroquest-ai_postgres_data 2>/dev/null || true

# 確認是否真的沒了
if docker volume ls -q | grep -q neuroquest-ai_postgres_data; then
    echo "警告：volume 還是存在！請手動檢查 docker volume inspect"
else
    echo "volume 已成功移除 ✓"
fi

# 執行一次 compose up-down 循環（背景）
echo "啟動 docker compose up -d ..."
docker compose up -d --quiet-pull

echo "等待 5 秒..."
sleep 5

echo "啟動.."
npm run dev