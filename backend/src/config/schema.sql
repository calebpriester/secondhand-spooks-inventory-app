-- Secondhand Spooks Inventory Database Schema

-- Enrichment source tables (one per provider)
CREATE TABLE IF NOT EXISTS google_books_enrichments (
  id SERIAL PRIMARY KEY,
  google_books_id VARCHAR(50) UNIQUE NOT NULL,
  cover_image_url TEXT,
  description TEXT,
  genres TEXT[],
  google_rating DECIMAL(3, 2),
  google_ratings_count INTEGER,
  page_count INTEGER,
  publisher VARCHAR(200),
  published_date VARCHAR(20),
  isbn_10 VARCHAR(13),
  isbn_13 VARCHAR(17),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  book_title VARCHAR(500) NOT NULL,
  cleaned BOOLEAN DEFAULT FALSE,
  author_last_name VARCHAR(100) NOT NULL,
  author_first_middle VARCHAR(100),
  book_series VARCHAR(200),
  vol_number VARCHAR(20),
  cover_type VARCHAR(15) CHECK (cover_type IN ('Paper', 'Hard', 'Audiobook')),
  category VARCHAR(50) CHECK (category IN ('YA/Nostalgia', 'PFH/Vintage', 'Mainstream', 'Comics/Ephemera')),
  condition VARCHAR(20) CHECK (condition IN ('Like New', 'Very Good', 'Good', 'Acceptable')),
  date_purchased DATE,
  source VARCHAR(100),
  seller VARCHAR(100),
  order_number VARCHAR(100),
  thriftbooks_price DECIMAL(10, 2),
  purchase_price DECIMAL(10, 2),
  our_price DECIMAL(10, 2),
  profit_est DECIMAL(10, 2),
  author_fullname VARCHAR(200),
  pulled_to_read BOOLEAN DEFAULT FALSE,
  google_enrichment_id INTEGER REFERENCES google_books_enrichments(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_books_author_fullname ON books(author_fullname);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_condition ON books(condition);
CREATE INDEX IF NOT EXISTS idx_books_date_purchased ON books(date_purchased);
CREATE INDEX IF NOT EXISTS idx_books_source ON books(source);
CREATE INDEX IF NOT EXISTS idx_books_book_series ON books(book_series);

-- Note: google_enrichment_id index, books_with_enrichment view, and
-- google_books_enrichments trigger are created by runMigrations() in initDb.ts
-- (handles both fresh and migrated databases safely)

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: google_books_enrichments trigger is created by runMigrations() in initDb.ts
