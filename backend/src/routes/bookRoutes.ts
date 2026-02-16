import { Router, Request, Response } from 'express';
import { BookService } from '../services/bookService';

const router = Router();
const bookService = new BookService();

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

// Get book stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await bookService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
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

// Create new book
router.post('/', async (req: Request, res: Response) => {
  try {
    const book = await bookService.createBook(req.body);
    res.status(201).json(book);
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

export default router;
