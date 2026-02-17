# 🎃 Secondhand Spooks Inventory App

**Secondhand Spooks** is a horror-only used book booth specializing in vintage paperbacks, cult classics, and nostalgic nightmares. We focus on the gritty, lurid era of "Paperbacks from Hell" horror, including Zebra, Leisure, Tor Skull, Dell Abyss, and other iconic imprints, alongside essential mainstream names like Stephen King and Clive Barker. You will also find carefully curated YA terror, retro horror nostalgia, and select comics and ephemera that fit the macabre mood.

We do not sell general fiction. Every title on the table earns its place through atmosphere, aesthetics, or outright depravity.

---

## 📚 About This App

This full-stack inventory management system helps track and analyze our horror book collection. Built from scratch with React, Node.js, and PostgreSQL, it provides a modern web interface for managing your inventory.

**Current Status**: ✅ **Fully Operational**
- 682 books successfully imported from CSV
- Dashboard with real-time statistics
- Full inventory browsing with search and filters
- Docker-based deployment ready to use

### Key Features

- **Inventory Management**: View, search, and filter all books
- **Add/Edit Books**: Create new books and edit existing ones through the UI
- **Quick Cleaned Toggle**: Checkbox to mark books as cleaned directly from the inventory table
- **Analytics Dashboard**: Track inventory value, profit estimates, and category breakdowns
- **CSV Import**: Easily import existing inventory data
- **Author Insights**: See top authors and series in the collection
- **Dark Horror Theme**: Custom-designed UI matching the Secondhand Spooks aesthetic
- **Mobile Responsive**: Full mobile support with card-based inventory view, stacked filters, and touch-friendly controls
- **Google Books Integration**: Auto-enrich books with cover images, ratings, descriptions, genres, ISBNs, and more via Google Books API. Batch enrichment tool on Dashboard. Custom search by ISBN/title/author for tricky matches. Duplicates share enrichment data (no wasted API calls). Normalized schema supports adding future enrichment sources (Hardcover, Open Library).
- **Sales Tracking**: Mark books as sold (single or bulk), track sale price, date, event, and payment method (Cash/Card). Transaction grouping ties books from the same purchase together. Dedicated Sales page with transaction-centric view, cover thumbnails, inline editing, and revert support. Dashboard sales stats with event breakdowns.
- **Bulk Price Management**: Select multiple books and set prices in bulk (per-book or flat price for all). Filter to show books missing prices. Dashboard widget shows how many books need pricing. Auto-calculates profit estimates.
- **Pulled to Read & Kept Books**: Pull books from inventory to read personally, then keep them permanently or return them. Pulled books show a READING badge; kept books are removed from active inventory and value calculations. Filter by Pulled to Read or Kept in the stock status dropdown. Dashboard tracks reading stats (Ghostly Blue accent).

### Planned Features

See [GitHub Issues](https://github.com/calebpriester/secondhand-spooks-inventory-app/issues) for upcoming features:
- #4: Enhanced analytics and insights

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Deployment**: Docker + Docker Compose (local), Railway (production)

## 🌐 Live App

**Production**: https://secondhand-spooks-inventory-app-production.up.railway.app/

Hosted on Railway (free tier). Auto-deploys from the `main` branch. The backend serves the frontend as static files, with PostgreSQL managed by Railway.

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development without Docker)
- PostgreSQL 16+ (for local development without Docker)

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   cd ss_inventory_app
   ```

2. **Start all services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Backend API on port 3001
   - Frontend app on port 3000

3. **Import your inventory data**
   ```bash
   # The seed data is automatically mounted, just import it
   docker exec ss_backend npm run import-csv

   # Or to use a different CSV file
   docker cp your_inventory.csv ss_backend:/inventory.csv
   docker exec ss_backend npm run import-csv
   ```

   Note: The repository includes seed data from February 16, 2026 in `data/seed/inventory.csv`

4. **Access the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api
   - Database: `docker exec -it ss_postgres psql -U spooks -d secondhand_spooks`

### Option 2: Local Development

#### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Initialize database
psql -U your_username -d secondhand_spooks -f src/config/schema.sql

# Import CSV data
npm run import-csv

# Start backend server
npm run dev
```

Backend will run on http://localhost:3001

#### Frontend Setup

```bash
cd frontend
npm install

# Start frontend development server
npm run dev
```

Frontend will run on http://localhost:3000

