# Secondhand Spooks Inventory App

Full-stack inventory app for a horror-only used-book booth (operators Caleb & Sarah). React+TS+Vite / Node+Express+TS / PostgreSQL. Local: Docker Compose (3 containers). Prod: Railway (auto-deploys from `main`).

**Mobile is the primary use case** — used on phones at a booth during events. Every feature must work well at 320–375px.

Source layout is discoverable from the code; this file captures only the non-obvious. Inventory is maintained in a Google Sheet → exported to `data/seed/inventory.csv` → imported. Open work: Issue #4 (enhanced analytics).

## Critical gotchas

- **No `node_modules` on host** — everything runs in Docker. Type-check via `docker exec ss_frontend npx tsc --noEmit` / `docker exec ss_backend npx tsc --noEmit`. Never run `tsc`/`jest`/`npm` directly on host.
- **schema.sql vs initDb.ts migrations** — `schema.sql` uses `CREATE TABLE IF NOT EXISTS`, so it only affects *fresh* DBs. For existing DBs, add new columns via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `runMigrations()` (`initDb.ts`), placed BEFORE the view drop/recreate.
- **Never put `CREATE INDEX` in schema.sql for migration-added columns.** schema.sql runs BEFORE `runMigrations()` on existing DBs → index references a missing column → crash (Postgres 42703). Put both the column AND its index in `runMigrations()`; leave a `-- created by runMigrations()` comment in schema.sql. Indexes in schema.sql are only for original `CREATE TABLE` columns.
- **Dockerfile.railway frontend stage copies only `package.json` (not the lockfile) + `npm install`.** Copying `package-lock.json` + `npm ci` triggers npm bug #4828 — the platform-specific `@rollup/rollup-linux-*-gnu` optional dep is skipped and `vite build` dies with "Cannot find module". Don't "fix" it back to `npm ci`.
- **Postgres DECIMAL returns as a string.** Always `Number(value)` before math/`.toFixed()`.
- **`docker compose down -v` DELETES the DB** (named volume `postgres_data`). Plain `down` is safe. Back up first: `./scripts/backup-db.sh`.
- **CSV import truncates and replaces ALL data.** Skips empty rows; tolerates null dates/prices/categories.

## Backend conventions

- **Transactions**: use `withTransaction()` from `database.ts` for multi-statement mutations. Services take an optional `QueryExecutor`; routes wrap as `withTransaction((client) => service.method(args, client))`.
- **Bulk ops**: `unnest($1::int[], ...)` or `WHERE id = ANY($1::int[])` — never loop individual UPDATEs.
- **Route validation**: `:id` via `parseIdParam()` (400 on NaN/≤0); batch limits via `clampLimit()` (cap 500); payment method enum validated at route level.
- **Enrichment is normalized**: `google_books_enrichments` table + `books.google_enrichment_id` FK (`ON DELETE SET NULL`); `books_with_enrichment` view returns flat columns (services read the view, write to `books`). Books with same title+author share an enrichment row (0 API calls for dupes). Add future sources via new table + LEFT JOIN in the view — no other code changes.
- **Gemini tagging** (`geminiService.ts`): same `GOOGLE_BOOKS_API_KEY` as Google Books. Uses structured output with a JSON-schema enum so it can only return valid sub-genres. `subgenre_options` table is the configurable list (CRUD `/api/subgenres`); rename = `array_replace()`, delete = `array_remove()` across all books.
- Endpoints live under `/api/books` + `/api/subgenres`; filters defined in `BookFilters` (`models/Book.ts`).

## Frontend conventions

- **React Query** for all fetching. QueryClient (`App.tsx`): `staleTime 30s`, `retry 1`, `refetchOnWindowFocus false`.
- **Global error handling**: `MutationCache.onError` shows a red toast on any failed mutation — no per-mutation `onError` needed. `ErrorBoundary` wraps the app for render crashes.
- **Shared book mutations** (mark sold/available, pull to read, keep, enrich, tag, blind date) live in `useBookActions()` — don't duplicate in pages.
- **Inventory** uses card layout on mobile (`useIsMobile`), table on desktop, with a sticky mobile action bar + bottom-sheet filter drawer.
- **Mobile requirements for ALL new UI**: `font-size: 16px` on inputs/selects/buttons (prevents iOS zoom); ≥44px tap targets; checkboxes ≥1.5rem; include a `@media (max-width: 768px)` block.
- **Theme colors**: Foam Green `#00FFA3`, Paper White `#FFFFDC`, Inky Black `#1E1B1C`, Pumpkin `#E85D04`, Pricing Purple `#7C3AED` (+ `#A78BFA` for Gemini UI), Ghostly Blue `#6366F1` (reading/kept), Deep Rose `#E11D48` (blind date).

## Testing

- Jest is a backend devDep, NOT in the dev container. Run locally: `cd backend && npm install && npx jest`. Tests in `backend/src/__tests__/` mirroring source; mock the DB with `jest.mock('../../config/database')`.
- **Coverage thresholds are enforced** in `jest.config.ts` (CI fails below). Per-file floors exist for `bookService`, `geminiService`, `googleBooksService`, `blindDateService`. Exported pure functions (`scoreResult`, `pickBestMatch`, `extractEnrichmentFromItem`, `filterValidSubgenres`, `enforceOtherRule`, `validatePacing`, `parseGeminiResponse`) should stay at 100%. Add tests for any new backend logic.

## Workflow

- **Never commit to `main`** (branch + PR via `gh`). Author: Caleb Priester <calebhpriester@gmail.com>.
- Before pushing: update README.md for any user-facing change, CLAUDE.md if architecture/colors/workflow changed, and keep tests current.
- Schema change → `./scripts/fresh-start.sh`. Other scripts: `backup-db.sh`, `restore-db.sh`, `reset-and-reimport.sh`.

## Local reference

- Containers: `ss_postgres`, `ss_backend`, `ss_frontend`. Ports: 3000 (frontend), 3001 (API), 5432 (db). DB creds: `spooks` / `horror_books_2024` / `secondhand_spooks`.
- Env: `DATABASE_URL` (required), `PORT`, `NODE_ENV`, `GOOGLE_BOOKS_API_KEY` (optional — enables enrichment + Gemini; local in root `.env`, prod in Railway dashboard).
- Prod (Railway): monolith — backend serves built frontend as static files (`VITE_API_URL=/api` baked in at build). `initDb.ts` runs migrations + seeds on startup. Health check `/health`.
- Start: `docker compose up -d`. Backend hot-reloads via nodemon; frontend via Vite. Vite needs `host: '0.0.0.0'` and proxy → `http://backend:3001`.
