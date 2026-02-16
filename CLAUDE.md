# Claude Instructions for Secondhand Spooks Inventory App

## Project Overview

This is a full-stack inventory management system for **Secondhand Spooks**, a horror-only used book booth. The app helps track and analyze a collection of vintage horror paperbacks, YA horror, and mainstream horror titles.

**Tech Stack:**
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- Deployment: Docker Compose (local), Railway (production)

**Current Status:** ✅ Fully operational with 682 books imported from seed data

**Production URL:** https://secondhand-spooks-inventory-app-production.up.railway.app/

## Project Context

### Business Model
- Small booth selling used horror books
- Two operators (Caleb and Sarah)
- Focus on "Paperbacks from Hell" era vintage horror
- Categories: YA/Nostalgia, PFH/Vintage, Mainstream, Comics/Ephemera
- Track purchase prices, retail prices, and profit estimates

### Data Source
- Primary inventory maintained in Google Sheet "Inventory Tracker"
- Tab name: "Inventory"
- Export to CSV → import to database workflow
- Seed data location: `data/seed/inventory.csv` (snapshot: Feb 16, 2026)

## Architecture & Key Files

### Backend (`/backend`)
- **Entry point**: `src/index.ts` - Express server
- **Database config**: `src/config/database.ts` - PostgreSQL connection
- **Schema**: `src/config/schema.sql` - Database schema (682 books currently)
- **Models**: `src/models/Book.ts` - TypeScript interfaces
- **Services**: `src/services/bookService.ts` - Business logic (CRUD, stats), `src/services/googleBooksService.ts` - Google Books API integration (enrichment, batch processing)
- **Routes**: `src/routes/bookRoutes.ts` - API endpoints (including enrichment)
- **Utilities**: `src/utils/importCsv.ts` - CSV import logic, `src/utils/initDb.ts` - DB initialization, seeding, and migrations

### Frontend (`/frontend`)
- **Entry point**: `src/main.tsx`
- **App**: `src/App.tsx` - Routing and layout
- **Pages**:
  - `src/pages/Dashboard.tsx` - Analytics and stats
  - `src/pages/Inventory.tsx` - Book browsing and filtering (card view on mobile, table on desktop, cover images)
- **Components**: `src/components/BookDetail.tsx` - Book detail popup (enrichment data, custom search), `src/components/BatchEnrichment.tsx` - Google Books batch enrichment panel (on Dashboard)
- **Hooks**: `src/hooks/useIsMobile.ts` - Responsive breakpoint hook using `matchMedia`
- **API client**: `src/services/api.ts` - Backend communication
- **Types**: `src/types/Book.ts` - TypeScript interfaces

### Database Schema

**`books` table:**
- Core: book_title, author (first/middle/last/fullname), series, vol_number
- Physical: cover_type (Paper/Hard/Audiobook), category, condition
- Purchase: date_purchased, source, seller, order_number
- Pricing: thriftbooks_price, purchase_price, our_price, profit_est
- Status: cleaned (boolean), pulled_to_read (boolean)
- Enrichment FK: google_enrichment_id (references google_books_enrichments)
- Metadata: id, created_at, updated_at

**`google_books_enrichments` table** (normalized, one row per unique Google Books match):
- google_books_id (unique), cover_image_url, description, genres (TEXT[])
- google_rating, google_ratings_count, page_count, publisher, published_date
- isbn_10, isbn_13, created_at, updated_at

**`books_with_enrichment` view** — JOINs books + enrichments, returns flat columns the frontend expects. Uses COALESCE for future multi-source support (add Hardcover/Open Library later by adding more LEFT JOINs).

Multiple books can share one enrichment row (duplicates don't waste API calls).

### Infrastructure
- **Docker Compose**: Orchestrates 3 containers for local dev (postgres, backend, frontend)
- **Railway (Production)**: 2 services — Postgres (managed) + app (backend serves frontend static files)
- **Dockerfile.railway**: Multi-stage production build (frontend build → backend build → slim runtime image)
- **railway.toml**: Railway deployment config (health check, restart policy)
- **Data Persistence**: Named volume `postgres_data` for local PostgreSQL; Railway manages production DB
- **Scripts**: Helper scripts in `/scripts` for backup/restore/import
- **Documentation**:
  - `README.md` - Main setup and reference
  - `docs/DATA_MANAGEMENT.md` - Data persistence guide
  - `data/seed/README.md` - Seed data info

## Quick Reference

### Container Names
- `ss_postgres` - PostgreSQL database
- `ss_backend` - Node.js/Express API
- `ss_frontend` - React/Vite app

### Ports
- `3000` - Frontend (React app)
- `3001` - Backend API
- `5432` - PostgreSQL

### Database Credentials
- User: `spooks`
- Password: `horror_books_2024`
- Database: `secondhand_spooks`

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required)
- `PORT` — API port (default 3001)
- `NODE_ENV` — 'production' or 'development'
- `GOOGLE_BOOKS_API_KEY` — Google Books API key (optional, enables enrichment)
  - Local: Set in `.env` file at project root (read by Docker Compose)
  - Railway: Set in Railway dashboard as environment variable
  - If not set, app works normally but enrichment is unavailable

