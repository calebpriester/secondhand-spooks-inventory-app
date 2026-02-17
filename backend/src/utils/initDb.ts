import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { query } from '../config/database';

interface CsvRow {
  'Book Title': string;
  'Cleaned?': string;
  'Author Last Name': string;
  'Author First/Middle': string;
  'Book Series': string;
  'Vol. #': string;
  'Cover Type': string;
  'Category': string;
  'Condition': string;
  'Date Purchased': string;
  'Source': string;
  'Seller': string;
  'Order #': string;
  'Thriftbooks Price': string;
  'Purchase Price': string;
  'Our Price': string;
  'Profit Est.': string;
  'Author Fullname': string;
  'Pulled to Read': string;
}

function parsePrice(price: string): number | null {
  if (!price || price.trim() === '') return null;
  const cleaned = price.replace('$', '').replace(',', '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function parseBoolean(value: string): boolean {
  return value?.toUpperCase() === 'TRUE';
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [month, day, year] = parts;
  const parsedMonth = parseInt(month);
  const parsedDay = parseInt(day);
  const parsedYear = parseInt(year);
  if (isNaN(parsedMonth) || isNaN(parsedDay) || isNaN(parsedYear)) return null;
  return new Date(parsedYear, parsedMonth - 1, parsedDay);
}

function findFile(paths: string[]): string | null {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function runSchema(): Promise<void> {
  const schemaPath = findFile([
    path.join(__dirname, '../config/schema.sql'),       // ts-node from src/utils/
    path.join(__dirname, '../../src/config/schema.sql'), // compiled from dist/utils/
  ]);

  if (!schemaPath) {
    console.warn('schema.sql not found, skipping schema initialization');
    return;
  }

  console.log('Applying schema from:', schemaPath);

  // Drop trigger first since CREATE TRIGGER doesn't support IF NOT EXISTS
  await query('DROP TRIGGER IF EXISTS update_books_updated_at ON books');

  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
  await query(schemaSQL);
  console.log('Schema applied successfully.');
}

async function seedFromCsv(): Promise<void> {
  const result = await query('SELECT COUNT(*) as count FROM books');
  const count = parseInt(result.rows[0].count);

  if (count > 0) {
    console.log(`Database has ${count} books. Skipping seed.`);
    return;
  }

  const csvPath = findFile([
    '/inventory.csv',                                         // Docker volume mount (local dev)
    path.join(__dirname, '../../data/seed/inventory.csv'),     // from dist/utils/ on Railway
    path.join(__dirname, '../../../data/seed/inventory.csv'),  // from src/utils/ in local monorepo
  ]);

  if (!csvPath) {
    console.warn('CSV seed file not found. Starting with empty database.');
    return;
  }

  console.log('Seeding from CSV:', csvPath);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records: CsvRow[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  console.log(`Parsed ${records.length} records from CSV`);

  let imported = 0;
  let failed = 0;

  for (const row of records) {
    if (!row['Book Title'] || !row['Author Last Name']) continue;

    try {
      await query(
        `INSERT INTO books (
          book_title, cleaned, author_last_name, author_first_middle, book_series,
          vol_number, cover_type, category, condition, date_purchased, source,
          seller, order_number, thriftbooks_price, purchase_price, our_price,
          profit_est, author_fullname, pulled_to_read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          row['Book Title'],
          parseBoolean(row['Cleaned?']),
          row['Author Last Name'],
          row['Author First/Middle'] || null,
          row['Book Series'] || null,
          row['Vol. #'] || null,
          row['Cover Type'] || null,
          row['Category'] || null,
          row['Condition'] || null,
          parseDate(row['Date Purchased']),
          row['Source'] || null,
          row['Seller'] || null,
          row['Order #'] || null,
          parsePrice(row['Thriftbooks Price']),
          parsePrice(row['Purchase Price']),
          parsePrice(row['Our Price']),
          parsePrice(row['Profit Est.']),
          row['Author Fullname'],
          parseBoolean(row['Pulled to Read']),
        ]
      );
      imported++;
      if (imported % 100 === 0) console.log(`Imported ${imported} books...`);
    } catch (error) {
      failed++;
      console.error(`Failed to import: ${row['Book Title']}`, error);
    }
  }

  console.log(`Seed complete: ${imported} imported, ${failed} failed`);
}

async function runMigrations(): Promise<void> {
  // Check if books still has the old flat enrichment columns (pre-normalization)
  const oldColumns = await query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'google_books_id'
  `);

  if (oldColumns.rows.length > 0) {
    console.log('Migrating enrichment data to normalized schema...');

    // 1. Create the enrichments table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS google_books_enrichments (
        id SERIAL PRIMARY KEY,
        google_books_id VARCHAR(50) UNIQUE NOT NULL,
        cover_image_url TEXT,
        description TEXT,
        genres TEXT[],
        google_rating DECIMAL(3, 2),
        google_ratings_count INTEGER,
        page_count INTEGER,
        publisher VARCHAR(200),
        published_date VARCHAR(20),
        isbn_10 VARCHAR(13),
        isbn_13 VARCHAR(17),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Migrate existing enrichment data
    await query(`
      INSERT INTO google_books_enrichments (
        google_books_id, cover_image_url, description, genres,
        google_rating, google_ratings_count, page_count, publisher,
        published_date, isbn_10, isbn_13, created_at
      )
      SELECT DISTINCT ON (google_books_id)
        google_books_id, cover_image_url, description, genres,
        google_rating, google_ratings_count, page_count, publisher,
        published_date, isbn_10, isbn_13, COALESCE(enriched_at, CURRENT_TIMESTAMP)
      FROM books
      WHERE google_books_id IS NOT NULL
      ON CONFLICT (google_books_id) DO NOTHING
    `);

    // 3. Add the FK column
    await query('ALTER TABLE books ADD COLUMN IF NOT EXISTS google_enrichment_id INTEGER REFERENCES google_books_enrichments(id)');

    // 4. Populate FKs from migrated data
    await query(`
      UPDATE books b SET google_enrichment_id = gbe.id
      FROM google_books_enrichments gbe
      WHERE b.google_books_id = gbe.google_books_id
        AND b.google_books_id IS NOT NULL
    `);

    // 5. Drop old flat columns
    await query('ALTER TABLE books DROP COLUMN IF EXISTS google_books_id');
    await query('ALTER TABLE books DROP COLUMN IF EXISTS cover_image_url');
    await query('ALTER TABLE books DROP COLUMN IF EXISTS description');
    await query('ALTER TABLE books DROP COLUMN IF EXISTS genres');
    await query('ALTER TABLE books DROP COLUMN IF EXISTS google_rating');
    await query('ALTER TABLE books DROP COLUMN IF EXISTS google_ratings_count');
    await query('ALTER TABLE books DROP COLUMN IF EXISTS page_count');
    await query('ALTER TABLE books DROP COLUMN IF EXISTS publisher');
    await query('ALTER TABLE books DROP COLUMN IF EXISTS published_date');
    await query('ALTER TABLE books DROP COLUMN IF EXISTS isbn_10');
    await query('ALTER TABLE books DROP COLUMN IF EXISTS isbn_13');
    await query('ALTER TABLE books DROP COLUMN IF EXISTS enriched_at');

    // 6. Drop old indexes
    await query('DROP INDEX IF EXISTS idx_books_google_books_id');
    await query('DROP INDEX IF EXISTS idx_books_enriched_at');

    console.log('Enrichment data migration complete.');
  }

  // Ensure enrichments table exists (for DBs that never had flat columns, e.g. fresh Railway)
  await query(`
    CREATE TABLE IF NOT EXISTS google_books_enrichments (
      id SERIAL PRIMARY KEY,
      google_books_id VARCHAR(50) UNIQUE NOT NULL,
      cover_image_url TEXT,
      description TEXT,
      genres TEXT[],
      google_rating DECIMAL(3, 2),
      google_ratings_count INTEGER,
      page_count INTEGER,
      publisher VARCHAR(200),
      published_date VARCHAR(20),
      isbn_10 VARCHAR(13),
      isbn_13 VARCHAR(17),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure FK column exists on books (for DBs that skipped the migration path)
  await query('ALTER TABLE books ADD COLUMN IF NOT EXISTS google_enrichment_id INTEGER REFERENCES google_books_enrichments(id)');

  // Always ensure FK index exists
  await query('CREATE INDEX IF NOT EXISTS idx_books_google_enrichment_id ON books(google_enrichment_id)');

  // --- Gemini sub-genre tagging migration ---

  // Ensure subgenre_options table exists
  await query(`
    CREATE TABLE IF NOT EXISTS subgenre_options (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add subgenres and pacing columns to books
  await query('ALTER TABLE books ADD COLUMN IF NOT EXISTS subgenres TEXT[]');
  await query('ALTER TABLE books ADD COLUMN IF NOT EXISTS pacing VARCHAR(20)');
  await query('CREATE INDEX IF NOT EXISTS idx_books_subgenres ON books USING GIN(subgenres)');

  // Seed default sub-genre options (only if table is empty)
  const subgenreCount = await query('SELECT COUNT(*) as count FROM subgenre_options');
  if (parseInt(subgenreCount.rows[0].count) === 0) {
    console.log('Seeding default sub-genre options...');
    await query(`
      INSERT INTO subgenre_options (name, sort_order) VALUES
        ('Supernatural', 1),
        ('Vampire', 2),
        ('Occult/Demonic', 3),
        ('Psychological', 4),
        ('Creature Feature', 5),
        ('Slasher/Survival', 6),
        ('Gothic', 7),
        ('Body Horror', 8),
        ('Apocalyptic', 9),
        ('Dark Fantasy', 10),
        ('Cosmic Horror', 11),
        ('Thriller/Suspense', 12),
        ('Splatterpunk', 13),
        ('Small Town Horror', 14),
        ('Paranormal Romance', 15),
        ('True Crime/Nonfiction', 16),
        ('Anthology/Collection', 17),
        ('Humor/Satire', 18),
        ('Other', 19)
      ON CONFLICT (name) DO NOTHING
    `);
  }

  // Drop and recreate the view (CREATE OR REPLACE can fail if column types change)
  await query('DROP VIEW IF EXISTS books_with_enrichment');
  await query(`
    CREATE OR REPLACE VIEW books_with_enrichment AS
    SELECT
      b.*,
      gb.google_books_id,
      COALESCE(gb.cover_image_url) AS cover_image_url,
      COALESCE(gb.description) AS description,
      COALESCE(gb.genres) AS genres,
      COALESCE(gb.google_rating) AS google_rating,
      COALESCE(gb.google_ratings_count) AS google_ratings_count,
      COALESCE(gb.page_count) AS page_count,
      COALESCE(gb.publisher) AS publisher,
      COALESCE(gb.published_date) AS published_date,
      COALESCE(gb.isbn_10) AS isbn_10,
      COALESCE(gb.isbn_13) AS isbn_13,
      gb.created_at AS enriched_at
    FROM books b
    LEFT JOIN google_books_enrichments gb ON b.google_enrichment_id = gb.id
  `);

  // Ensure trigger exists for enrichments table
  await query('DROP TRIGGER IF EXISTS update_google_books_enrichments_updated_at ON google_books_enrichments');
  await query(`
    CREATE TRIGGER update_google_books_enrichments_updated_at BEFORE UPDATE ON google_books_enrichments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);
}

async function waitForDatabase(maxRetries = 10, initialDelayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await query('SELECT 1');
      console.log(`Database connected (attempt ${attempt}/${maxRetries}).`);
      return;
    } catch (err: any) {
      const retryable = ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(err.code)
        || err.code === 'ETIMEDOUT'
        || (err.errors && err.errors.some((e: any) => ['ETIMEDOUT', 'ECONNREFUSED'].includes(e.code)));

      if (!retryable || attempt === maxRetries) {
        throw err;
      }

      const delay = initialDelayMs * Math.pow(2, attempt - 1); // 2s, 4s, 8s, ...
      console.log(`Database not ready (attempt ${attempt}/${maxRetries}): ${err.code || err.message}. Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function initializeDatabase(): Promise<void> {
  console.log('Initializing database...');
  await waitForDatabase();
  await runSchema();
  await runMigrations();
  await seedFromCsv();
  console.log('Database initialization complete.');
}
