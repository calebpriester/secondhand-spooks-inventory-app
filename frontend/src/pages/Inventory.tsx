import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookApi, subgenreApi } from '../services/api';
import { Book, BookFilters, BulkSaleRequest, BulkPriceRequest } from '../types/Book';
import Modal from '../components/Modal';
import BookForm from '../components/BookForm';
import BookDetail from '../components/BookDetail';
import BulkSaleModal from '../components/BulkSaleModal';
import BulkPriceModal from '../components/BulkPriceModal';
import { useIsMobile } from '../hooks/useIsMobile';
import './Inventory.css';

interface FilterDrawerProps {
  filters: BookFilters;
  subgenreOptions: { id: number; name: string }[] | undefined;
  onApply: (filters: BookFilters) => void;
  onClear: () => void;
  onClose: () => void;
}

function FilterDrawer({ filters, subgenreOptions, onApply, onClear, onClose }: FilterDrawerProps) {
  const [draft, setDraft] = useState<BookFilters>({ ...filters });

  const draftStockStatus = draft.blind_date ? 'blind_date' :
    draft.blind_date_candidate ? 'blind_date_candidate' :
    draft.missing_price ? 'missing_price' :
    draft.pulled_to_read ? 'pulled_to_read' :
    draft.kept === true && draft.sold === undefined ? 'kept' :
    draft.sold === undefined && draft.kept === undefined ? '' :
    draft.sold ? 'sold' : 'available';
  const draftViewingSold = draft.sold === true && !draft.missing_price;
  const draftViewingKept = draft.kept === true && draft.sold === undefined;

  const handleStockStatusChange = (val: string) => {
    const next = { ...draft };
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
    setDraft(next);
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
  const [selectedBooksMap, setSelectedBooksMap] = useState<Map<number, Book>>(new Map());
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const { data: books, isLoading } = useQuery({
    queryKey: ['books', filters],
    queryFn: () => bookApi.getAll(filters),
  });

  const createMutation = useMutation({
    mutationFn: bookApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setIsFormOpen(false);
      setSelectedBook(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, book }: { id: number; book: Partial<Book> }) =>
      bookApi.update(id, book),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['saleEvents'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (isFormOpen) {
        setIsFormOpen(false);
        setSelectedBook(null);
      }
    },
  });

  const enrichMutation = useMutation({
    mutationFn: ({ id, title, author, isbn }: { id: number; title?: string; author?: string; isbn?: string }) =>
      bookApi.enrichBook(id, title, author, isbn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book'] });
    },
  });

  const tagMutation = useMutation({
    mutationFn: (id: number) => bookApi.tagBookSubgenres(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book'] });
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
      setSelectedBooksMap(new Map());
    },
  });

  const bulkPriceMutation = useMutation({
    mutationFn: (request: BulkPriceRequest) => bookApi.bulkSetPrice(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setIsBulkPriceOpen(false);
      setSelectedIds(new Set());
      setSelectedBooksMap(new Map());
    },
  });

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
    updateMutation.mutate({ id: book.id, book: { cleaned: !book.cleaned } });
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
    setSelectedBooksMap(new Map());
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
      updateMutation.mutate({ id: selectedBook.id, book: bookData });
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

  const handleEnrichBook = (bookId: number, title?: string, author?: string, isbn?: string) => {
    enrichMutation.mutate({ id: bookId, title, author, isbn });
  };

  const handleMarkSold = (bookId: number, saleData: { sold_price: number; date_sold: string; sale_event?: string; payment_method: 'Cash' | 'Card'; sale_transaction_id: string }) => {
    updateMutation.mutate({
      id: bookId,
      book: {
        sold: true,
        sold_price: saleData.sold_price,
        date_sold: saleData.date_sold,
        sale_event: saleData.sale_event || null,
        payment_method: saleData.payment_method,
        sale_transaction_id: saleData.sale_transaction_id,
      },
    });
  };

  const handleMarkAvailable = (bookId: number) => {
    updateMutation.mutate({
      id: bookId,
      book: {
        sold: false,
        sold_price: null,
        date_sold: null,
        sale_event: null,
        sale_transaction_id: null,
        payment_method: null,
      },
    });
  };

  const handlePullToRead = (bookId: number) => {
    updateMutation.mutate({
      id: bookId,
      book: { pulled_to_read: true },
    });
  };

  const handleReturnFromPull = (bookId: number) => {
    updateMutation.mutate({
      id: bookId,
      book: { pulled_to_read: false },
    });
  };

  const handleMarkKept = (bookId: number) => {
    updateMutation.mutate({
      id: bookId,
      book: {
        kept: true,
        date_kept: new Date().toISOString().split('T')[0],
        pulled_to_read: false,
      },
    });
  };

  const handleUnkeep = (bookId: number) => {
    updateMutation.mutate({
      id: bookId,
      book: {
        kept: false,
        date_kept: null,
      },
    });
  };

  const handleMarkBlindDate = (bookId: number) => {
    bookApi.markBlindDate([bookId]).then(() => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
    });
  };

  const handleUnmarkBlindDate = (bookId: number) => {
    bookApi.unmarkBlindDate([bookId]).then(() => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
    });
  };

  const toggleSelectBook = (bookId: number, book?: Book) => {
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
    setSelectedBooksMap(prev => {
      const next = new Map(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else if (book) {
        next.set(bookId, book);
      }
      return next;
    });
    // Restore scroll position after React re-render
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  const selectedBooks = Array.from(selectedBooksMap.values());
  const selectableBooks = books?.filter(b => !b.sold && !b.kept && b.id) || [];
  const allSelected = selectableBooks.length > 0 && selectedIds.size === selectableBooks.length;

  // Fetch the selected book directly by ID so it stays fresh even when filtered out of the list
  const { data: fetchedSelectedBook } = useQuery({
    queryKey: ['book', selectedBook?.id],
    queryFn: () => bookApi.getById(selectedBook!.id!),
    enabled: isDetailOpen && !!selectedBook?.id,
  });

  const currentSelectedBook = fetchedSelectedBook || selectedBook;

  const stockStatusValue = filters.blind_date ? 'blind_date' :
    filters.blind_date_candidate ? 'blind_date_candidate' :
    filters.missing_price ? 'missing_price' :
    filters.pulled_to_read ? 'pulled_to_read' :
    filters.kept === true && filters.sold === undefined ? 'kept' :
    filters.sold === undefined && filters.kept === undefined ? '' :
    filters.sold ? 'sold' : 'available';
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

  if (isLoading) {
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
                onClick={() => { setSelectedIds(new Set()); setSelectedBooksMap(new Map()); }}
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
            setSelectedBooksMap(new Map());
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
                const val = e.target.value;
                const newFilters = { ...filters };
                delete newFilters.sold;
                delete newFilters.kept;
                delete newFilters.missing_price;
                delete newFilters.pulled_to_read;
                delete newFilters.blind_date;
                delete newFilters.blind_date_candidate;

                if (val === 'sold') {
                  newFilters.sold = true;
                } else if (val === 'available') {
                  newFilters.sold = false;
                  newFilters.kept = false;
                } else if (val === 'missing_price') {
                  newFilters.sold = false;
                  newFilters.kept = false;
                  newFilters.missing_price = true;
                } else if (val === 'pulled_to_read') {
                  newFilters.sold = false;
                  newFilters.kept = false;
                  newFilters.pulled_to_read = true;
                } else if (val === 'kept') {
                  newFilters.kept = true;
                } else if (val === 'blind_date') {
                  newFilters.blind_date = true;
                  newFilters.sold = false;
                } else if (val === 'blind_date_candidate') {
                  newFilters.blind_date_candidate = true;
                }
                setFilters(newFilters);
                setSelectedIds(new Set());
                setSelectedBooksMap(new Map());
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
                    setSelectedBooksMap(new Map());
                  } else {
                    setSelectedIds(new Set(selectableBooks.map(b => b.id!)));
                    setSelectedBooksMap(new Map(selectableBooks.map(b => [b.id!, b])));
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
                    onChange={() => book.id && toggleSelectBook(book.id, book)}
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
                      {book.book_title}
                      {book.sold && <span className="badge badge-sold badge-sold-inline">SOLD</span>}
                      {book.kept && <span className="badge badge-kept badge-kept-inline">KEPT</span>}
                      {book.pulled_to_read && !book.sold && !book.kept && <span className="badge badge-reading badge-reading-inline">READING</span>}
                      {book.blind_date && !book.sold && <span className="badge badge-blind-date badge-blind-date-inline">BLIND DATE</span>}
                    </span>
                    <button
                      onClick={() => handleEditBook(book)}
                      className="btn btn-action"
                      title="Edit book"
                    >
                      ✏️
                    </button>
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
                      {book.our_price ? `$${Number(book.our_price).toFixed(2)}` : 'N/A'}
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
                            setSelectedBooksMap(new Map());
                          } else {
                            setSelectedIds(new Set(selectableBooks.map(b => b.id!)));
                            setSelectedBooksMap(new Map(selectableBooks.map(b => [b.id!, b])));
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
                <th>Actions</th>
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
                          onChange={() => book.id && toggleSelectBook(book.id, book)}
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
                    {book.book_title}
                    {book.pulled_to_read && !book.sold && !book.kept && (
                      <span className="badge badge-reading badge-reading-inline">READING</span>
                    )}
                    {book.blind_date && !book.sold && (
                      <span className="badge badge-blind-date badge-blind-date-inline">BLIND DATE</span>
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
                      <td>{book.date_sold ? new Date(String(book.date_sold).split('T')[0] + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
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
                      <td>{book.date_kept ? new Date(String(book.date_kept).split('T')[0] + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
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
                      <td>{book.our_price ? `$${Number(book.our_price).toFixed(2)}` : 'N/A'}</td>
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
                  <td className="actions-cell">
                    <button
                      onClick={() => handleEditBook(book)}
                      className="btn btn-action"
                      title="Edit book"
                    >
                      ✏️
                    </button>
                  </td>
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
            isMarkingSold={updateMutation.isPending}
            saleEvents={saleEvents}
            onMarkAvailable={handleMarkAvailable}
            onMarkKept={handleMarkKept}
            onUnkeep={handleUnkeep}
            onPullToRead={handlePullToRead}
            onReturnFromPull={handleReturnFromPull}
            onMarkBlindDate={handleMarkBlindDate}
            onUnmarkBlindDate={handleUnmarkBlindDate}
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
