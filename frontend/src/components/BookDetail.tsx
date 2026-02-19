import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Book } from '../types/Book';
import { subgenreApi } from '../services/api';
import Autocomplete from './Autocomplete';
import InlinePrice from './InlinePrice';
import { todayDateString, toDateOnly } from '../utils/dates';
import './BookDetail.css';

interface BookDetailProps {
  book: Book;
  onClose: () => void;
  onEdit: (book: Book) => void;
  onEnrich: (bookId: number, title?: string, author?: string, isbn?: string) => void;
  isEnriching: boolean;
  onTagSubgenres: (bookId: number) => void;
  isTagging: boolean;
  onMarkSold?: (bookId: number, saleData: { sold_price: number; date_sold: string; sale_event?: string; payment_method: 'Cash' | 'Card'; sale_transaction_id: string }) => void;
  isMarkingSold?: boolean;
  saleEvents?: string[];
  onMarkAvailable?: (bookId: number) => void;
  onMarkKept?: (bookId: number) => void;
  onUnkeep?: (bookId: number) => void;
  onPullToRead?: (bookId: number) => void;
  onReturnFromPull?: (bookId: number) => void;
  onMarkBlindDate?: (bookId: number) => void;
  onUnmarkBlindDate?: (bookId: number) => void;
  onSetPrice?: (bookId: number, price: number | null) => void;
  isSettingPrice?: boolean;
  onSaveTags?: (bookId: number, subgenres: string[], pacing: string | null) => void;
  isSavingTags?: boolean;
}

