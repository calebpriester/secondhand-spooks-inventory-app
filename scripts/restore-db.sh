#!/bin/bash
# Restore PostgreSQL database from a backup file

if [ -z "$1" ]; then
    echo "Usage: ./scripts/restore-db.sh <backup-file.sql>"
    echo ""
    echo "Available backups:"
    ls -lh data/backups/*.sql 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will replace all current data!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Clearing existing data..."
docker exec ss_postgres psql -U spooks -d secondhand_spooks -c "TRUNCATE TABLE books RESTART IDENTITY CASCADE;" 2>&1 | grep -v "NOTICE"

echo "Restoring database from $BACKUP_FILE..."
docker exec -i ss_postgres psql -U spooks secondhand_spooks < "$BACKUP_FILE" 2>&1 | grep -v "ERROR" | grep -v "already exists"

BOOK_COUNT=$(docker exec ss_postgres psql -U spooks -d secondhand_spooks -t -c "SELECT COUNT(*) FROM books;")

echo "✅ Database restored successfully!"
echo "📚 Books in database: $BOOK_COUNT"
