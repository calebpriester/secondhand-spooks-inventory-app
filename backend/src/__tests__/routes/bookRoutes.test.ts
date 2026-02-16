jest.mock('../../services/bookService');

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
    it('returns 200 with stats object', async () => {
      mockService.getStats.mockResolvedValueOnce({
        total_books: 682,
        total_value: 4523.50,
        total_cost: 1890.25,
        estimated_profit: 2633.25,
        by_category: [],
        by_condition: [],
        top_authors: [],
      });

      const response = await request(app)
        .get('/api/books/stats')
        .expect(200);

      expect(response.body.total_books).toBe(682);
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
});
