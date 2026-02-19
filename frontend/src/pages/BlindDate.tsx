import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookApi } from '../services/api';
import { Book, BlindDateBatchProgress } from '../types/Book';
import Modal from '../components/Modal';
import BookDetail from '../components/BookDetail';
import { useBookActions } from '../hooks/useBookActions';
import './BlindDate.css';

function BlindDate() {
  const queryClient = useQueryClient();
  const {
    updateMutation: sharedUpdateMutation,
    enrichMutation,
    tagMutation,
    handleEnrichBook,
    handleMarkSold,
    handleMarkAvailable,
    handlePullToRead,
    handleReturnFromPull,
    handleMarkKept,
    handleUnkeep,
    handleMarkBlindDate: handleDetailMarkBlindDate,
    handleUnmarkBlindDate: handleDetailUnmarkBlindDate,
    handleSaveTags,
  } = useBookActions();

  const [batchSize, setBatchSize] = useState(10);
  const [editingBlurb, setEditingBlurb] = useState<number | null>(null);
  const [blurbDraft, setBlurbDraft] = useState('');
  const [blurbError, setBlurbError] = useState<{ bookId: number; message: string } | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Active blind date books
  const { data: activeBooks = [], isLoading: loadingActive, isError: errorActive, refetch: refetchActive } = useQuery({
    queryKey: ['books', { blind_date: true, sold: false }],
    queryFn: () => bookApi.getAll({ blind_date: true, sold: false }),
  });

  // Candidates
  const { data: candidates = [], isLoading: loadingCandidates, refetch: refetchCandidates } = useQuery({
    queryKey: ['blindDateCandidates'],
    queryFn: () => bookApi.getBlindDateCandidates(20),
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => bookApi.getStats(),
  });
  const bdStats = stats?.blind_date;

  // Batch progress polling
  const { data: batchProgress } = useQuery<BlindDateBatchProgress>({
    queryKey: ['batchBlurbProgress'],
    queryFn: bookApi.getBatchBlurbProgress,
    refetchInterval: (query) => {
      const data = query.state.data as BlindDateBatchProgress | undefined;
      return data?.is_running ? 2000 : false;
    },
  });

  // Fetch selected book fresh for BookDetail
  const { data: fetchedSelectedBook } = useQuery({
    queryKey: ['book', selectedBook?.id],
    queryFn: () => bookApi.getById(selectedBook!.id!),
    enabled: isDetailOpen && !!selectedBook?.id,
  });
  const currentSelectedBook = fetchedSelectedBook || selectedBook;

  // Sale events for BookDetail
  const { data: saleEvents = [] } = useQuery({
    queryKey: ['saleEvents'],
    queryFn: bookApi.getSaleEvents,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['books'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['blindDateCandidates'] });
  };

  // Refresh book list as blurbs complete (not just when batch finishes)
  const wasRunning = useRef(false);
  const lastProcessed = useRef(0);
  useEffect(() => {
    if (batchProgress?.is_running) {
      wasRunning.current = true;
      if (batchProgress.processed > lastProcessed.current) {
        lastProcessed.current = batchProgress.processed;
        queryClient.invalidateQueries({ queryKey: ['books'] });
      }
    } else if (wasRunning.current && batchProgress && !batchProgress.is_running) {
      wasRunning.current = false;
      lastProcessed.current = 0;
      invalidateAll();
    }
  }, [batchProgress?.is_running, batchProgress?.processed]);

  // Mutations
  const markMutation = useMutation({
    mutationFn: (bookIds: number[]) => bookApi.markBlindDate(bookIds),
    onSuccess: invalidateAll,
  });

  const unmarkMutation = useMutation({
    mutationFn: (bookIds: number[]) => bookApi.unmarkBlindDate(bookIds),
    onSuccess: invalidateAll,
  });

  const generateBlurbMutation = useMutation({
    mutationFn: (bookId: number) => bookApi.generateBlurb(bookId),
    onSuccess: (result) => {
      if (result.status === 'error') {
        const isRateLimit = result.error?.toLowerCase().includes('rate limit') || result.error?.toLowerCase().includes('quota');
        setBlurbError({
          bookId: result.book_id,
          message: isRateLimit ? 'Rate limited — try again in a minute' : (result.error || 'Generation failed'),
        });
      } else {
        setBlurbError(null);
      }
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err: any) => {
      setBlurbError({ bookId: 0, message: err?.message || 'Network error' });
    },
  });

  const startBatchMutation = useMutation({
    mutationFn: (limit: number) => bookApi.startBatchBlurbs(limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchBlurbProgress'] });
    },
  });

  const cancelBatchMutation = useMutation({
    mutationFn: () => bookApi.cancelBatchBlurbs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchBlurbProgress'] });
      invalidateAll();
    },
  });

  const handleViewBook = (book: Book) => {
    setSelectedBook(book);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedBook(null);
  };

  const handleAddCandidate = (book: Book) => {
    if (book.id) {
      markMutation.mutate([book.id]);
    }
  };

  const handleRemove = (book: Book) => {
    if (book.id && window.confirm(`Remove "${book.book_title}" from Blind Date?`)) {
      unmarkMutation.mutate([book.id]);
    }
  };

  const handleGenerateBlurb = (book: Book) => {
    if (book.id) {
      generateBlurbMutation.mutate(book.id);
    }
  };

  const handleStartBatch = () => {
    startBatchMutation.mutate(batchSize);
  };

  const handleSaveBlurb = (bookId: number) => {
    sharedUpdateMutation.mutate(
      { id: bookId, book: { blind_date_blurb: blurbDraft } },
      {
        onSuccess: () => {
          setEditingBlurb(null);
          setBlurbDraft('');
        },
      },
    );
  };

  const handleNumberChange = (bookId: number, value: string) => {
    sharedUpdateMutation.mutate({ id: bookId, book: { blind_date_number: value || null } });
  };

  const isRunning = batchProgress?.is_running ?? false;

  if (loadingActive) {
    return <div className="loading">Loading blind date books...</div>;
  }

  if (errorActive) {
    return (
      <div className="loading">
        <p>Failed to load blind date books.</p>
        <button onClick={() => refetchActive()} className="btn btn-primary" style={{ marginTop: '1rem' }}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="blind-date">
      <div className="blind-date-header">
        <h2>Blind Date with a Book</h2>
        {bdStats && bdStats.active_count > 0 && (
          <span className="blind-date-count-badge">{bdStats.active_count} active</span>
        )}
      </div>

      {/* Stats bar */}
      {bdStats && bdStats.active_count > 0 && (
        <div className="blind-date-stats">
          <div className="blind-date-stat-card">
            <h3>Active Books</h3>
            <p className="stat-value">{bdStats.active_count}</p>
          </div>
          <div className="blind-date-stat-card">
            <h3>Total Value</h3>
            <p className="stat-value">${bdStats.total_value.toFixed(2)}</p>
          </div>
          <div className="blind-date-stat-card">
            <h3>Have Blurbs</h3>
            <p className="stat-value">{bdStats.with_blurb_count}</p>
          </div>
          <div className="blind-date-stat-card">
            <h3>Need Blurbs</h3>
            <p className="stat-value">{bdStats.without_blurb_count}</p>
          </div>
        </div>
      )}

      {/* Active blind date books */}
      <div className="blind-date-section">
        <div className="blind-date-section-header">
          <h3>Active Blind Date Books</h3>
          {bdStats && bdStats.without_blurb_count > 0 && (
            <div className="batch-blurb-controls">
              <label>Batch:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                disabled={isRunning}
              />
              {isRunning ? (
                <button className="btn btn-secondary" onClick={() => cancelBatchMutation.mutate()}>
                  Cancel
                </button>
              ) : (
                <button
                  className="btn btn-blind-date"
                  onClick={handleStartBatch}
                  disabled={startBatchMutation.isPending}
                >
                  Generate All Missing Blurbs
                </button>
              )}
            </div>
          )}
        </div>

        {/* Batch progress */}
        {batchProgress && (batchProgress.is_running || batchProgress.processed > 0) && (
          <div className="blind-date-progress">
            <div className="blind-date-progress-bar">
              <div
                className="blind-date-progress-fill"
                style={{ width: batchProgress.total > 0 ? `${(batchProgress.processed / batchProgress.total) * 100}%` : '0%' }}
              />
            </div>
            <span className="blind-date-progress-text">
              {batchProgress.processed} / {batchProgress.total}
              {batchProgress.succeeded > 0 && ` | OK: ${batchProgress.succeeded}`}
              {batchProgress.errors > 0 && ` | Errors: ${batchProgress.errors}`}
              {!batchProgress.is_running && batchProgress.processed > 0 && (
                batchProgress.stopped_reason
                  ? ` — ${batchProgress.stopped_reason}`
                  : batchProgress.errors > 0
                    ? ` — Done (${batchProgress.errors} failed)`
                    : ' — Done'
              )}
            </span>
          </div>
        )}

        {activeBooks.length === 0 ? (
          <div className="blind-date-empty">
            <p>No blind date books yet.</p>
            <p className="hint">Add books from the candidates below or from the Inventory page.</p>
          </div>
        ) : (
          <div className="blind-date-book-list">
            {activeBooks.map((book) => (
              <ActiveBookCard
                key={book.id}
                book={book}
                isEditingBlurb={editingBlurb === book.id}
                blurbDraft={editingBlurb === book.id ? blurbDraft : ''}
                onStartEditBlurb={() => {
                  setEditingBlurb(book.id!);
                  setBlurbDraft(book.blind_date_blurb || '');
                }}
                onCancelEditBlurb={() => { setEditingBlurb(null); setBlurbDraft(''); }}
                onSaveBlurb={() => handleSaveBlurb(book.id!)}
                onBlurbDraftChange={setBlurbDraft}
                onGenerateBlurb={() => handleGenerateBlurb(book)}
                isGenerating={generateBlurbMutation.isPending && generateBlurbMutation.variables === book.id}
                errorMessage={blurbError && blurbError.bookId === book.id ? blurbError.message : undefined}
                onRemove={() => handleRemove(book)}
                onNumberSave={(val) => handleNumberChange(book.id!, val)}
                onViewBook={() => handleViewBook(book)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Candidates section */}
      <div className="blind-date-section">
        <div className="blind-date-section-header">
          <h3>
            Suggested Candidates
            {bdStats && bdStats.candidate_count > 0 && (
              <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                ({bdStats.candidate_count} eligible)
              </span>
            )}
          </h3>
          <button
            className="btn btn-secondary btn-refresh-candidates"
            onClick={() => refetchCandidates()}
            disabled={loadingCandidates}
          >
            {loadingCandidates ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="blind-date-empty">
            <p>No candidates found.</p>
            <p className="hint">
              Candidates are books in Very Good or Like New condition with enrichment data and sub-genre tags.
            </p>
          </div>
        ) : (
          <div className="blind-date-candidates-grid">
            {candidates.map((book) => (
              <div key={book.id} className="blind-date-candidate-card">
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt=""
                    className="blind-date-book-cover blind-date-cover-clickable"
                    onClick={() => handleViewBook(book)}
                  />
                ) : (
                  <div
                    className="blind-date-book-cover-placeholder blind-date-cover-clickable"
                    onClick={() => handleViewBook(book)}
                  />
                )}
                <div className="blind-date-candidate-info">
                  <span className="blind-date-book-title blind-date-title-clickable" onClick={() => handleViewBook(book)}>{book.book_title}</span>
                  <span className="blind-date-book-author">{book.author_fullname}</span>
                  <div className="blind-date-book-badges">
                    {book.pulled_to_read && !book.sold && !book.kept && <span className="badge badge-reading">READING</span>}
                    {book.kept && <span className="badge badge-kept">KEPT</span>}
                    {book.sold && <span className="badge badge-sold">SOLD</span>}
                    {book.blind_date && !book.sold && (
                      <span className="badge badge-blind-date">BLIND DATE{book.blind_date_number ? ` #${book.blind_date_number}` : ''}</span>
                    )}
                    {book.condition && <span className="badge-condition">{book.condition}</span>}
                    {book.subgenres?.map((sg) => (
                      <span key={sg} className="badge-subgenre">{sg}</span>
                    ))}
                  </div>
                </div>
                <div className="blind-date-candidate-actions">
                  <button
                    className="btn btn-blind-date"
                    onClick={() => handleAddCandidate(book)}
                    disabled={markMutation.isPending}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={handleCloseDetail}>
        {currentSelectedBook && (
          <BookDetail
            book={currentSelectedBook}
            onClose={handleCloseDetail}
            onEdit={() => {}}
            onEnrich={handleEnrichBook}
            isEnriching={enrichMutation.isPending}
            onTagSubgenres={(id: number) => tagMutation.mutate(id)}
            isTagging={tagMutation.isPending}
            onMarkSold={handleMarkSold}
            isMarkingSold={sharedUpdateMutation.isPending}
            saleEvents={saleEvents}
            onMarkAvailable={handleMarkAvailable}
            onMarkKept={handleMarkKept}
            onUnkeep={handleUnkeep}
            onPullToRead={handlePullToRead}
            onReturnFromPull={handleReturnFromPull}
            onMarkBlindDate={handleDetailMarkBlindDate}
            onUnmarkBlindDate={handleDetailUnmarkBlindDate}
            onSaveTags={handleSaveTags}
            isSavingTags={sharedUpdateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
}

function ActiveBookCard({
  book,
  isEditingBlurb,
  blurbDraft,
  onStartEditBlurb,
  onCancelEditBlurb,
  onSaveBlurb,
  onBlurbDraftChange,
  onGenerateBlurb,
  isGenerating,
  errorMessage,
  onRemove,
  onNumberSave,
  onViewBook,
}: {
  book: Book;
  isEditingBlurb: boolean;
  blurbDraft: string;
  onStartEditBlurb: () => void;
  onCancelEditBlurb: () => void;
  onSaveBlurb: () => void;
  onBlurbDraftChange: (val: string) => void;
  onGenerateBlurb: () => void;
  isGenerating: boolean;
  errorMessage?: string;
  onRemove: () => void;
  onNumberSave: (val: string) => void;
  onViewBook: () => void;
}) {
  const [localNumber, setLocalNumber] = useState(book.blind_date_number || '');
  const numberChanged = localNumber !== (book.blind_date_number || '');

  return (
    <div className="blind-date-book-card">
      {book.cover_image_url ? (
        <img
          src={book.cover_image_url}
          alt=""
          className="blind-date-book-cover blind-date-cover-clickable"
          onClick={onViewBook}
        />
      ) : (
        <div
          className="blind-date-book-cover-placeholder blind-date-cover-clickable"
          onClick={onViewBook}
        />
      )}
      <div className="blind-date-book-info">
        <span className="blind-date-book-title blind-date-title-clickable" onClick={onViewBook}>{book.book_title}</span>
        <span className="blind-date-book-author">{book.author_fullname}</span>

        <div className="blind-date-book-badges">
          {book.pulled_to_read && !book.sold && !book.kept && <span className="badge badge-reading">READING</span>}
          {book.kept && <span className="badge badge-kept">KEPT</span>}
          {book.sold && <span className="badge badge-sold">SOLD</span>}
          {book.blind_date && !book.sold && (
            <span className="badge badge-blind-date">BLIND DATE{book.blind_date_number ? ` #${book.blind_date_number}` : ''}</span>
          )}
          {book.condition && <span className="badge-condition">{book.condition}</span>}
          {book.subgenres?.map((sg) => (
            <span key={sg} className="badge-subgenre">{sg}</span>
          ))}
        </div>

        <div className="blind-date-inline-fields">
          <div className="blind-date-inline-field">
            <label>#</label>
            <input
              type="text"
              value={localNumber}
              onChange={(e) => setLocalNumber(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onNumberSave(localNumber); }}
              placeholder="—"
            />
            {numberChanged && (
              <button className="btn btn-blind-date btn-inline-save" onClick={() => onNumberSave(localNumber)}>
                Save
              </button>
            )}
          </div>
          {book.our_price != null && (
            <div className="blind-date-inline-field">
              <label>Price</label>
              <span className="blind-date-price-display">${Number(book.our_price).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Blurb display/edit */}
        {isEditingBlurb ? (
          <>
            <textarea
              className="blurb-edit-textarea"
              value={blurbDraft}
              onChange={(e) => onBlurbDraftChange(e.target.value)}
              placeholder="Write a teaser blurb..."
            />
            <div className="blind-date-book-actions">
              <button className="btn btn-blind-date" onClick={onSaveBlurb}>Save</button>
              <button className="btn btn-secondary" onClick={onCancelEditBlurb}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            {book.blind_date_blurb ? (
              <div className="blurb-card" style={{ whiteSpace: 'pre-line' }}>{book.blind_date_blurb}</div>
            ) : (
              <p className="blurb-empty">No blurb yet</p>
            )}
            {errorMessage && (
              <p className="blurb-error">{errorMessage}</p>
            )}
            <div className="blind-date-book-actions">
              <button
                className="btn btn-blind-date"
                onClick={onGenerateBlurb}
                disabled={isGenerating}
              >
                {isGenerating ? 'Retrying...' : book.blind_date_blurb ? 'Regenerate' : 'Generate Blurb'}
              </button>
              <button className="btn btn-secondary" onClick={onStartEditBlurb}>
                {book.blind_date_blurb ? 'Edit' : 'Write'}
              </button>
              <button className="btn btn-secondary" onClick={onRemove}>Remove</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BlindDate;
