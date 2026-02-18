import { Router, Request, Response } from 'express';
import { BookService } from '../services/bookService';
import { GoogleBooksService } from '../services/googleBooksService';
import { GeminiService } from '../services/geminiService';
import { BlindDateService } from '../services/blindDateService';

const router = Router();
const bookService = new BookService();
const googleBooksService = new GoogleBooksService();
const geminiService = new GeminiService();
const blindDateService = new BlindDateService();

// Get all books with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      category: req.query.category as string,
      author: req.query.author as string,
      condition: req.query.condition as string,
      cover_type: req.query.cover_type as string,
      source: req.query.source as string,
      cleaned: req.query.cleaned === 'true' ? true : req.query.cleaned === 'false' ? false : undefined,
      pulled_to_read: req.query.pulled_to_read === 'true' ? true : req.query.pulled_to_read === 'false' ? false : undefined,
      kept: req.query.kept === 'true' ? true : req.query.kept === 'false' ? false : undefined,
      search: req.query.search as string,
      subgenre: req.query.subgenre as string,
      pacing: req.query.pacing as string,
      sold: req.query.sold === 'true' ? true : req.query.sold === 'false' ? false : undefined,
      sale_event: req.query.sale_event as string,
      date_sold: req.query.date_sold as string,
      sale_transaction_id: req.query.sale_transaction_id as string,
      missing_price: req.query.missing_price === 'true' ? true : undefined,
      blind_date: req.query.blind_date === 'true' ? true : req.query.blind_date === 'false' ? false : undefined,
      blind_date_candidate: req.query.blind_date_candidate === 'true' ? true : undefined,
    };

    const books = await bookService.getAllBooks(filters);
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Get unique series for autocomplete
router.get('/series', async (req: Request, res: Response) => {
  try {
    const series = await bookService.getUniqueSeries();
    res.json(series);
  } catch (error) {
    console.error('Error fetching series:', error);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

// Get unique sources for autocomplete
router.get('/sources', async (_req: Request, res: Response) => {
  try {
    const sources = await bookService.getUniqueSources();
    res.json(sources);
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// Get unique authors for autocomplete
router.get('/authors', async (req: Request, res: Response) => {
  try {
    const authors = await bookService.getUniqueAuthors();
    res.json(authors);
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
});

// Get book stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const cleaned = req.query.cleaned === 'true' ? true
                  : req.query.cleaned === 'false' ? false
                  : undefined;
    const stats = await bookService.getStats(cleaned);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// --- Enrichment routes (before /:id to avoid path conflicts) ---

// Get enrichment status
router.get('/enrichment/status', async (_req: Request, res: Response) => {
  try {
    const configured = googleBooksService.isConfigured();
    const stats = configured ? await googleBooksService.getEnrichmentStats() : null;
    res.json({ configured, stats });
  } catch (error) {
    console.error('Error checking enrichment status:', error);
    res.status(500).json({ error: 'Failed to check enrichment status' });
  }
});

// Start batch enrichment
router.post('/enrichment/batch', async (req: Request, res: Response) => {
  try {
    if (!googleBooksService.isConfigured()) {
      return res.status(503).json({ error: 'Google Books API key not configured' });
    }
    const limit = req.body.limit || 3;
    await googleBooksService.startBatchEnrichment(limit);
    res.json({ message: 'Batch enrichment started', limit });
  } catch (error: any) {
    console.error('Error starting batch enrichment:', error);
    res.status(500).json({ error: error.message || 'Failed to start batch enrichment' });
  }
});

// Get batch progress
router.get('/enrichment/batch/progress', async (_req: Request, res: Response) => {
  try {
    const progress = googleBooksService.getBatchProgress();
    res.json(progress || { is_running: false, total: 0, processed: 0, succeeded: 0, not_found: 0, errors: 0, results: [] });
  } catch (error) {
    console.error('Error fetching batch progress:', error);
    res.status(500).json({ error: 'Failed to fetch batch progress' });
  }
});

// Cancel batch enrichment
router.post('/enrichment/batch/cancel', async (_req: Request, res: Response) => {
  try {
    googleBooksService.cancelBatchEnrichment();
    res.json({ message: 'Batch enrichment cancelled' });
  } catch (error) {
    console.error('Error cancelling batch enrichment:', error);
    res.status(500).json({ error: 'Failed to cancel batch enrichment' });
  }
});

// --- Gemini tagging routes ---

// Get Gemini tagging status
router.get('/enrichment/gemini/status', async (_req: Request, res: Response) => {
  try {
    const configured = geminiService.isConfigured();
    const stats = configured ? await geminiService.getTaggingStats() : null;
    res.json({ configured, stats });
  } catch (error) {
    console.error('Error checking Gemini status:', error);
    res.status(500).json({ error: 'Failed to check Gemini status' });
  }
});

// Start batch tagging
router.post('/enrichment/gemini/batch', async (req: Request, res: Response) => {
  try {
    if (!geminiService.isConfigured()) {
      return res.status(503).json({ error: 'Gemini API key not configured' });
    }
    const limit = req.body.limit || 5;
    await geminiService.startBatchTagging(limit);
    res.json({ message: 'Batch tagging started', limit });
  } catch (error: any) {
    console.error('Error starting batch tagging:', error);
    res.status(500).json({ error: error.message || 'Failed to start batch tagging' });
  }
});

// Get batch tagging progress
router.get('/enrichment/gemini/batch/progress', async (_req: Request, res: Response) => {
  try {
    const progress = geminiService.getBatchProgress();
    res.json(progress || { is_running: false, total: 0, processed: 0, succeeded: 0, skipped: 0, errors: 0, results: [] });
  } catch (error) {
    console.error('Error fetching batch tagging progress:', error);
    res.status(500).json({ error: 'Failed to fetch batch tagging progress' });
  }
});

// Cancel batch tagging
router.post('/enrichment/gemini/batch/cancel', async (_req: Request, res: Response) => {
  try {
    geminiService.cancelBatchTagging();
    res.json({ message: 'Batch tagging cancelled' });
  } catch (error) {
    console.error('Error cancelling batch tagging:', error);
    res.status(500).json({ error: 'Failed to cancel batch tagging' });
  }
});

// --- Sales routes (before /:id to avoid path conflicts) ---

// Get unique sale events for autocomplete
router.get('/sale-events', async (_req: Request, res: Response) => {
  try {
    const events = await bookService.getUniqueSaleEvents();
    res.json(events);
  } catch (error) {
    console.error('Error fetching sale events:', error);
    res.status(500).json({ error: 'Failed to fetch sale events' });
  }
});

// Get transactions (grouped sold books)
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const filters = {
      sale_event: req.query.sale_event as string,
      date_sold: req.query.date_sold as string,
      payment_method: req.query.payment_method as string,
    };
    const transactions = await bookService.getTransactions(filters);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Mark multiple books as sold in one transaction
router.post('/bulk-sale', async (req: Request, res: Response) => {
  try {
    const { items, date_sold, sale_event, sale_transaction_id, payment_method } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    if (!date_sold || !sale_transaction_id || !payment_method) {
      return res.status(400).json({ error: 'date_sold, sale_transaction_id, and payment_method are required' });
    }
    const results = await bookService.markBulkSold({
      items,
      date_sold,
      sale_event,
      sale_transaction_id,
      payment_method,
    });
    res.json(results);
  } catch (error) {
    console.error('Error processing bulk sale:', error);
    res.status(500).json({ error: 'Failed to process bulk sale' });
  }
});

// Set prices on multiple books at once
router.post('/bulk-price', async (req: Request, res: Response) => {
  try {
    const { items, book_ids, our_price } = req.body;

    const hasItems = items && Array.isArray(items) && items.length > 0;
    const hasFlat = book_ids && Array.isArray(book_ids) && book_ids.length > 0 && our_price !== undefined;

    if (!hasItems && !hasFlat) {
      return res.status(400).json({
        error: 'Provide either items array (per-book prices) or book_ids + our_price (flat price)',
      });
    }

    if (hasItems) {
      for (const item of items) {
        if (!item.book_id || item.our_price === undefined || item.our_price < 0) {
          return res.status(400).json({ error: 'Each item must have book_id and a non-negative our_price' });
        }
      }
    }

    if (hasFlat && our_price < 0) {
      return res.status(400).json({ error: 'our_price must be non-negative' });
    }

    const results = await bookService.bulkSetPrice({ items, book_ids, our_price });
    res.json(results);
  } catch (error) {
    console.error('Error setting bulk prices:', error);
    res.status(500).json({ error: 'Failed to set prices' });
  }
});

// Clear prices on multiple books
router.post('/clear-prices', async (req: Request, res: Response) => {
  try {
    const { book_ids } = req.body;
    if (!book_ids || !Array.isArray(book_ids) || book_ids.length === 0) {
      return res.status(400).json({ error: 'book_ids array is required' });
    }
    const count = await bookService.bulkClearPrice(book_ids);
    res.json({ message: `Cleared prices on ${count} book(s)`, count });
  } catch (error) {
    console.error('Error clearing prices:', error);
    res.status(500).json({ error: 'Failed to clear prices' });
  }
});

// Update transaction details (shared fields + per-book prices)
router.post('/update-transaction', async (req: Request, res: Response) => {
  try {
    const { sale_transaction_id, date_sold, sale_event, payment_method, items } = req.body;
    if (!sale_transaction_id) {
      return res.status(400).json({ error: 'sale_transaction_id is required' });
    }
    const count = await bookService.updateTransaction({
      sale_transaction_id,
      date_sold,
      sale_event,
      payment_method,
      items,
    });
    if (count === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: `Updated ${count} book(s)`, count });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Revert an entire transaction (mark all books as available)
router.post('/revert-transaction', async (req: Request, res: Response) => {
  try {
    const { sale_transaction_id } = req.body;
    if (!sale_transaction_id) {
      return res.status(400).json({ error: 'sale_transaction_id is required' });
    }
    const count = await bookService.revertTransaction(sale_transaction_id);
    if (count === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: `Reverted ${count} book(s)`, count });
  } catch (error) {
    console.error('Error reverting transaction:', error);
    res.status(500).json({ error: 'Failed to revert transaction' });
  }
});

// --- Blind Date routes (before /:id to avoid path conflicts) ---

// Get blind date candidate books
router.get('/blind-date/candidates', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const candidates = await blindDateService.getCandidates(limit);
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching blind date candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Mark books as blind date
router.post('/blind-date/mark', async (req: Request, res: Response) => {
  try {
    const { book_ids } = req.body;
    if (!book_ids || !Array.isArray(book_ids) || book_ids.length === 0) {
      return res.status(400).json({ error: 'book_ids array is required' });
    }
    const results = await bookService.bulkMarkBlindDate(book_ids, true);
    res.json(results);
  } catch (error) {
    console.error('Error marking blind date books:', error);
    res.status(500).json({ error: 'Failed to mark books as blind date' });
  }
});

// Unmark books from blind date
router.post('/blind-date/unmark', async (req: Request, res: Response) => {
  try {
    const { book_ids } = req.body;
    if (!book_ids || !Array.isArray(book_ids) || book_ids.length === 0) {
      return res.status(400).json({ error: 'book_ids array is required' });
    }
    const results = await bookService.bulkMarkBlindDate(book_ids, false);
    res.json(results);
  } catch (error) {
    console.error('Error unmarking blind date books:', error);
    res.status(500).json({ error: 'Failed to unmark books' });
  }
});

// Generate blurb for one book (user-triggered only)
router.post('/blind-date/generate-blurb', async (req: Request, res: Response) => {
  try {
    if (!blindDateService.isConfigured()) {
      return res.status(503).json({ error: 'Gemini API key not configured' });
    }
    const { book_id } = req.body;
    if (!book_id) {
      return res.status(400).json({ error: 'book_id is required' });
    }
    const result = await blindDateService.generateBlurb(book_id);
    res.json(result);
  } catch (error) {
    console.error('Error generating blurb:', error);
    res.status(500).json({ error: 'Failed to generate blurb' });
  }
});

// Start batch blurb generation (user-triggered only)
router.post('/blind-date/batch-blurbs', async (req: Request, res: Response) => {
  try {
    if (!blindDateService.isConfigured()) {
      return res.status(503).json({ error: 'Gemini API key not configured' });
    }
    const limit = req.body.limit || 10;
    await blindDateService.startBatchBlurbGeneration(limit);
    res.json({ message: 'Batch blurb generation started', limit });
  } catch (error: any) {
    console.error('Error starting batch blurb generation:', error);
    res.status(500).json({ error: error.message || 'Failed to start batch blurb generation' });
  }
});

// Get batch blurb generation progress
router.get('/blind-date/batch-blurbs/progress', async (_req: Request, res: Response) => {
  try {
    const progress = blindDateService.getBatchProgress();
    res.json(progress || { is_running: false, total: 0, processed: 0, succeeded: 0, errors: 0, results: [] });
  } catch (error) {
    console.error('Error fetching batch blurb progress:', error);
    res.status(500).json({ error: 'Failed to fetch batch progress' });
  }
});

// Cancel batch blurb generation
router.post('/blind-date/batch-blurbs/cancel', async (_req: Request, res: Response) => {
  try {
    blindDateService.cancelBatchGeneration();
    res.json({ message: 'Batch blurb generation cancelled' });
  } catch (error) {
    console.error('Error cancelling batch blurb generation:', error);
    res.status(500).json({ error: 'Failed to cancel batch generation' });
  }
});

// Get single book
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const book = await bookService.getBookById(id);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Create new book (with auto-enrich)
router.post('/', async (req: Request, res: Response) => {
  try {
    const book = await bookService.createBook(req.body);
    res.status(201).json(book);

    // Fire-and-forget: enrich first, then auto-tag if enrichment succeeded
    if (book.id) {
      (async () => {
        try {
          if (googleBooksService.isConfigured()) {
            const enrichResult = await googleBooksService.enrichBook(book.id!);
            if (enrichResult.status !== 'success') return;
          }
          if (geminiService.isConfigured()) {
            await geminiService.tagBook(book.id!);
          }
        } catch (err) {
          console.error(`Auto-enrich/tag failed for book ${book.id}:`, err);
        }
      })();
    }
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

// Update book
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const book = await bookService.updateBook(id, req.body);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(book);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// Delete book
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await bookService.deleteBook(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Enrich single book on demand (accepts optional title/author overrides in body)
router.post('/:id/enrich', async (req: Request, res: Response) => {
  try {
    if (!googleBooksService.isConfigured()) {
      return res.status(503).json({ error: 'Google Books API key not configured' });
    }
    const id = parseInt(req.params.id);
    const { title, author, isbn } = req.body || {};
    const result = await googleBooksService.enrichBook(id, title, author, isbn);
    res.json(result);
  } catch (error) {
    console.error('Error enriching book:', error);
    res.status(500).json({ error: 'Failed to enrich book' });
  }
});

// Tag single book sub-genres via Gemini
router.post('/:id/tag-subgenres', async (req: Request, res: Response) => {
  try {
    if (!geminiService.isConfigured()) {
      return res.status(503).json({ error: 'Gemini API key not configured' });
    }
    const id = parseInt(req.params.id);
    const result = await geminiService.tagBook(id);
    res.json(result);
  } catch (error) {
    console.error('Error tagging book:', error);
    res.status(500).json({ error: 'Failed to tag book' });
  }
});

export default router;
