<div align="center">

# Secondhand Spooks

**Revived Reads for Restless Souls**

*A horror-only used book booth specializing in vintage paperbacks, cult classics, and nostalgic nightmares.*

[![Live App](https://img.shields.io/badge/Live_App-Railway-00FFA3?style=for-the-badge&logo=railway&logoColor=white)](https://secondhand-spooks-inventory-app-production.up.railway.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-FFFFDC?style=for-the-badge)](LICENSE)

</div>

---

We focus on the gritty, lurid era of **"Paperbacks from Hell"** horror — Zebra, Leisure, Tor Skull, Dell Abyss, and other iconic imprints — alongside essential mainstream names like Stephen King and Clive Barker. You will also find carefully curated YA terror, retro horror nostalgia, and select comics and ephemera that fit the macabre mood.

We do not sell general fiction. Every title on the table earns its place through atmosphere, aesthetics, or outright depravity.

---

## About the App

This is the full-stack inventory management system that powers Secondhand Spooks. It tracks purchases, pricing, sales, and analytics for our horror book collection — built from scratch with a dark theme to match.

> **Live at:** https://secondhand-spooks-inventory-app-production.up.railway.app/

### Features

| Feature | Description |
|---|---|
| **Inventory Management** | Browse, search, and filter 682+ books. Card view on mobile, table on desktop. |
| **Sales Tracking** | Single and bulk sales with transaction grouping, event tagging, payment method (Cash/Card), and a dedicated Sales page with inline editing and revert. |
| **Bulk Pricing** | Set prices on multiple books at once. Per-book or flat pricing, auto-calculated profit estimates, below-cost warnings. |
| **Google Books Enrichment** | Cover images, ratings, descriptions, genres, and ISBNs pulled automatically. Batch enrichment, custom search, duplicate-aware. |
| **Gemini AI Tagging** | Sub-genre classification and pacing analysis via Gemini 2.5 Flash. Configurable sub-genre list with batch processing. |
| **Blind Date with a Book** | Manage wrapped mystery books for events. AI-generated blurbs, candidate scoring, batch processing. |
| **Pulled to Read / Kept** | Track personal reading pile and permanently kept books, separate from active inventory and value calculations. |
| **Analytics Dashboard** | Inventory value, profit estimates, category breakdowns, sales stats, event breakdowns, top authors. Tab toggle to Pricing Analysis view. |
| **Pricing Analysis** | Price distribution bar chart, breakdown tables by category/condition/author with inline price chips showing count and percentage at each price point. |
| **Mobile-First** | Sticky action bar, bottom-sheet filters, touch-friendly controls. Built for use at the booth. |

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, React Query |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| AI | Google Books API, Gemini 2.5 Flash |
| Deploy | Docker Compose (local), Railway (production) |

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ and PostgreSQL 16+ (only if running without Docker)

### Docker (Recommended)

```bash
# Clone and start
git clone https://github.com/calebpriester/secondhand-spooks-inventory-app.git
cd ss_inventory_app
docker compose up -d

# Import seed data (682 books from Feb 16, 2026)
docker exec ss_backend npm run import-csv
```

The app will be running at:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001/api
- **Database:** `docker exec -it ss_postgres psql -U spooks -d secondhand_spooks`

### Local Development (Without Docker)

```bash
# Backend
cd backend && npm install
cp .env.example .env          # Edit with your PostgreSQL credentials
psql -U your_username -d secondhand_spooks -f src/config/schema.sql
npm run import-csv && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

---

## Docker Commands

> Your PostgreSQL data persists between runs. See [docs/DATA_MANAGEMENT.md](docs/DATA_MANAGEMENT.md) for backup and restore details.

```bash
docker compose up -d              # Start (data persists)
docker compose down               # Stop (data safe)
docker compose down -v            # DANGER: deletes all data
docker compose logs -f            # Stream logs
docker compose up -d --build      # Rebuild after code changes
docker compose restart backend    # Restart a single service
```

### Data Management

```bash
./scripts/backup-db.sh                                      # Create backup
./scripts/restore-db.sh data/backups/backup_YYYYMMDD.sql    # Restore
./scripts/reset-and-reimport.sh                             # Clear DB + reimport CSV
```

### Updating Inventory from Google Sheets

1. Open "Inventory Tracker" sheet, `Inventory` tab
2. Download as CSV (`File > Download > CSV`)
3. Replace `data/seed/inventory.csv` with the download
4. Run `./scripts/reset-and-reimport.sh` (backup first!)

---

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/books` | List books (with filters) |
| `GET` | `/api/books/:id` | Single book |
| `GET` | `/api/books/stats` | Inventory statistics |
| `POST` | `/api/books` | Create book |
| `PUT` | `/api/books/:id` | Update book |
| `DELETE` | `/api/books/:id` | Delete book |
| `POST` | `/api/books/bulk-sale` | Bulk sale |
| `POST` | `/api/books/bulk-price` | Bulk pricing |
| `POST` | `/api/books/clear-prices` | Clear prices |
| `GET` | `/api/books/transactions` | Sale transactions |
| `POST` | `/api/books/update-transaction` | Edit transaction |
| `POST` | `/api/books/revert-transaction` | Revert transaction |
| `GET` | `/api/books/blind-date/candidates` | Blind date candidates |
| `POST` | `/api/books/blind-date/generate-blurb` | Generate AI blurb |
| `GET` | `/api/subgenres` | Sub-genre options |

---

## Project Structure

```
ss_inventory_app/
├── backend/
│   └── src/
│       ├── config/          # Database config + schema
│       ├── models/          # TypeScript interfaces
│       ├── routes/          # API routes
│       ├── services/        # Business logic (books, Google Books, Gemini, blind date)
│       └── utils/           # CSV import, DB init + migrations
├── frontend/
│   └── src/
│       ├── components/      # BookDetail, BulkSaleModal, BulkPriceModal, ErrorBoundary, etc.
│       ├── hooks/           # useIsMobile, useBookActions
│       ├── pages/           # Dashboard, Inventory, Sales, BlindDate
│       ├── services/        # API client
│       ├── types/           # TypeScript interfaces
│       └── utils/           # Date formatting helpers
├── data/
│   ├── seed/                # Seed CSV (Feb 16, 2026)
│   └── backups/             # Database backups
├── scripts/                 # backup, restore, reimport, fresh-start
├── Dockerfile.railway       # Production multi-stage build
├── docker-compose.yml       # Local dev orchestration
└── railway.toml             # Railway deployment config
```

---

## Theme & Branding

The app uses a dark horror aesthetic with the official Secondhand Spooks palette:

| Color | Hex | Usage |
|---|---|---|
| Ghostly Foam Green | `#00FFA3` | Primary accent |
| Paper White | `#FFFFDC` / `#e8e8e0` | Text and highlights |
| Inky Black | `#121010` | Background |
| Surface | `#1E1B1C` | Cards and panels |
| Pumpkin Orange | `#E85D04` | Sales and events |
| Pricing Purple | `#7C3AED` | Bulk pricing features |
| Ghostly Blue | `#6366F1` | Reading / kept books |
| Deep Rose | `#E11D48` | Blind date |

### Book Categories

| Category | Description |
|---|---|
| **PFH/Vintage** | Paperbacks from Hell era and vintage horror |
| **Mainstream** | Stephen King, Clive Barker, and the big names |
| **YA/Nostalgia** | Young adult horror and nostalgic reads |
| **Comics/Ephemera** | Comics, zines, and horror memorabilia |

---

## Roadmap

**Phase 1 — Essential Operations** ✅
- ~~#1: Add/edit/delete books UI~~ Done
- ~~#3: Price management tools~~ Done

**Phase 2 — Business Intelligence**
- ~~#2: Sales tracking~~ Done
- #4: Enhanced analytics

**Phase 3 — User Experience**
- ~~#5: Mobile responsive design~~ Done

See [open issues](https://github.com/calebpriester/secondhand-spooks-inventory-app/issues) for what's next.

---

## Contributing

1. Review [CLAUDE.md](CLAUDE.md) for project architecture
2. Check the relevant GitHub issue for requirements
3. Create a feature branch (never commit directly to main)
4. Test thoroughly and update docs for any user-facing changes

---

## License

MIT

---

<div align="center">

*Every title on the table earns its place through atmosphere, aesthetics, or outright depravity.*

</div>
