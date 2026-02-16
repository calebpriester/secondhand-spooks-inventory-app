import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookApi } from '../services/api';
import { Book, BookFilters } from '../types/Book';
import Modal from '../components/Modal';
import BookForm from '../components/BookForm';
import { useIsMobile } from '../hooks/useIsMobile';
import './Inventory.css';

function Inventory() {
  const [filters, setFilters] = useState<BookFilters>({});
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

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
      setIsModalOpen(false);
      setSelectedBook(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, book }: { id: number; book: Partial<Book> }) =>
      bookApi.update(id, book),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setIsModalOpen(false);
      setSelectedBook(null);
    },
  });

  const toggleCleaned = (book: Book) => {
    if (!book.id) return;
    updateMutation.mutate({ id: book.id, book: { cleaned: !book.cleaned } });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search });
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
    setFilters({});
    setSearch('');
  };

  const handleAddBook = () => {
    setSelectedBook(null);
    setIsModalOpen(true);
  };

  const handleEditBook = (book: Book) => {
    setSelectedBook(book);
    setIsModalOpen(true);
  };

  const handleSubmitBook = (bookData: Partial<Book>) => {
    if (selectedBook?.id) {
      updateMutation.mutate({ id: selectedBook.id, book: bookData });
    } else {
      createMutation.mutate(bookData as Book);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBook(null);
  };

  if (isLoading) {
    return <div className="loading">Loading inventory...</div>;
  }

  return (
    <div className="inventory">
      <div className="inventory-header">
        <h2>Inventory ({books?.length || 0} books)</h2>
        <button onClick={handleAddBook} className="btn btn-primary">
          + Add Book
        </button>
      </div>

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

          <button onClick={clearFilters} className="btn btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>

      {isMobile ? (
        <div className="book-cards">
          {books?.map((book) => (
            <div key={book.id} className="book-card">
              <div className="book-card-header">
                <span className="book-card-title">{book.book_title}</span>
                <button
                  onClick={() => handleEditBook(book)}
                  className="btn btn-edit"
                  title="Edit book"
                >
                  ✏️
                </button>
              </div>
              <div className="book-card-author">{book.author_fullname}</div>
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
          ))}
        </div>
      ) : (
        <div className="books-table-container">
          <table className="books-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Series</th>
                <th>Category</th>
                <th>Condition</th>
                <th>Cover</th>
                <th>Purchase $</th>
                <th>Our Price</th>
                <th>Source</th>
                <th>Cleaned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books?.map((book) => (
                <tr key={book.id}>
                  <td className="book-title">{book.book_title}</td>
                  <td>{book.author_fullname}</td>
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
                  <td>
                    <button
                      onClick={() => handleEditBook(book)}
                      className="btn btn-edit"
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

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <BookForm
          book={selectedBook}
          onSubmit={handleSubmitBook}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}

export default Inventory;
