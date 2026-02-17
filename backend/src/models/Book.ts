export interface Book {
  id?: number;
  book_title: string;
  cleaned: boolean;
  author_last_name: string;
  author_first_middle?: string;
  book_series?: string;
  vol_number?: string;
  cover_type: 'Paper' | 'Hard' | 'Audiobook' | null;
  category: 'YA/Nostalgia' | 'PFH/Vintage' | 'Mainstream' | 'Comics/Ephemera' | null;
  condition: 'Like New' | 'Very Good' | 'Good' | 'Acceptable' | null;
  date_purchased: Date | null;
  source: string | null;
  seller: string | null;
  order_number?: string;
  thriftbooks_price?: number;
  purchase_price?: number;
  our_price?: number;
  profit_est?: number;
  author_fullname: string;
  pulled_to_read: boolean;
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
  enriched_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface GoogleBooksEnrichment {
  google_books_id: string;
  cover_image_url: string | null;
  description: string | null;
  genres: string[];
  google_rating: number | null;
  google_ratings_count: number | null;
  page_count: number | null;
  publisher: string | null;
  published_date: string | null;
  isbn_10: string | null;
  isbn_13: string | null;
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
  search?: string;
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
  by_decade: DecadeBreakdown[];
  rating_distribution: RatingBucket[];
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
