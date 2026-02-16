# Management Scripts

Helper scripts for database and inventory management.

## Scripts

### 📦 backup-db.sh
**Purpose**: Create a timestamped backup of your PostgreSQL database

**Usage**:
```bash
./scripts/backup-db.sh
```

**Output**: Creates `data/backups/backup_YYYYMMDD_HHMMSS.sql`

**When to use**:
- Before importing new inventory
- Weekly for data safety
- Before making major changes

---

### 🔄 restore-db.sh
**Purpose**: Restore database from a backup file

**Usage**:
```bash
./scripts/restore-db.sh data/backups/backup_20260216_124503.sql
```

**What it does**:
1. Prompts for confirmation
2. Clears current books table
3. Restores data from backup
4. Shows final book count

**When to use**:
- Recover from accidental deletion
- Roll back to previous state
- Restore after testing

---

### ♻️ reset-and-reimport.sh
**Purpose**: Clear database and re-import from seed CSV

**Usage**:
```bash
./scripts/reset-and-reimport.sh
```

**What it does**:
1. Prompts for confirmation
2. Truncates books table
3. Imports from `/inventory.csv` (mounted from `data/seed/inventory.csv`)
4. Shows import results

**When to use**:
- You've updated data/seed/inventory.csv with new inventory
- Want to start fresh with clean data
- Testing import process

---

### 🆕 fresh-start.sh
**Purpose**: Complete teardown and rebuild (DELETES ALL DATA!)

**Usage**:
```bash
./scripts/fresh-start.sh
```

**What it does**:
1. Prompts for confirmation (safety!)
2. Runs `docker compose down -v` (deletes volume!)
3. Runs `docker compose up -d` (fresh containers)
4. Imports seed data
5. Shows completion status

**When to use**:
- Schema changes that require fresh database
- Corrupted database state
- Testing deployment from scratch
- ⚠️ ONLY when you want to lose all current data!

---

## Safety Features

All destructive scripts include:
- ⚠️ Warning messages
- Confirmation prompts (must type "yes")
- Success/failure reporting

## Tested Scenarios

✅ All scripts validated:
- backup-db.sh: Creates 140KB backup successfully
- restore-db.sh: Shows help, prompts correctly, restores 682 books
- reset-and-reimport.sh: Clears and reimports 682 books with 0 failures
- fresh-start.sh: Prompts correctly (not fully tested to avoid data loss)

## Backup Best Practices

1. **Before major operations**: Always run `./scripts/backup-db.sh`
2. **Regular backups**: Weekly or before each booth event
3. **Keep backup history**: Don't delete old backups immediately
4. **Test restores**: Periodically verify backups are valid
