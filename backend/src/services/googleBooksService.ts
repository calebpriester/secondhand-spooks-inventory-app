import { query } from '../config/database';
import { GoogleBooksEnrichment, EnrichmentResult, BatchEnrichmentProgress } from '../models/Book';

const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1/volumes';
const RATE_LIMIT_DELAY_MS = 1100;

export class GoogleBooksService {
  private apiKey: string | null;
  private batchProgress: BatchEnrichmentProgress | null = null;
  private batchAbortController: AbortController | null = null;

  constructor() {
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY || null;
    if (!this.apiKey) {
      console.warn('GOOGLE_BOOKS_API_KEY not configured. Book enrichment will be unavailable.');
    }
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  async searchBook(title: string, author: string, isbn?: string): Promise<GoogleBooksEnrichment | null> {
    if (!this.apiKey) throw new Error('Google Books API key not configured');

    let searchQuery: string;
    if (isbn) {
      searchQuery = `isbn:${encodeURIComponent(isbn.replace(/[-\s]/g, ''))}`;
    } else {
      const cleanTitle = title.split(':')[0].trim();
      const cleanAuthor = author.replace(/\./g, '').trim();
      searchQuery = `intitle:${encodeURIComponent(cleanTitle)}+inauthor:${encodeURIComponent(cleanAuthor)}`;
    }
    const url = `${GOOGLE_BOOKS_API_BASE}?q=${searchQuery}&maxResults=10&langRestrict=en&key=${this.apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google Books API error: ${response.status} ${text}`);
    }

    const data: any = await response.json();
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const bestMatch = this.pickBestMatch(data.items, title, author);
    if (!bestMatch) return null;

