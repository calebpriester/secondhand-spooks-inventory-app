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
- **Services**: `src/services/bookService.ts` - Business logic (CRUD, stats, sales tracking, bulk sales, transactions), `src/services/googleBooksService.ts` - Google Books API integration (enrichment, batch processing), `src/services/geminiService.ts` - Gemini 2.0 Flash integration (sub-genre tagging, pacing, batch processing)
- **Routes**: `src/routes/bookRoutes.ts` - API endpoints (including enrichment + Gemini tagging), `src/routes/subgenreRoutes.ts` - Sub-genre options CRUD
- **Utilities**: `src/utils/importCsv.ts` - CSV import logic, `src/utils/initDb.ts` - DB initialization, seeding, and migrations

### Frontend (`/frontend`)
- **Entry point**: `src/main.tsx`
- **App**: `src/App.tsx` - Routing and layout
- **Pages**:
  - `src/pages/Dashboard.tsx` - Analytics and stats (including sales stats)
  - `src/pages/Inventory.tsx` - Book browsing and filtering (card view on mobile, table on desktop, cover images, checkbox selection for bulk sales)
  - `src/pages/Sales.tsx` + `Sales.css` - Transaction-centric sales history (expandable transactions with cover thumbnails, filters by event/date/payment, inline edit mode, transaction revert)
