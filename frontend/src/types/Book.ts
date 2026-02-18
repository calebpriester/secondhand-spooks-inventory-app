export interface Book {
  id: number;
  book_title: string;
  cleaned: boolean;
  author_last_name: string;
  author_first_middle?: string;
  book_series?: string;
  vol_number?: string;
  cover_type: 'Paper' | 'Hard' | 'Audiobook' | null;
  category: 'YA/Nostalgia' | 'PFH/Vintage' | 'Mainstream' | 'Comics/Ephemera' | null;
  condition: 'Like New' | 'Very Good' | 'Good' | 'Acceptable' | null;
  date_purchased: string | null;
  source: string | null;
  seller: string | null;
  order_number?: string;
  purchase_price?: number | null;
  our_price?: number | null;
  profit_est?: number | null;
  author_fullname?: string | null;
  pulled_to_read: boolean;
  kept?: boolean;
  date_kept?: string | null;
  subgenres?: string[] | null;
  pacing?: string | null;
  sold?: boolean;
  date_sold?: string | null;
  sold_price?: number | null;
  sale_event?: string | null;
  sale_transaction_id?: string | null;
  payment_method?: string | null;
  blind_date?: boolean;
  blind_date_number?: string | null;
  blind_date_blurb?: string | null;
  google_books_id?: string | null;
  cover_image_url?: string | null;
  description?: string | null;
  genres?: string[] | null;
  google_rating?: number | null;
  google_ratings_count?: number | null;
  page_count?: number | null;
  publisher?: string | null;
  published_date?: string | null;
  isbn_10?: string | null;
  isbn_13?: string | null;
  enriched_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type BookCreate = Omit<Book, 'id'>;

export interface EnrichmentStatus {
  configured: boolean;
  stats: {
    total_books: string;
    enriched_count: string;
    unenriched_count: string;
    with_cover: string;
    with_description: string;
    with_rating: string;
  } | null;
}

export interface EnrichmentResult {
  book_id: number;
  book_title: string;
  status: 'success' | 'not_found' | 'error';
  google_books_id?: string;
  error?: string;
}

export interface BatchEnrichmentProgress {
  total: number;
  processed: number;
  succeeded: number;
  not_found: number;
  errors: number;
  is_running: boolean;
  results: EnrichmentResult[];
}

export interface BookFilters {
  category?: string;
  author?: string;
  condition?: string;
  cover_type?: string;
  source?: string;
  cleaned?: boolean;
  pulled_to_read?: boolean;
  kept?: boolean;
  search?: string;
  subgenre?: string;
  pacing?: string;
  sold?: boolean;
  sale_event?: string;
  date_sold?: string;
  sale_transaction_id?: string;
  missing_price?: boolean;
  blind_date?: boolean;
  blind_date_candidate?: boolean;
}

export interface BookStats {
  total_books: number;
  total_value: number;
  total_cost: number;
  estimated_profit: number;
  by_category: CategoryBreakdown[];
  by_condition: ConditionBreakdown[];
  top_authors: AuthorBreakdown[];
  by_genre: GenreBreakdown[];
  by_subgenre: SubgenreBreakdown[];
  by_decade: DecadeBreakdown[];
  rating_distribution: RatingBucket[];
  sales: SalesStats;
  books_missing_price: number;
  reading: ReadingStats;
  blind_date: BlindDateStats;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  total_value: number;
  percentage: number;
}

export interface ConditionBreakdown {
  condition: string;
  count: number;
  percentage: number;
}

export interface GenreBreakdown {
  genre: string;
  count: number;
  percentage: number;
}

export interface DecadeBreakdown {
  decade: string;
  count: number;
  percentage: number;
}

export interface RatingBucket {
  rating_bucket: string;
  count: number;
  avg_rating: number;
}

export interface AuthorBreakdown {
  author: string;
  count: number;
  total_value: number;
}

export interface SubgenreBreakdown {
  subgenre: string;
  count: number;
  percentage: number;
}

export interface SubgenreOption {
  id: number;
  name: string;
  sort_order: number;
  created_at?: string;
}

export interface GeminiTagResult {
  book_id: number;
  book_title: string;
  status: 'success' | 'skipped' | 'error';
  subgenres?: string[];
  pacing?: string;
  error?: string;
}

export interface GeminiBatchProgress {
  total: number;
  processed: number;
  succeeded: number;
  skipped: number;
  errors: number;
  is_running: boolean;
  results: GeminiTagResult[];
}

export interface GeminiTaggingStatus {
  configured: boolean;
  stats: {
    total_books: string;
    tagged_count: string;
    untagged_count: string;
  } | null;
}

export interface BulkSaleItem {
  book_id: number;
  sold_price: number;
}

export interface BulkSaleRequest {
  items: BulkSaleItem[];
  date_sold: string;
  sale_event?: string;
  sale_transaction_id: string;
  payment_method: 'Cash' | 'Card';
}

export interface BulkPriceItem {
  book_id: number;
  our_price: number | null;
}

export interface BulkPriceRequest {
  items?: BulkPriceItem[];
  book_ids?: number[];
  our_price?: number;
}

export interface UpdateTransactionRequest {
  sale_transaction_id: string;
  date_sold?: string;
  sale_event?: string | null;
  payment_method?: 'Cash' | 'Card';
  items?: BulkSaleItem[];
}

export interface TransactionBook {
  id: number;
  book_title: string;
  author_fullname: string;
  sold_price: number;
  purchase_price: number | null;
  cover_image_url: string | null;
}

export interface Transaction {
  sale_transaction_id: string;
  date_sold: string;
  sale_event: string | null;
  payment_method: string | null;
  book_count: number;
  total_revenue: number;
  total_profit: number;
  books: TransactionBook[];
}

export interface ReadingStats {
  pulled_to_read_count: number;
  kept_count: number;
  total_kept_cost: number;
}

export interface SalesStats {
  books_sold: number;
  total_revenue: number;
  actual_profit: number;
  transaction_count: number;
  by_event: SaleEventBreakdown[];
}

export interface SaleEventBreakdown {
  event: string;
  count: number;
  transaction_count: number;
  revenue: number;
  profit: number;
}

export interface BlindDateStats {
  active_count: number;
  total_value: number;
  with_blurb_count: number;
  without_blurb_count: number;
  candidate_count: number;
}

export interface BlindDateBlurbResult {
  book_id: number;
  book_title: string;
  status: 'success' | 'error';
  blurb?: string;
  error?: string;
}

export interface BlindDateBatchProgress {
  total: number;
  processed: number;
  succeeded: number;
  errors: number;
  is_running: boolean;
  results: BlindDateBlurbResult[];
}
