# Seed Data

This folder contains initial seed data for the Secondhand Spooks inventory database.

## Files

### inventory.csv
**Snapshot Date**: February 16, 2026

Contains the initial inventory data used to populate the database, including:
- 682 horror books across multiple categories
- Purchase information, pricing, and condition data
- Author details and series information

This is a snapshot of the inventory as of the date above and may not reflect current inventory state after the application has been in use.

## Source

This CSV is exported from Google Sheet **"Inventory Tracker"** (tab: `Inventory`).

## Updating This File

To update with fresh inventory data from Google Sheets:

1. Open Google Sheet "Inventory Tracker"
2. Select the `Inventory` tab
3. Download: `File` → `Download` → `Comma Separated Values (.csv)`
4. Rename downloaded file to `inventory.csv`
5. Replace this file: `mv ~/Downloads/inventory.csv data/seed/inventory.csv`
6. Re-import: `./scripts/reset-and-reimport.sh`

## Usage

To import this seed data into your database:

```bash
# Using the helper script (recommended)
./scripts/reset-and-reimport.sh

# Or manually
docker cp data/seed/inventory.csv ss_backend:/inventory.csv
docker exec ss_backend npm run import-csv
```

## Data Format

The CSV includes the following fields:
- Book Title
- Cleaned? (boolean)
- Author Last Name, First/Middle
- Book Series, Volume #
- Cover Type (Paper, Hard, Audiobook)
- Category (YA/Nostalgia, PFH/Vintage, Mainstream, Comics/Ephemera)
- Condition (Like New, Very Good, Good, Acceptable)
- Date Purchased
- Source, Seller, Order #
- Pricing (ThriftBooks Price, Purchase Price, Our Price, Profit Est.)
- Author Fullname
- Pulled to Read (boolean)