    return this.extractEnrichment(bestMatch);
  }

  private pickBestMatch(items: any[], title: string, author: string): any | null {
    const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const normalizedTitle = normalizeStr(title);
    const normalizedAuthor = normalizeStr(author);

    let bestItem = null;
    let bestScore = 0;

    for (const item of items) {
      const vi = item.volumeInfo;
      if (!vi) continue;

      let score = 0;
      const resultTitle = normalizeStr(vi.title || '');
      const resultAuthors = (vi.authors || []).map((a: string) => normalizeStr(a));

      if (resultTitle === normalizedTitle) score += 10;
      else if (resultTitle.includes(normalizedTitle) || normalizedTitle.includes(resultTitle)) score += 5;

      for (const ra of resultAuthors) {
        if (ra === normalizedAuthor || normalizedAuthor.includes(ra) || ra.includes(normalizedAuthor)) {
          score += 10;
          break;
        }
        // Fallback: compare last names (handles middle name/initial variations like "Poppy Brite" vs "Poppy Z. Brite")
        const resultLast = ra.split(/\s+/).pop() || '';
        const authorLast = normalizedAuthor.split(/\s+/).pop() || '';
        if (resultLast && authorLast && resultLast === authorLast) {
          score += 7;
          break;
        }
      }

      if (vi.imageLinks) score += 5;
      if (vi.description) score += 3;
      if (vi.pageCount) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    return bestScore >= 10 ? bestItem : null;
  }

  private extractEnrichment(item: any): GoogleBooksEnrichment {
    const vi = item.volumeInfo;
    const identifiers = vi.industryIdentifiers || [];

    return {
      google_books_id: item.id,
      cover_image_url: vi.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
      description: vi.description ? vi.description.replace(/<[^>]+>/g, '') : null,
      genres: vi.categories || [],
      google_rating: vi.averageRating ?? null,
      google_ratings_count: vi.ratingsCount ?? null,
      page_count: vi.pageCount ?? null,
      publisher: vi.publisher || null,
      published_date: vi.publishedDate || null,
      isbn_10: identifiers.find((id: any) => id.type === 'ISBN_10')?.identifier || null,
      isbn_13: identifiers.find((id: any) => id.type === 'ISBN_13')?.identifier || null,
    };
  }

  async enrichBook(bookId: number, overrideTitle?: string, overrideAuthor?: string, isbn?: string): Promise<EnrichmentResult> {
    const bookResult = await query('SELECT id, book_title, author_fullname, google_enrichment_id FROM books WHERE id = $1', [bookId]);
    if (bookResult.rows.length === 0) {
      return { book_id: bookId, book_title: 'Unknown', status: 'error', error: 'Book not found' };
    }

    const book = bookResult.rows[0];
    const searchTitle = overrideTitle || book.book_title;
    const searchAuthor = overrideAuthor || book.author_fullname || '';

    // Check if a duplicate (same title+author) already has enrichment — copy the FK
    // Skip duplicate check if ISBN is provided (user wants a specific edition)
    if (!overrideTitle && !overrideAuthor && !isbn) {
      const duplicate = await query(
        `SELECT google_enrichment_id FROM books
         WHERE book_title = $1 AND author_fullname = $2
         AND google_enrichment_id IS NOT NULL AND id != $3
         LIMIT 1`,
        [book.book_title, book.author_fullname, bookId]
      );
      if (duplicate.rows.length > 0) {
        await query('UPDATE books SET google_enrichment_id = $1 WHERE id = $2', [duplicate.rows[0].google_enrichment_id, bookId]);
        return {
          book_id: bookId,
          book_title: book.book_title,
          status: 'success',
          google_books_id: 'shared',
        };
      }
    }

    try {
      const enrichment = await this.searchBook(searchTitle, searchAuthor, isbn);
      if (!enrichment) {
        return { book_id: bookId, book_title: book.book_title, status: 'not_found' };
      }

      await this.saveEnrichment(bookId, enrichment);
      return {
        book_id: bookId,
        book_title: book.book_title,
        status: 'success',
        google_books_id: enrichment.google_books_id,
      };
    } catch (error: any) {
      return {
        book_id: bookId,
        book_title: book.book_title,
        status: 'error',
        error: error.message,
      };
    }
  }

  private async saveEnrichment(bookId: number, enrichment: GoogleBooksEnrichment): Promise<void> {
    // Upsert into enrichments table
    const result = await query(
      `INSERT INTO google_books_enrichments (
        google_books_id, cover_image_url, description, genres,
        google_rating, google_ratings_count, page_count, publisher,
        published_date, isbn_10, isbn_13
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (google_books_id) DO UPDATE SET
        cover_image_url = EXCLUDED.cover_image_url,
        description = EXCLUDED.description,
        genres = EXCLUDED.genres,
        google_rating = EXCLUDED.google_rating,
        google_ratings_count = EXCLUDED.google_ratings_count,
        page_count = EXCLUDED.page_count,
        publisher = EXCLUDED.publisher,
        published_date = EXCLUDED.published_date,
        isbn_10 = EXCLUDED.isbn_10,
        isbn_13 = EXCLUDED.isbn_13
      RETURNING id`,
      [
        enrichment.google_books_id,
        enrichment.cover_image_url,
        enrichment.description,
        enrichment.genres,
        enrichment.google_rating,
        enrichment.google_ratings_count,
        enrichment.page_count,
        enrichment.publisher,
        enrichment.published_date,
        enrichment.isbn_10,
        enrichment.isbn_13,
      ]
    );

    const enrichmentId = result.rows[0].id;

    // Link the book to this enrichment
    await query('UPDATE books SET google_enrichment_id = $1 WHERE id = $2', [enrichmentId, bookId]);

    // Propagate to duplicates (same title+author)
    const bookData = await query('SELECT book_title, author_fullname FROM books WHERE id = $1', [bookId]);
    if (bookData.rows.length > 0) {
      const { book_title, author_fullname } = bookData.rows[0];
      await query(
        `UPDATE books SET google_enrichment_id = $1
         WHERE book_title = $2 AND author_fullname = $3 AND id != $4`,
        [enrichmentId, book_title, author_fullname, bookId]
      );
    }
  }

  async startBatchEnrichment(limit: number = 3): Promise<void> {
    if (this.batchProgress?.is_running) {
      throw new Error('Batch enrichment is already running');
    }

    const result = await query(
      'SELECT id, book_title, author_fullname FROM books WHERE google_enrichment_id IS NULL ORDER BY id LIMIT $1',
      [limit]
    );

    const books = result.rows;
    if (books.length === 0) {
      this.batchProgress = {
        total: 0,
        processed: 0,
        succeeded: 0,
        not_found: 0,
        errors: 0,
        is_running: false,
        results: [],
      };
      return;
    }

    this.batchAbortController = new AbortController();
    this.batchProgress = {
      total: books.length,
      processed: 0,
      succeeded: 0,
      not_found: 0,
      errors: 0,
      is_running: true,
      results: [],
    };

    this.processBatch(books).catch(err => {
      console.error('Batch enrichment failed:', err);
      if (this.batchProgress) {
        this.batchProgress.is_running = false;
      }
    });
  }

  private async processBatch(books: any[]): Promise<void> {
    for (const book of books) {
      if (this.batchAbortController?.signal.aborted) {
        break;
      }

      const enrichResult = await this.enrichBook(book.id);
      if (!this.batchProgress) break;

      this.batchProgress.processed++;
      this.batchProgress.results.push(enrichResult);

      if (enrichResult.status === 'success') this.batchProgress.succeeded++;
      else if (enrichResult.status === 'not_found') this.batchProgress.not_found++;
      else this.batchProgress.errors++;

      // Rate limiting (skip delay if we shared an existing enrichment — no API call was made)
      if (this.batchProgress.processed < this.batchProgress.total && enrichResult.google_books_id !== 'shared') {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    }

    if (this.batchProgress) {
      this.batchProgress.is_running = false;
    }
  }

  cancelBatchEnrichment(): void {
    this.batchAbortController?.abort();
    if (this.batchProgress) {
      this.batchProgress.is_running = false;
    }
  }

  getBatchProgress(): BatchEnrichmentProgress | null {
    return this.batchProgress;
  }

  async getEnrichmentStats(): Promise<{
    total_books: string;
    enriched_count: string;
    unenriched_count: string;
    with_cover: string;
    with_description: string;
    with_rating: string;
  }> {
    const result = await query(`
      SELECT
        COUNT(*) as total_books,
        COUNT(b.google_enrichment_id) as enriched_count,
        COUNT(*) - COUNT(b.google_enrichment_id) as unenriched_count,
        COUNT(gb.cover_image_url) as with_cover,
        COUNT(gb.description) as with_description,
        COUNT(gb.google_rating) as with_rating
      FROM books b
      LEFT JOIN google_books_enrichments gb ON b.google_enrichment_id = gb.id
    `);
    return result.rows[0];
  }
}
