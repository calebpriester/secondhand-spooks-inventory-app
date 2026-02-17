import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Book } from '../types/Book';
import { bookApi } from '../services/api';
import Autocomplete from './Autocomplete';
import './BookForm.css';

interface BookFormProps {
  book?: Book | null;
  onSubmit: (book: Partial<Book>) => void;
  onCancel: () => void;
}

const BookForm: React.FC<BookFormProps> = ({ book, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Book>>({
    book_title: '',
    cleaned: false,
    author_last_name: '',
    author_first_middle: '',
    book_series: '',
    vol_number: '',
    cover_type: null,
    category: null,
    condition: null,
    date_purchased: null,
    source: '',
    seller: '',
    order_number: '',
    purchase_price: null,
    our_price: null,
    profit_est: null,
    author_fullname: '',
    pulled_to_read: false,
  });

  const { data: authors = [] } = useQuery({
    queryKey: ['authors'],
    queryFn: bookApi.getAuthors,
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series'],
    queryFn: bookApi.getSeries,
  });

  const { data: sourcesList = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: bookApi.getSources,
  });

  // Get unique first/middle names
  const firstMiddleNames = [...new Set(authors.map(a => a.first_middle).filter(Boolean))];

  // Filter last names based on selected first/middle name
  const lastNames = formData.author_first_middle
    ? [...new Set(
        authors
          .filter(a => a.first_middle === formData.author_first_middle)
          .map(a => a.last_name)
          .filter(Boolean)
      )]
    : [...new Set(authors.map(a => a.last_name).filter(Boolean))];

  // Filter first/middle names based on selected last name
  const filteredFirstMiddleNames = formData.author_last_name
    ? [...new Set(
        authors
          .filter(a => a.last_name === formData.author_last_name)
          .map(a => a.first_middle)
          .filter(Boolean)
      )]
    : firstMiddleNames;

  useEffect(() => {
    if (book) {
      setFormData({
        ...book,
        date_purchased: book.date_purchased ? book.date_purchased.split('T')[0] : null,
      });
    }
  }, [book]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : null }));
    } else {
      setFormData(prev => {
        const updated = { ...prev, [name]: value || null };

        // Auto-generate author_fullname when author fields change
        if (name === 'author_first_middle' || name === 'author_last_name') {
          const firstName = name === 'author_first_middle' ? value : (prev.author_first_middle || '');
          const lastName = name === 'author_last_name' ? value : (prev.author_last_name || '');

          if (firstName && lastName) {
            updated.author_fullname = `${firstName} ${lastName}`;
          } else if (lastName) {
            updated.author_fullname = lastName;
          } else {
            updated.author_fullname = firstName || null;
          }
        }

        return updated;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="book-form" onSubmit={handleSubmit} data-lpignore="true" autoComplete="off">
      <div className="form-header">
        <h2>{book ? 'Edit Book' : 'Add New Book'}</h2>
      </div>

      <div className="form-body">
        {/* Basic Information */}
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="book_title">Book Title *</label>
              <input
                type="text"
                id="book_title"
                name="book_title"
                value={formData.book_title || ''}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="book_author_first">Book Author First/Middle</label>
              <Autocomplete
                id="book_author_first"
                name="author_first_middle"
                value={formData.author_first_middle || ''}
                onChange={handleChange}
                suggestions={filteredFirstMiddleNames}
                placeholder="e.g., Dean R."
              />
            </div>
            <div className="form-group">
              <label htmlFor="book_author_last">Book Author Last Name *</label>
              <Autocomplete
                id="book_author_last"
                name="author_last_name"
                value={formData.author_last_name || ''}
                onChange={handleChange}
                suggestions={lastNames}
                placeholder="e.g., Koontz"
                required
              />
            </div>
          </div>

          {formData.author_fullname && (
            <div className="form-row">
              <div className="form-group">
                <label className="computed-label">Full Name (auto-generated)</label>
                <div className="computed-value">{formData.author_fullname}</div>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="book_series">Series</label>
              <Autocomplete
                id="book_series"
                name="book_series"
                value={formData.book_series || ''}
                onChange={handleChange}
                suggestions={seriesList}
                placeholder="e.g., Goosebumps"
              />
            </div>
            <div className="form-group">
              <label htmlFor="vol_number">Volume #</label>
              <input
                type="text"
                id="vol_number"
                name="vol_number"
                value={formData.vol_number || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Physical Details */}
        <div className="form-section">
          <h3>Physical Details</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cover_type">Cover Type</label>
              <select
                id="cover_type"
                name="cover_type"
                value={formData.cover_type || ''}
                onChange={handleChange}
              >
                <option value="">Select...</option>
                <option value="Paper">Paper</option>
                <option value="Hard">Hard</option>
                <option value="Audiobook">Audiobook</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="condition">Condition</label>
              <select
                id="condition"
                name="condition"
                value={formData.condition || ''}
                onChange={handleChange}
              >
                <option value="">Select...</option>
                <option value="Like New">Like New</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Acceptable">Acceptable</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category || ''}
                onChange={handleChange}
              >
                <option value="">Select...</option>
                <option value="YA/Nostalgia">YA/Nostalgia</option>
                <option value="PFH/Vintage">PFH/Vintage</option>
                <option value="Mainstream">Mainstream</option>
                <option value="Comics/Ephemera">Comics/Ephemera</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="cleaned"
                  checked={formData.cleaned || false}
                  onChange={handleChange}
                />
                Cleaned
              </label>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="pulled_to_read"
                  checked={formData.pulled_to_read || false}
                  onChange={handleChange}
                />
                Pulled to Read
              </label>
            </div>
          </div>
        </div>

        {/* Purchase Information */}
        <div className="form-section">
          <h3>Purchase Information</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date_purchased">Date Purchased</label>
              <input
                type="date"
                id="date_purchased"
                name="date_purchased"
                value={formData.date_purchased || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="source">Source</label>
              <Autocomplete
                id="source"
                name="source"
                value={formData.source || ''}
                onChange={handleChange}
                suggestions={sourcesList}
                placeholder="e.g., eBay"
              />
            </div>
            <div className="form-group">
              <label htmlFor="seller">Seller</label>
              <input
                type="text"
                id="seller"
                name="seller"
                value={formData.seller || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="order_number">Order #</label>
              <input
                type="text"
                id="order_number"
                name="order_number"
                value={formData.order_number || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="form-section">
          <h3>Pricing</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="purchase_price">Purchase Price</label>
              <input
                type="number"
                step="0.01"
                id="purchase_price"
                name="purchase_price"
                value={formData.purchase_price || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="our_price">Our Price</label>
              <input
                type="number"
                step="0.01"
                id="our_price"
                name="our_price"
                value={formData.our_price || ''}
                onChange={handleChange}
              />
            </div>
          </div>

        </div>

      </div>

      <div className="form-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {book ? 'Update Book' : 'Add Book'}
        </button>
      </div>
    </form>
  );
};

export default BookForm;
