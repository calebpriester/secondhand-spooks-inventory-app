jest.mock('../../config/database');

import { query } from '../../config/database';
import { BookService } from '../../services/bookService';
import { sampleBook, sampleBook2, rawStatsRows } from '../helpers/fixtures';

const mockQuery = query as jest.MockedFunction<typeof query>;
let service: BookService;

beforeEach(() => {
  service = new BookService();
});

const mockRows = (rows: any[], rowCount?: number) =>
  ({ rows, rowCount: rowCount ?? rows.length, command: '', oid: 0, fields: [] }) as any;

describe('BookService', () => {
  describe('getAllBooks', () => {
    it('returns all books with no filters', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([sampleBook, sampleBook2]));

      const result = await service.getAllBooks();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM books WHERE 1=1'),
        []
      );
      expect(result).toHaveLength(2);
    });

    it('filters by category', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([sampleBook]));

      await service.getAllBooks({ category: 'Mainstream' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND category = $1'),
        ['Mainstream']
      );
    });

    it('filters by multiple criteria', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getAllBooks({ category: 'Mainstream', condition: 'Good', cover_type: 'Paper' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('AND category = $1');
      expect(sql).toContain('AND condition = $2');
      expect(sql).toContain('AND cover_type = $3');
      expect(params).toEqual(['Mainstream', 'Good', 'Paper']);
    });

    it('uses ILIKE for search across title, author, and series', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getAllBooks({ search: 'haunting' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('book_title ILIKE');
      expect(sql).toContain('author_fullname ILIKE');
      expect(sql).toContain('book_series ILIKE');
      expect(params).toEqual(['%haunting%']);
    });

    it('uses ILIKE for author filter', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getAllBooks({ author: 'king' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('author_fullname ILIKE'),
        ['%king%']
      );
    });

    it('handles cleaned=false without skipping it', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getAllBooks({ cleaned: false });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('AND cleaned = $1');
      expect(params).toEqual([false]);
    });
  });

  describe('getBookById', () => {
    it('returns book when found', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([sampleBook]));

      const result = await service.getBookById(1);

      expect(result).toEqual(sampleBook);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM books WHERE id = $1', [1]);
    });

    it('returns null when not found', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      const result = await service.getBookById(999);

      expect(result).toBeNull();
    });
  });

  describe('createBook', () => {
    it('inserts book with all 19 fields in correct order', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([{ ...sampleBook, id: 1 }]));

      const result = await service.createBook(sampleBook);

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO books');
      expect(sql).toContain('RETURNING *');
      expect(params).toHaveLength(19);
      expect(params![0]).toBe(sampleBook.book_title);
      expect(params![1]).toBe(sampleBook.cleaned);
      expect(params![2]).toBe(sampleBook.author_last_name);
      expect(params![17]).toBe(sampleBook.author_fullname);
      expect(params![18]).toBe(sampleBook.pulled_to_read);
      expect(result.id).toBe(1);
    });
  });

  describe('updateBook', () => {
    it('builds UPDATE for partial fields', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([{ ...sampleBook, book_title: 'New Title' }]));

      await service.updateBook(1, { book_title: 'New Title' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('UPDATE books SET book_title = $1 WHERE id = $2');
      expect(params).toEqual(['New Title', 1]);
    });

    it('falls through to getBookById when no fields provided', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([sampleBook]));

      const result = await service.updateBook(1, {});

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM books WHERE id = $1', [1]);
      expect(result).toEqual(sampleBook);
    });

    it('skips id field in SET clause', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([sampleBook]));

      await service.updateBook(1, { id: 999, book_title: 'Test' } as any);

      const [sql, params] = mockQuery.mock.calls[0];
      // SET should only have book_title, not id
      expect(sql).toMatch(/SET book_title = \$1 WHERE/);
      expect(params).toEqual(['Test', 1]);
    });
  });

  describe('deleteBook', () => {
    it('returns true on successful delete', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([], 1));

      const result = await service.deleteBook(1);

      expect(result).toBe(true);
    });

    it('returns false when book not found', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([], 0));

      const result = await service.deleteBook(999);

      expect(result).toBe(false);
    });
  });

  describe('getUniqueSeries', () => {
    it('returns mapped series names', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([
        { book_series: 'Goosebumps' },
        { book_series: 'Necroscope' },
      ]));

      const result = await service.getUniqueSeries();

      expect(result).toEqual(['Goosebumps', 'Necroscope']);
    });
  });

  describe('getUniqueAuthors', () => {
    it('maps database fields to response format', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([
        { author_first_middle: 'Stephen', author_last_name: 'King', author_fullname: 'Stephen King' },
      ]));

      const result = await service.getUniqueAuthors();

      expect(result).toEqual([
        { first_middle: 'Stephen', last_name: 'King', full_name: 'Stephen King' },
      ]);
    });

    it('converts null first_middle to empty string', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([
        { author_first_middle: null, author_last_name: 'Unknown', author_fullname: 'Unknown' },
      ]));

      const result = await service.getUniqueAuthors();

      expect(result[0].first_middle).toBe('');
    });
  });

  describe('getStats', () => {
    it('converts string values from PostgreSQL to numbers', async () => {
      mockQuery
        .mockResolvedValueOnce(mockRows(rawStatsRows.totals))
        .mockResolvedValueOnce(mockRows(rawStatsRows.categories))
        .mockResolvedValueOnce(mockRows(rawStatsRows.conditions))
        .mockResolvedValueOnce(mockRows(rawStatsRows.authors));

      const result = await service.getStats();

      expect(result.total_books).toBe(682);
      expect(typeof result.total_books).toBe('number');
      expect(result.total_value).toBe(4523.50);
      expect(result.total_cost).toBe(1890.25);
      expect(result.estimated_profit).toBe(2633.25);
    });

    it('parses category and condition breakdowns correctly', async () => {
      mockQuery
        .mockResolvedValueOnce(mockRows(rawStatsRows.totals))
        .mockResolvedValueOnce(mockRows(rawStatsRows.categories))
        .mockResolvedValueOnce(mockRows(rawStatsRows.conditions))
        .mockResolvedValueOnce(mockRows(rawStatsRows.authors));

      const result = await service.getStats();

      expect(result.by_category).toHaveLength(2);
      expect(result.by_category[0]).toEqual({ category: 'Mainstream', count: 280, total_value: 2100.00 });
      expect(result.by_condition[0]).toEqual({ condition: 'Good', count: 300 });
      expect(result.top_authors[0]).toEqual({ author: 'Stephen King', count: 45, total_value: 350.00 });
    });
  });
});
