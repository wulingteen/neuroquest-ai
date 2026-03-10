```shell
#!/usr/bin/env bash

set -euo pipefail

echo "Starting full reset of neuroquest-ai (enhanced version)..."

# Force stop & remove container (regardless of status)
echo "Force removing container neuroquest-ai..."
docker rm -f neuroquest-ai 2>/dev/null || true

# Remove any containers still bound to the volume (safety measure)
echo "Clearing any containers still using the volume..."
docker rm -f $(docker ps -a --filter volume=neuroquest-ai_postgres_data -q) 2>/dev/null || true

# Remove volume (normal then force)
echo "Removing volume neuroquest-ai_postgres_data..."
docker volume rm neuroquest-ai_postgres_data 2>/dev/null || \
docker volume rm --force neuroquest-ai_postgres_data 2>/dev/null || true

# Verify if it's really gone
if docker volume ls -q | grep -q neuroquest-ai_postgres_data; then
    echo "Warning: volume still exists! Please manually check docker volume inspect"
else
    echo "Volume successfully removed ✓"
fi

# Run compose up (background)
echo "Starting docker compose up -d ..."
docker compose up -d --quiet-pull

# Ensure .env exists (DATABASE_URL is required for Prisma)
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ".env created ✓ (please fill in actual values as needed)"
fi

echo "Waiting for 5 seconds..."
sleep 5

echo "Starting..."
npm run dev
```