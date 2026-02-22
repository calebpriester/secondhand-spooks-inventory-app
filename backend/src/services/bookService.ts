import { query, QueryExecutor } from '../config/database';
import { Book, BookFilters, BookStats, BulkSaleRequest, BulkPriceRequest, UpdateTransactionRequest, Transaction, PricingStats, PricePoint, PricingStatsFilters, PriceByConditionRow } from '../models/Book';

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
      if (filters.kept !== undefined) {
        sql += ` AND kept = $${paramCount++}`;
        params.push(filters.kept);
      }
      if (filters.search) {
        const blindDateNum = filters.search.replace(/^#/, '').trim();
        sql += ` AND (book_title ILIKE $${paramCount} OR author_fullname ILIKE $${paramCount} OR book_series ILIKE $${paramCount} OR blind_date_number = $${paramCount + 1})`;
        params.push(`%${filters.search}%`);
        params.push(blindDateNum);
        paramCount += 2;
      }
      if (filters.subgenre) {
        sql += ` AND $${paramCount++} = ANY(subgenres)`;
        params.push(filters.subgenre);
      }
      if (filters.pacing) {
        sql += ` AND pacing = $${paramCount++}`;
        params.push(filters.pacing);
      }
      if (filters.sold !== undefined) {
        sql += ` AND sold = $${paramCount++}`;
        params.push(filters.sold);
      }
      if (filters.sale_event) {
        sql += ` AND sale_event = $${paramCount++}`;
        params.push(filters.sale_event);
      }
      if (filters.date_sold) {
        sql += ` AND date_sold = $${paramCount++}`;
        params.push(filters.date_sold);
      }
      if (filters.sale_transaction_id) {
        sql += ` AND sale_transaction_id = $${paramCount++}`;
        params.push(filters.sale_transaction_id);
      }
      if (filters.missing_price) {
        sql += ' AND our_price IS NULL';
      }
      if (filters.blind_date !== undefined) {
        sql += ` AND blind_date = $${paramCount++}`;
        params.push(filters.blind_date);
      }
      if (filters.blind_date_candidate) {
        sql += ` AND sold = false AND kept = false AND blind_date = false`;
        sql += ` AND condition IN ('Like New', 'Very Good')`;
        sql += ` AND category != 'YA/Nostalgia'`;
        sql += ` AND google_enrichment_id IS NOT NULL`;
        sql += ` AND subgenres IS NOT NULL AND array_length(subgenres, 1) > 0`;
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
        seller, order_number, purchase_price, our_price,
        profit_est, author_fullname, pulled_to_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
      'purchase_price', 'our_price', 'profit_est',
      'author_fullname', 'pulled_to_read', 'kept', 'date_kept', 'subgenres', 'pacing', 'google_enrichment_id',
      'sold', 'date_sold', 'sold_price', 'sale_event', 'sale_transaction_id', 'payment_method',
      'blind_date', 'blind_date_number', 'blind_date_blurb',
    ]);

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(book).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && allowedColumns.has(key)) {
        if (!/^[a-z_][a-z0-9_]*$/.test(key)) {
          throw new Error(`Invalid column name: ${key}`);
        }
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

  async getUniqueSources(): Promise<string[]> {
    const result = await query(`
      SELECT DISTINCT source
      FROM books
      WHERE source IS NOT NULL AND source <> ''
      ORDER BY source
    `);
    return result.rows.map(row => row.source);
  }

  async getUniqueSaleEvents(): Promise<string[]> {
    const result = await query(`
      SELECT DISTINCT sale_event
      FROM books
      WHERE sale_event IS NOT NULL AND sale_event <> ''
      ORDER BY sale_event
    `);
    return result.rows.map(row => row.sale_event);
  }

  async markBulkSold(request: BulkSaleRequest): Promise<Book[]> {
    const ids = request.items.map(i => i.book_id);
    const prices = request.items.map(i => i.sold_price);
    const result = await query(
      `UPDATE books SET sold = true,
         sold_price = v.price, date_sold = $3, sale_event = $4,
         sale_transaction_id = $5, payment_method = $6
       FROM unnest($1::int[], $2::numeric[]) AS v(id, price)
       WHERE books.id = v.id
       RETURNING *`,
      [ids, prices, request.date_sold, request.sale_event || null,
       request.sale_transaction_id, request.payment_method]
    );
    return result.rows;
  }

  async bulkSetPrice(request: BulkPriceRequest): Promise<Book[]> {
    if (request.items && request.items.length > 0) {
      const ids = request.items.map(i => i.book_id);
      const prices = request.items.map(i => i.our_price);
      const result = await query(
        `UPDATE books SET our_price = v.price,
         profit_est = CASE WHEN purchase_price IS NOT NULL AND v.price IS NOT NULL THEN v.price - purchase_price ELSE NULL END
         FROM unnest($1::int[], $2::numeric[]) AS v(id, price)
         WHERE books.id = v.id
         RETURNING *`,
        [ids, prices]
      );
      return result.rows;
    } else if (request.book_ids && request.book_ids.length > 0 && request.our_price !== undefined) {
      const result = await query(
        `UPDATE books SET our_price = $1,
         profit_est = CASE WHEN purchase_price IS NOT NULL THEN $1 - purchase_price ELSE NULL END
         WHERE id = ANY($2::int[])
         RETURNING *`,
        [request.our_price, request.book_ids]
      );
      return result.rows;
    }

    return [];
  }

  async bulkClearPrice(bookIds: number[]): Promise<number> {
    if (bookIds.length === 0) return 0;
    const result = await query(
      'UPDATE books SET our_price = NULL, profit_est = NULL WHERE id = ANY($1::int[]) RETURNING id',
      [bookIds]
    );
    return result.rowCount || 0;
  }

  async revertTransaction(saleTransactionId: string): Promise<number> {
    const result = await query(
      `UPDATE books SET sold = false, sold_price = NULL, date_sold = NULL,
       sale_event = NULL, sale_transaction_id = NULL, payment_method = NULL
       WHERE sale_transaction_id = $1 RETURNING id`,
      [saleTransactionId]
    );
    return result.rowCount || 0;
  }

  async updateTransaction(request: UpdateTransactionRequest, executor?: QueryExecutor): Promise<number> {
    const exec = executor ?? { query };

    // Update shared fields on all books in the transaction
    const sharedFields: string[] = [];
    const sharedParams: any[] = [];
    let paramCount = 1;

    if (request.date_sold !== undefined) {
      sharedFields.push(`date_sold = $${paramCount++}`);
      sharedParams.push(request.date_sold);
    }
    if (request.sale_event !== undefined) {
      sharedFields.push(`sale_event = $${paramCount++}`);
      sharedParams.push(request.sale_event);
    }
    if (request.payment_method !== undefined) {
      sharedFields.push(`payment_method = $${paramCount++}`);
      sharedParams.push(request.payment_method);
    }

    if (sharedFields.length > 0) {
      sharedParams.push(request.sale_transaction_id);
      await exec.query(
        `UPDATE books SET ${sharedFields.join(', ')} WHERE sale_transaction_id = $${paramCount}`,
        sharedParams
      );
    }

    // Update per-book sold_price
    if (request.items && request.items.length > 0) {
      const ids = request.items.map(i => i.book_id);
      const prices = request.items.map(i => i.sold_price);
      await exec.query(
        `UPDATE books SET sold_price = v.price
         FROM unnest($1::int[], $2::numeric[]) AS v(id, price)
         WHERE books.id = v.id AND books.sale_transaction_id = $3`,
        [ids, prices, request.sale_transaction_id]
      );
    }

    const countResult = await exec.query(
      'SELECT COUNT(*) as count FROM books WHERE sale_transaction_id = $1',
      [request.sale_transaction_id]
    );
    return parseInt(countResult.rows[0].count);
  }

  async getTransactions(filters?: { sale_event?: string; date_sold?: string; payment_method?: string }): Promise<Transaction[]> {
    let sql = `
      SELECT
        sale_transaction_id, date_sold, sale_event, payment_method,
        id, book_title, author_fullname, sold_price, purchase_price, cover_image_url,
        blind_date, blind_date_number
      FROM books_with_enrichment
      WHERE sold = true AND sale_transaction_id IS NOT NULL
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.sale_event) {
      sql += ` AND sale_event = $${paramCount++}`;
      params.push(filters.sale_event);
    }
    if (filters?.date_sold) {
      sql += ` AND date_sold = $${paramCount++}`;
      params.push(filters.date_sold);
    }
    if (filters?.payment_method) {
      sql += ` AND payment_method = $${paramCount++}`;
      params.push(filters.payment_method);
    }

    sql += ' ORDER BY date_sold DESC, sale_transaction_id, book_title ASC';

    const result = await query(sql, params);

    // Group rows by transaction ID
    const transactionMap = new Map<string, Transaction>();
    for (const row of result.rows) {
      const txId = row.sale_transaction_id;
      if (!transactionMap.has(txId)) {
        transactionMap.set(txId, {
          sale_transaction_id: txId,
          date_sold: row.date_sold,
          sale_event: row.sale_event,
          payment_method: row.payment_method,
          book_count: 0,
          total_revenue: 0,
          total_profit: 0,
          books: [],
        });
      }
      const tx = transactionMap.get(txId)!;
      const soldPrice = parseFloat(row.sold_price) || 0;
      const purchasePrice = parseFloat(row.purchase_price) || 0;
      tx.book_count++;
      tx.total_revenue += soldPrice;
      tx.total_profit += soldPrice - purchasePrice;
      tx.books.push({
        id: row.id,
        book_title: row.book_title,
        author_fullname: row.author_fullname,
        sold_price: soldPrice,
        purchase_price: row.purchase_price ? purchasePrice : null,
        cover_image_url: row.cover_image_url || null,
        blind_date: row.blind_date || false,
        blind_date_number: row.blind_date_number || null,
      });
    }

    return Array.from(transactionMap.values());
  }

  async getStats(cleaned?: boolean): Promise<BookStats> {
    const cleanedParam = cleaned ?? null;
    const params = [cleanedParam];
    const cleanedWhere = '($1::boolean IS NULL OR cleaned = $1)';

    const [
      totalQuery, categoryQuery, conditionQuery, authorQuery,
      genreQuery, decadeQuery, subgenreQuery, ratingQuery,
      salesQuery, salesByEventQuery, missingPriceQuery,
      readingQuery, blindDateQuery,
    ] = await Promise.all([
      query(`
        SELECT
          COUNT(*) as total_books,
          COALESCE(SUM(our_price), 0) as total_value,
          COALESCE(SUM(purchase_price), 0) as total_cost,
          COALESCE(SUM(our_price - purchase_price), 0) as estimated_profit
        FROM books_with_enrichment
        WHERE ${cleanedWhere}
      `, params),
      query(`
        SELECT
          category,
          COUNT(*) as count,
          COALESCE(SUM(our_price), 0) as total_value,
          ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(), 0) * 100, 1) as percentage
        FROM books_with_enrichment
        WHERE ${cleanedWhere}
        GROUP BY category
        ORDER BY count DESC
      `, params),
      query(`
        SELECT
          condition,
          COUNT(*) as count,
          ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(), 0) * 100, 1) as percentage
        FROM books_with_enrichment
        WHERE ${cleanedWhere}
        GROUP BY condition
        ORDER BY count DESC
      `, params),
      query(`
        SELECT
          author_fullname as author,
          COUNT(*) as count,
          COALESCE(SUM(our_price), 0) as total_value
        FROM books_with_enrichment
        WHERE ${cleanedWhere}
        GROUP BY author_fullname
        ORDER BY count DESC
        LIMIT 10
      `, params),
      query(`
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
      `, params),
      query(`
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
      `, params),
      query(`
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
      `, params),
      query(`
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
      `, params),
      query(`
        SELECT
          COUNT(*) as books_sold,
          COALESCE(SUM(sold_price), 0) as total_revenue,
          COALESCE(SUM(sold_price - purchase_price), 0) as actual_profit,
          COUNT(DISTINCT sale_transaction_id) as transaction_count
        FROM books_with_enrichment
        WHERE sold = true AND ${cleanedWhere}
      `, params),
      query(`
        SELECT
          COALESCE(sale_event, 'No Event') as event,
          COUNT(*) as count,
          COUNT(DISTINCT sale_transaction_id) as transaction_count,
          COALESCE(SUM(sold_price), 0) as revenue,
          COALESCE(SUM(sold_price - purchase_price), 0) as profit
        FROM books_with_enrichment
        WHERE sold = true AND ${cleanedWhere}
        GROUP BY sale_event
        ORDER BY count DESC
      `, params),
      query(`
        SELECT COUNT(*) as books_missing_price
        FROM books_with_enrichment
        WHERE our_price IS NULL AND sold = false AND kept = false AND ${cleanedWhere}
      `, params),
      query(`
        SELECT
          COUNT(*) FILTER (WHERE pulled_to_read = true AND sold = false AND kept = false) as pulled_to_read_count,
          COUNT(*) FILTER (WHERE kept = true) as kept_count,
          COALESCE(SUM(purchase_price) FILTER (WHERE kept = true), 0) as total_kept_cost
        FROM books_with_enrichment
        WHERE ${cleanedWhere}
      `, params),
      query(`
        SELECT
          COUNT(*) FILTER (WHERE blind_date = true AND sold = false) as active_count,
          COALESCE(SUM(our_price) FILTER (WHERE blind_date = true AND sold = false), 0) as total_value,
          COUNT(*) FILTER (WHERE blind_date = true AND sold = false AND blind_date_blurb IS NOT NULL AND blind_date_blurb != '') as with_blurb_count,
          COUNT(*) FILTER (WHERE blind_date = true AND sold = false AND (blind_date_blurb IS NULL OR blind_date_blurb = '')) as without_blurb_count,
          COUNT(*) FILTER (WHERE sold = false AND kept = false AND blind_date = false
            AND condition IN ('Like New', 'Very Good') AND category != 'YA/Nostalgia'
            AND google_enrichment_id IS NOT NULL
            AND subgenres IS NOT NULL AND array_length(subgenres, 1) > 0) as candidate_count
        FROM books_with_enrichment
        WHERE ${cleanedWhere}
      `, params),
    ]);

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
      sales: {
        books_sold: parseInt(salesQuery.rows[0].books_sold),
        total_revenue: parseFloat(salesQuery.rows[0].total_revenue),
        actual_profit: parseFloat(salesQuery.rows[0].actual_profit),
        transaction_count: parseInt(salesQuery.rows[0].transaction_count),
        by_event: salesByEventQuery.rows.map(row => ({
          event: row.event,
          count: parseInt(row.count),
          transaction_count: parseInt(row.transaction_count),
          revenue: parseFloat(row.revenue),
          profit: parseFloat(row.profit),
        })),
      },
      books_missing_price: parseInt(missingPriceQuery.rows[0].books_missing_price),
      reading: {
        pulled_to_read_count: parseInt(readingQuery.rows[0].pulled_to_read_count),
        kept_count: parseInt(readingQuery.rows[0].kept_count),
        total_kept_cost: parseFloat(readingQuery.rows[0].total_kept_cost),
      },
      blind_date: {
        active_count: parseInt(blindDateQuery.rows[0].active_count),
        total_value: parseFloat(blindDateQuery.rows[0].total_value),
        with_blurb_count: parseInt(blindDateQuery.rows[0].with_blurb_count),
        without_blurb_count: parseInt(blindDateQuery.rows[0].without_blurb_count),
        candidate_count: parseInt(blindDateQuery.rows[0].candidate_count),
      },
    };
  }

  async getPricingStats(filters?: PricingStatsFilters): Promise<PricingStats> {
    const cleanedParam = filters?.cleaned ?? null;
    const params: any[] = [cleanedParam];
    let paramCount = 2;
    let extraWhere = '';

    if (filters?.category) {
      extraWhere += ` AND category = $${paramCount++}`;
      params.push(filters.category);
    }
    if (filters?.author) {
      extraWhere += ` AND author_fullname = $${paramCount++}`;
      params.push(filters.author);
    }

    const cleanedWhere = '($1::boolean IS NULL OR cleaned = $1)';
    const priceBase = `our_price IS NOT NULL AND sold = false AND kept = false AND ${cleanedWhere}${extraWhere}`;

    const [
      summaryResult, distributionResult, priceByConditionResult,
      categoryResult, conditionResult, authorResult,
    ] = await Promise.all([
      query(`
        SELECT
          COUNT(*) FILTER (WHERE our_price IS NOT NULL) as total_priced,
          COUNT(*) FILTER (WHERE our_price IS NULL) as total_unpriced,
          MIN(our_price) as price_range_min,
          MAX(our_price) as price_range_max,
          COUNT(DISTINCT our_price) as unique_price_count,
          ROUND(AVG(our_price)::numeric, 2) as avg_price,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY our_price) as median_price
        FROM books_with_enrichment
        WHERE sold = false AND kept = false AND ${cleanedWhere}${extraWhere}
      `, params),
      query(`
        SELECT
          our_price as price,
          COUNT(*) as count,
          ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(), 0) * 100, 1) as percentage
        FROM books_with_enrichment
        WHERE ${priceBase}
        GROUP BY our_price
        ORDER BY our_price ASC
      `, params),
      query(`
        SELECT
          our_price as price,
          COALESCE(condition, 'Unknown') as condition,
          COUNT(*) as count
        FROM books_with_enrichment
        WHERE ${priceBase}
        GROUP BY our_price, condition
        ORDER BY our_price ASC, condition
      `, params),
      query(`
        SELECT
          category,
          COUNT(*) as total_priced,
          ROUND(AVG(sub.price)::numeric, 2) as avg_price,
          MIN(sub.price) as min_price,
          MAX(sub.price) as max_price,
          json_agg(
            json_build_object('price', sub.price, 'count', sub.cnt, 'percentage', sub.pct)
            ORDER BY sub.price
          ) as price_points
        FROM (
          SELECT
            category,
            our_price as price,
            COUNT(*) as cnt,
            ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(PARTITION BY category), 0) * 100, 1) as pct
          FROM books_with_enrichment
          WHERE ${priceBase}
          GROUP BY category, our_price
        ) sub
        GROUP BY category
        ORDER BY total_priced DESC
      `, params),
      query(`
        SELECT
          condition,
          COUNT(*) as total_priced,
          ROUND(AVG(sub.price)::numeric, 2) as avg_price,
          MIN(sub.price) as min_price,
          MAX(sub.price) as max_price,
          json_agg(
            json_build_object('price', sub.price, 'count', sub.cnt, 'percentage', sub.pct)
            ORDER BY sub.price
          ) as price_points
        FROM (
          SELECT
            condition,
            our_price as price,
            COUNT(*) as cnt,
            ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(PARTITION BY condition), 0) * 100, 1) as pct
          FROM books_with_enrichment
          WHERE ${priceBase}
          GROUP BY condition, our_price
        ) sub
        GROUP BY condition
        ORDER BY total_priced DESC
      `, params),
      query(`
        SELECT
          author_fullname as author,
          COUNT(*) as total_priced,
          ROUND(AVG(sub.price)::numeric, 2) as avg_price,
          MIN(sub.price) as min_price,
          MAX(sub.price) as max_price,
          json_agg(
            json_build_object('price', sub.price, 'count', sub.cnt, 'percentage', sub.pct)
            ORDER BY sub.price
          ) as price_points
        FROM (
          SELECT
            author_fullname,
            our_price as price,
            COUNT(*) as cnt,
            ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(PARTITION BY author_fullname), 0) * 100, 1) as pct
          FROM books_with_enrichment
          WHERE ${priceBase}
          GROUP BY author_fullname, our_price
        ) sub
        GROUP BY author_fullname
        HAVING COUNT(*) >= 2
        ORDER BY total_priced DESC
        LIMIT 15
      `, params),
    ]);

    const distribution: PricePoint[] = distributionResult.rows.map(r => ({
      price: parseFloat(r.price),
      count: parseInt(r.count),
      percentage: parseFloat(r.percentage),
    }));

    const mostCommon = distribution.reduce(
      (max, p) => p.count > max.count ? p : max,
      { price: 0, count: 0, percentage: 0 },
    );

    const priceByCondition: PriceByConditionRow[] = priceByConditionResult.rows.map(r => ({
      price: parseFloat(r.price),
      condition: r.condition,
      count: parseInt(r.count),
    }));

    const parsePricePoints = (row: any): PricePoint[] => {
      if (!row.price_points) return [];
      const points = typeof row.price_points === 'string'
        ? JSON.parse(row.price_points)
        : row.price_points;
      return points.map((p: any) => ({
        price: parseFloat(p.price),
        count: parseInt(p.count),
        percentage: parseFloat(p.percentage),
      }));
    };

    const summary = summaryResult.rows[0];
    return {
      summary: {
        total_priced: parseInt(summary.total_priced),
        total_unpriced: parseInt(summary.total_unpriced),
        price_range_min: parseFloat(summary.price_range_min) || 0,
        price_range_max: parseFloat(summary.price_range_max) || 0,
        most_common_price: mostCommon.price,
        most_common_price_count: mostCommon.count,
        unique_price_count: parseInt(summary.unique_price_count),
        avg_price: parseFloat(summary.avg_price) || 0,
        median_price: parseFloat(summary.median_price) || 0,
      },
      distribution,
      price_by_condition: priceByCondition,
      by_category: categoryResult.rows.map(row => ({
        category: row.category || 'Uncategorized',
        total_priced: parseInt(row.total_priced),
        avg_price: parseFloat(row.avg_price),
        min_price: parseFloat(row.min_price),
        max_price: parseFloat(row.max_price),
        price_points: parsePricePoints(row),
      })),
      by_condition: conditionResult.rows.map(row => ({
        condition: row.condition || 'Unknown',
        total_priced: parseInt(row.total_priced),
        avg_price: parseFloat(row.avg_price),
        min_price: parseFloat(row.min_price),
        max_price: parseFloat(row.max_price),
        price_points: parsePricePoints(row),
      })),
      by_author: authorResult.rows.map(row => ({
        author: row.author,
        total_priced: parseInt(row.total_priced),
        avg_price: parseFloat(row.avg_price),
        min_price: parseFloat(row.min_price),
        max_price: parseFloat(row.max_price),
        price_points: parsePricePoints(row),
      })),
    };
  }

  async bulkMarkBlindDate(bookIds: number[], blindDate: boolean): Promise<Book[]> {
    if (bookIds.length === 0) return [];
    let result;
    if (blindDate) {
      result = await query(
        `UPDATE books SET blind_date = true WHERE id = ANY($1::int[]) RETURNING *`,
        [bookIds]
      );
    } else {
      result = await query(
        `UPDATE books SET blind_date = false, blind_date_number = NULL,
         blind_date_blurb = NULL WHERE id = ANY($1::int[]) RETURNING *`,
        [bookIds]
      );
    }
    return result.rows;
  }
}
