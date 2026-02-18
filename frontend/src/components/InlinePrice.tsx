import { useState, useRef, useEffect } from 'react';
import { Book } from '../types/Book';
import './InlinePrice.css';

interface InlinePriceProps {
  book: Book;
  onSave: (bookId: number, price: number | null) => void;
  isSaving: boolean;
  disabled?: boolean;
}

const MIN_PRICE = 3;
const MARKUP_MULTIPLIER = 2;

function suggestedPrice(book: Book): number | null {
  if (book.purchase_price != null && Number(book.purchase_price) > 0) {
    return Math.max(MIN_PRICE, Math.ceil(Number(book.purchase_price) * MARKUP_MULTIPLIER));
  }
  return null;
}

const InlinePrice: React.FC<InlinePriceProps> = ({ book, onSave, isSaving, disabled }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    if (disabled || isSaving) return;
    setValue(book.our_price != null ? String(Number(book.our_price).toFixed(2)) : '');
    setIsEditing(true);
  };

  const handleConfirm = () => {
    if (!book.id) { setIsEditing(false); return; }
    if (value === '') {
      onSave(book.id, null);
    } else {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed >= 0) {
        onSave(book.id, parsed);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const suggested = suggestedPrice(book);
  const parsed = parseFloat(value);
  const purchasePrice = book.purchase_price != null ? Number(book.purchase_price) : null;
  const isBelowCost = !isNaN(parsed) && purchasePrice != null && purchasePrice > 0 && parsed < purchasePrice;

  if (isEditing) {
    return (
      <div className="inline-price-edit">
        <div className="inline-price-input-row">
          <span className="inline-price-dollar">$</span>
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleConfirm}
            className="inline-price-input"
            disabled={isSaving}
          />
          <button
            className="inline-price-btn inline-price-confirm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleConfirm}
            disabled={isSaving || (value !== '' && isNaN(parsed))}
            title="Save price"
          >
            ✓
          </button>
          <button
            className="inline-price-btn inline-price-cancel"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCancel}
            title="Cancel"
          >
            ✕
          </button>
        </div>
        {suggested != null && (
          <div className="inline-price-hint">Suggested: ${suggested}</div>
        )}
        {isBelowCost && (
          <div className="inline-price-warning">Below cost (${purchasePrice!.toFixed(2)})</div>
        )}
      </div>
    );
  }

  const displayPrice = book.our_price != null ? `$${Number(book.our_price).toFixed(2)}` : 'N/A';

  return (
    <span
      className={`inline-price-display${disabled ? '' : ' inline-price-editable'}`}
      onClick={disabled ? undefined : startEditing}
      title={disabled ? undefined : 'Click to set price'}
    >
      {isSaving ? '...' : displayPrice}
    </span>
  );
};

export default InlinePrice;
