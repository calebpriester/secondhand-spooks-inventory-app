import { query } from '../config/database';
import { Book, BookFilters, BookStats } from '../models/Book';

export class BookService {
  async getAllBooks(filters?: BookFilters): Promise<Book[]> {
    let sql = 'SELECT * FROM books_with_enrichment WHERE 1=1';
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
      if (filters.subgenre) {
        sql += ` AND $${paramCount++} = ANY(subgenres)`;
        params.push(filters.subgenre);
      }
      if (filters.pacing) {
        sql += ` AND pacing = $${paramCount++}`;
        params.push(filters.pacing);
      }
    }

    sql += ' ORDER BY author_last_name ASC, book_title ASC, id ASC';

    const result = await query(sql, params);
    return result.rows;
  }

  async getBookById(id: number): Promise<Book | null> {
    const result = await query('SELECT * FROM books_with_enrichment WHERE id = $1', [id]);
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
    // Only allow columns that exist on the books table (not view-only enrichment fields)
    const allowedColumns = new Set([
      'book_title', 'cleaned', 'author_last_name', 'author_first_middle',
      'book_series', 'vol_number', 'cover_type', 'category', 'condition',
      'date_purchased', 'source', 'seller', 'order_number',
      'thriftbooks_price', 'purchase_price', 'our_price', 'profit_est',
      'author_fullname', 'pulled_to_read', 'subgenres', 'pacing', 'google_enrichment_id',
    ]);

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(book).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && allowedColumns.has(key)) {
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

  async getStats(cleaned?: boolean): Promise<BookStats> {
    const cleanedParam = cleaned ?? null;
    const params = [cleanedParam];
    const cleanedWhere = '($1::boolean IS NULL OR cleaned = $1)';

    const totalQuery = await query(`
      SELECT
        COUNT(*) as total_books,
        COALESCE(SUM(our_price), 0) as total_value,
        COALESCE(SUM(purchase_price), 0) as total_cost,
        COALESCE(SUM(our_price - purchase_price), 0) as estimated_profit
      FROM books_with_enrichment
      WHERE ${cleanedWhere}
    `, params);

    const categoryQuery = await query(`
      SELECT
        category,
        COUNT(*) as count,
        COALESCE(SUM(our_price), 0) as total_value,
        ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(), 0) * 100, 1) as percentage
      FROM books_with_enrichment
      WHERE ${cleanedWhere}
      GROUP BY category
      ORDER BY count DESC
    `, params);

    const conditionQuery = await query(`
      SELECT
        condition,
        COUNT(*) as count,
        ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(), 0) * 100, 1) as percentage
      FROM books_with_enrichment
      WHERE ${cleanedWhere}
      GROUP BY condition
      ORDER BY count DESC
    `, params);

    const authorQuery = await query(`
      SELECT
        author_fullname as author,
        COUNT(*) as count,
        COALESCE(SUM(our_price), 0) as total_value
      FROM books_with_enrichment
      WHERE ${cleanedWhere}
      GROUP BY author_fullname
      ORDER BY count DESC
      LIMIT 10
    `, params);

    const genreQuery = await query(`
      SELECT
        genre,
        COUNT(*) as count,
        ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(), 0) * 100, 1) as percentage
      FROM (
        SELECT UNNEST(genres) as genre
        FROM books_with_enrichment
        WHERE genres IS NOT NULL AND ${cleanedWhere}
      ) g
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 20
    `, params);

    const decadeQuery = await query(`
      SELECT
        CONCAT(FLOOR(CAST(LEFT(published_date, 4) AS INTEGER) / 10) * 10, 's') as decade,
        COUNT(*) as count,
        ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(), 0) * 100, 1) as percentage
      FROM books_with_enrichment
      WHERE published_date IS NOT NULL
        AND LENGTH(published_date) >= 4
        AND LEFT(published_date, 4) ~ '^\\d{4}$'
        AND ${cleanedWhere}
      GROUP BY FLOOR(CAST(LEFT(published_date, 4) AS INTEGER) / 10) * 10
      ORDER BY FLOOR(CAST(LEFT(published_date, 4) AS INTEGER) / 10) * 10 ASC
    `, params);

    const subgenreQuery = await query(`
      SELECT
        subgenre,
        COUNT(*) as count,
        ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(), 0) * 100, 1) as percentage
      FROM (
        SELECT UNNEST(subgenres) as subgenre
        FROM books_with_enrichment
        WHERE subgenres IS NOT NULL AND ${cleanedWhere}
      ) s
      GROUP BY subgenre
      ORDER BY count DESC
    `, params);

    const ratingQuery = await query(`
      SELECT
        CASE
          WHEN google_rating >= 4.5 THEN '4.5-5.0'
          WHEN google_rating >= 4.0 THEN '4.0-4.4'
          WHEN google_rating >= 3.5 THEN '3.5-3.9'
          WHEN google_rating >= 3.0 THEN '3.0-3.4'
          WHEN google_rating >= 2.0 THEN '2.0-2.9'
          ELSE '0-1.9'
        END as rating_bucket,
        COUNT(*) as count,
        ROUND(AVG(google_rating)::numeric, 2) as avg_rating,
        CASE
          WHEN google_rating >= 4.5 THEN 6
          WHEN google_rating >= 4.0 THEN 5
          WHEN google_rating >= 3.5 THEN 4
          WHEN google_rating >= 3.0 THEN 3
          WHEN google_rating >= 2.0 THEN 2
          ELSE 1
        END as sort_order
      FROM books_with_enrichment
      WHERE google_rating IS NOT NULL AND ${cleanedWhere}
      GROUP BY rating_bucket, sort_order
      ORDER BY sort_order ASC
    `, params);

    return {
      total_books: parseInt(totalQuery.rows[0].total_books),
      total_value: parseFloat(totalQuery.rows[0].total_value),
      total_cost: parseFloat(totalQuery.rows[0].total_cost),
      estimated_profit: parseFloat(totalQuery.rows[0].estimated_profit),
      by_category: categoryQuery.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count),
        total_value: parseFloat(row.total_value),
        percentage: parseFloat(row.percentage),
      })),
      by_condition: conditionQuery.rows.map(row => ({
        condition: row.condition,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage),
      })),
      top_authors: authorQuery.rows.map(row => ({
        author: row.author,
        count: parseInt(row.count),
        total_value: parseFloat(row.total_value),
      })),
      by_genre: genreQuery.rows.map(row => ({
        genre: row.genre,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage),
      })),
      by_subgenre: subgenreQuery.rows.map(row => ({
        subgenre: row.subgenre,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage),
      })),
      by_decade: decadeQuery.rows.map(row => ({
        decade: row.decade,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage),
      })),
      rating_distribution: ratingQuery.rows.map(row => ({
        rating_bucket: row.rating_bucket,
        count: parseInt(row.count),
        avg_rating: parseFloat(row.avg_rating),
      })),
    };
  }
}
