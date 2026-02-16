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

export async function initializeDatabase(): Promise<void> {
  console.log('Initializing database...');
  await runSchema();
  await seedFromCsv();
  console.log('Database initialization complete.');
}
