# 🗄️ Data Management Guide

## Understanding Data Persistence

Your PostgreSQL data is stored in a **Docker named volume** called `postgres_data`. This means your data **automatically persists** between container restarts and even when you run `docker compose down`.

### What KEEPS Your Data:
- ✅ `docker compose stop` - Just stops containers
- ✅ `docker compose restart` - Restarts containers
- ✅ `docker compose down` - Removes containers but KEEPS volume
- ✅ Rebooting your PC - Volume persists on disk
- ✅ Updating code and rebuilding - Volume stays intact

### What DELETES Your Data:
- ❌ `docker compose down -v` - The `-v` flag removes volumes
- ❌ `docker volume rm ss_inventory_app_postgres_data` - Explicit deletion
- ❌ `./scripts/fresh-start.sh` - Complete reset script

## Common Workflows

### Daily Operations (Data Persists)

**Start the app:**
```bash
docker compose up -d
```

**Stop the app when done:**
```bash
docker compose down
# Your data is safe! It's still in the volume
```

**Restart after code changes:**
```bash
docker compose restart backend frontend
# Or rebuild if needed:
docker compose up -d --build
```

### Update Inventory from Google Sheets

**Your Workflow**: Google Sheet "Inventory Tracker" → `Inventory` tab → CSV download

**Full Process**:
1. Open Google Sheet "Inventory Tracker"
2. Select the `Inventory` tab
3. Download: `File` → `Download` → `Comma Separated Values (.csv)`
4. The file downloads as something like `Inventory Tracker - Inventory.csv`
5. Update your local inventory:
   ```bash
   # Backup current database first (important!)
   ./scripts/backup-db.sh

   # Rename and move the downloaded file
   mv ~/Downloads/"Inventory Tracker - Inventory.csv" data/seed/inventory.csv

   # Or if already renamed to inventory.csv
   mv ~/Downloads/inventory.csv data/seed/inventory.csv

   # Re-import the data (clears DB and imports fresh)
   ./scripts/reset-and-reimport.sh
   ```

**Alternative: Manual CSV Import**
```bash
# If you have a CSV elsewhere
./scripts/backup-db.sh
docker cp /path/to/your.csv ss_backend:/inventory.csv
docker exec ss_postgres psql -U spooks -d secondhand_spooks -c "TRUNCATE TABLE books RESTART IDENTITY;"
docker exec ss_backend npm run import-csv
```

### Backup & Restore

**Create a backup:**
```bash
./scripts/backup-db.sh
# Creates: data/backups/backup_YYYYMMDD_HHMMSS.sql
```

**Restore from backup:**
```bash
./scripts/restore-db.sh data/backups/backup_20260216_123456.sql
```

**Manual backup:**
```bash
# Backup to file
docker exec ss_postgres pg_dump -U spooks secondhand_spooks > my_backup.sql

# Restore from file
docker exec -i ss_postgres psql -U spooks secondhand_spooks < my_backup.sql
```

### Complete Fresh Start

**Nuclear option - delete everything and start fresh:**
```bash
./scripts/fresh-start.sh
# This will:
# 1. Delete all containers and volumes
# 2. Rebuild from scratch
# 3. Import seed data
```

## Where is the Data Stored?

**On macOS/Linux:**
```bash
# Find the volume location
docker volume inspect ss_inventory_app_postgres_data

# Typical location:
# /var/lib/docker/volumes/ss_inventory_app_postgres_data/_data
```

**Size of volume:**
```bash
docker system df -v | grep postgres_data
```

## Best Practices for Your PC Setup

### 1. Regular Backups
Create a weekly backup routine:
```bash
# Add to crontab or run manually
./scripts/backup-db.sh
```

### 2. Before Major Changes
Always backup before:
- Importing new CSV data
- Schema changes
- Major code updates

```bash
./scripts/backup-db.sh
# Then make your changes
```

### 3. Keep Backup History
Your backups go to `data/backups/` - consider keeping:
- Last 7 daily backups
- Last 4 weekly backups
- Monthly backups

### 4. Startup Routine
```bash
# Normal daily startup (data persists)
docker compose up -d

# If Docker was updated or PC rebooted, just start normally
docker compose up -d
# Your data is still there!
```

### 5. Shutdown Routine
```bash
# Safe shutdown (keeps data)
docker compose down

# DO NOT use -v flag unless you want to delete everything!
```

## Migration Scenarios

### Scenario 1: Updated CSV with New Books (Append)
If you want to ADD books without deleting existing ones:
```bash
# This would require a custom script - not built yet
# For now, use manual SQL or the UI to add books
```

### Scenario 2: Complete Inventory Refresh
When you want to start fresh with a new CSV:
```bash
# Backup first!
./scripts/backup-db.sh

# Clear and reimport
./scripts/reset-and-reimport.sh
```

### Scenario 3: Moving to a Different PC
```bash
# On old PC: Create backup
./scripts/backup-db.sh

# Copy backup file to new PC
# On new PC: Setup app, then restore
docker compose up -d
./scripts/restore-db.sh data/backups/backup_20260216_123456.sql
```

## Volume Management Commands

```bash
# List all volumes
docker volume ls

# Inspect the postgres volume
docker volume inspect ss_inventory_app_postgres_data

# See volume usage
docker system df -v

# Manually delete volume (DANGER!)
docker compose down
docker volume rm ss_inventory_app_postgres_data
```

## Summary

**TL;DR:**
- Your data **automatically persists** with the current setup
- Use `docker compose down` safely - data stays
- Only `docker compose down -v` deletes data
- Use `./scripts/backup-db.sh` before major changes
- Use `./scripts/reset-and-reimport.sh` to refresh from CSV
