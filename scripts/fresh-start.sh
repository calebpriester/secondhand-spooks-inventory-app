#!/bin/bash
# Complete fresh start: tear down everything and rebuild from scratch

echo "⚠️  WARNING: This will DELETE ALL DATA including the database volume!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Fresh start cancelled."
    exit 0
fi

echo "Tearing down all containers and volumes..."
docker compose down -v

echo "Starting fresh containers..."
docker compose up -d

echo "Waiting for database to be ready..."
sleep 10

echo "Importing seed data..."
docker exec ss_backend npm run import-csv

echo "✅ Fresh start complete!"
echo "🎃 App running at http://localhost:3000"
