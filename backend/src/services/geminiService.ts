import { query } from '../config/database';
import { GeminiTagResult, GeminiBatchProgress } from '../models/Book';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const RATE_LIMIT_DELAY_MS = 500;
export const PACING_OPTIONS = ['Slow Burn', 'Moderate', 'Fast-Paced'];

/** Filter sub-genres to only those in the allowed list */
export function filterValidSubgenres(subgenres: string[], allowed: string[]): string[] {
  return subgenres.filter(s => allowed.includes(s));
}

/** Enforce "Other" rule: if "Other" appears with other tags, drop "Other" */
export function enforceOtherRule(subgenres: string[]): string[] {
  if (subgenres.length > 1 && subgenres.includes('Other')) {
    return subgenres.filter(s => s !== 'Other');
  }
  return subgenres;
}

/** Validate pacing value, default to "Moderate" if invalid */
export function validatePacing(pacing: string): string {
  return PACING_OPTIONS.includes(pacing) ? pacing : 'Moderate';
}

/** Parse and validate raw Gemini response text into structured result */
export function parseGeminiResponse(
  responseText: string,
  allowedSubgenres: string[]
): { subgenres: string[]; pacing: string } {
  const parsed = JSON.parse(responseText);
  const rawSubgenres = parsed.subgenres || [];
  const rawPacing = parsed.pacing || 'Moderate';

  const filtered = filterValidSubgenres(rawSubgenres, allowedSubgenres);
  const enforced = enforceOtherRule(filtered);
  const pacing = validatePacing(rawPacing);

  return { subgenres: enforced, pacing };
}

export class GeminiService {
  private apiKey: string | null;
  private batchProgress: GeminiBatchProgress | null = null;
  private batchAbortController: AbortController | null = null;

