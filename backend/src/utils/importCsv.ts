import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
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

  // Handle format: 11/1/2025
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const [month, day, year] = parts;
  const parsedMonth = parseInt(month);
  const parsedDay = parseInt(day);
  const parsedYear = parseInt(year);

  if (isNaN(parsedMonth) || isNaN(parsedDay) || isNaN(parsedYear)) {
    return null;
  }

  return new Date(parsedYear, parsedMonth - 1, parsedDay);
}

async function importCsv() {
  // Try multiple possible paths for the CSV file
  const possiblePaths = [
    '/inventory.csv',                                // Docker volume mount
    path.join(__dirname, '../../../inventory.csv'),  // Local development
    path.join(process.cwd(), '../inventory.csv'),    // Parent directory
  ];

  let csvPath: string | null = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      csvPath = testPath;
      break;
    }
  }

  if (!csvPath) {
    console.error('CSV file not found. Tried paths:', possiblePaths);
    process.exit(1);
  }

  console.log('Found CSV file at:', csvPath);

  const records: CsvRow[] = [];

  fs.createReadStream(csvPath)
    .pipe(parse({ columns: true, skip_empty_lines: true }))
    .on('data', (row: CsvRow) => {
      records.push(row);
    })
    .on('end', async () => {
      console.log(`Parsed ${records.length} records from CSV`);

      let imported = 0;
      let failed = 0;

      for (const row of records) {
        // Skip empty rows (no title or no author)
        if (!row['Book Title'] || !row['Author Last Name']) {
          continue;
        }

        try {
          const sql = `
            INSERT INTO books (
              book_title, cleaned, author_last_name, author_first_middle, book_series,
              vol_number, cover_type, category, condition, date_purchased, source,
              seller, order_number, thriftbooks_price, purchase_price, our_price,
              profit_est, author_fullname, pulled_to_read
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          `;

          const values = [
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
          ];

          await query(sql, values);
          imported++;

          if (imported % 100 === 0) {
            console.log(`Imported ${imported} books...`);
          }
        } catch (error) {
          failed++;
          console.error(`Failed to import: ${row['Book Title']}`, error);
        }
      }

      console.log(`\nImport complete!`);
      console.log(`Successfully imported: ${imported}`);
      console.log(`Failed: ${failed}`);
      process.exit(0);
    })
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
      process.exit(1);
    });
}

importCsv();
