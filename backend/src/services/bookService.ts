import { query } from '../config/database';
import { Book, BookFilters, BookStats } from '../models/Book';

export class BookService {
  async getAllBooks(filters?: BookFilters): Promise<Book[]> {
    let sql = 'SELECT * FROM books WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters) {
      if (filters.category) {
        sql += ` AND category = $${paramCount++}`;
        params.push(filters.category);
      }
      if (filters.author) {
        sql += ` AND author_fullname ILIKE $${paramCount++}`;
        params.push(`%${filters.author}%`);
      }
      if (filters.condition) {
        sql += ` AND condition = $${paramCount++}`;
        params.push(filters.condition);
      }
      if (filters.cover_type) {
        sql += ` AND cover_type = $${paramCount++}`;
        params.push(filters.cover_type);
      }
      if (filters.source) {
        sql += ` AND source = $${paramCount++}`;
        params.push(filters.source);
      }
      if (filters.cleaned !== undefined) {
        sql += ` AND cleaned = $${paramCount++}`;
        params.push(filters.cleaned);
      }
      if (filters.pulled_to_read !== undefined) {
        sql += ` AND pulled_to_read = $${paramCount++}`;
        params.push(filters.pulled_to_read);
      }
      if (filters.search) {
        sql += ` AND (book_title ILIKE $${paramCount} OR author_fullname ILIKE $${paramCount} OR book_series ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
        paramCount++;
      }
    }

    sql += ' ORDER BY date_purchased DESC, id DESC';

    const result = await query(sql, params);
    return result.rows;
  }

  async getBookById(id: number): Promise<Book | null> {
    const result = await query('SELECT * FROM books WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async createBook(book: Book): Promise<Book> {
    const sql = `
      INSERT INTO books (
        book_title, cleaned, author_last_name, author_first_middle, book_series,
        vol_number, cover_type, category, condition, date_purchased, source,
        seller, order_number, thriftbooks_price, purchase_price, our_price,
        profit_est, author_fullname, pulled_to_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const values = [
      book.book_title,
      book.cleaned,
      book.author_last_name,
      book.author_first_middle,
      book.book_series,
      book.vol_number,
      book.cover_type,
      book.category,
      book.condition,
      book.date_purchased,
      book.source,
      book.seller,
      book.order_number,
      book.thriftbooks_price,
      book.purchase_price,
      book.our_price,
      book.profit_est,
      book.author_fullname,
      book.pulled_to_read,
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  async updateBook(id: number, book: Partial<Book>): Promise<Book | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(book).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getBookById(id);
    }

    values.push(id);
    const sql = `UPDATE books SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  async deleteBook(id: number): Promise<boolean> {
    const result = await query('DELETE FROM books WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getUniqueSeries(): Promise<string[]> {
    const result = await query(`
      SELECT DISTINCT book_series
      FROM books
      WHERE book_series IS NOT NULL AND book_series <> ''
      ORDER BY book_series
    `);

    return result.rows.map(row => row.book_series);
  }

  async getUniqueAuthors(): Promise<{ first_middle: string; last_name: string; full_name: string }[]> {
    const result = await query(`
      SELECT DISTINCT
        author_first_middle,
        author_last_name,
        author_fullname
      FROM books
      WHERE author_fullname IS NOT NULL
      ORDER BY author_fullname
    `);

    return result.rows.map(row => ({
      first_middle: row.author_first_middle || '',
      last_name: row.author_last_name,
      full_name: row.author_fullname,
    }));
  }

  async getStats(): Promise<BookStats> {
    const totalQuery = await query(`
      SELECT
        COUNT(*) as total_books,
        COALESCE(SUM(our_price), 0) as total_value,
        COALESCE(SUM(purchase_price), 0) as total_cost,
        COALESCE(SUM(our_price - purchase_price), 0) as estimated_profit
      FROM books
    `);

    const categoryQuery = await query(`
      SELECT
        category,
        COUNT(*) as count,
        COALESCE(SUM(our_price), 0) as total_value
      FROM books
      GROUP BY category
      ORDER BY count DESC
    `);

    const conditionQuery = await query(`
      SELECT
        condition,
        COUNT(*) as count
      FROM books
      GROUP BY condition
      ORDER BY count DESC
    `);

    const authorQuery = await query(`
      SELECT
        author_fullname as author,
        COUNT(*) as count,
        COALESCE(SUM(our_price), 0) as total_value
      FROM books
      GROUP BY author_fullname
      ORDER BY count DESC
      LIMIT 10
    `);

    return {
      total_books: parseInt(totalQuery.rows[0].total_books),
      total_value: parseFloat(totalQuery.rows[0].total_value),
      total_cost: parseFloat(totalQuery.rows[0].total_cost),
      estimated_profit: parseFloat(totalQuery.rows[0].estimated_profit),
      by_category: categoryQuery.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count),
        total_value: parseFloat(row.total_value),
      })),
      by_condition: conditionQuery.rows.map(row => ({
        condition: row.condition,
        count: parseInt(row.count),
      })),
      top_authors: authorQuery.rows.map(row => ({
        author: row.author,
        count: parseInt(row.count),
        total_value: parseFloat(row.total_value),
      })),
    };
  }
}
