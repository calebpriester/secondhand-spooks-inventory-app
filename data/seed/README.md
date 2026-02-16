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

## Usage

To import this seed data into your database:

```bash
# Copy CSV to backend container
docker cp data/seed/inventory.csv ss_backend:/inventory.csv

# Import the data
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