## 📊 Features

### Dashboard
- **Inventory Statistics**: Total books count, inventory value, total cost, and estimated profit
- **Category Breakdown**: View distribution across YA/Nostalgia, PFH/Vintage, Mainstream, and Comics/Ephemera
- **Condition Analysis**: Track book conditions (Like New, Very Good, Good, Acceptable)
- **Top 10 Authors**: See your most collected authors by book count and total value

### Inventory View
- **Full Inventory Table**: Browse all 682+ books in your collection
- **Advanced Search**: Search by title, author name, or series
- **Smart Filters**: Filter by category, condition, and cover type (Paper, Hard, Audiobook)
- **Price Tracking**: View purchase prices, retail prices, and profit margins
- **Status Flags**: Track book cleaning status and personal reading list

## 🗄 Database Schema

The app tracks comprehensive book information:
- **Book Details**: Title, Author (First/Middle/Last), Series, Volume Number
- **Categories**: YA/Nostalgia, PFH/Vintage, Mainstream, Comics/Ephemera
- **Physical Details**: Cover Type (Paperback, Hardcover, Audiobook), Condition
- **Purchase Info**: Date purchased, source, seller, order number
- **Pricing**: Purchase price, your price, profit estimate
- **Status Flags**: Cleaned status, pulled to read flag

## 📝 API Endpoints

- `GET /api/books` - Get all books (supports filtering, including `missing_price=true`)
- `GET /api/books/:id` - Get single book
- `GET /api/books/stats` - Get inventory statistics (includes `books_missing_price`)
- `POST /api/books` - Create new book
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book
- `POST /api/books/bulk-price` - Set prices on multiple books at once
- `POST /api/books/clear-prices` - Clear prices on multiple books

## 🔧 Development

### Backend Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run import-csv` - Import inventory from CSV

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🐳 Docker Commands

> **📦 Data Persistence:** Your PostgreSQL data persists between runs! See [docs/DATA_MANAGEMENT.md](docs/DATA_MANAGEMENT.md) for details on backups, restores, and data management.

```bash
# Start all services (data persists from previous runs)
docker compose up -d

# Stop all services (data stays safe in volume)
docker compose down

# ⚠️ DANGER: This deletes all data!
docker compose down -v

# View logs (all services)
docker compose logs -f

# View logs (specific service)
docker compose logs -f frontend
docker compose logs -f backend

# Rebuild containers after code changes
docker compose up -d --build

# Restart a specific service
docker compose restart backend

# Access backend container shell
docker exec -it ss_backend sh

# Access database
docker exec -it ss_postgres psql -U spooks -d secondhand_spooks

# Re-import seed data (from data/seed/inventory.csv)
docker exec ss_backend npm run import-csv

# Or import a custom CSV
docker cp your_inventory.csv ss_backend:/inventory.csv
docker exec ss_backend npm run import-csv

# Check container status
docker compose ps
```

## 🔧 Troubleshooting

### Frontend not loading
- Ensure Docker Desktop is running
- Check that all containers are up: `docker compose ps`
- View frontend logs: `docker compose logs -f frontend`
- Try restarting: `docker compose restart frontend`

### Database connection issues
- Verify PostgreSQL is healthy: `docker compose ps` (should show "healthy")
- Check backend logs: `docker compose logs -f backend`
- Ensure the database initialized: `docker exec ss_postgres psql -U spooks -d secondhand_spooks -c '\dt'`

### CSV import fails
- Verify CSV file exists: `ls -la inventory.csv`
- Check file was copied to container: `docker exec ss_backend ls -la /inventory.csv`
- View import errors: `docker exec ss_backend npm run import-csv`

### Port conflicts
If ports 3000, 3001, or 5432 are already in use:
- Edit `docker-compose.yml` to change port mappings
- Example: `"3002:3000"` to use port 3002 on your host

### Hot reload not working
- Ensure volume mounts are correct in `docker-compose.yml`
- Try rebuilding: `docker compose up -d --build`
- On some systems, file watching may not work - restart containers after changes

## 📂 Project Structure

