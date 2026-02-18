import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { bookApi, subgenreApi } from '../services/api';
import { Book, BookFilters, BulkSaleRequest, BulkPriceRequest } from '../types/Book';
import Modal from '../components/Modal';
import BookForm from '../components/BookForm';
import BookDetail from '../components/BookDetail';
import BulkSaleModal from '../components/BulkSaleModal';
import BulkPriceModal from '../components/BulkPriceModal';
import InlinePrice from '../components/InlinePrice';
import { useIsMobile } from '../hooks/useIsMobile';
import { useBookActions } from '../hooks/useBookActions';
import { formatDate } from '../utils/dates';
import './Inventory.css';

function getStockStatusValue(filters: BookFilters): string {
  if (filters.blind_date) return 'blind_date';
  if (filters.blind_date_candidate) return 'blind_date_candidate';
  if (filters.missing_price) return 'missing_price';
  if (filters.pulled_to_read) return 'pulled_to_read';
  if (filters.kept === true && filters.sold === undefined) return 'kept';
  if (filters.sold === undefined && filters.kept === undefined) return '';
  if (filters.sold) return 'sold';
  return 'available';
}

function applyStockStatus(filters: BookFilters, val: string): BookFilters {
  const next = { ...filters };
  delete next.sold;
  delete next.kept;
  delete next.missing_price;
  delete next.pulled_to_read;
  delete next.blind_date;
  delete next.blind_date_candidate;
  if (val === 'sold') { next.sold = true; }
  else if (val === 'available') { next.sold = false; next.kept = false; }
  else if (val === 'missing_price') { next.sold = false; next.kept = false; next.missing_price = true; }
  else if (val === 'pulled_to_read') { next.sold = false; next.kept = false; next.pulled_to_read = true; }
  else if (val === 'kept') { next.kept = true; }
  else if (val === 'blind_date') { next.blind_date = true; next.sold = false; }
  else if (val === 'blind_date_candidate') { next.blind_date_candidate = true; }
  return next;
}

interface FilterDrawerProps {
  filters: BookFilters;
  subgenreOptions: { id: number; name: string }[] | undefined;
  onApply: (filters: BookFilters) => void;
  onClear: () => void;
  onClose: () => void;
}

