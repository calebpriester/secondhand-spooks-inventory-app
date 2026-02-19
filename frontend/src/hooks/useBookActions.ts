import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookApi } from '../services/api';
import { Book } from '../types/Book';
import { todayDateString } from '../utils/dates';

export interface SaleData {
  sold_price: number;
  date_sold: string;
  sale_event?: string;
  payment_method: 'Cash' | 'Card';
  sale_transaction_id: string;
}

export function useBookActions() {
  const queryClient = useQueryClient();

  const invalidateBookQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['books'] });
    queryClient.invalidateQueries({ queryKey: ['book'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, book }: { id: number; book: Partial<Book> }) =>
      bookApi.update(id, book),
    onSuccess: () => {
      invalidateBookQueries();
      queryClient.invalidateQueries({ queryKey: ['saleEvents'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

  const markBlindDateMutation = useMutation({
    mutationFn: (bookId: number) => bookApi.markBlindDate([bookId]),
    onSuccess: (_data, bookId) => {
      invalidateBookQueries();
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      queryClient.invalidateQueries({ queryKey: ['blindDateCandidates'] });
    },
  });

  const unmarkBlindDateMutation = useMutation({
    mutationFn: (bookId: number) => bookApi.unmarkBlindDate([bookId]),
    onSuccess: (_data, bookId) => {
      invalidateBookQueries();
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      queryClient.invalidateQueries({ queryKey: ['blindDateCandidates'] });
    },
  });

  const handleEnrichBook = (bookId: number, title?: string, author?: string, isbn?: string) => {
    enrichMutation.mutate({ id: bookId, title, author, isbn });
  };

  const handleMarkSold = (bookId: number, saleData: SaleData) => {
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
    updateMutation.mutate({ id: bookId, book: { pulled_to_read: true } });
  };

  const handleReturnFromPull = (bookId: number) => {
    updateMutation.mutate({ id: bookId, book: { pulled_to_read: false } });
  };

  const handleMarkKept = (bookId: number) => {
    updateMutation.mutate({
      id: bookId,
      book: {
        kept: true,
        date_kept: todayDateString(),
        pulled_to_read: false,
      },
    });
  };

  const handleUnkeep = (bookId: number) => {
    updateMutation.mutate({
      id: bookId,
      book: { kept: false, date_kept: null },
    });
  };

  const handleMarkBlindDate = (bookId: number) => {
    markBlindDateMutation.mutate(bookId);
  };

  const handleUnmarkBlindDate = (bookId: number) => {
    unmarkBlindDateMutation.mutate(bookId);
  };

  const handleSaveTags = (bookId: number, subgenres: string[], pacing: string | null) => {
    updateMutation.mutate({
      id: bookId,
      book: {
        subgenres: subgenres.length > 0 ? subgenres : null,
        pacing,
      },
    });
  };

  return {
    updateMutation,
    enrichMutation,
    tagMutation,
    markBlindDateMutation,
    unmarkBlindDateMutation,
    handleEnrichBook,
    handleMarkSold,
    handleMarkAvailable,
    handlePullToRead,
    handleReturnFromPull,
    handleMarkKept,
    handleUnkeep,
    handleMarkBlindDate,
    handleUnmarkBlindDate,
    handleSaveTags,
  };
}
