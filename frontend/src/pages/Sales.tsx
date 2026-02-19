import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookApi } from '../services/api';
import { Transaction, UpdateTransactionRequest } from '../types/Book';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatDate, toDateOnly } from '../utils/dates';
import './Sales.css';

function Sales() {
  const [searchParams] = useSearchParams();
  const txFromUrl = searchParams.get('tx');

  const [eventFilter, setEventFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [expandedTx, setExpandedTx] = useState<Set<string>>(txFromUrl ? new Set([txFromUrl]) : new Set());

  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions', eventFilter, dateFilter, paymentFilter],
    queryFn: () => bookApi.getTransactions({
      sale_event: eventFilter || undefined,
      date_sold: dateFilter || undefined,
      payment_method: paymentFilter || undefined,
    }),
  });

  const { data: saleEvents = [] } = useQuery({
    queryKey: ['saleEvents'],
    queryFn: bookApi.getSaleEvents,
  });

  const toggleExpand = (txId: string) => {
    setExpandedTx(prev => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
      }
      return next;
    });
  };

  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.total_revenue, 0);
  const totalProfit = transactions.reduce((sum, tx) => sum + tx.total_profit, 0);
  const totalBooks = transactions.reduce((sum, tx) => sum + tx.book_count, 0);

  const revertMutation = useMutation({
    mutationFn: (txId: string) => bookApi.revertTransaction(txId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['saleEvents'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (request: UpdateTransactionRequest) => bookApi.updateTransaction(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['saleEvents'] });
    },
  });

  const handleRevertTransaction = (tx: Transaction) => {
    if (window.confirm(
      `Revert this sale? ${tx.book_count} book${tx.book_count !== 1 ? 's' : ''} will be marked as available again.`
    )) {
      revertMutation.mutate(tx.sale_transaction_id);
    }
  };

  const clearFilters = () => {
    setEventFilter('');
    setDateFilter('');
    setPaymentFilter('');
  };

  if (isLoading) {
    return <div className="loading">Loading sales...</div>;
  }

  if (isError) {
    return (
      <div className="loading">
        <p>Failed to load sales.</p>
        <button onClick={() => refetch()} className="btn btn-primary" style={{ marginTop: '1rem' }}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="sales-page">
      <div className="sales-header">
        <h2>Sales</h2>
      </div>

      {transactions.length > 0 && (
        <div className="sales-summary">
          <div className="sales-summary-card">
            <span className="sales-summary-label">Transactions</span>
            <span className="sales-summary-value">{transactions.length}</span>
          </div>
          <div className="sales-summary-card">
            <span className="sales-summary-label">Books Sold</span>
            <span className="sales-summary-value">{totalBooks}</span>
          </div>
          <div className="sales-summary-card">
            <span className="sales-summary-label">Revenue</span>
            <span className="sales-summary-value">${totalRevenue.toFixed(2)}</span>
          </div>
          <div className="sales-summary-card">
            <span className="sales-summary-label">Profit</span>
            <span className="sales-summary-value profit">${totalProfit.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="sales-filters">
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Events</option>
          {saleEvents.map(event => (
            <option key={event} value={event}>{event}</option>
          ))}
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="filter-input"
          placeholder="Filter by date"
        />

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Payments</option>
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
        </select>

        <button onClick={clearFilters} className="btn btn-secondary">
          Clear
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="sales-empty">
          <p>No sales recorded yet.</p>
          <p className="sales-empty-hint">Mark books as sold from the Inventory page to see them here.</p>
        </div>
      ) : (
        <div className="transactions-list">
          {transactions.map((tx) => (
            <TransactionCard
              key={tx.sale_transaction_id}
              transaction={tx}
              isExpanded={expandedTx.has(tx.sale_transaction_id)}
              onToggle={() => toggleExpand(tx.sale_transaction_id)}
              onRevert={() => handleRevertTransaction(tx)}
              isReverting={revertMutation.isPending}
              onUpdate={(request) => updateMutation.mutate(request)}
              isUpdating={updateMutation.isPending}
              saleEvents={saleEvents}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionCard({ transaction: tx, isExpanded, onToggle, onRevert, isReverting, onUpdate, isUpdating, saleEvents, isMobile }: {
  transaction: Transaction;
  isExpanded: boolean;
  onToggle: () => void;
  onRevert: () => void;
  isReverting: boolean;
  onUpdate: (request: UpdateTransactionRequest) => void;
  isUpdating: boolean;
  saleEvents: string[];
  isMobile: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editEvent, setEditEvent] = useState('');
  const [editPayment, setEditPayment] = useState<'Cash' | 'Card'>('Cash');
  const [editPrices, setEditPrices] = useState<Record<number, string>>({});

  const startEditing = () => {
    setEditDate(toDateOnly(tx.date_sold));
    setEditEvent(tx.sale_event || '');
    setEditPayment((tx.payment_method as 'Cash' | 'Card') || 'Cash');
    const prices: Record<number, string> = {};
    tx.books.forEach(b => { prices[b.id] = b.sold_price.toFixed(2); });
    setEditPrices(prices);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEdits = () => {
    const items = tx.books.map(b => ({
      book_id: b.id,
      sold_price: parseFloat(editPrices[b.id]) || b.sold_price,
    }));
    onUpdate({
      sale_transaction_id: tx.sale_transaction_id,
      date_sold: editDate,
      sale_event: editEvent || null,
      payment_method: editPayment,
      items,
    });
    setIsEditing(false);
  };

  const maxCovers = isMobile ? 3 : 5;
  const visibleBooks = tx.books.slice(0, maxCovers);
  const remaining = tx.books.length - maxCovers;

  const editTotal = isEditing
    ? tx.books.reduce((sum, b) => sum + (parseFloat(editPrices[b.id]) || 0), 0)
    : tx.total_revenue;

  return (
    <div className={`transaction-card ${isEditing ? 'transaction-card-editing' : ''}`}>
      <div className="transaction-summary" onClick={isEditing ? undefined : onToggle} style={isEditing ? { cursor: 'default' } : undefined}>
        <div className="transaction-covers">
          {visibleBooks.map(book => (
            book.cover_image_url ? (
              <img
                key={book.id}
                src={book.cover_image_url}
                alt={book.book_title}
                className="transaction-cover-thumb"
                loading="lazy"
              />
            ) : (
              <div key={book.id} className="transaction-cover-placeholder" />
            )
          ))}
          {remaining > 0 && (
            <div className="transaction-cover-more">+{remaining}</div>
          )}
        </div>

        <div className="transaction-info">
          <div className="transaction-meta">
            <span className="transaction-date">
              {formatDate(tx.date_sold, 'Unknown date')}
            </span>
            {tx.sale_event && (
              <span className="transaction-event-badge">{tx.sale_event}</span>
            )}
            {tx.payment_method && (
              <span className={`transaction-payment-badge payment-${tx.payment_method.toLowerCase()}`}>
                {tx.payment_method}
              </span>
            )}
          </div>
          <div className="transaction-stats">
            <span>{tx.book_count} book{tx.book_count !== 1 ? 's' : ''}</span>
            <span className="transaction-revenue">${tx.total_revenue.toFixed(2)}</span>
            <span className="transaction-profit">+${tx.total_profit.toFixed(2)}</span>
          </div>
        </div>

        {!isEditing && (
          <span className={`transaction-expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
        )}
      </div>

      {(isExpanded || isEditing) && (
        <div className="transaction-details">
          {isEditing && (
            <div className="transaction-edit-shared">
              <div className="transaction-edit-row">
                <div className="transaction-edit-field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div className="transaction-edit-field">
                  <label>Event</label>
                  <input
                    type="text"
                    value={editEvent}
                    onChange={(e) => setEditEvent(e.target.value)}
                    placeholder="Event name"
                    list="edit-event-suggestions"
                  />
                  <datalist id="edit-event-suggestions">
                    {saleEvents.map(ev => (
                      <option key={ev} value={ev} />
                    ))}
                  </datalist>
                </div>
                <div className="transaction-edit-field">
                  <label>Payment</label>
                  <select
                    value={editPayment}
                    onChange={(e) => setEditPayment(e.target.value as 'Cash' | 'Card')}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {tx.books.map(book => (
            <div key={book.id} className="transaction-book-row">
              {book.cover_image_url ? (
                <img src={book.cover_image_url} alt="" className="transaction-book-cover" />
              ) : (
                <div className="transaction-book-cover-placeholder" />
              )}
              <div className="transaction-book-info">
                <span className="transaction-book-title">{book.book_title}</span>
                <span className="transaction-book-author">{book.author_fullname}</span>
              </div>
              <div className="transaction-book-price">
                {isEditing ? (
                  <div className="transaction-edit-price">
                    <span className="price-prefix">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPrices[book.id] || ''}
                      onChange={(e) => setEditPrices(prev => ({ ...prev, [book.id]: e.target.value }))}
                    />
                  </div>
                ) : (
                  <>
                    <span className="transaction-book-sold">${book.sold_price.toFixed(2)}</span>
                    {book.purchase_price != null && (
                      <span className="transaction-book-profit">
                        +${(book.sold_price - book.purchase_price).toFixed(2)}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {isEditing && (
            <div className="transaction-edit-total">
              Total: <strong>${editTotal.toFixed(2)}</strong>
            </div>
          )}

          <div className="transaction-actions">
            {isEditing ? (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={cancelEditing}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveEdits}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={startEditing}
                >
                  Edit
                </button>
                <button
                  className="btn btn-revert"
                  onClick={onRevert}
                  disabled={isReverting}
                >
                  {isReverting ? 'Reverting...' : 'Revert Sale'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;