function FilterDrawer({ filters, subgenreOptions, onApply, onClear, onClose }: FilterDrawerProps) {
  const [draft, setDraft] = useState<BookFilters>({ ...filters });

  const draftStockStatus = getStockStatusValue(draft);
  const draftViewingSold = draft.sold === true && !draft.missing_price;
  const draftViewingKept = draft.kept === true && draft.sold === undefined;

  const handleStockStatusChange = (val: string) => {
    setDraft(applyStockStatus(draft, val));
  };

  const handleDraftFilterChange = (key: keyof BookFilters, value: string) => {
    const next = { ...draft };
    if (value === '') {
      delete next[key];
    } else {
      next[key] = value as any;
    }
    setDraft(next);
  };

  return (
    <div className="filter-drawer-overlay" onClick={onClose}>
      <div className="filter-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="filter-drawer-header">
          <h3>Filters</h3>
          <button className="filter-drawer-close" onClick={onClose}>&times;</button>
        </div>
        <div className="filter-drawer-body">
          <div className="filter-drawer-group">
            <label className="filter-drawer-label">Stock Status</label>
            <select
              value={draftStockStatus}
              onChange={(e) => handleStockStatusChange(e.target.value)}
              className="filter-drawer-select"
            >
              <option value="available">Available</option>
              <option value="missing_price">Missing Price</option>
              <option value="sold">Sold</option>
              <option value="pulled_to_read">Pulled to Read</option>
              <option value="kept">Kept</option>
              <option value="blind_date">Blind Date</option>
              <option value="blind_date_candidate">Blind Date Candidates</option>
              <option value="">All Books</option>
            </select>
          </div>

          <div className="filter-drawer-group">
            <button
              type="button"
              className={`filter-drawer-cleaned-toggle ${draft.cleaned ? 'active' : ''}`}
              onClick={() => {
                const next = { ...draft };
                if (next.cleaned) {
                  delete next.cleaned;
                } else {
                  next.cleaned = true;
                }
                setDraft(next);
              }}
            >
              Cleaned only
            </button>
          </div>

          {!draftViewingSold && !draftViewingKept && (
            <>
              <div className="filter-drawer-group">
                <label className="filter-drawer-label">Category</label>
                <select
                  value={draft.category || ''}
                  onChange={(e) => handleDraftFilterChange('category', e.target.value)}
                  className="filter-drawer-select"
                >
                  <option value="">All Categories</option>
                  <option value="YA/Nostalgia">YA/Nostalgia</option>
                  <option value="PFH/Vintage">PFH/Vintage</option>
                  <option value="Mainstream">Mainstream</option>
                  <option value="Comics/Ephemera">Comics/Ephemera</option>
                </select>
              </div>

              <div className="filter-drawer-group">
                <label className="filter-drawer-label">Condition</label>
                <select
                  value={draft.condition || ''}
                  onChange={(e) => handleDraftFilterChange('condition', e.target.value)}
                  className="filter-drawer-select"
                >
                  <option value="">All Conditions</option>
                  <option value="Like New">Like New</option>
                  <option value="Very Good">Very Good</option>
                  <option value="Good">Good</option>
                  <option value="Acceptable">Acceptable</option>
                </select>
              </div>

              <div className="filter-drawer-group">
                <label className="filter-drawer-label">Cover Type</label>
                <select
                  value={draft.cover_type || ''}
                  onChange={(e) => handleDraftFilterChange('cover_type', e.target.value)}
                  className="filter-drawer-select"
                >
                  <option value="">All Cover Types</option>
                  <option value="Paper">Paperback</option>
                  <option value="Hard">Hardcover</option>
                  <option value="Audiobook">Audiobook</option>
                </select>
              </div>

              <div className="filter-drawer-group">
                <label className="filter-drawer-label">Sub-Genre</label>
                <select
                  value={draft.subgenre || ''}
                  onChange={(e) => handleDraftFilterChange('subgenre', e.target.value)}
                  className="filter-drawer-select"
                >
                  <option value="">All Sub-Genres</option>
                  {subgenreOptions?.map(sg => (
                    <option key={sg.id} value={sg.name}>{sg.name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-drawer-group">
                <label className="filter-drawer-label">Pacing</label>
                <select
                  value={draft.pacing || ''}
                  onChange={(e) => handleDraftFilterChange('pacing', e.target.value)}
                  className="filter-drawer-select"
                >
                  <option value="">All Pacing</option>
                  <option value="Slow Burn">Slow Burn</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Fast-Paced">Fast-Paced</option>
                </select>
              </div>
            </>
          )}
        </div>
        <div className="filter-drawer-footer">
          <button onClick={onClear} className="btn btn-secondary filter-drawer-clear-btn">
            Clear All
          </button>
          <button onClick={() => onApply(draft)} className="btn btn-primary filter-drawer-done-btn">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function Inventory() {
  const [filters, setFilters] = useState<BookFilters>({ sold: false, kept: false });
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBulkSaleOpen, setIsBulkSaleOpen] = useState(false);
  const [isBulkPriceOpen, setIsBulkPriceOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const isMobile = useIsMobile();
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
    handleMarkBlindDate,
    handleUnmarkBlindDate,
  } = useBookActions();

  const { data: books, isLoading } = useQuery({
    queryKey: ['books', filters],
    queryFn: () => bookApi.getAll(filters),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: bookApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setIsFormOpen(false);
      setSelectedBook(null);
    },
  });


  const bulkSaleMutation = useMutation({
    mutationFn: (request: BulkSaleRequest) => bookApi.bulkMarkSold(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['saleEvents'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsBulkSaleOpen(false);
      setSelectedIds(new Set());
          },
  });

  const bulkPriceMutation = useMutation({
    mutationFn: (request: BulkPriceRequest) => bookApi.bulkSetPrice(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setIsBulkPriceOpen(false);
      setSelectedIds(new Set());
          },
  });

  const quickPriceMutation = useMutation({
    mutationFn: ({ bookId, price }: { bookId: number; price: number | null }) =>
      bookApi.bulkSetPrice({ items: [{ book_id: bookId, our_price: price }] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const handleQuickPrice = (bookId: number, price: number | null) => {
    quickPriceMutation.mutate({ bookId, price });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => bookApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setIsFormOpen(false);
      setSelectedBook(null);
    },
  });

  const { data: subgenreOptions } = useQuery({
    queryKey: ['subgenreOptions'],
    queryFn: subgenreApi.getAll,
  });

  const { data: saleEvents = [] } = useQuery({
    queryKey: ['saleEvents'],
    queryFn: bookApi.getSaleEvents,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = search.trim();
    setFilters({ ...filters, search: trimmed || undefined });
  };

  const toggleCleaned = (book: Book) => {
    if (!book.id) return;
    sharedUpdateMutation.mutate({ id: book.id, book: { cleaned: !book.cleaned } });
  };

  const handleFilterChange = (key: keyof BookFilters, value: string) => {
    const newFilters = { ...filters };
    if (value === '') {
      delete newFilters[key];
    } else {
      newFilters[key] = value as any;
    }
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({ sold: false, kept: false });
    setSearch('');
    setSelectedIds(new Set());
      };

  const handleAddBook = () => {
    setSelectedBook(null);
    setIsFormOpen(true);
  };

  const handleEditBook = (book: Book) => {
    setIsDetailOpen(false);
    setSelectedBook(book);
    setIsFormOpen(true);
  };

  const handleViewBook = (book: Book) => {
    setSelectedBook(book);
    setIsDetailOpen(true);
  };

  const handleSubmitBook = (bookData: Partial<Book>) => {
    if (selectedBook?.id) {
      sharedUpdateMutation.mutate(
        { id: selectedBook.id, book: bookData },
        { onSuccess: () => { setIsFormOpen(false); setSelectedBook(null); } },
      );
    } else {
      createMutation.mutate(bookData as Book);
    }
  };

  const handleDeleteBook = (bookId: number) => {
    deleteMutation.mutate(bookId);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedBook(null);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedBook(null);
  };


  const toggleSelectBook = (bookId: number) => {
    // Save scroll position — iOS Safari aggressively scrolls on checkbox re-renders
    const scrollY = window.scrollY;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
    // Restore scroll position after React re-render
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  // Derive selected books from current query data so they're always fresh
  const selectedBooks = (books || []).filter(b => b.id && selectedIds.has(b.id));
  const selectableBooks = books?.filter(b => !b.sold && !b.kept && b.id) || [];
  const allSelected = selectableBooks.length > 0 && selectedIds.size === selectableBooks.length;

  // Fetch the selected book directly by ID so it stays fresh even when filtered out of the list
  const { data: fetchedSelectedBook } = useQuery({
    queryKey: ['book', selectedBook?.id],
    queryFn: () => bookApi.getById(selectedBook!.id!),
    enabled: isDetailOpen && !!selectedBook?.id,
  });

  const currentSelectedBook = fetchedSelectedBook || selectedBook;

  const stockStatusValue = getStockStatusValue(filters);
  const statusLabel = filters.blind_date ? 'blind date' :
    filters.blind_date_candidate ? 'blind date candidate' :
    filters.missing_price ? 'unpriced' :
    filters.pulled_to_read ? 'pulled to read' :
    filters.kept === true && filters.sold === undefined ? 'kept' :
    filters.sold === true ? 'sold' : filters.sold === false ? 'available' : '';
  const viewingSold = filters.sold === true && !filters.missing_price;
  const viewingKept = filters.kept === true && filters.sold === undefined;

  const activeFilterCount = [
    filters.category,
    filters.condition,
    filters.cover_type,
    filters.subgenre,
    filters.pacing,
    filters.search,
    filters.cleaned,
  ].filter(Boolean).length + (stockStatusValue !== 'available' ? 1 : 0);

  // Lock body scroll when filter drawer is open (mobile)
  useEffect(() => {
    if (isFilterDrawerOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY) * -1);
      }
    };
  }, [isFilterDrawerOpen]);

  if (isLoading && !books) {
    return <div className="loading">Loading inventory...</div>;
  }

  return (
    <div className="inventory">
      <div className="inventory-header">
        <h2>Inventory ({books?.length || 0} {statusLabel} books)</h2>
        <div className="inventory-header-actions">
          {!isMobile && selectedIds.size > 0 && (
            <>
              {!viewingSold && !viewingKept && (
                <button
                  onClick={() => setIsBulkPriceOpen(true)}
                  className="btn btn-price"
                >
                  Price {selectedIds.size} Book{selectedIds.size !== 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={() => setIsBulkSaleOpen(true)}
                className="btn btn-sold"
              >
                Sell {selectedIds.size} Book{selectedIds.size !== 1 ? 's' : ''}
              </button>
            </>
          )}
          <button onClick={handleAddBook} className="btn btn-primary">
            + Add Book
          </button>
        </div>
      </div>

      {/* Mobile: sticky action bar with search, filters toggle, and action buttons */}
      {isMobile && (
        <div className="mobile-action-bar">
          <div className="mobile-action-bar-row">
            <button
              className={`mobile-filter-toggle ${activeFilterCount > 0 ? 'has-filters' : ''}`}
              onClick={() => setIsFilterDrawerOpen(true)}
            >
              <span className="filter-icon">&#9776;</span>
              {activeFilterCount > 0 && (
                <span className="filter-badge">{activeFilterCount}</span>
              )}
            </button>

            <form onSubmit={handleSearch} className="mobile-action-search">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mobile-search-input"
              />
              <button type="submit" className="mobile-search-btn">Go</button>
            </form>
          </div>

          {selectedIds.size > 0 && (
            <div className="mobile-action-bar-selection">
              <span className="mobile-selection-count">{selectedIds.size} selected</span>
              {!viewingSold && !viewingKept && (
                <button
                  onClick={() => setIsBulkPriceOpen(true)}
                  className="mobile-action-btn mobile-action-price"
                  title={`Price ${selectedIds.size} book${selectedIds.size !== 1 ? 's' : ''}`}
                >
                  Price
                </button>
              )}
              <button
                onClick={() => setIsBulkSaleOpen(true)}
                className="mobile-action-btn mobile-action-sell"
                title={`Sell ${selectedIds.size} book${selectedIds.size !== 1 ? 's' : ''}`}
              >
                Sell
              </button>
              <button
                onClick={() => { setSelectedIds(new Set()); }}
                className="mobile-action-btn mobile-action-clear"
                title="Clear selection"
              >
                &times;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile: filter drawer (bottom sheet) — staged filters, applied on Done */}
      {isMobile && isFilterDrawerOpen && (
        <FilterDrawer
          filters={filters}
          subgenreOptions={subgenreOptions}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setSelectedIds(new Set());
                        setIsFilterDrawerOpen(false);
          }}
          onClear={() => {
            clearFilters();
            setIsFilterDrawerOpen(false);
          }}
          onClose={() => setIsFilterDrawerOpen(false)}
        />
      )}

      {/* Desktop: filters section (unchanged) */}
      {!isMobile && (
        <div className="filters-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search by title, author, or series..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>

          <div className="filters">
            <select
              value={stockStatusValue}
              onChange={(e) => {
                setFilters(applyStockStatus(filters, e.target.value));
                setSelectedIds(new Set());
                              }}
              className="filter-select"
            >
              <option value="available">Available</option>
              <option value="missing_price">Missing Price</option>
              <option value="sold">Sold</option>
              <option value="pulled_to_read">Pulled to Read</option>
              <option value="kept">Kept</option>
              <option value="blind_date">Blind Date</option>
              <option value="blind_date_candidate">Blind Date Candidates</option>
              <option value="">All Books</option>
            </select>

            <button
              type="button"
              className={`filter-cleaned-toggle ${filters.cleaned ? 'active' : ''}`}
              onClick={() => {
                const newFilters = { ...filters };
                if (newFilters.cleaned) {
                  delete newFilters.cleaned;
                } else {
                  newFilters.cleaned = true;
                }
                setFilters(newFilters);
              }}
            >
              Cleaned
            </button>

            {!viewingSold && !viewingKept && (
              <>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Categories</option>
                  <option value="YA/Nostalgia">YA/Nostalgia</option>
                  <option value="PFH/Vintage">PFH/Vintage</option>
                  <option value="Mainstream">Mainstream</option>
                  <option value="Comics/Ephemera">Comics/Ephemera</option>
                </select>

                <select
                  value={filters.condition || ''}
                  onChange={(e) => handleFilterChange('condition', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Conditions</option>
                  <option value="Like New">Like New</option>
                  <option value="Very Good">Very Good</option>
                  <option value="Good">Good</option>
                  <option value="Acceptable">Acceptable</option>
                </select>

                <select
                  value={filters.cover_type || ''}
                  onChange={(e) => handleFilterChange('cover_type', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Cover Types</option>
                  <option value="Paper">Paperback</option>
                  <option value="Hard">Hardcover</option>
                  <option value="Audiobook">Audiobook</option>
                </select>

                <select
                  value={filters.subgenre || ''}
                  onChange={(e) => handleFilterChange('subgenre', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Sub-Genres</option>
                  {subgenreOptions?.map(sg => (
                    <option key={sg.id} value={sg.name}>{sg.name}</option>
                  ))}
                </select>

                <select
                  value={filters.pacing || ''}
                  onChange={(e) => handleFilterChange('pacing', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Pacing</option>
                  <option value="Slow Burn">Slow Burn</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Fast-Paced">Fast-Paced</option>
                </select>
              </>
            )}

            <button onClick={clearFilters} className="btn btn-secondary">
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {isMobile ? (
        <div className="book-cards">
          {!viewingSold && !viewingKept && selectableBooks.length > 0 && (
            <label className="mobile-select-all">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  const scrollY = window.scrollY;
                  if (allSelected) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(selectableBooks.map(b => b.id!)));
                  }
                  requestAnimationFrame(() => window.scrollTo(0, scrollY));
                }}
              />
              Select all
            </label>
          )}
          {books?.map((book) => (
            <div key={book.id} className={`book-card ${book.sold ? 'book-card-sold' : book.kept ? 'book-card-kept' : ''}`}>
              <div className="book-card-content">
                {!book.sold && !book.kept && (
                  <input
                    type="checkbox"
                    className="book-select-checkbox"
                    checked={!!book.id && selectedIds.has(book.id)}
                    onChange={() => book.id && toggleSelectBook(book.id)}
                  />
                )}
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt={book.book_title}
                    className="book-card-cover book-card-cover-clickable"
                    loading="lazy"
                    onClick={() => handleViewBook(book)}
                  />
                ) : (
                  <div
                    className="book-card-cover-placeholder book-card-cover-clickable"
                    onClick={() => handleViewBook(book)}
                  >
                    View
                  </div>
                )}
                <div className="book-card-info">
                  <div className="book-card-header">
                    <span className="book-card-title">
                      <span className="title-clickable" onClick={() => handleViewBook(book)}>{book.book_title}</span>
                      {book.sold && <span className="badge badge-sold badge-sold-inline">SOLD</span>}
                      {book.kept && <span className="badge badge-kept badge-kept-inline">KEPT</span>}
                      {book.pulled_to_read && !book.sold && !book.kept && <span className="badge badge-reading badge-reading-inline">READING</span>}
                      {book.blind_date && !book.sold && <span className="badge badge-blind-date badge-blind-date-inline">BLIND DATE{book.blind_date_number ? ` #${book.blind_date_number}` : ''}</span>}
                    </span>
                  </div>
                  <div className="book-card-author">
                    {book.author_fullname}
                    {book.google_rating && (
                      <span className="google-rating" title={`${book.google_ratings_count} ratings`}>
                        {Number(book.google_rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  {book.book_series && (
                    <div className="book-card-series">
                      {book.book_series}
                      {book.vol_number && ` #${book.vol_number}`}
                    </div>
                  )}
                  <div className="book-card-badges">
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
                  <div className="book-card-details">
                    <span className="book-card-detail-label">Purchase $</span>
                    <span className="book-card-detail-value">
                      {book.purchase_price ? `$${Number(book.purchase_price).toFixed(2)}` : 'N/A'}
                    </span>
                    <span className="book-card-detail-label">Our Price</span>
                    <span className="book-card-detail-value">
                      <InlinePrice
                        book={book}
                        onSave={handleQuickPrice}
                        isSaving={quickPriceMutation.isPending && quickPriceMutation.variables?.bookId === book.id}
                        disabled={!!book.sold || !!book.kept}
                      />
                    </span>
                    <span className="book-card-detail-label">Source</span>
                    <span className="book-card-detail-value">{book.source || '-'}</span>
                  </div>
                  <div className="book-card-footer">
                    <label className="book-card-cleaned">
                      <input
                        type="checkbox"
                        checked={!!book.cleaned}
                        onChange={() => toggleCleaned(book)}
                        className="cleaned-checkbox"
                        title={book.cleaned ? 'Mark as not cleaned' : 'Mark as cleaned'}
                      />
                      Cleaned
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="books-table-container">
          <table className="books-table">
            <thead>
              <tr>
                {!viewingSold && !viewingKept && (
                  <th className="select-cell">
                    {selectableBooks.length > 0 && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => {
                          const scrollY = window.scrollY;
                          if (allSelected) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(selectableBooks.map(b => b.id!)));
                          }
                          requestAnimationFrame(() => window.scrollTo(0, scrollY));
                        }}
                        title={allSelected ? 'Deselect all' : 'Select all'}
                      />
                    )}
                  </th>
                )}
                <th></th>
                <th>Title</th>
                <th>Author</th>
                {viewingSold ? (
                  <>
                    <th>Sold Price</th>
                    <th>Profit</th>
                    <th>Date Sold</th>
                    <th>Event</th>
                    <th>Payment</th>
                  </>
                ) : viewingKept ? (
                  <>
                    <th>Category</th>
                    <th>Purchase $</th>
                    <th>Date Kept</th>
                  </>
                ) : (
                  <>
                    <th>Series</th>
                    <th>Category</th>
                    <th>Condition</th>
                    <th>Cover</th>
                    <th>Purchase $</th>
                    <th>Our Price</th>
                    <th>Source</th>
                    <th>Cleaned</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {books?.map((book) => (
                <tr key={book.id} className={book.sold && !viewingSold ? 'sold-row' : book.kept && !viewingKept ? 'kept-row' : ''}>
                  {!viewingSold && !viewingKept && (
                    <td className="select-cell">
                      {!book.sold && !book.kept ? (
                        <input
                          type="checkbox"
                          checked={!!book.id && selectedIds.has(book.id)}
                          onChange={() => book.id && toggleSelectBook(book.id)}
                        />
                      ) : book.sold ? (
                        <span className="badge badge-sold badge-sold-sm">SOLD</span>
                      ) : (
                        <span className="badge badge-kept badge-kept-sm">KEPT</span>
                      )}
                    </td>
                  )}
                  <td className="cover-cell">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.book_title}
                        className="cover-thumbnail cover-clickable"
                        loading="lazy"
                        onClick={() => handleViewBook(book)}
                      />
                    ) : (
                      <div
                        className="cover-placeholder cover-clickable"
                        onClick={() => handleViewBook(book)}
                      />
                    )}
                  </td>
                  <td className="book-title">
                    <span className="title-clickable" onClick={() => handleViewBook(book)}>{book.book_title}</span>
                    {book.pulled_to_read && !book.sold && !book.kept && (
                      <span className="badge badge-reading badge-reading-inline">READING</span>
                    )}
                    {book.blind_date && !book.sold && (
                      <span className="badge badge-blind-date badge-blind-date-inline">BLIND DATE{book.blind_date_number ? ` #${book.blind_date_number}` : ''}</span>
                    )}
                    {book.google_rating && (
                      <span className="google-rating" title={`${book.google_ratings_count} ratings`}>
                        {Number(book.google_rating).toFixed(1)}
                      </span>
                    )}
                  </td>
                  <td>{book.author_fullname}</td>
                  {viewingSold ? (
                    <>
                      <td>{book.sold_price ? `$${Number(book.sold_price).toFixed(2)}` : 'N/A'}</td>
                      <td className="profit-cell">
                        {book.sold_price && book.purchase_price
                          ? `$${(Number(book.sold_price) - Number(book.purchase_price)).toFixed(2)}`
                          : 'N/A'}
                      </td>
                      <td>{formatDate(book.date_sold)}</td>
                      <td className="source-cell">{book.sale_event || '-'}</td>
                      <td>
                        {book.payment_method && (
                          <span className={`badge payment-badge-${book.payment_method.toLowerCase()}`}>
                            {book.payment_method}
                          </span>
                        )}
                      </td>
                    </>
                  ) : viewingKept ? (
                    <>
                      <td>
                        {book.category && (
                          <span className={`badge badge-${book.category.toLowerCase().replace('/', '-')}`}>
                            {book.category}
                          </span>
                        )}
                      </td>
                      <td>{book.purchase_price ? `$${Number(book.purchase_price).toFixed(2)}` : 'N/A'}</td>
                      <td>{formatDate(book.date_kept)}</td>
                    </>
                  ) : (
                    <>
                      <td>
                        {book.book_series && (
                          <>
                            {book.book_series}
                            {book.vol_number && ` #${book.vol_number}`}
                          </>
                        )}
                      </td>
                      <td>
                        {book.category && (
                          <span className={`badge badge-${book.category.toLowerCase().replace('/', '-')}`}>
                            {book.category}
                          </span>
                        )}
                      </td>
                      <td>
                        {book.condition && (
                          <span className={`badge badge-${book.condition.toLowerCase().replace(' ', '-')}`}>
                            {book.condition}
                          </span>
                        )}
                      </td>
                      <td>
                        {book.cover_type && (
                          <span className={`badge badge-${book.cover_type.toLowerCase()}`}>
                            {book.cover_type}
                          </span>
                        )}
                      </td>
                      <td>{book.purchase_price ? `$${Number(book.purchase_price).toFixed(2)}` : 'N/A'}</td>
                      <td>
                        <InlinePrice
                          book={book}
                          onSave={handleQuickPrice}
                          isSaving={quickPriceMutation.isPending && quickPriceMutation.variables?.bookId === book.id}
                          disabled={!!book.sold || !!book.kept}
                        />
                      </td>
                      <td className="source-cell">{book.source || '-'}</td>
                      <td className="cleaned-cell">
                        <input
                          type="checkbox"
                          checked={!!book.cleaned}
                          onChange={() => toggleCleaned(book)}
                          className="cleaned-checkbox"
                          title={book.cleaned ? 'Mark as not cleaned' : 'Mark as cleaned'}
                        />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isFormOpen} onClose={handleCloseForm}>
        <BookForm
          book={selectedBook}
          onSubmit={handleSubmitBook}
          onCancel={handleCloseForm}
          onDelete={handleDeleteBook}
        />
      </Modal>

      <Modal isOpen={isDetailOpen} onClose={handleCloseDetail}>
        {currentSelectedBook && (
          <BookDetail
            book={currentSelectedBook}
            onClose={handleCloseDetail}
            onEdit={handleEditBook}
            onEnrich={handleEnrichBook}
            isEnriching={enrichMutation.isPending}
            onTagSubgenres={(id) => tagMutation.mutate(id)}
            isTagging={tagMutation.isPending}
            onMarkSold={handleMarkSold}
            isMarkingSold={sharedUpdateMutation.isPending}
            saleEvents={saleEvents}
            onMarkAvailable={handleMarkAvailable}
            onMarkKept={handleMarkKept}
            onUnkeep={handleUnkeep}
            onPullToRead={handlePullToRead}
            onReturnFromPull={handleReturnFromPull}
            onMarkBlindDate={handleMarkBlindDate}
            onUnmarkBlindDate={handleUnmarkBlindDate}
            onSetPrice={handleQuickPrice}
            isSettingPrice={quickPriceMutation.isPending && quickPriceMutation.variables?.bookId === currentSelectedBook?.id}
          />
        )}
      </Modal>

      <Modal isOpen={isBulkSaleOpen} onClose={() => setIsBulkSaleOpen(false)}>
        <BulkSaleModal
          books={selectedBooks}
          onConfirm={(request) => bulkSaleMutation.mutate(request)}
          onCancel={() => setIsBulkSaleOpen(false)}
          onRemoveBook={(bookId) => toggleSelectBook(bookId)}
          isSubmitting={bulkSaleMutation.isPending}
          saleEvents={saleEvents}
        />
      </Modal>

      <Modal isOpen={isBulkPriceOpen} onClose={() => setIsBulkPriceOpen(false)}>
        <BulkPriceModal
          books={selectedBooks}
          onConfirm={(request) => bulkPriceMutation.mutate(request)}
          onCancel={() => setIsBulkPriceOpen(false)}
          onRemoveBook={(bookId) => toggleSelectBook(bookId)}
          isSubmitting={bulkPriceMutation.isPending}
        />
      </Modal>
    </div>
  );
}

export default Inventory;
