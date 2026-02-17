import { Router, Request, Response } from 'express';
import { BookService } from '../services/bookService';
import { GoogleBooksService } from '../services/googleBooksService';

const router = Router();
const bookService = new BookService();
const googleBooksService = new GoogleBooksService();

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
      search: req.query.search as string,
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

    // Fire-and-forget enrichment
    if (googleBooksService.isConfigured() && book.id) {
      googleBooksService.enrichBook(book.id).catch(err => {
        console.error(`Auto-enrich failed for book ${book.id}:`, err);
      });
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

export default router;
