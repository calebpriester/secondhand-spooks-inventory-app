import { useState, useEffect } from 'react';
import { Book, BulkSaleRequest } from '../types/Book';
import Autocomplete from './Autocomplete';
import './BulkSaleModal.css';

interface BulkSaleModalProps {
  books: Book[];
  onConfirm: (request: BulkSaleRequest) => void;
  onCancel: () => void;
  onRemoveBook: (bookId: number) => void;
  isSubmitting: boolean;
  saleEvents: string[];
}

const BulkSaleModal: React.FC<BulkSaleModalProps> = ({ books, onConfirm, onCancel, onRemoveBook, isSubmitting, saleEvents }) => {
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleEvent, setSaleEvent] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');

  useEffect(() => {
    const initial: Record<number, string> = {};
    books.forEach(book => {
      if (book.id) {
        initial[book.id] = book.our_price ? String(Number(book.our_price).toFixed(2)) : '';
      }
    });
    setPrices(initial);
  }, [books]);

  const total = books.reduce((sum, book) => sum + (book.id && prices[book.id] ? (parseFloat(prices[book.id]) || 0) : 0), 0);

  const allPricesSet = books.length > 0 && books.every(book => book.id && prices[book.id] && parseFloat(prices[book.id]) > 0);

  const handleConfirm = () => {
    const items = books
      .filter(book => book.id && prices[book.id])
      .map(book => ({
        book_id: book.id!,
        sold_price: parseFloat(prices[book.id!]),
      }));

    onConfirm({
      items,
      date_sold: saleDate,
      sale_event: saleEvent || undefined,
      sale_transaction_id: crypto.randomUUID(),
      payment_method: paymentMethod,
    });
  };

  return (
    <div className="bulk-sale-modal">
      <div className="bulk-sale-header">
        <h2>Mark {books.length} Book{books.length !== 1 ? 's' : ''} as Sold</h2>
        <button className="btn-close" onClick={onCancel}>&times;</button>
      </div>

      <div className="bulk-sale-body">
        <div className="bulk-sale-shared-fields">
          <div className="bulk-sale-row">
            <div className="bulk-sale-field">
              <label>Date Sold</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
            <div className="bulk-sale-field">
              <label>Payment</label>
              <div className="payment-toggle">
                <button
                  type="button"
                  className={`payment-btn ${paymentMethod === 'Cash' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('Cash')}
                >
                  Cash
                </button>
                <button
                  type="button"
                  className={`payment-btn ${paymentMethod === 'Card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('Card')}
                >
                  Card
                </button>
              </div>
            </div>
          </div>
          <div className="bulk-sale-field">
            <label>Event (optional)</label>
            <Autocomplete
              id="bulk_sale_event"
              name="bulk_sale_event"
              value={saleEvent}
              onChange={(e) => setSaleEvent(e.target.value)}
              suggestions={saleEvents}
              placeholder="e.g., Mad Monster Party 2026"
            />
          </div>
        </div>

        <div className="bulk-sale-books">
          <h3>Books & Prices</h3>
          {books.map(book => (
            <div key={book.id} className="bulk-sale-book-item">
              <button
                className="bulk-sale-remove-btn"
                onClick={() => book.id && onRemoveBook(book.id)}
                title="Remove from sale"
              >
                &times;
              </button>
              <div className="bulk-sale-book-info">
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt="" className="bulk-sale-cover" />
                ) : (
                  <div className="bulk-sale-cover-placeholder" />
                )}
                <div className="bulk-sale-book-text">
                  <span className="bulk-sale-book-title">{book.book_title}</span>
                  <span className="bulk-sale-book-author">{book.author_fullname}</span>
                </div>
              </div>
              <div className="bulk-sale-book-price">
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
                  placeholder="0.00"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bulk-sale-footer">
        <div className="bulk-sale-total">
          Total: <strong>${total.toFixed(2)}</strong>
        </div>
        <div className="bulk-sale-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="btn btn-sold"
            onClick={handleConfirm}
            disabled={isSubmitting || !allPricesSet}
          >
            {isSubmitting ? 'Saving...' : `Confirm Sale ($${total.toFixed(2)})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkSaleModal;