- **Components**: `src/components/BookDetail.tsx` - Book detail popup (enrichment data, custom search, sub-genre tags, mark as sold with inline form, sale details, "View Transaction" link), `src/components/BulkSaleModal.tsx` + `BulkSaleModal.css` - Bulk sale form (per-book prices, shared event/date/payment), `src/components/BulkPriceModal.tsx` + `BulkPriceModal.css` - Bulk price setting (per-book or flat price mode, nullable pricing, suggestions with fill helper, below-cost warnings, purple #7C3AED accent), `src/components/BatchEnrichment.tsx` - Google Books batch enrichment panel (on Dashboard), `src/components/GeminiEnrichment.tsx` - Gemini sub-genre tagging panel (on Dashboard, includes sub-genre management CRUD)
- **Hooks**: `src/hooks/useIsMobile.ts` - Responsive breakpoint hook using `matchMedia`
- **API client**: `src/services/api.ts` - Backend communication
- **Types**: `src/types/Book.ts` - TypeScript interfaces

### Database Schema

**`books` table:**
- Core: book_title, author (first/middle/last/fullname), series, vol_number
- Physical: cover_type (Paper/Hard/Audiobook), category, condition
- Purchase: date_purchased, source, seller, order_number
- Pricing: purchase_price, our_price, profit_est (thriftbooks_price deprecated — column retained for historical data)
- Status: cleaned (boolean), pulled_to_read (boolean)
- Gemini tags: subgenres (TEXT[]), pacing (VARCHAR — Slow Burn/Moderate/Fast-Paced)
- Sales: sold (boolean), date_sold (date), sold_price (decimal), sale_event (varchar), sale_transaction_id (varchar), payment_method (varchar — Cash/Card)
- Enrichment FK: google_enrichment_id (references google_books_enrichments)
- Metadata: id, created_at, updated_at

**`google_books_enrichments` table** (normalized, one row per unique Google Books match):
- google_books_id (unique), cover_image_url, description, genres (TEXT[])
- google_rating, google_ratings_count, page_count, publisher, published_date
- isbn_10, isbn_13, created_at, updated_at

**`books_with_enrichment` view** — JOINs books + enrichments, returns flat columns the frontend expects. Uses COALESCE for future multi-source support (add Hardcover/Open Library later by adding more LEFT JOINs).

Multiple books can share one enrichment row (duplicates don't waste API calls).

**`subgenre_options` table** (configurable list for Gemini tagging):
- id, name (UNIQUE), sort_order, created_at
- Seeded with 18 default horror sub-genres on first migration
- CRUD via `/api/subgenres` — renaming/deleting propagates to all tagged books

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
- `GOOGLE_BOOKS_API_KEY` — Google API key (optional, enables Google Books enrichment + Gemini sub-genre tagging)
  - Same key works for both Google Books API and Gemini 2.0 Flash API
  - Local: Set in `.env` file at project root (read by Docker Compose)
  - Railway: Set in Railway dashboard as environment variable
  - If not set, app works normally but enrichment and tagging are unavailable

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
- **IMPORTANT: schema.sql vs initDb.ts migrations** — `schema.sql` uses `CREATE TABLE IF NOT EXISTS`, so adding new columns to the table definition ONLY affects fresh databases. For existing databases, new columns MUST be added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `runMigrations()` in `initDb.ts`. Always put new column additions AND their indexes in the migration block BEFORE the view drop/recreate.
- **CRITICAL: Never add `CREATE INDEX` to `schema.sql` for columns that are added via migration.** On existing databases, `schema.sql` runs BEFORE `runMigrations()`, so the index statement will reference a column that doesn't exist yet and the app will crash with error code 42703. Instead, add both the column AND its index in `runMigrations()` only. In `schema.sql`, add a comment pointing to the migration (e.g., `-- Note: idx_books_sold created by runMigrations()`). Only add indexes to `schema.sql` for columns that are part of the original `CREATE TABLE` definition (like `author_fullname`, `category`, etc.).

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
✅ Gemini 2.0 Flash integration (sub-genre tagging, pacing classification, batch processing, configurable sub-genre list)
✅ Sales tracking (Issue #2): single-book mark-as-sold (inline form in BookDetail), bulk sales via checkbox selection + BulkSaleModal, transaction grouping (UUID sale_transaction_id), payment method (Cash/Card), event tagging with autocomplete, dedicated Sales page (`/sales`) with transaction-centric view (cover thumbnail strips, expandable details, filters by event/date/payment, inline edit mode for date/event/payment/per-book prices, full transaction revert), "View Transaction" link from BookDetail, Inventory sold view with sale-relevant columns, Dashboard sales stats (5 cards: Books Sold, Transactions, Total Revenue, Actual Profit, Avg Sale Price) + Sales by Event breakdown table
✅ Bulk price management (Issue #3): select books via checkboxes + BulkPriceModal (per-book or flat price modes, nullable pricing for clearing), select-all checkbox in table header + mobile, "Missing Price" filter in stock status dropdown, Dashboard "Need Pricing" alert (purple #7C3AED), pricing suggestions (2x cost rounded up, min $3, whole dollars), below-cost warnings, fill-suggested helper, auto-calculates profit_est, thriftbooks_price deprecated (column retained, removed from UI/forms)

### What's Missing (See GitHub Issues):
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
- Sales endpoints: `GET /api/books/sale-events`, `GET /api/books/transactions`, `POST /api/books/bulk-sale`, `POST /api/books/update-transaction`, `POST /api/books/revert-transaction`
- Pricing endpoints: `POST /api/books/bulk-price` (per-book or flat price mode, auto-calculates profit_est), `POST /api/books/clear-prices` (bulk clear our_price + profit_est to NULL)
- Book filters include: `sold`, `sale_event`, `date_sold`, `sale_transaction_id`, `missing_price` (see `BookFilters` interface in `models/Book.ts`)

### Database
- Use parameterized queries (avoid SQL injection)
- NULL values are allowed for most fields
- date_purchased can be null (some books don't have dates)
- DECIMAL types return as strings from PostgreSQL (convert with Number())

### UI/UX
- Dark horror theme (Ghostly Foam Green #00FFA3, Paper White #FFFFDC, Inky Black #1E1B1C, Pumpkin Orange #E85D04, Pricing Purple #7C3AED)
- Keep interface simple and intuitive
- **Mobile is the primary use case** — this app is used at a booth during events; every feature MUST work well on phones
- Mobile-responsive: breakpoints at 768px (mobile) and 1024px (tablet)
- Inventory uses card layout on mobile via `useIsMobile` hook, table on desktop
- Cover images are clickable to open BookDetail popup (enrichment data, custom search, edit/enrich actions)
- Modals use `overflow: hidden` + `min-height: 0` flex pattern to stay within 90vh
- Use React Query for data fetching

**Mobile requirements (apply to ALL new UI):**
- `font-size: 16px` on ALL mobile inputs, selects, and buttons — prevents iOS Safari auto-zoom
- Minimum 44px tap target height for buttons, toggles, and interactive elements (WCAG AA)
- Test all flows on narrow screens (320px–375px width)
- Checkboxes should be at least 1.5rem on mobile
- All new components MUST include a `@media (max-width: 768px)` block with mobile overrides

### Enrichment Architecture
- Normalized: `google_books_enrichments` table + `books.google_enrichment_id` FK
- `books_with_enrichment` SQL view returns flat columns (frontend sees same shape as before)
- `bookService.ts` reads from the view; writes go to `books` table directly
- Duplicate titles share enrichment rows (0 API calls for duplicates)
- Custom search supports ISBN, title, and author overrides
- Future sources: add new table + FK + update view COALESCE (zero changes to existing code)

### Gemini Sub-Genre Tagging
- Uses Gemini 2.0 Flash API with same `GOOGLE_BOOKS_API_KEY`
- Tags each book with 1-2 sub-genres from a configurable list + pacing (Slow Burn/Moderate/Fast-Paced)
- Structured output with JSON schema + enum constraint — Gemini can ONLY return valid values
- `subgenres TEXT[]` and `pacing VARCHAR(20)` stored directly on `books` table (included in view via `b.*`)
- `subgenre_options` table holds the configurable sub-genre list (CRUD via `/api/subgenres`)
- Renaming a sub-genre uses `array_replace()` on all books; deleting uses `array_remove()`
- Batch tagging follows same pattern as Google Books: in-memory state, AbortController, 500ms rate limit
- Deduplication: books with same title+author copy tags from already-tagged duplicates (0 API calls)
- Purple accent (#A78BFA) distinguishes Gemini UI from Google Books green (#00FFA3)
- Pacing is experimental — can be hidden in UI if data quality is poor

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
- [ ] **New unit tests written for any new backend logic** (services, validation, utilities)

### Unit Testing Requirements
- **Every new backend service, validation function, or business logic must have unit tests.**
- Extract testable pure functions from services (validation, filtering, transformation) and test them independently.
- Tests live in `backend/src/__tests__/` mirroring the source structure (e.g., `services/geminiService.test.ts`).
- Run tests locally: `cd backend && npm install && npx jest`
- Jest config: `backend/jest.config.ts` (ts-jest, tests match `**/__tests__/**/*.test.ts`)
- Mock the database with `jest.mock('../../config/database')` — do not require a running DB for unit tests.
- When modifying existing code (e.g., adding new stats queries or filters), update the corresponding test file and fixtures.

### Coverage Enforcement
- **Coverage thresholds are enforced in `jest.config.ts`** — CI will fail if coverage drops below thresholds.
- Global floor: 45% statements, 25% branches, 40% functions, 45% lines
- Per-file thresholds:
  - `bookService.ts`: 80% statements/branches/lines, 75% functions
  - `geminiService.ts`: 50% statements/lines, 30% branches, 80% functions
  - `googleBooksService.ts`: 30% statements/lines/functions, 40% branches
- Run `npx jest --coverage` locally to check before pushing.
- CI runs `npx jest --ci --coverage` on PRs — coverage report uploaded as artifact.
- Exported pure functions (`scoreResult`, `pickBestMatch`, `extractEnrichmentFromItem`, `filterValidSubgenres`, `enforceOtherRule`, `validatePacing`, `parseGeminiResponse`) should maintain 100% coverage.

## Need Help?

- **Technical docs**: See README.md, docs/DATA_MANAGEMENT.md
- **Script usage**: See scripts/README.md
- **Seed data**: See data/seed/README.md
- **Open issues**: Run `gh issue list` or visit GitHub
- **Architecture questions**: This file (CLAUDE.md)