### Important Paths
- Seed CSV (in container): `/inventory.csv`
- Seed CSV (on host): `data/seed/inventory.csv`
- Backups: `data/backups/`
- Schema: `backend/src/config/schema.sql`
- Production Dockerfile: `Dockerfile.railway`
- Railway config: `railway.toml`

## Common Development Tasks

### Starting Work
```bash
# Start the app
docker compose up -d

# View logs
docker compose logs -f
```

### Making Changes

**Backend changes:**
- Edit files in `backend/src/`
- Nodemon auto-restarts on file changes
- If schema changes, run: `docker compose down -v && docker compose up -d`

**Frontend changes:**
- Edit files in `frontend/src/`
- Vite hot-reloads automatically
- No restart needed

**Database changes:**
- Update `backend/src/config/schema.sql`
- Requires fresh start: `./scripts/fresh-start.sh`

### Testing
```bash
# Type-check frontend (no node_modules on host — must use Docker)
docker exec ss_frontend npx tsc --noEmit

# Backend tests (jest is a devDependency, NOT installed in the dev container)
# Backend tests must be run by installing locally or in a separate test container
# For quick validation: the backend dev container uses nodemon, not jest
# To run tests: npm install in backend/ locally, then npm test

# Check API
curl http://localhost:3001/api/books/stats

# Check book count
docker exec ss_postgres psql -U spooks -d secondhand_spooks -c "SELECT COUNT(*) FROM books;"

# View container status
docker compose ps
```

### Important: No node_modules on Host
- The project runs entirely in Docker — there are no `node_modules` directories on the host machine
- **Frontend type-check**: `docker exec ss_frontend npx tsc --noEmit`
- **Backend type-check**: `docker exec ss_backend npx tsc --noEmit`
- Do NOT try to run `tsc`, `jest`, `npx tsc`, or `npm test` directly on the host — they will fail
- For backend unit tests, you would need to `cd backend && npm install && npm test` locally (installs devDeps)

### Data Management
```bash
# Backup before changes
./scripts/backup-db.sh

# Re-import from CSV
./scripts/reset-and-reimport.sh

# Restore from backup
./scripts/restore-db.sh data/backups/backup_YYYYMMDD_HHMMSS.sql
```

## Current Limitations & Known Issues

