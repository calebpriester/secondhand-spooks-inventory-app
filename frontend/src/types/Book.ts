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
  date_purchased: string | null;
  source: string | null;
  seller: string | null;
  order_number?: string;
  thriftbooks_price?: number | null;
  purchase_price?: number | null;
  our_price?: number | null;
  profit_est?: number | null;
  author_fullname?: string | null;
  pulled_to_read: boolean;
  created_at?: string;
  updated_at?: string;
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
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  total_value: number;
}

export interface ConditionBreakdown {
  condition: string;
  count: number;
}

export interface AuthorBreakdown {
  author: string;
  count: number;
  total_value: number;
}