const BookDetail: React.FC<BookDetailProps> = ({ book, onClose, onEdit, onEnrich, isEnriching, onTagSubgenres, isTagging, onMarkSold, isMarkingSold, saleEvents = [], onMarkAvailable, onMarkKept, onUnkeep, onPullToRead, onReturnFromPull, onMarkBlindDate, onUnmarkBlindDate, onSetPrice, isSettingPrice, onSaveTags, isSavingTags }) => {
  const [showCustomSearch, setShowCustomSearch] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showEnrichMenu, setShowEnrichMenu] = useState(false);
  const [customTitle, setCustomTitle] = useState(book.book_title);
  const [customAuthor, setCustomAuthor] = useState(book.author_fullname || '');
  const [customIsbn, setCustomIsbn] = useState('');
  const [salePrice, setSalePrice] = useState(book.our_price ? String(Number(book.our_price).toFixed(2)) : '');
  const [saleDate, setSaleDate] = useState(todayDateString());
  const [saleEvent, setSaleEvent] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [editSubgenres, setEditSubgenres] = useState<string[]>(book.subgenres || []);
  const [editPacing, setEditPacing] = useState<string | null>(book.pacing || null);

  const { data: subgenreOptions = [] } = useQuery({
    queryKey: ['subgenreOptions'],
    queryFn: subgenreApi.getAll,
    enabled: showTagEditor,
  });

  // Sync sale price when book's our_price changes
  useEffect(() => {
    setSalePrice(book.our_price != null ? String(Number(book.our_price).toFixed(2)) : '');
  }, [book.our_price]);

  // Clear sale form when book becomes sold (mutation succeeded)
  useEffect(() => {
    if (book.sold) setShowSaleForm(false);
  }, [book.sold]);

  // Sync tag editor state when book tags change (e.g., after save or Gemini re-tag)
  useEffect(() => {
    setEditSubgenres(book.subgenres || []);
    setEditPacing(book.pacing || null);
    setShowTagEditor(false);
  }, [book.subgenres, book.pacing]);

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
              {book.pulled_to_read && !book.sold && !book.kept && (
                <span className="badge badge-reading">READING</span>
              )}
              {book.kept && (
                <span className="badge badge-kept">KEPT</span>
              )}
              {book.sold && (
                <span className="badge badge-sold">SOLD</span>
              )}
              {book.blind_date && !book.sold && (
                <span className="badge badge-blind-date">BLIND DATE{book.blind_date_number ? ` #${book.blind_date_number}` : ''}</span>
              )}
            </div>

            {showTagEditor && onSaveTags ? (
              <div className="tag-editor">
                <div className="tag-editor-label">Sub-genres <span className="tag-editor-hint">(pick up to 2)</span></div>
                <div className="tag-editor-subgenres">
                  {subgenreOptions.map(sg => (
                    <button
                      key={sg.id}
                      type="button"
                      className={`tag-chip ${editSubgenres.includes(sg.name) ? 'tag-chip-selected' : ''}`}
                      onClick={() => {
                        setEditSubgenres(prev =>
                          prev.includes(sg.name)
                            ? prev.filter(s => s !== sg.name)
                            : prev.length < 2 ? [...prev, sg.name] : prev
                        );
                      }}
                    >
                      {sg.name}
                    </button>
                  ))}
                </div>
                <div className="tag-editor-label">Pacing</div>
                <div className="tag-editor-pacing">
                  <select
                    value={editPacing || ''}
                    onChange={(e) => setEditPacing(e.target.value || null)}
                    className="tag-editor-pacing-select"
                  >
                    <option value="">None</option>
                    <option value="Slow Burn">Slow Burn</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Fast-Paced">Fast-Paced</option>
                  </select>
                </div>
                <div className="tag-editor-actions">
                  <button
                    className="btn btn-subgenre-save"
                    onClick={() => {
                      if (book.id) {
                        onSaveTags(book.id, editSubgenres, editPacing);
                      }
                    }}
                    disabled={isSavingTags}
                  >
                    {isSavingTags ? 'Saving...' : 'Save Tags'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditSubgenres(book.subgenres || []);
                      setEditPacing(book.pacing || null);
                      setShowTagEditor(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              (((book.subgenres && book.subgenres.length > 0) || book.pacing) || onSaveTags) && (
                <div className="book-detail-subgenres">
                  {book.subgenres?.map(sg => (
                    <span key={sg} className="badge badge-subgenre">{sg}</span>
                  ))}
                  {book.pacing && (
                    <span className="badge badge-pacing">{book.pacing}</span>
                  )}
                  {onSaveTags && (book.subgenres?.length || book.pacing) && (
                    <button
                      className="tag-edit-btn"
                      onClick={() => setShowTagEditor(true)}
                      title="Edit tags"
                    >
                      &#9998;
                    </button>
                  )}
                  {onSaveTags && !book.subgenres?.length && !book.pacing && (
                    <button
                      className="tag-add-btn"
                      onClick={() => setShowTagEditor(true)}
                    >
                      + Add Tags
                    </button>
                  )}
                </div>
              )
            )}

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

        {book.blind_date && (
          <div className="book-detail-blind-date-info">
            <h3>Blind Date Details</h3>
            <div className="pricing-grid">
              <div className="pricing-item">
                <span className="meta-label">Number</span>
                <span className="meta-value">{book.blind_date_number || 'Not assigned'}</span>
              </div>
            </div>
            {book.blind_date_blurb && (
              <div className="blurb-card" style={{
                backgroundColor: 'rgba(225, 29, 72, 0.08)',
                borderLeft: '3px solid #E11D48',
                padding: '0.75rem 1rem',
                borderRadius: '0 6px 6px 0',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                marginTop: '0.75rem',
                whiteSpace: 'pre-line',
              }}>{book.blind_date_blurb}</div>
            )}
            <Link
              to="/blind-date"
              className="manage-blind-date-link"
              onClick={onClose}
            >
              Manage on Blind Date page
            </Link>
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
              {onSetPrice ? (
                <InlinePrice
                  book={book}
                  onSave={onSetPrice}
                  isSaving={!!isSettingPrice}
                  disabled={!!book.sold || !!book.kept}
                />
              ) : (
                <span className="meta-value">{book.our_price ? `$${Number(book.our_price).toFixed(2)}` : 'N/A'}</span>
              )}
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
                <span className="meta-value">{toDateOnly(book.date_purchased)}</span>
              </div>
            )}
          </div>
        </div>

        {book.sold && (
          <div className="book-detail-sale-info">
            <h3>Sale Information</h3>
            <div className="pricing-grid">
              <div className="pricing-item">
                <span className="meta-label">Sold Price</span>
                <span className="meta-value">{book.sold_price ? `$${Number(book.sold_price).toFixed(2)}` : 'N/A'}</span>
              </div>
              <div className="pricing-item">
                <span className="meta-label">Date Sold</span>
                <span className="meta-value">{toDateOnly(book.date_sold) || 'N/A'}</span>
              </div>
              <div className="pricing-item">
                <span className="meta-label">Actual Profit</span>
                <span className="meta-value profit">
                  {book.sold_price && book.purchase_price
                    ? `$${(Number(book.sold_price) - Number(book.purchase_price)).toFixed(2)}`
                    : 'N/A'}
                </span>
              </div>
              {book.payment_method && (
                <div className="pricing-item">
                  <span className="meta-label">Payment</span>
                  <span className="meta-value">{book.payment_method}</span>
                </div>
              )}
              {book.sale_event && (
                <div className="pricing-item">
                  <span className="meta-label">Event</span>
                  <span className="meta-value">{book.sale_event}</span>
                </div>
              )}
            </div>
            {book.sale_transaction_id && (
              <Link
                to={`/sales?tx=${book.sale_transaction_id}`}
                className="view-transaction-link"
                onClick={onClose}
              >
                View Transaction
              </Link>
            )}
          </div>
        )}

      </div>

      {showSaleForm && !book.sold ? (
        <div className="book-detail-footer sale-form-footer">
          <div className="sale-form-fields">
            <div className="custom-search-row">
              <div className="custom-search-field">
                <label>Sale Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="custom-search-field">
                <label>Date Sold</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
            </div>
            <div className="custom-search-row">
              <div className="custom-search-field">
                <label>Event (optional)</label>
                <Autocomplete
                  id="sale_event"
                  name="sale_event"
                  value={saleEvent}
                  onChange={(e) => setSaleEvent(e.target.value)}
                  suggestions={saleEvents}
                  placeholder="e.g., Mad Monster Party 2026"
                />
              </div>
              <div className="custom-search-field">
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
          </div>
          <div className="custom-search-actions">
            <button
              className="btn btn-sold"
              onClick={() => {
                if (book.id && salePrice && onMarkSold) {
                  onMarkSold(book.id, {
                    sold_price: parseFloat(salePrice),
                    date_sold: saleDate,
                    sale_event: saleEvent || undefined,
                    payment_method: paymentMethod,
                    sale_transaction_id: crypto.randomUUID(),
                  });
                }
              }}
              disabled={isMarkingSold || !salePrice}
            >
              {isMarkingSold ? 'Saving...' : 'Confirm Sale'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowSaleForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : showCustomSearch ? (
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
          {!book.sold && !book.kept && !book.pulled_to_read && onMarkSold && (
            <button
              className="btn btn-sold"
              onClick={() => setShowSaleForm(true)}
              disabled={!book.id}
            >
              Mark as Sold
            </button>
          )}
          {!book.sold && !book.kept && !book.pulled_to_read && onPullToRead && (
            <button
              className="btn btn-kept"
              onClick={() => {
                if (book.id) onPullToRead(book.id);
              }}
              disabled={!book.id}
            >
              Pull to Read
            </button>
          )}
          {!book.sold && !book.kept && !book.blind_date && onMarkBlindDate && (
            <button
              className="btn btn-blind-date-action"
              onClick={() => {
                if (book.id) onMarkBlindDate(book.id);
              }}
              disabled={!book.id}
            >
              Blind Date
            </button>
          )}
          {book.blind_date && !book.sold && onUnmarkBlindDate && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (book.id && window.confirm('Remove this book from Blind Date?')) {
                  onUnmarkBlindDate(book.id);
                }
              }}
            >
              Remove from Blind Date
            </button>
          )}
          {book.pulled_to_read && !book.sold && !book.kept && onMarkKept && (
            <button
              className="btn btn-kept"
              onClick={() => {
                if (book.id && window.confirm('Keep this book for your personal library? It will be removed from active inventory.')) {
                  onMarkKept(book.id);
                }
              }}
              disabled={!book.id}
            >
              Keep
            </button>
          )}
          {book.pulled_to_read && !book.sold && !book.kept && onReturnFromPull && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (book.id) onReturnFromPull(book.id);
              }}
            >
              Return to Inventory
            </button>
          )}
          {book.sold && onMarkAvailable && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (book.id && window.confirm('Mark this book as available again? Sale data will be cleared.')) {
                  onMarkAvailable(book.id);
                }
              }}
            >
              Mark Available
            </button>
          )}
          {book.kept && !book.pulled_to_read && onUnkeep && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (book.id && window.confirm('Return this book to active inventory?')) {
                  onUnkeep(book.id);
                }
              }}
            >
              Return to Inventory
            </button>
          )}
          <div className="book-detail-secondary-actions">
            <button className="btn btn-secondary" onClick={() => onEdit(book)}>
              Edit
            </button>
            <div className="enrich-dropdown-wrapper">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEnrichMenu(!showEnrichMenu)}
                disabled={(isEnriching || isTagging) && !showEnrichMenu}
              >
                {isEnriching ? 'Enriching...' : isTagging ? 'Tagging...' : 'Enrich'}
              </button>
              {showEnrichMenu && (
                <div className="enrich-dropdown">
                  <button
                    className="enrich-dropdown-item"
                    onClick={() => { handleEnrich(); setShowEnrichMenu(false); }}
                    disabled={isEnriching || !book.id}
                  >
                    {book.enriched_at ? 'Re-enrich from Google Books' : 'Google Books Auto'}
                  </button>
                  <button
                    className="enrich-dropdown-item"
                    onClick={() => { setShowCustomSearch(true); setShowEnrichMenu(false); }}
                  >
                    Google Books Custom Search
                  </button>
                  <button
                    className="enrich-dropdown-item btn-subgenre"
                    onClick={() => {
                      if (book.id && window.confirm(
                        `${book.subgenres?.length ? 'Re-tag' : 'Tag'} "${book.book_title}" with sub-genres using Gemini AI? This uses 1 API request.`
                      )) {
                        onTagSubgenres(book.id);
                      }
                      setShowEnrichMenu(false);
                    }}
                    disabled={isTagging || !book.id}
                  >
                    {book.subgenres?.length ? 'Re-tag Sub-genres (Gemini)' : 'Tag Sub-genres (Gemini)'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetail;