### What Works:
✅ View all inventory with search and filters
✅ Dashboard with statistics and analytics
✅ CSV import from Google Sheets
✅ Data persistence across restarts
✅ Backup and restore functionality
✅ Add/edit books through the UI (Issue #1 - closed)
✅ Quick-toggle cleaned status checkbox
✅ Production deployment on Railway (auto-deploys from main)
✅ Mobile-responsive design (Issue #5 - closed)
✅ Google Books API integration (cover images, ratings, descriptions, genres, ISBNs)

### What's Missing (See GitHub Issues):
❌ No sales tracking (Issue #2)
❌ Many books missing prices (Issue #3)
❌ Limited analytics (Issue #4)

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Use async/await (not callbacks)
- Prefer functional React components with hooks
- Keep components focused and small

### API Conventions
- RESTful endpoints under `/api/books`
- Use proper HTTP methods (GET/POST/PUT/DELETE)
- Return JSON responses
- Handle errors with appropriate status codes

### Database
- Use parameterized queries (avoid SQL injection)
- NULL values are allowed for most fields
- date_purchased can be null (some books don't have dates)
- DECIMAL types return as strings from PostgreSQL (convert with Number())

### UI/UX
- Dark horror theme (Ghostly Foam Green #00FFA3, Paper White #FFFFDC, Inky Black #1E1B1C)
- Keep interface simple and intuitive
- Mobile-responsive: breakpoints at 768px (mobile) and 1024px (tablet)
- Inventory uses card layout on mobile via `useIsMobile` hook, table on desktop
- Cover images are clickable to open BookDetail popup (enrichment data, custom search, edit/enrich actions)
- Modals use `overflow: hidden` + `min-height: 0` flex pattern to stay within 90vh
- Use `font-size: 16px` on mobile inputs/selects to prevent iOS Safari auto-zoom
- Use React Query for data fetching

### Enrichment Architecture
- Normalized: `google_books_enrichments` table + `books.google_enrichment_id` FK
- `books_with_enrichment` SQL view returns flat columns (frontend sees same shape as before)
- `bookService.ts` reads from the view; writes go to `books` table directly
- Duplicate titles share enrichment rows (0 API calls for duplicates)
- Custom search supports ISBN, title, and author overrides
- Future sources: add new table + FK + update view COALESCE (zero changes to existing code)

## Troubleshooting Common Issues

### Frontend won't load
- Check Vite config has `host: '0.0.0.0'`
- Verify proxy points to `http://backend:3001`
- Check frontend logs: `docker compose logs -f frontend`

### API returns errors
- Check backend logs: `docker compose logs -f backend`
- Verify database connection in backend/.env
- Ensure postgres container is healthy

### Data import fails
- Verify CSV is at `/inventory.csv` in container
- Check for empty rows or invalid data
- Review error messages in import output
- Some records may fail validation (check constraints)

### Price/number fields show errors
- PostgreSQL returns DECIMAL as string
- Always convert: `Number(value).toFixed(2)`
- Use optional chaining: `book.price?.toFixed(2)`

## Working with GitHub Issues

**To work on an issue:**
1. Read the issue description carefully
2. Check acceptance criteria
3. Review relevant files mentioned in the issue
4. Consider impact on both frontend and backend
5. Test thoroughly before committing
6. Reference issue in commit: `git commit -m "Fix #1: Add book edit UI"`

**Current Open Issues:**
- #2: Sales tracking functionality (HIGH PRIORITY)
- #3: Bulk price management tools (HIGH PRIORITY)
- #4: Enhanced analytics and reporting (MEDIUM)

## Git Workflow

- Main branch: `main`
- Never commit directly to main (per user's CLAUDE.md)
- Author: Caleb Priester <calebhpriester@gmail.com>
- Remote: https://github.com/calebpriester/secondhand-spooks-inventory-app.git
- Use `gh` CLI for GitHub operations
- **Before pushing**: Always verify that README.md, CLAUDE.md, and tests are up-to-date with your changes

## Important Notes

### Data Persistence
- PostgreSQL data persists via Docker named volume
- `docker compose down` is SAFE (keeps data)
- `docker compose down -v` DELETES data (dangerous!)
- Always backup before major changes: `./scripts/backup-db.sh`

### CSV Import Behavior
- Truncates and replaces ALL data
- Skips empty rows automatically
- Handles null dates, prices, and categories
- Expects specific column names (see data/seed/README.md)

### Environment
- Backend runs on port 3001
- Frontend runs on port 3000
- PostgreSQL runs on port 5432
- All accessible via localhost when using Docker

### Production (Railway)
- URL: https://secondhand-spooks-inventory-app-production.up.railway.app/
- Auto-deploys from `main` branch via GitHub integration
- Backend serves frontend as static files (monolith — 2 Railway services total)
- DB initialization and CSV seeding runs automatically on startup via `initDb.ts`
- `VITE_API_URL=/api` baked in at build time — frontend calls same origin
- Health check: `/health`

## Quick Reference Commands

```bash
# Start app
docker compose up -d

# Stop app (data persists!)
docker compose down

# View all books
curl http://localhost:3001/api/books | jq

# Get statistics
curl http://localhost:3001/api/books/stats | jq

# Database access
docker exec -it ss_postgres psql -U spooks -d secondhand_spooks

# Backup
./scripts/backup-db.sh

# Re-import from Google Sheets
# (After downloading CSV to data/seed/inventory.csv)
./scripts/reset-and-reimport.sh
```

## When Helping with New Features

1. **Read the GitHub issue first** - Understand requirements and acceptance criteria
2. **Check existing code** - Don't duplicate functionality
3. **Maintain consistency** - Follow existing patterns
4. **Update both frontend and backend** - Most features need both
5. **Test thoroughly** - Verify with actual API calls and UI testing
6. **Update documentation** - Keep README.md current
7. **Consider mobile** - Think about responsive design even if not implementing yet

## Testing Checklist

Before pushing changes:
- [ ] Backend compiles without errors
- [ ] Frontend compiles without errors
- [ ] API endpoints return correct data
- [ ] UI displays data correctly
- [ ] Null values handled gracefully
- [ ] No console errors in browser
- [ ] Data persists after restart
- [ ] Changes documented in README if user-facing
- [ ] CLAUDE.md updated if architecture, colors, or workflows changed
- [ ] Existing tests still pass and are updated if relevant

## Need Help?

- **Technical docs**: See README.md, docs/DATA_MANAGEMENT.md
- **Script usage**: See scripts/README.md
- **Seed data**: See data/seed/README.md
- **Open issues**: Run `gh issue list` or visit GitHub
- **Architecture questions**: This file (CLAUDE.md)
