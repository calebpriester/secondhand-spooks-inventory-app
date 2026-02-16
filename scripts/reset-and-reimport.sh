#!/bin/bash
# Clear database and re-import from CSV

echo "⚠️  WARNING: This will delete ALL books in the database!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Reset cancelled."
    exit 0
fi

echo "Clearing database..."
docker exec ss_postgres psql -U spooks -d secondhand_spooks -c "TRUNCATE TABLE books RESTART IDENTITY;"

if [ $? -ne 0 ]; then
    echo "❌ Failed to clear database!"
    exit 1
fi

echo "Importing CSV data..."
docker exec ss_backend npm run import-csv

echo "✅ Database reset and re-imported successfully!"
