import { useState, useEffect } from 'react';
import { Book, BulkPriceRequest } from '../types/Book';
import './BulkPriceModal.css';

interface BulkPriceModalProps {
  books: Book[];
  onConfirm: (request: BulkPriceRequest) => void;
  onCancel: () => void;
  onRemoveBook: (bookId: number) => void;
  isSubmitting: boolean;
}

type PriceMode = 'per-book' | 'flat';

const MIN_PRICE = 3;
const MARKUP_MULTIPLIER = 2;

function suggestedPrice(book: Book): number {
  if (book.purchase_price != null && Number(book.purchase_price) > 0) {
    return Math.max(MIN_PRICE, Math.ceil(Number(book.purchase_price) * MARKUP_MULTIPLIER));
  }
  return MIN_PRICE;
}

const BulkPriceModal: React.FC<BulkPriceModalProps> = ({ books, onConfirm, onCancel, onRemoveBook, isSubmitting }) => {
  const [mode, setMode] = useState<PriceMode>('per-book');
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [flatPrice, setFlatPrice] = useState('');

  useEffect(() => {
    const initial: Record<number, string> = {};
    books.forEach(book => {
      if (book.id) {
        initial[book.id] = book.our_price ? String(Number(book.our_price).toFixed(2)) : '';
      }
    });
    setPrices(initial);
  }, [books]);

  const perBookTotal = books.reduce(
    (sum, book) => sum + (book.id && prices[book.id] ? (parseFloat(prices[book.id]) || 0) : 0),
    0
  );
  const flatTotal = flatPrice ? parseFloat(flatPrice) * books.length : 0;
  const total = mode === 'per-book' ? perBookTotal : flatTotal;
  const avgPrice = books.length > 0 ? total / books.length : 0;

  const allPerBookPricesSet = books.length > 0 &&
    books.every(book => book.id && prices[book.id] && parseFloat(prices[book.id]) >= 0);
  const flatPriceSet = flatPrice !== '' && parseFloat(flatPrice) >= 0;
  const canConfirm = mode === 'per-book' ? allPerBookPricesSet : flatPriceSet;

  // Pricing guidance computations
  const booksWithCost = books.filter(b => b.purchase_price != null && Number(b.purchase_price) > 0);
  const avgCost = booksWithCost.length > 0
    ? booksWithCost.reduce((sum, b) => sum + Number(b.purchase_price), 0) / booksWithCost.length
    : 0;
  const suggestedFlat = Math.max(MIN_PRICE, Math.ceil(avgCost * MARKUP_MULTIPLIER));

  // Flat mode: count books that would be priced below purchase price
  const flatVal = flatPrice ? parseFloat(flatPrice) : 0;
  const belowCostCountFlat = flatPrice
    ? books.filter(b => b.purchase_price != null && flatVal < Number(b.purchase_price)).length
    : 0;

  // Per-book mode: count below-cost entries
  const belowCostCountPerBook = books.filter(book => {
    if (!book.id || !prices[book.id] || book.purchase_price == null) return false;
    return parseFloat(prices[book.id]) < Number(book.purchase_price);
  }).length;

  const belowCostCount = mode === 'per-book' ? belowCostCountPerBook : belowCostCountFlat;

  const handleFillSuggested = () => {
    setPrices(prev => {
      const next = { ...prev };
      books.forEach(book => {
        if (book.id && !next[book.id]) {
          next[book.id] = String(suggestedPrice(book));
        }
      });
      return next;
    });
  };

  const emptyPriceCount = books.filter(b => b.id && !prices[b.id]).length;

  const handleConfirm = () => {
    if (mode === 'per-book') {
      const items = books
        .filter(book => book.id && prices[book.id])
        .map(book => ({
          book_id: book.id!,
          our_price: parseFloat(prices[book.id!]),
        }));
      onConfirm({ items });
    } else {
      const book_ids = books.filter(b => b.id).map(b => b.id!);
      onConfirm({ book_ids, our_price: parseFloat(flatPrice) });
    }
  };

  return (
    <div className="bulk-price-modal">
      <div className="bulk-price-header">
        <h2>Set Prices for {books.length} Book{books.length !== 1 ? 's' : ''}</h2>
        <button className="btn-close" onClick={onCancel}>&times;</button>
      </div>

      <div className="bulk-price-body">
        <div className="bulk-price-mode-toggle">
          <button
            type="button"
            className={`mode-btn ${mode === 'per-book' ? 'active' : ''}`}
            onClick={() => setMode('per-book')}
          >
            Per-Book Prices
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'flat' ? 'active' : ''}`}
            onClick={() => setMode('flat')}
          >
            Flat Price
          </button>
        </div>

        {mode === 'flat' && (
          <div className="bulk-price-flat-section">
            <label>Price for all {books.length} books</label>
            <div className="bulk-price-flat-input">
              <span className="price-prefix">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={flatPrice}
                onChange={(e) => setFlatPrice(e.target.value)}
                placeholder="0.00"
              />
              <span className="flat-price-note">each</span>
            </div>
            {avgCost > 0 && (
              <div className="bulk-price-hint">
                Avg cost: ${avgCost.toFixed(2)} &middot; Suggested: ${suggestedFlat} (2x avg cost, min $3)
              </div>
            )}
            {belowCostCountFlat > 0 && (
              <div className="bulk-price-warning">
                {belowCostCountFlat} book{belowCostCountFlat !== 1 ? 's' : ''} would be priced below purchase cost
              </div>
            )}
          </div>
        )}

        <div className="bulk-price-books">
          <div className="bulk-price-books-header">
            <h3>{mode === 'per-book' ? 'Books & Prices' : 'Books'}</h3>
            {mode === 'per-book' && emptyPriceCount > 0 && (
              <button
                type="button"
                className="bulk-price-fill-btn"
                onClick={handleFillSuggested}
              >
                Fill {emptyPriceCount} empty with suggested
              </button>
            )}
          </div>
          {books.map(book => {
            const cost = book.purchase_price != null ? Number(book.purchase_price) : null;
            const enteredPrice = book.id && prices[book.id] ? parseFloat(prices[book.id]) : null;
            const isBelowCost = mode === 'per-book' && cost != null && enteredPrice != null && enteredPrice < cost;
            const suggested = suggestedPrice(book);

            return (
              <div key={book.id} className={`bulk-price-book-item ${isBelowCost ? 'bulk-price-below-cost' : ''}`}>
                <button
                  className="bulk-price-remove-btn"
                  onClick={() => book.id && onRemoveBook(book.id)}
                  title="Remove from pricing"
                >
                  &times;
                </button>
                <div className="bulk-price-book-info">
                  {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt="" className="bulk-price-cover" />
                  ) : (
                    <div className="bulk-price-cover-placeholder" />
                  )}
                  <div className="bulk-price-book-text">
                    <span className="bulk-price-book-title">{book.book_title}</span>
                    <span className="bulk-price-book-author">{book.author_fullname}</span>
                    {cost != null ? (
                      <span className="bulk-price-book-cost">
                        Cost: ${cost.toFixed(2)} &middot; Sug: ${suggested}
                      </span>
                    ) : (
                      <span className="bulk-price-book-cost">
                        No cost &middot; Min: ${MIN_PRICE}
                      </span>
                    )}
                  </div>
                </div>
                {mode === 'per-book' ? (
                  <div className="bulk-price-book-price">
                    <span className="price-prefix">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={book.id ? prices[book.id] || '' : ''}
                      onChange={(e) => {
                        if (book.id) {
                          setPrices(prev => ({ ...prev, [book.id!]: e.target.value }));
                        }
                      }}
                      placeholder={String(suggested)}
                      className={isBelowCost ? 'input-below-cost' : ''}
                    />
                  </div>
                ) : (
                  <div className={`bulk-price-flat-display ${flatPrice && cost != null && flatVal < cost ? 'flat-below-cost' : ''}`}>
                    {flatPrice ? `$${parseFloat(flatPrice).toFixed(2)}` : '-'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bulk-price-footer">
        <div className="bulk-price-summary">
          <div className="bulk-price-total">
            Total: <strong>${total.toFixed(2)}</strong>
          </div>
          <div className="bulk-price-avg">
            Avg: ${avgPrice.toFixed(2)}/book
          </div>
          {belowCostCount > 0 && (
            <div className="bulk-price-footer-warning">
              {belowCostCount} below cost
            </div>
          )}
        </div>
        <div className="bulk-price-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              const cleared: Record<number, string> = {};
              books.forEach(b => { if (b.id) cleared[b.id] = ''; });
              setPrices(cleared);
              setFlatPrice('');
            }}
          >
            Clear All
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-price"
            onClick={handleConfirm}
            disabled={isSubmitting || !canConfirm}
          >
            {isSubmitting ? 'Saving...' : `Set Prices ($${total.toFixed(2)})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkPriceModal;
