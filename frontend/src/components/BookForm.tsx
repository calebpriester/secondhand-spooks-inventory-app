import React, { useState, useEffect } from 'react';
import { Book } from '../types/Book';
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
    thriftbooks_price: null,
    purchase_price: null,
    our_price: null,
    profit_est: null,
    author_fullname: '',
    pulled_to_read: false,
  });

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
      setFormData(prev => ({ ...prev, [name]: value || null }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="book-form" onSubmit={handleSubmit}>
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
              <label htmlFor="author_last_name">Author Last Name *</label>
              <input
                type="text"
                id="author_last_name"
                name="author_last_name"
                value={formData.author_last_name || ''}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="author_first_middle">Author First/Middle</label>
              <input
                type="text"
                id="author_first_middle"
                name="author_first_middle"
                value={formData.author_first_middle || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="author_fullname">Author Full Name</label>
              <input
                type="text"
                id="author_fullname"
                name="author_fullname"
                value={formData.author_fullname || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="book_series">Series</label>
              <input
                type="text"
                id="book_series"
                name="book_series"
                value={formData.book_series || ''}
                onChange={handleChange}
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
              <input
                type="text"
                id="source"
                name="source"
                value={formData.source || ''}
                onChange={handleChange}
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
              <label htmlFor="thriftbooks_price">ThriftBooks Price</label>
              <input
                type="number"
                step="0.01"
                id="thriftbooks_price"
                name="thriftbooks_price"
                value={formData.thriftbooks_price || ''}
                onChange={handleChange}
              />
            </div>
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
          </div>

          <div className="form-row">
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
            <div className="form-group">
              <label htmlFor="profit_est">Profit Est.</label>
              <input
                type="number"
                step="0.01"
                id="profit_est"
                name="profit_est"
                value={formData.profit_est || ''}
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