  constructor() {
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY || null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  private async getSubgenreOptions(): Promise<string[]> {
    const result = await query('SELECT name FROM subgenre_options ORDER BY sort_order ASC');
    return result.rows.map((r: any) => r.name);
  }

  private async callGemini(
    title: string,
    author: string,
    description: string | null,
    genres: string[] | null,
    allowedSubgenres: string[]
  ): Promise<{ subgenres: string[]; pacing: string }> {
    const prompt = `You are a horror fiction expert. Given the following book, assign 1-2 horror sub-genre tags from ONLY the allowed list below, and classify the pacing.

Book Title: ${title}
Author: ${author}
${description ? `Description: ${description}` : ''}
${genres && genres.length > 0 ? `Google Books Genres: ${genres.join(', ')}` : ''}

Allowed sub-genres: ${allowedSubgenres.join(', ')}
Allowed pacing values: ${PACING_OPTIONS.join(', ')}

Return a JSON object with:
- "subgenres": array of 1-2 strings from the allowed sub-genres list. Pick the most specific and accurate tags. IMPORTANT: "Other" is a catch-all — only use "Other" if NO other sub-genre fits, and if you use "Other" it must be the ONLY tag (never pair it with another sub-genre).
- "pacing": one of the allowed pacing values. "Slow Burn" = atmospheric/dread-building, "Moderate" = balanced, "Fast-Paced" = action-driven/page-turner.`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            subgenres: {
              type: 'ARRAY',
              items: {
                type: 'STRING',
                enum: allowedSubgenres,
              },
            },
            pacing: {
              type: 'STRING',
              enum: PACING_OPTIONS,
            },
          },
          required: ['subgenres', 'pacing'],
        },
      },
    };

    const url = `${GEMINI_API_BASE}?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${text}`);
    }

    const data: any = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error('No content in Gemini response');
    }

    const parsed = JSON.parse(textContent);
    return {
      subgenres: parsed.subgenres || [],
      pacing: parsed.pacing || 'Moderate',
    };
  }

  async tagBook(bookId: number): Promise<GeminiTagResult> {
    const bookResult = await query(
      'SELECT id, book_title, author_fullname, description, genres, subgenres FROM books_with_enrichment WHERE id = $1',
      [bookId]
    );
    if (bookResult.rows.length === 0) {
      return { book_id: bookId, book_title: 'Unknown', status: 'error', error: 'Book not found' };
    }

    const book = bookResult.rows[0];
    const allowedSubgenres = await this.getSubgenreOptions();

    if (allowedSubgenres.length === 0) {
      return { book_id: bookId, book_title: book.book_title, status: 'error', error: 'No sub-genre options configured' };
    }

    try {
      const result = await this.callGemini(
        book.book_title,
        book.author_fullname || '',
        book.description,
        book.genres,
        allowedSubgenres
      );

      const validSubgenres = enforceOtherRule(filterValidSubgenres(result.subgenres, allowedSubgenres));
      const validPacing = validatePacing(result.pacing);

      if (validSubgenres.length === 0) {
        return { book_id: bookId, book_title: book.book_title, status: 'error', error: 'Gemini returned no valid sub-genres' };
      }

      // Save to books table
      await query('UPDATE books SET subgenres = $1, pacing = $2 WHERE id = $3', [validSubgenres, validPacing, bookId]);

      return { book_id: bookId, book_title: book.book_title, status: 'success', subgenres: validSubgenres, pacing: validPacing };
    } catch (error: any) {
      return { book_id: bookId, book_title: book.book_title, status: 'error', error: error.message };
    }
  }

  private async copyFromDuplicate(bookId: number, title: string, author: string): Promise<GeminiTagResult | null> {
    const duplicate = await query(
      `SELECT subgenres, pacing FROM books
       WHERE book_title = $1 AND author_fullname = $2
       AND subgenres IS NOT NULL AND array_length(subgenres, 1) > 0
       AND id != $3
       LIMIT 1`,
      [title, author, bookId]
    );
    if (duplicate.rows.length > 0) {
      const { subgenres, pacing } = duplicate.rows[0];
      await query('UPDATE books SET subgenres = $1, pacing = $2 WHERE id = $3', [subgenres, pacing, bookId]);
      return {
        book_id: bookId,
        book_title: title,
        status: 'success',
        subgenres,
        pacing,
      };
    }
    return null;
  }

  async startBatchTagging(limit: number = 5): Promise<void> {
    if (this.batchProgress?.is_running) {
      throw new Error('Batch tagging is already running');
    }

    const result = await query(
      'SELECT id, book_title, author_fullname FROM books WHERE subgenres IS NULL ORDER BY id LIMIT $1',
      [limit]
    );

    const books = result.rows;
    if (books.length === 0) {
      this.batchProgress = {
        total: 0, processed: 0, succeeded: 0, skipped: 0, errors: 0,
        is_running: false, results: [],
      };
      return;
    }

    this.batchAbortController = new AbortController();
    this.batchProgress = {
      total: books.length, processed: 0, succeeded: 0, skipped: 0, errors: 0,
      is_running: true, results: [],
    };

    this.processBatch(books).catch(err => {
      console.error('Batch tagging failed:', err);
      if (this.batchProgress) this.batchProgress.is_running = false;
    });
  }

  private async processBatch(books: any[]): Promise<void> {
    for (const book of books) {
      if (this.batchAbortController?.signal.aborted) break;

      // Try duplicate copy first (saves an API call)
      let result = await this.copyFromDuplicate(book.id, book.book_title, book.author_fullname);
      const wasShared = !!result;

      if (!result) {
        result = await this.tagBook(book.id);
      }

      if (!this.batchProgress) break;

      this.batchProgress.processed++;
      this.batchProgress.results.push(result);

      if (result.status === 'success') this.batchProgress.succeeded++;
      else if (result.status === 'skipped') this.batchProgress.skipped++;
      else this.batchProgress.errors++;

      // Rate limit (skip delay if we shared from a duplicate — no API call was made)
      if (this.batchProgress.processed < this.batchProgress.total && !wasShared) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    }

    if (this.batchProgress) this.batchProgress.is_running = false;
  }

  cancelBatchTagging(): void {
    this.batchAbortController?.abort();
    if (this.batchProgress) this.batchProgress.is_running = false;
  }

  getBatchProgress(): GeminiBatchProgress | null {
    return this.batchProgress;
  }

  async getTaggingStats(): Promise<{
    total_books: string;
    tagged_count: string;
    untagged_count: string;
  }> {
    const result = await query(`
      SELECT
        COUNT(*) as total_books,
        COUNT(CASE WHEN subgenres IS NOT NULL AND array_length(subgenres, 1) > 0 THEN 1 END) as tagged_count,
        COUNT(CASE WHEN subgenres IS NULL OR array_length(subgenres, 1) IS NULL THEN 1 END) as untagged_count
      FROM books
    `);
    return result.rows[0];
  }
}
