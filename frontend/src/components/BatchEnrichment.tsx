import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookApi } from '../services/api';
import './BatchEnrichment.css';

function BatchEnrichment() {
  const [batchSize, setBatchSize] = useState(3);
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['enrichmentStatus'],
    queryFn: bookApi.getEnrichmentStatus,
  });

  const { data: progress } = useQuery({
    queryKey: ['batchProgress'],
    queryFn: bookApi.getBatchProgress,
    refetchInterval: (query) => {
      return query.state.data?.is_running ? 2000 : false;
    },
  });

  const startMutation = useMutation({
    mutationFn: () => bookApi.startBatchEnrichment(batchSize),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchProgress'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: bookApi.cancelBatchEnrichment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchProgress'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['enrichmentStatus'] });
    },
  });

  // Refresh book list when batch transitions from running to done
  const wasRunning = useRef(false);
  useEffect(() => {
    if (progress?.is_running) {
      wasRunning.current = true;
    } else if (wasRunning.current && progress && !progress.is_running) {
      wasRunning.current = false;
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['enrichmentStatus'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    }
  }, [progress?.is_running]);

  if (!status?.configured) {
    return (
      <div className="enrichment-panel">
        <h3>Google Books Enrichment</h3>
        <p className="enrichment-warning">
          Google Books API key not configured. Set GOOGLE_BOOKS_API_KEY environment variable.
        </p>
      </div>
    );
  }

  const stats = status.stats;
  const isRunning = progress?.is_running;
  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  const unenrichedCount = Number(stats?.unenriched_count || 0);

  return (
    <div className="enrichment-panel">
      <h3>Google Books Enrichment</h3>

      {stats && (
        <div className="enrichment-stats">
          <span>Enriched: {stats.enriched_count} / {stats.total_books}</span>
          <span>With covers: {stats.with_cover}</span>
          <span>With ratings: {stats.with_rating}</span>
        </div>
      )}

      {isRunning && progress && (
        <div className="enrichment-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="progress-text">
            {progress.processed} / {progress.total} ({progressPercent}%)
            &nbsp;|&nbsp; OK: {progress.succeeded} &nbsp;|&nbsp; Not found: {progress.not_found} &nbsp;|&nbsp; Errors: {progress.errors}
          </div>
        </div>
      )}

      {!isRunning && progress && progress.processed > 0 && (
        <div className="enrichment-results">
          Last run: {progress.succeeded} enriched, {progress.not_found} not found, {progress.errors} errors
        </div>
      )}

      <div className="enrichment-actions">
        {!isRunning ? (
          <>
            <div className="batch-size-input">
              <label htmlFor="batchSize">Books to enrich:</label>
              <input
                type="number"
                id="batchSize"
                min="1"
                max={unenrichedCount}
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending || unenrichedCount === 0}
            >
              {unenrichedCount === 0 ? 'All Books Enriched' : `Enrich ${Math.min(batchSize, unenrichedCount)} Books`}
            </button>
          </>
        ) : (
          <button
            className="btn btn-secondary"
            onClick={() => cancelMutation.mutate()}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default BatchEnrichment;
