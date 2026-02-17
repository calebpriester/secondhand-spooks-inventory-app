import axios from 'axios';
import { Book, BookFilters, BookStats, EnrichmentStatus, EnrichmentResult, BatchEnrichmentProgress, SubgenreOption, GeminiTagResult, GeminiBatchProgress, GeminiTaggingStatus, BulkSaleRequest, BulkPriceRequest, UpdateTransactionRequest, Transaction } from '../types/Book';

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

  // Gemini sub-genre tagging
  tagBookSubgenres: async (id: number): Promise<GeminiTagResult> => {
    const { data } = await api.post(`/books/${id}/tag-subgenres`);
    return data;
  },

  getGeminiStatus: async (): Promise<GeminiTaggingStatus> => {
    const { data } = await api.get('/books/enrichment/gemini/status');
    return data;
  },

  startBatchTagging: async (limit: number = 5): Promise<{ message: string }> => {
    const { data } = await api.post('/books/enrichment/gemini/batch', { limit });
    return data;
  },

  getBatchTaggingProgress: async (): Promise<GeminiBatchProgress> => {
    const { data } = await api.get('/books/enrichment/gemini/batch/progress');
    return data;
  },

  cancelBatchTagging: async (): Promise<{ message: string }> => {
    const { data } = await api.post('/books/enrichment/gemini/batch/cancel');
    return data;
  },

  // Sales
  getSaleEvents: async (): Promise<string[]> => {
    const { data } = await api.get('/books/sale-events');
    return data;
  },

  bulkMarkSold: async (request: BulkSaleRequest): Promise<Book[]> => {
    const { data } = await api.post('/books/bulk-sale', request);
    return data;
  },

  bulkSetPrice: async (request: BulkPriceRequest): Promise<Book[]> => {
    const { data } = await api.post('/books/bulk-price', request);
    return data;
  },

  updateTransaction: async (request: UpdateTransactionRequest): Promise<{ message: string; count: number }> => {
    const { data } = await api.post('/books/update-transaction', request);
    return data;
  },

  revertTransaction: async (saleTransactionId: string): Promise<{ message: string; count: number }> => {
    const { data } = await api.post('/books/revert-transaction', { sale_transaction_id: saleTransactionId });
    return data;
  },

  getTransactions: async (filters?: { sale_event?: string; date_sold?: string; payment_method?: string }): Promise<Transaction[]> => {
    const { data } = await api.get('/books/transactions', { params: filters });
    return data;
  },
};

export const subgenreApi = {
  getAll: async (): Promise<SubgenreOption[]> => {
    const { data } = await api.get('/subgenres');
    return data;
  },

  create: async (name: string): Promise<SubgenreOption> => {
    const { data } = await api.post('/subgenres', { name });
    return data;
  },

  update: async (id: number, updates: Partial<SubgenreOption>): Promise<SubgenreOption> => {
    const { data } = await api.put(`/subgenres/${id}`, updates);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/subgenres/${id}`);
  },
};