```
ss_inventory_app/
├── backend/
│   ├── src/
│   │   ├── config/         # Database config and schema
│   │   ├── models/         # TypeScript interfaces
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities (CSV import, DB init)
│   ├── Dockerfile          # Local dev Dockerfile
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── logo.png        # Secondhand Spooks logo
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   ├── Dockerfile          # Local dev Dockerfile
│   └── package.json
├── data/
│   ├── seed/
│   │   ├── inventory.csv   # Seed inventory data (Feb 16, 2026)
│   │   └── README.md       # Seed data documentation
│   └── backups/            # Database backups (created by scripts)
├── docs/
│   └── DATA_MANAGEMENT.md  # Data persistence & backup guide
├── scripts/
│   ├── backup-db.sh        # Create database backup
│   ├── restore-db.sh       # Restore from backup
│   ├── reset-and-reimport.sh  # Clear DB and reimport CSV
│   ├── fresh-start.sh      # Complete teardown and rebuild
│   └── README.md           # Scripts documentation
├── Dockerfile.railway      # Production multi-stage build (Railway)
├── railway.toml            # Railway deployment config
├── docker-compose.yml      # Local dev orchestration
└── README.md
```

## 🎨 Customization

The app uses a dark horror-themed design with official Secondhand Spooks brand colors:
- Primary accent (Ghostly Foam Green): `#00FFA3`
- Text (Paper White): `#FFFFDC` (accents), `#e8e8e0` (body)
- Background (Inky Black): `#121010`
- Surface: `#1E1B1C`

Edit the CSS variables in [frontend/src/App.css](frontend/src/App.css) to customize.

### Supported Categories
- **YA/Nostalgia**: Young adult horror and nostalgic reads (Purple badge)
- **PFH/Vintage**: Paperbacks from Hell and vintage horror (Red badge)
- **Mainstream**: Stephen King, Clive Barker, etc. (Green badge)
- **Comics/Ephemera**: Comics and horror memorabilia (Orange badge)

### Supported Cover Types
- **Paper**: Paperback books
- **Hard**: Hardcover books
- **Audiobook**: Audio format books

## 📊 Current Stats

Based on the imported inventory:
- **Total Books**: 682
- **Categories**: Mainstream (280), YA/Nostalgia (224), PFH/Vintage (176), Comics/Ephemera (2)
- **Total Investment**: $1,217.58
- **Conditions**: Good, Very Good, Like New, Acceptable

## 🚀 Quick Reference

### Daily Use
```bash
# Start the app
docker compose up -d

# Open in browser
open http://localhost:3000

# Stop when done
docker compose down
```

### Backup & Restore
```bash
# Create a backup
./scripts/backup-db.sh

# Restore from backup
./scripts/restore-db.sh data/backups/backup_20260216_123456.sql

# Clear and re-import from CSV
./scripts/reset-and-reimport.sh
```

### Update Inventory from Google Sheets

**Source**: Google Sheet "Inventory Tracker" → `Inventory` tab

**Steps**:
1. Open your Google Sheet "Inventory Tracker"
2. Go to the `Inventory` tab
3. Download as CSV: `File` → `Download` → `Comma Separated Values (.csv)`
4. Rename the downloaded file to `inventory.csv`
5. Replace the seed file:
   ```bash
   # Backup current database first!
   ./scripts/backup-db.sh

   # Move new CSV to seed location
   mv ~/Downloads/inventory.csv data/seed/inventory.csv

   # Re-import the data
   ./scripts/reset-and-reimport.sh
   ```

**Note**: The reset-and-reimport script will clear the database and import fresh data from `data/seed/inventory.csv`

### Development
```bash
# Watch logs while developing
docker compose logs -f

# Restart after major changes
docker compose restart backend frontend
```

## 🔮 Future Development

This project is actively developed. See [open issues](https://github.com/calebpriester/secondhand-spooks-inventory-app/issues) for planned features.

### Contributing

When working on new features:
1. Review the [CLAUDE.md](CLAUDE.md) file for project context
2. Check relevant GitHub issue for requirements
3. Create a new branch (never commit to main directly)
4. Test thoroughly before committing
5. Update documentation for user-facing changes

### Roadmap Priority

**Phase 1 - Essential Operations** ✅ Complete
- ~~Issue #1: Add/edit books UI~~ ✅ Done
- ~~Issue #3: Price management tools~~ ✅ Done

**Phase 2 - Business Intelligence**
- ~~Issue #2: Sales tracking~~ ✅ Done
- Issue #4: Enhanced analytics

**Phase 3 - User Experience**
- ~~Issue #5: Mobile responsive design~~ ✅ Done

## 📄 License

MIT

---

**Happy cataloging! 👻📖**