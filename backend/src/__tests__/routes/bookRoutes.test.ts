jest.mock('../../services/bookService');
jest.mock('../../services/geminiService');
jest.mock('../../services/googleBooksService');

import request from 'supertest';
import express from 'express';
import { BookService } from '../../services/bookService';
import bookRoutes from '../../routes/bookRoutes';
import { sampleBook, sampleBook2 } from '../helpers/fixtures';

const app = express();
app.use(express.json());
app.use('/api/books', bookRoutes);

// Get the mocked instance created when bookRoutes imports BookService
const mockService = BookService.prototype as jest.Mocked<BookService>;

describe('Book Routes', () => {
  describe('GET /api/books', () => {
    it('returns 200 with list of books', async () => {
      mockService.getAllBooks.mockResolvedValueOnce([sampleBook, sampleBook2]);

      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].book_title).toBe('The Haunting of Hill House');
    });

    it('passes query params as filters including boolean parsing', async () => {
      mockService.getAllBooks.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/books?category=Mainstream&cleaned=true')
        .expect(200);

      expect(mockService.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Mainstream',
          cleaned: true,
        })
      );
    });

    it('parses sold boolean query param', async () => {
      mockService.getAllBooks.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/books?sold=true')
        .expect(200);

      expect(mockService.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({ sold: true })
      );
    });

    it('parses sold=false query param', async () => {
      mockService.getAllBooks.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/books?sold=false')
        .expect(200);

      expect(mockService.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({ sold: false })
      );
    });

    it('passes sale_event and sale_transaction_id as string filters', async () => {
      mockService.getAllBooks.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/books?sale_event=Flea+Market&sale_transaction_id=TX-001&date_sold=2026-02-15')
        .expect(200);

      expect(mockService.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({
          sale_event: 'Flea Market',
          sale_transaction_id: 'TX-001',
          date_sold: '2026-02-15',
        })
      );
    });

    it('parses kept boolean query param', async () => {
      mockService.getAllBooks.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/books?kept=true')
        .expect(200);

      expect(mockService.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({ kept: true })
      );
    });

    it('parses kept=false query param', async () => {
      mockService.getAllBooks.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/books?kept=false')
        .expect(200);

      expect(mockService.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({ kept: false })
      );
    });

    it('parses pulled_to_read boolean query param', async () => {
      mockService.getAllBooks.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/books?pulled_to_read=true')
        .expect(200);

      expect(mockService.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({ pulled_to_read: true })
      );
    });

    it('returns 500 on service error', async () => {
      mockService.getAllBooks.mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app)
        .get('/api/books')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch books');
    });
  });

  describe('GET /api/books/series', () => {
    it('returns 200 with series list', async () => {
      mockService.getUniqueSeries.mockResolvedValueOnce(['Goosebumps', 'Necroscope']);

      const response = await request(app)
        .get('/api/books/series')
        .expect(200);

      expect(response.body).toEqual(['Goosebumps', 'Necroscope']);
    });
  });

  describe('GET /api/books/authors', () => {
    it('returns 200 with author list', async () => {
      mockService.getUniqueAuthors.mockResolvedValueOnce([
        { first_middle: 'Stephen', last_name: 'King', full_name: 'Stephen King' },
      ]);

      const response = await request(app)
        .get('/api/books/authors')
        .expect(200);

      expect(response.body[0].full_name).toBe('Stephen King');
    });
  });

  describe('GET /api/books/stats', () => {
    it('returns 200 with stats object including sales', async () => {
      mockService.getStats.mockResolvedValueOnce({
        total_books: 682,
        total_value: 4523.50,
        total_cost: 1890.25,
        estimated_profit: 2633.25,
        by_category: [],
        by_condition: [],
        top_authors: [],
        by_genre: [],
        by_subgenre: [],
        by_decade: [],
        rating_distribution: [],
        sales: {
          books_sold: 5,
          total_revenue: 42.50,
          actual_profit: 28.00,
          transaction_count: 3,
          by_event: [],
        },
        books_missing_price: 150,
        reading: {
          pulled_to_read_count: 3,
          kept_count: 2,
          total_kept_cost: 7.49,
        },
        blind_date: {
          active_count: 0,
          total_value: 0,
          with_blurb_count: 0,
          without_blurb_count: 0,
          candidate_count: 0,
        },
      });

      const response = await request(app)
        .get('/api/books/stats')
        .expect(200);

      expect(response.body.total_books).toBe(682);
      expect(response.body.sales).toBeDefined();
      expect(response.body.sales.books_sold).toBe(5);
      expect(response.body.sales.total_revenue).toBe(42.50);
      expect(response.body.reading).toBeDefined();
      expect(response.body.reading.kept_count).toBe(2);
      expect(response.body.reading.pulled_to_read_count).toBe(3);
    });
  });

  describe('GET /api/books/sale-events', () => {
    it('returns 200 with sale events list', async () => {
      mockService.getUniqueSaleEvents.mockResolvedValueOnce(['Flea Market', 'Booth Sale']);

      const response = await request(app)
        .get('/api/books/sale-events')
        .expect(200);

      expect(response.body).toEqual(['Flea Market', 'Booth Sale']);
    });

    it('returns 500 on service error', async () => {
      mockService.getUniqueSaleEvents.mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app)
        .get('/api/books/sale-events')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch sale events');
    });
  });

  describe('GET /api/books/transactions', () => {
    it('returns 200 with transactions list', async () => {
      mockService.getTransactions.mockResolvedValueOnce([
        {
          sale_transaction_id: 'TX-001',
          date_sold: '2026-02-15',
          sale_event: 'Flea Market',
          payment_method: 'Cash',
          book_count: 2,
          total_revenue: 13.00,
          total_profit: 7.51,
          books: [],
        },
      ]);

      const response = await request(app)
        .get('/api/books/transactions')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].sale_transaction_id).toBe('TX-001');
    });

    it('passes filter query params to service', async () => {
      mockService.getTransactions.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/books/transactions?sale_event=Flea+Market&date_sold=2026-02-15&payment_method=Cash')
        .expect(200);

      expect(mockService.getTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          sale_event: 'Flea Market',
          date_sold: '2026-02-15',
          payment_method: 'Cash',
        })
      );
    });

    it('returns 500 on service error', async () => {
      mockService.getTransactions.mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app)
        .get('/api/books/transactions')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch transactions');
    });
  });

  describe('POST /api/books/bulk-sale', () => {
    it('returns 200 with updated books on success', async () => {
      mockService.markBulkSold.mockResolvedValueOnce([
        { ...sampleBook, sold: true, sold_price: 8.00 },
        { ...sampleBook2, sold: true, sold_price: 5.00 },
      ]);

      const response = await request(app)
        .post('/api/books/bulk-sale')
        .send({
          items: [
            { book_id: 1, sold_price: 8.00 },
            { book_id: 2, sold_price: 5.00 },
          ],
          date_sold: '2026-02-15',
          sale_event: 'Flea Market',
          sale_transaction_id: 'TX-001',
          payment_method: 'Cash',
        })
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(mockService.markBulkSold).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            { book_id: 1, sold_price: 8.00 },
            { book_id: 2, sold_price: 5.00 },
          ],
          date_sold: '2026-02-15',
          sale_event: 'Flea Market',
          sale_transaction_id: 'TX-001',
          payment_method: 'Cash',
        })
      );
    });

    it('returns 400 when items array is missing', async () => {
      const response = await request(app)
        .post('/api/books/bulk-sale')
        .send({
          date_sold: '2026-02-15',
          sale_transaction_id: 'TX-001',
          payment_method: 'Cash',
        })
        .expect(400);

      expect(response.body.error).toBe('Items array is required');
    });

    it('returns 400 when items array is empty', async () => {
      const response = await request(app)
        .post('/api/books/bulk-sale')
        .send({
          items: [],
          date_sold: '2026-02-15',
          sale_transaction_id: 'TX-001',
          payment_method: 'Cash',
        })
        .expect(400);

      expect(response.body.error).toBe('Items array is required');
    });

    it('returns 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/books/bulk-sale')
        .send({
          items: [{ book_id: 1, sold_price: 8.00 }],
        })
        .expect(400);

      expect(response.body.error).toBe('date_sold, sale_transaction_id, and payment_method are required');
    });

    it('returns 500 on service error', async () => {
      mockService.markBulkSold.mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app)
        .post('/api/books/bulk-sale')
        .send({
          items: [{ book_id: 1, sold_price: 8.00 }],
          date_sold: '2026-02-15',
          sale_transaction_id: 'TX-001',
          payment_method: 'Cash',
        })
        .expect(500);

      expect(response.body.error).toBe('Failed to process bulk sale');
    });
  });

  describe('GET /api/books/:id', () => {
    it('returns 200 when book found', async () => {
      mockService.getBookById.mockResolvedValueOnce(sampleBook);

      const response = await request(app)
        .get('/api/books/1')
        .expect(200);

      expect(response.body.book_title).toBe('The Haunting of Hill House');
    });

    it('returns 404 when book not found', async () => {
      mockService.getBookById.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/books/999')
        .expect(404);

      expect(response.body.error).toBe('Book not found');
    });

    it('returns 500 on service error', async () => {
      mockService.getBookById.mockRejectedValueOnce(new Error('DB error'));

      await request(app)
        .get('/api/books/1')
        .expect(500);
    });
  });

  describe('POST /api/books', () => {
    it('returns 201 with created book', async () => {
      mockService.createBook.mockResolvedValueOnce({ ...sampleBook, id: 683 });

      const response = await request(app)
        .post('/api/books')
        .send(sampleBook)
        .expect(201);

      expect(response.body.id).toBe(683);
      expect(mockService.createBook).toHaveBeenCalledWith(
        expect.objectContaining({ book_title: 'The Haunting of Hill House' })
      );
    });

    it('returns 500 on service error', async () => {
      mockService.createBook.mockRejectedValueOnce(new Error('DB error'));

      await request(app)
        .post('/api/books')
        .send(sampleBook)
        .expect(500);
    });
  });

  describe('PUT /api/books/:id', () => {
    it('returns 200 with updated book', async () => {
      mockService.updateBook.mockResolvedValueOnce({ ...sampleBook, book_title: 'Updated' });

      const response = await request(app)
        .put('/api/books/1')
        .send({ book_title: 'Updated' })
        .expect(200);

      expect(response.body.book_title).toBe('Updated');
    });

    it('returns 404 when book not found', async () => {
      mockService.updateBook.mockResolvedValueOnce(null);

      await request(app)
        .put('/api/books/999')
        .send({ book_title: 'Updated' })
        .expect(404);
    });

    it('returns 500 on service error', async () => {
      mockService.updateBook.mockRejectedValueOnce(new Error('DB error'));

      await request(app)
        .put('/api/books/1')
        .send({ book_title: 'Updated' })
        .expect(500);
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('returns 204 on successful delete', async () => {
      mockService.deleteBook.mockResolvedValueOnce(true);

      await request(app)
        .delete('/api/books/1')
        .expect(204);
    });

    it('returns 404 when book not found', async () => {
      mockService.deleteBook.mockResolvedValueOnce(false);

      await request(app)
        .delete('/api/books/999')
        .expect(404);
    });

    it('returns 500 on service error', async () => {
      mockService.deleteBook.mockRejectedValueOnce(new Error('DB error'));

      await request(app)
        .delete('/api/books/1')
        .expect(500);
    });
  });

  describe('POST /api/books/bulk-price', () => {
    it('returns 200 with per-book items', async () => {
      mockService.bulkSetPrice.mockResolvedValueOnce([
        { ...sampleBook, our_price: 8.00 },
        { ...sampleBook2, our_price: 5.00 },
      ]);

      const response = await request(app)
        .post('/api/books/bulk-price')
        .send({ items: [{ book_id: 1, our_price: 8 }, { book_id: 2, our_price: 5 }] })
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('returns 200 with flat price mode', async () => {
      mockService.bulkSetPrice.mockResolvedValueOnce([sampleBook]);

      await request(app)
        .post('/api/books/bulk-price')
        .send({ book_ids: [1], our_price: 5 })
        .expect(200);
    });

    it('accepts null our_price in items for clearing', async () => {
      mockService.bulkSetPrice.mockResolvedValueOnce([{ ...sampleBook, our_price: undefined }] as any);

      await request(app)
        .post('/api/books/bulk-price')
        .send({ items: [{ book_id: 1, our_price: null }] })
        .expect(200);
    });

    it('returns 400 when no items or book_ids provided', async () => {
      await request(app)
        .post('/api/books/bulk-price')
        .send({})
        .expect(400);
    });

    it('returns 400 for negative price in items', async () => {
      await request(app)
        .post('/api/books/bulk-price')
        .send({ items: [{ book_id: 1, our_price: -5 }] })
        .expect(400);
    });

    it('returns 500 on service error', async () => {
      mockService.bulkSetPrice.mockRejectedValueOnce(new Error('DB error'));

      await request(app)
        .post('/api/books/bulk-price')
        .send({ items: [{ book_id: 1, our_price: 5 }] })
        .expect(500);
    });
  });

  describe('POST /api/books/clear-prices', () => {
    it('returns 200 with count', async () => {
      mockService.bulkClearPrice.mockResolvedValueOnce(2);

      const response = await request(app)
        .post('/api/books/clear-prices')
        .send({ book_ids: [1, 2] })
        .expect(200);

      expect(response.body.count).toBe(2);
    });

    it('returns 400 when book_ids missing', async () => {
      await request(app)
        .post('/api/books/clear-prices')
        .send({})
        .expect(400);
    });

    it('returns 400 when book_ids is empty', async () => {
      await request(app)
        .post('/api/books/clear-prices')
        .send({ book_ids: [] })
        .expect(400);
    });

    it('returns 500 on service error', async () => {
      mockService.bulkClearPrice.mockRejectedValueOnce(new Error('DB error'));

      await request(app)
        .post('/api/books/clear-prices')
        .send({ book_ids: [1] })
        .expect(500);
    });
  });

  describe('GET /api/books with missing_price filter', () => {
    it('passes missing_price=true as boolean filter', async () => {
      mockService.getAllBooks.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/books?missing_price=true&sold=false')
        .expect(200);

      expect(mockService.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({
          missing_price: true,
          sold: false,
        })
      );
    });
  });
});
