import { Book } from '../../models/Book';

export const sampleBook: Book = {
  id: 1,
  book_title: 'The Haunting of Hill House',
  cleaned: true,
  author_last_name: 'Jackson',
  author_first_middle: 'Shirley',
  cover_type: 'Paper',
  category: 'Mainstream',
  condition: 'Very Good',
  date_purchased: new Date('2025-11-01'),
  source: 'ThriftBooks',
  seller: null,
  purchase_price: 3.99,
  our_price: 8.00,
  profit_est: 4.01,
  author_fullname: 'Shirley Jackson',
  pulled_to_read: false,
};

export const sampleBook2: Book = {
  id: 2,
  book_title: 'Welcome to Dead House',
  cleaned: false,
  author_last_name: 'Stine',
  author_first_middle: 'R.L.',
  book_series: 'Goosebumps',
  vol_number: '1',
  cover_type: 'Paper',
  category: 'YA/Nostalgia',
  condition: 'Good',
  date_purchased: new Date('2025-10-15'),
  source: 'Goodwill',
  seller: 'Goodwill',
  purchase_price: 1.50,
  our_price: 5.00,
  profit_est: 3.50,
  author_fullname: 'R.L. Stine',
  pulled_to_read: false,
};

// PostgreSQL returns COUNT/SUM/DECIMAL as strings
export const rawStatsRows = {
  totals: [{ total_books: '682', total_value: '4523.50', total_cost: '1890.25', estimated_profit: '2633.25' }],
  categories: [
    { category: 'Mainstream', count: '280', total_value: '2100.00', percentage: '58.3' },
    { category: 'YA/Nostalgia', count: '200', total_value: '1200.00', percentage: '41.7' },
  ],
  conditions: [
    { condition: 'Good', count: '300', percentage: '60.0' },
    { condition: 'Very Good', count: '200', percentage: '40.0' },
  ],
  authors: [
    { author: 'Stephen King', count: '45', total_value: '350.00' },
    { author: 'R.L. Stine', count: '38', total_value: '190.00' },
  ],
  sales: [{ books_sold: '5', total_revenue: '42.50', actual_profit: '28.00', transaction_count: '3' }],
  salesByEvent: [
    { event: 'Flea Market', count: '3', transaction_count: '2', revenue: '25.00', profit: '17.00' },
    { event: 'No Event', count: '2', transaction_count: '1', revenue: '17.50', profit: '11.00' },
  ],
  missingPrice: [{ books_missing_price: '150' }],
};
