import { useState } from 'react';
import { Book } from '../types/Book';
import './BookDetail.css';

interface BookDetailProps {
  book: Book;
  onClose: () => void;
  onEdit: (book: Book) => void;
  onEnrich: (bookId: number, title?: string, author?: string, isbn?: string) => void;
  isEnriching: boolean;
}

const BookDetail: React.FC<BookDetailProps> = ({ book, onClose, onEdit, onEnrich, isEnriching }) => {
  const [showCustomSearch, setShowCustomSearch] = useState(false);
  const [customTitle, setCustomTitle] = useState(book.book_title);
  const [customAuthor, setCustomAuthor] = useState(book.author_fullname || '');
  const [customIsbn, setCustomIsbn] = useState('');

  const handleEnrich = () => {
    if (book.id && window.confirm(
      `${book.enriched_at ? 'Re-enrich' : 'Enrich'} "${book.book_title}" from Google Books? This uses 1 API request from your daily quota.`
    )) {
      onEnrich(book.id);
    }
  };

  const handleCustomEnrich = () => {
    const searchDesc = customIsbn
      ? `ISBN "${customIsbn}"`
      : `"${customTitle}" by "${customAuthor}"`;
    if (book.id && window.confirm(
      `Search Google Books for ${searchDesc}? This uses 1 API request from your daily quota.`
    )) {
      onEnrich(book.id, customIsbn ? undefined : customTitle, customIsbn ? undefined : customAuthor, customIsbn || undefined);
      setShowCustomSearch(false);
    }
  };

  return (
    <div className="book-detail">
      <div className="book-detail-header">
        <h2>{book.book_title}</h2>
        <button className="btn-close" onClick={onClose}>&times;</button>
      </div>

      <div className="book-detail-body">
        <div className="book-detail-top">
          {book.cover_image_url ? (
            <img src={book.cover_image_url} alt={book.book_title} className="book-detail-cover" />
          ) : (
            <div className="book-detail-cover-placeholder">No Cover</div>
          )}

          <div className="book-detail-info">
            <div className="book-detail-author">{book.author_fullname}</div>

            {book.book_series && (
              <div className="book-detail-series">
                {book.book_series}
                {book.vol_number && ` #${book.vol_number}`}
              </div>
            )}

            <div className="book-detail-badges">
              {book.category && (
                <span className={`badge badge-${book.category.toLowerCase().replace('/', '-')}`}>
                  {book.category}
                </span>
              )}
              {book.condition && (
                <span className={`badge badge-${book.condition.toLowerCase().replace(' ', '-')}`}>
                  {book.condition}
                </span>
              )}
              {book.cover_type && (
                <span className={`badge badge-${book.cover_type.toLowerCase()}`}>
                  {book.cover_type}
                </span>
              )}
            </div>

            {book.google_rating && (
              <div className="book-detail-rating">
                <span className="rating-stars">
                  {'★'.repeat(Math.round(Number(book.google_rating)))}
                  {'☆'.repeat(5 - Math.round(Number(book.google_rating)))}
                </span>
                <span className="rating-number">
                  {Number(book.google_rating).toFixed(1)} / 5
                </span>
                {book.google_ratings_count && (
                  <span className="rating-count">({book.google_ratings_count} ratings)</span>
                )}
              </div>
            )}

            <div className="book-detail-meta">
              {book.publisher && (
                <div className="meta-item">
                  <span className="meta-label">Publisher</span>
                  <span className="meta-value">{book.publisher}</span>
                </div>
              )}
              {book.published_date && (
                <div className="meta-item">
                  <span className="meta-label">Published</span>
                  <span className="meta-value">{book.published_date}</span>
                </div>
              )}
              {book.page_count != null && book.page_count > 0 && (
                <div className="meta-item">
                  <span className="meta-label">Pages</span>
                  <span className="meta-value">{book.page_count}</span>
                </div>
              )}
              {(book.isbn_13 || book.isbn_10) && (
                <div className="meta-item">
                  <span className="meta-label">ISBN</span>
                  <span className="meta-value">{book.isbn_13 || book.isbn_10}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {book.description && (
          <div className="book-detail-description">
            <h3>Description</h3>
            <p>{book.description}</p>
          </div>
        )}

        {book.genres && book.genres.length > 0 && (
          <div className="book-detail-genres">
            <h3>Genres</h3>
            <div className="genre-list">
              {book.genres.map(genre => (
                <span key={genre} className="badge badge-genre">{genre}</span>
              ))}
            </div>
          </div>
        )}

        <div className="book-detail-pricing">
          <h3>Pricing & Purchase</h3>
          <div className="pricing-grid">
            <div className="pricing-item">
              <span className="meta-label">Purchase Price</span>
              <span className="meta-value">{book.purchase_price ? `$${Number(book.purchase_price).toFixed(2)}` : 'N/A'}</span>
            </div>
            <div className="pricing-item">
              <span className="meta-label">Our Price</span>
              <span className="meta-value">{book.our_price ? `$${Number(book.our_price).toFixed(2)}` : 'N/A'}</span>
            </div>
            <div className="pricing-item">
              <span className="meta-label">ThriftBooks</span>
              <span className="meta-value">{book.thriftbooks_price ? `$${Number(book.thriftbooks_price).toFixed(2)}` : 'N/A'}</span>
            </div>
            <div className="pricing-item">
              <span className="meta-label">Profit Est.</span>
              <span className="meta-value">{book.profit_est ? `$${Number(book.profit_est).toFixed(2)}` : 'N/A'}</span>
            </div>
            {book.source && (
              <div className="pricing-item">
                <span className="meta-label">Source</span>
                <span className="meta-value">{book.source}</span>
              </div>
            )}
            {book.date_purchased && (
              <div className="pricing-item">
                <span className="meta-label">Purchased</span>
                <span className="meta-value">{book.date_purchased.split('T')[0]}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {showCustomSearch ? (
        <div className="book-detail-footer custom-search-footer">
          <div className="custom-search-fields">
            <div className="custom-search-field">
              <label>ISBN (overrides title/author)</label>
              <input
                type="text"
                value={customIsbn}
                onChange={(e) => setCustomIsbn(e.target.value)}
                placeholder="e.g. 978-0-553-26963-5"
              />
            </div>
            <div className="custom-search-row">
              <div className="custom-search-field">
                <label>Title</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  disabled={!!customIsbn}
                />
              </div>
              <div className="custom-search-field">
                <label>Author</label>
                <input
                  type="text"
                  value={customAuthor}
                  onChange={(e) => setCustomAuthor(e.target.value)}
                  disabled={!!customIsbn}
                />
              </div>
            </div>
          </div>
          <div className="custom-search-actions">
            <button
              className="btn btn-primary"
              onClick={handleCustomEnrich}
              disabled={isEnriching || (!customIsbn.trim() && !customTitle.trim())}
            >
              {isEnriching ? 'Searching...' : 'Search'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowCustomSearch(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="book-detail-footer">
          <button
            className="btn btn-secondary"
            onClick={handleEnrich}
            disabled={isEnriching || !book.id}
          >
            {isEnriching ? 'Enriching...' : (book.enriched_at ? 'Re-enrich' : 'Enrich')}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowCustomSearch(true)}
          >
            Custom Search
          </button>
          <button className="btn btn-secondary" onClick={() => onEdit(book)}>
            Edit
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default BookDetail;
