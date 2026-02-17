import axios from 'axios';
import { Book, BookFilters, BookStats, EnrichmentStatus, EnrichmentResult, BatchEnrichmentProgress } from '../types/Book';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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

  getStats: async (cleaned?: boolean): Promise<BookStats> => {
    const params: Record<string, string> = {};
    if (cleaned !== undefined) {
      params.cleaned = String(cleaned);
    }
    const { data } = await api.get('/books/stats', { params });
    return data;
  },

  getSeries: async (): Promise<string[]> => {
    const { data } = await api.get('/books/series');
    return data;
  },

  getAuthors: async (): Promise<{ first_middle: string; last_name: string; full_name: string }[]> => {
    const { data } = await api.get('/books/authors');
    return data;
  },

  // Enrichment
  getEnrichmentStatus: async (): Promise<EnrichmentStatus> => {
    const { data } = await api.get('/books/enrichment/status');
    return data;
  },

  enrichBook: async (id: number, title?: string, author?: string, isbn?: string): Promise<EnrichmentResult> => {
    const body = (title || author || isbn) ? { title, author, isbn } : undefined;
    const { data } = await api.post(`/books/${id}/enrich`, body);
    return data;
  },

  startBatchEnrichment: async (limit: number = 3): Promise<{ message: string }> => {
    const { data } = await api.post('/books/enrichment/batch', { limit });
    return data;
  },

  getBatchProgress: async (): Promise<BatchEnrichmentProgress> => {
    const { data } = await api.get('/books/enrichment/batch/progress');
    return data;
  },

  cancelBatchEnrichment: async (): Promise<{ message: string }> => {
    const { data } = await api.post('/books/enrichment/batch/cancel');
    return data;
  },
};
