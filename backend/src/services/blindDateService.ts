import { query } from '../config/database';
import { Book, BlindDateBlurbResult, BlindDateBatchProgress } from '../models/Book';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const RATE_LIMIT_DELAY_MS = 500;

/** Build the Gemini prompt for generating a blind date blurb. Does NOT include title or author in the output instructions. */
export function buildBlurbPrompt(
  title: string,
  author: string,
  description: string | null,
  subgenres: string[] | null,
  pacing: string | null,
  pageCount: number | null
): string {
  const parts: string[] = [
    `You write bullet points for "Blind Date with a Book" cards at a horror book booth called "Secondhand Spooks".`,
    `The book is wrapped — the customer reads your bullets to decide if they want it.`,
    ``,
    `Book info (for your reference only — do NOT reveal title, author, or character names):`,
  ];

  if (subgenres && subgenres.length > 0) {
    parts.push(`- Sub-genres: ${subgenres.join(', ')}`);
  }
  if (pacing) {
    parts.push(`- Pacing: ${pacing}`);
  }
  if (pageCount && pageCount > 0) {
    parts.push(`- Page count: ${pageCount}`);
  }
  if (description) {
    parts.push(`- Description: ${description}`);
  }

  parts.push('');
  parts.push(`Write exactly 3-4 bullet points. Mix different types of hints: concrete story hooks (a key element, setting, or trope), genre/tone labels, and "fans of X will love this" comps.`);
  parts.push(`Rules:`);
  parts.push(`1. Each bullet is a SHORT fragment — 2-5 words. No full sentences. Think: labels on a tag, not a review`);
  parts.push(`2. Be specific enough to be interesting but vague enough that you can't identify the book`);
  parts.push(`3. Do NOT mention the title "${title}", the author "${author}", or any character names`);
  parts.push(`4. At least one bullet should be a concrete story element (a setting, trope, or key detail). At least one should be a genre/tone label or reader comp`);
  parts.push(`5. Format: return as a single string, each line starting with "• "`);
  parts.push(``);
  parts.push(`Examples of GOOD bullets (from other books — do NOT reuse these):`);
  parts.push(`• twins`);
  parts.push(`• tragic accident`);
  parts.push(`• psychological thriller`);
  parts.push(`• Girl on a Train fans`);
  parts.push(``);
  parts.push(`Another example:`);
  parts.push(`• remote cabin in the woods`);
  parts.push(`• extreme survival horror`);
  parts.push(`• relentless pacing`);

  return parts.join('\n');
}

/** Parse the blurb from Gemini's JSON response */
export function parseBlurbResponse(responseText: string): string {
  const parsed = JSON.parse(responseText);
  const blurb = parsed.blurb;
  if (!blurb || typeof blurb !== 'string' || blurb.trim().length === 0) {
    throw new Error('Gemini response missing valid blurb field');
  }
  return blurb.trim();
}

export class BlindDateService {
  private apiKey: string | null;
  private batchProgress: BlindDateBatchProgress | null = null;
  private batchAbortController: AbortController | null = null;

  constructor() {
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY || null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  private async callGemini(prompt: string): Promise<string> {
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            blurb: { type: 'STRING' },
          },
          required: ['blurb'],
        },
      },
    };

    const url = `${GEMINI_API_BASE}?key=${this.apiKey}`;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 429) {
        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 2s, 4s
          console.log(`Gemini rate limited (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error('Rate limited — Gemini API quota exceeded. Try again in a minute.');
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${text}`);
      }

      const data: any = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error('No content in Gemini response');
      }

      return parseBlurbResponse(textContent);
    }

    throw new Error('Gemini API failed after retries');
  }

  async generateBlurb(bookId: number): Promise<BlindDateBlurbResult> {
    const bookResult = await query(
      `SELECT id, book_title, author_fullname, description, subgenres, pacing, page_count
       FROM books_with_enrichment WHERE id = $1`,
      [bookId]
    );

    if (bookResult.rows.length === 0) {
      return { book_id: bookId, book_title: 'Unknown', status: 'error', error: 'Book not found' };
    }

    const book = bookResult.rows[0];

    if (!this.isConfigured()) {
      return { book_id: bookId, book_title: book.book_title, status: 'error', error: 'Gemini API key not configured' };
    }

    try {
      const prompt = buildBlurbPrompt(
        book.book_title,
        book.author_fullname || '',
        book.description,
        book.subgenres,
        book.pacing,
        book.page_count ? parseInt(book.page_count) : null
      );

      const blurb = await this.callGemini(prompt);

      await query('UPDATE books SET blind_date_blurb = $1 WHERE id = $2', [blurb, bookId]);

      return { book_id: bookId, book_title: book.book_title, status: 'success', blurb };
    } catch (error: any) {
      return { book_id: bookId, book_title: book.book_title, status: 'error', error: error.message };
    }
  }

  async startBatchBlurbGeneration(limit: number = 10): Promise<void> {
    if (this.batchProgress?.is_running) {
      throw new Error('Batch blurb generation is already running');
    }

    const result = await query(
      `SELECT id, book_title, author_fullname FROM books
       WHERE blind_date = true AND (blind_date_blurb IS NULL OR blind_date_blurb = '')
       AND sold = false
       ORDER BY id LIMIT $1`,
      [limit]
    );

    const books = result.rows;
    if (books.length === 0) {
      this.batchProgress = {
        total: 0, processed: 0, succeeded: 0, errors: 0,
        is_running: false, results: [],
      };
      return;
    }

    this.batchAbortController = new AbortController();
    this.batchProgress = {
      total: books.length, processed: 0, succeeded: 0, errors: 0,
      is_running: true, results: [],
    };

    this.processBatch(books).catch(err => {
      console.error('Batch blurb generation failed:', err);
      if (this.batchProgress) this.batchProgress.is_running = false;
    });
  }

  private async processBatch(books: any[]): Promise<void> {
    for (const book of books) {
      if (this.batchAbortController?.signal.aborted) break;

      const result = await this.generateBlurb(book.id);

      if (!this.batchProgress) break;

      this.batchProgress.processed++;
      this.batchProgress.results.push(result);

      if (result.status === 'success') this.batchProgress.succeeded++;
      else this.batchProgress.errors++;

      // Rate limit between API calls
      if (this.batchProgress.processed < this.batchProgress.total) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    }

    if (this.batchProgress) this.batchProgress.is_running = false;
  }

  cancelBatchGeneration(): void {
    this.batchAbortController?.abort();
    if (this.batchProgress) this.batchProgress.is_running = false;
  }

  getBatchProgress(): BlindDateBatchProgress | null {
    return this.batchProgress;
  }

  async getCandidates(limit: number = 20): Promise<Book[]> {
    const result = await query(
      `SELECT * FROM books_with_enrichment
       WHERE sold = false AND kept = false AND blind_date = false
       AND condition IN ('Like New', 'Very Good')
       AND category != 'YA/Nostalgia'
       AND google_enrichment_id IS NOT NULL
       AND subgenres IS NOT NULL AND array_length(subgenres, 1) > 0
       ORDER BY RANDOM()
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}
