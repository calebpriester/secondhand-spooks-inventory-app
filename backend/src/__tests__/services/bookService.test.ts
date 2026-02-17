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
        expect.stringContaining('SELECT * FROM books_with_enrichment WHERE 1=1'),
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

    it('filters by sold status', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getAllBooks({ sold: true });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('AND sold = $1');
      expect(params).toEqual([true]);
    });

    it('filters by sold=false without skipping it', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getAllBooks({ sold: false });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('AND sold = $1');
      expect(params).toEqual([false]);
    });

    it('filters by sale_event', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getAllBooks({ sale_event: 'Flea Market' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('AND sale_event = $1');
      expect(params).toEqual(['Flea Market']);
    });

    it('filters by date_sold', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getAllBooks({ date_sold: '2026-02-15' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('AND date_sold = $1');
      expect(params).toEqual(['2026-02-15']);
    });

    it('filters by sale_transaction_id', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getAllBooks({ sale_transaction_id: 'TX-001' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('AND sale_transaction_id = $1');
      expect(params).toEqual(['TX-001']);
    });
  });

  describe('getBookById', () => {
    it('returns book when found', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([sampleBook]));

      const result = await service.getBookById(1);

      expect(result).toEqual(sampleBook);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM books_with_enrichment WHERE id = $1', [1]);
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

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM books_with_enrichment WHERE id = $1', [1]);
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

    it('allows sales fields in SET clause', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([{ ...sampleBook, sold: true }]));

      await service.updateBook(1, { sold: true, sold_price: 8.00, date_sold: '2026-02-15', sale_event: 'Flea Market', sale_transaction_id: 'TX-001', payment_method: 'Cash' } as any);

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('sold = $1');
      expect(sql).toContain('sold_price = $2');
      expect(sql).toContain('date_sold = $3');
      expect(sql).toContain('sale_event = $4');
      expect(sql).toContain('sale_transaction_id = $5');
      expect(sql).toContain('payment_method = $6');
      expect(params).toEqual([true, 8.00, '2026-02-15', 'Flea Market', 'TX-001', 'Cash', 1]);
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
    const mockAllStatQueries = () => {
      mockQuery
        .mockResolvedValueOnce(mockRows(rawStatsRows.totals))       // totalQuery
        .mockResolvedValueOnce(mockRows(rawStatsRows.categories))   // categoryQuery
        .mockResolvedValueOnce(mockRows(rawStatsRows.conditions))   // conditionQuery
        .mockResolvedValueOnce(mockRows(rawStatsRows.authors))      // authorQuery
        .mockResolvedValueOnce(mockRows([{ genre: 'Horror', count: '50', percentage: '100.0' }]))  // genreQuery
        .mockResolvedValueOnce(mockRows([{ decade: '1980s', count: '30', percentage: '60.0' }])) // decadeQuery
        .mockResolvedValueOnce(mockRows([{ subgenre: 'Supernatural', count: '20', percentage: '40.0' }])) // subgenreQuery
        .mockResolvedValueOnce(mockRows([{ rating_bucket: '4.0-4.4', count: '15', avg_rating: '4.20' }])) // ratingQuery
        .mockResolvedValueOnce(mockRows(rawStatsRows.sales))        // salesQuery
        .mockResolvedValueOnce(mockRows(rawStatsRows.salesByEvent)); // salesByEventQuery
    };

    it('converts string values from PostgreSQL to numbers', async () => {
      mockAllStatQueries();

      const result = await service.getStats();

      expect(result.total_books).toBe(682);
      expect(typeof result.total_books).toBe('number');
      expect(result.total_value).toBe(4523.50);
      expect(result.total_cost).toBe(1890.25);
      expect(result.estimated_profit).toBe(2633.25);
    });

    it('parses category and condition breakdowns correctly', async () => {
      mockAllStatQueries();

      const result = await service.getStats();

      expect(result.by_category).toHaveLength(2);
      expect(result.by_category[0]).toEqual({ category: 'Mainstream', count: 280, total_value: 2100.00, percentage: 58.3 });
      expect(result.by_condition[0]).toEqual({ condition: 'Good', count: 300, percentage: 60.0 });
      expect(result.top_authors[0]).toEqual({ author: 'Stephen King', count: 45, total_value: 350.00 });
    });

    it('parses sales stats correctly', async () => {
      mockAllStatQueries();

      const result = await service.getStats();

      expect(result.sales).toBeDefined();
      expect(result.sales.books_sold).toBe(5);
      expect(result.sales.total_revenue).toBe(42.50);
      expect(result.sales.actual_profit).toBe(28.00);
      expect(result.sales.transaction_count).toBe(3);
      expect(result.sales.by_event).toHaveLength(2);
      expect(result.sales.by_event[0]).toEqual({ event: 'Flea Market', count: 3, revenue: 25.00, profit: 17.00 });
      expect(result.sales.by_event[1]).toEqual({ event: 'No Event', count: 2, revenue: 17.50, profit: 11.00 });
    });
  });

  describe('getUniqueSaleEvents', () => {
    it('returns mapped sale event names', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([
        { sale_event: 'Flea Market' },
        { sale_event: 'Booth Sale' },
      ]));

      const result = await service.getUniqueSaleEvents();

      expect(result).toEqual(['Flea Market', 'Booth Sale']);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT sale_event'),
      );
    });

    it('returns empty array when no sale events exist', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      const result = await service.getUniqueSaleEvents();

      expect(result).toEqual([]);
    });
  });

  describe('markBulkSold', () => {
    it('updates multiple books as sold and returns results', async () => {
      const soldBook1 = { ...sampleBook, sold: true, sold_price: 8.00, date_sold: '2026-02-15' };
      const soldBook2 = { ...sampleBook2, sold: true, sold_price: 5.00, date_sold: '2026-02-15' };

      mockQuery
        .mockResolvedValueOnce(mockRows([soldBook1]))
        .mockResolvedValueOnce(mockRows([soldBook2]));

      const result = await service.markBulkSold({
        items: [
          { book_id: 1, sold_price: 8.00 },
          { book_id: 2, sold_price: 5.00 },
        ],
        date_sold: '2026-02-15',
        sale_event: 'Flea Market',
        sale_transaction_id: 'TX-001',
        payment_method: 'Cash',
      });

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledTimes(2);

      // Verify first call
      const [sql1, params1] = mockQuery.mock.calls[0];
      expect(sql1).toContain('UPDATE books SET sold = true');
      expect(params1).toEqual([8.00, '2026-02-15', 'Flea Market', 'TX-001', 'Cash', 1]);

      // Verify second call
      const [, params2] = mockQuery.mock.calls[1];
      expect(params2).toEqual([5.00, '2026-02-15', 'Flea Market', 'TX-001', 'Cash', 2]);
    });

    it('skips books that return no rows', async () => {
      mockQuery
        .mockResolvedValueOnce(mockRows([{ ...sampleBook, sold: true }]))
        .mockResolvedValueOnce(mockRows([])); // book not found

      const result = await service.markBulkSold({
        items: [
          { book_id: 1, sold_price: 8.00 },
          { book_id: 999, sold_price: 5.00 },
        ],
        date_sold: '2026-02-15',
        sale_transaction_id: 'TX-002',
        payment_method: 'Card',
      });

      expect(result).toHaveLength(1);
    });

    it('passes null for optional sale_event when not provided', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([{ ...sampleBook, sold: true }]));

      await service.markBulkSold({
        items: [{ book_id: 1, sold_price: 8.00 }],
        date_sold: '2026-02-15',
        sale_transaction_id: 'TX-003',
        payment_method: 'Cash',
      });

      const [, params] = mockQuery.mock.calls[0];
      expect(params![2]).toBeNull(); // sale_event should be null
    });
  });

  describe('getTransactions', () => {
    it('groups rows by transaction ID', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([
        {
          sale_transaction_id: 'TX-001', date_sold: '2026-02-15', sale_event: 'Flea Market',
          payment_method: 'Cash', id: 1, book_title: 'The Haunting of Hill House',
          author_fullname: 'Shirley Jackson', sold_price: '8.00', purchase_price: '3.99',
          cover_image_url: 'http://example.com/cover1.jpg',
        },
        {
          sale_transaction_id: 'TX-001', date_sold: '2026-02-15', sale_event: 'Flea Market',
          payment_method: 'Cash', id: 2, book_title: 'Welcome to Dead House',
          author_fullname: 'R.L. Stine', sold_price: '5.00', purchase_price: '1.50',
          cover_image_url: null,
        },
        {
          sale_transaction_id: 'TX-002', date_sold: '2026-02-14', sale_event: null,
          payment_method: 'Card', id: 3, book_title: 'It',
          author_fullname: 'Stephen King', sold_price: '12.00', purchase_price: '5.00',
          cover_image_url: 'http://example.com/cover3.jpg',
        },
      ]));

      const result = await service.getTransactions();

      expect(result).toHaveLength(2);

      // First transaction: TX-001 with 2 books
      expect(result[0].sale_transaction_id).toBe('TX-001');
      expect(result[0].book_count).toBe(2);
      expect(result[0].total_revenue).toBe(13.00);
      expect(result[0].total_profit).toBeCloseTo(7.51, 2);
      expect(result[0].books).toHaveLength(2);
      expect(result[0].books[0].book_title).toBe('The Haunting of Hill House');
      expect(result[0].books[1].cover_image_url).toBeNull();

      // Second transaction: TX-002 with 1 book
      expect(result[1].sale_transaction_id).toBe('TX-002');
      expect(result[1].book_count).toBe(1);
      expect(result[1].total_revenue).toBe(12.00);
      expect(result[1].payment_method).toBe('Card');
    });

    it('applies sale_event filter', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getTransactions({ sale_event: 'Flea Market' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('AND sale_event = $1');
      expect(params).toEqual(['Flea Market']);
    });

    it('applies date_sold filter', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getTransactions({ date_sold: '2026-02-15' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('AND date_sold = $1');
      expect(params).toEqual(['2026-02-15']);
    });

    it('applies payment_method filter', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getTransactions({ payment_method: 'Cash' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('AND payment_method = $1');
      expect(params).toEqual(['Cash']);
    });

    it('applies multiple filters simultaneously', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.getTransactions({ sale_event: 'Booth Sale', date_sold: '2026-02-15', payment_method: 'Card' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('AND sale_event = $1');
      expect(sql).toContain('AND date_sold = $2');
      expect(sql).toContain('AND payment_method = $3');
      expect(params).toEqual(['Booth Sale', '2026-02-15', 'Card']);
    });

    it('returns empty array when no transactions exist', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      const result = await service.getTransactions();

      expect(result).toEqual([]);
    });

    it('handles null purchase_price in profit calculation', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([
        {
          sale_transaction_id: 'TX-010', date_sold: '2026-02-15', sale_event: null,
          payment_method: 'Cash', id: 10, book_title: 'Mystery Book',
          author_fullname: 'Unknown Author', sold_price: '6.00', purchase_price: null,
          cover_image_url: null,
        },
      ]));

      const result = await service.getTransactions();

      expect(result[0].total_revenue).toBe(6.00);
      expect(result[0].total_profit).toBe(6.00); // sold_price - 0 (null purchase_price)
      expect(result[0].books[0].purchase_price).toBeNull();
    });
  });

  describe('updateTransaction', () => {
    it('updates shared fields on all books in transaction', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([])); // shared fields UPDATE
      mockQuery.mockResolvedValueOnce(mockRows([{ count: '2' }])); // count query

      const result = await service.updateTransaction({
        sale_transaction_id: 'tx-123',
        date_sold: '2026-02-17',
        sale_event: 'New Event',
        payment_method: 'Card',
      });

      expect(result).toBe(2);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('UPDATE books SET');
      expect(sql).toContain('date_sold');
      expect(sql).toContain('sale_event');
      expect(sql).toContain('payment_method');
      expect(params).toContain('tx-123');
    });

    it('updates per-book prices', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([])); // shared fields UPDATE
      mockQuery.mockResolvedValueOnce(mockRows([])); // item 1 UPDATE
      mockQuery.mockResolvedValueOnce(mockRows([])); // item 2 UPDATE
      mockQuery.mockResolvedValueOnce(mockRows([{ count: '2' }])); // count query

      await service.updateTransaction({
        sale_transaction_id: 'tx-123',
        date_sold: '2026-02-17',
        items: [
          { book_id: 1, sold_price: 5.00 },
          { book_id: 2, sold_price: 3.00 },
        ],
      });

      // calls[1] and calls[2] are the per-book updates
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE books SET sold_price');
      expect(mockQuery.mock.calls[1][1]).toEqual([5.00, 1, 'tx-123']);
      expect(mockQuery.mock.calls[2][1]).toEqual([3.00, 2, 'tx-123']);
    });

    it('skips shared fields update when none provided', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([{ count: '1' }])); // count query only

      await service.updateTransaction({
        sale_transaction_id: 'tx-123',
      });

      // Only the count query should have been called
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('revertTransaction', () => {
    it('clears sale fields and returns count', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([{ id: 1 }, { id: 2 }], 2));

      const result = await service.revertTransaction('tx-123');

      expect(result).toBe(2);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('UPDATE books SET sold = false');
      expect(sql).toContain('sold_price = NULL');
      expect(sql).toContain('sale_transaction_id = NULL');
      expect(params).toEqual(['tx-123']);
    });

    it('returns 0 when transaction not found', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([], 0));

      const result = await service.revertTransaction('nonexistent');

      expect(result).toBe(0);
    });
  });
});
