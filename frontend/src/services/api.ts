import axios from 'axios';
import { Book, BookFilters, BookStats } from '../types/Book';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

export const bookApi = {
  getAll: async (filters?: BookFilters): Promise<Book[]> => {
    const { data } = await api.get('/books', { params: filters });
    return data;
  },

  getById: async (id: number): Promise<Book> => {
    const { data } = await api.get(`/books/${id}`);
    return data;
  },

  create: async (book: Book): Promise<Book> => {
    const { data } = await api.post('/books', book);
    return data;
  },

  update: async (id: number, book: Partial<Book>): Promise<Book> => {
    const { data } = await api.put(`/books/${id}`, book);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/books/${id}`);
  },

  getStats: async (): Promise<BookStats> => {
    const { data } = await api.get('/books/stats');
    return data;
  },
};
