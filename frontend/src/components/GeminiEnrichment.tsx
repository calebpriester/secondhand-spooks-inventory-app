import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookApi, subgenreApi } from '../services/api';
import './GeminiEnrichment.css';

function GeminiEnrichment() {
  const [batchSize, setBatchSize] = useState(5);
  const [showManagement, setShowManagement] = useState(false);
  const [newSubgenre, setNewSubgenre] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['geminiStatus'],
    queryFn: bookApi.getGeminiStatus,
  });

  const { data: progress } = useQuery({
    queryKey: ['geminiBatchProgress'],
    queryFn: bookApi.getBatchTaggingProgress,
    refetchInterval: (query) => {
      return query.state.data?.is_running ? 2000 : false;
    },
  });

  const { data: subgenres } = useQuery({
    queryKey: ['subgenreOptions'],
    queryFn: subgenreApi.getAll,
  });

  const startMutation = useMutation({
    mutationFn: () => bookApi.startBatchTagging(batchSize),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geminiBatchProgress'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: bookApi.cancelBatchTagging,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geminiBatchProgress'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['geminiStatus'] });
    },
  });

  const addMutation = useMutation({
    mutationFn: (name: string) => subgenreApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subgenreOptions'] });
      setNewSubgenre('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => subgenreApi.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subgenreOptions'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => subgenreApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subgenreOptions'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  if (!status?.configured) {
    return (
      <div className="enrichment-panel gemini-panel">
        <h3>Gemini Sub-Genre Tagging</h3>
        <p className="enrichment-warning">
          Google API key not configured. Set GOOGLE_BOOKS_API_KEY environment variable (also used for Gemini).
        </p>
      </div>
    );
  }

  const stats = status.stats;
  const isRunning = progress?.is_running;
  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;
  const untaggedCount = Number(stats?.untagged_count || 0);

  return (
    <div className="enrichment-panel gemini-panel">
      <h3>Gemini Sub-Genre Tagging</h3>

      {stats && (
        <div className="enrichment-stats">
          <span>Tagged: {stats.tagged_count} / {stats.total_books}</span>
          <span>Untagged: {stats.untagged_count}</span>
        </div>
      )}

      {isRunning && progress && (
        <div className="enrichment-progress">
          <div className="progress-bar">
            <div className="progress-fill gemini-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="progress-text">
            {progress.processed} / {progress.total} ({progressPercent}%)
            &nbsp;|&nbsp; OK: {progress.succeeded} &nbsp;|&nbsp; Errors: {progress.errors}
          </div>
        </div>
      )}

      {!isRunning && progress && progress.processed > 0 && (
        <div className="enrichment-results">
          Last run: {progress.succeeded} tagged, {progress.errors} errors
        </div>
      )}

      <div className="enrichment-actions">
        {!isRunning ? (
          <>
            <div className="batch-size-input">
              <label htmlFor="geminiBatchSize">Books to tag:</label>
              <input
                type="number"
                id="geminiBatchSize"
                min="1"
                max={untaggedCount}
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending || untaggedCount === 0}
            >
              {untaggedCount === 0 ? 'All Books Tagged' : `Tag ${Math.min(batchSize, untaggedCount)} Books`}
            </button>
          </>
        ) : (
          <button className="btn btn-secondary" onClick={() => cancelMutation.mutate()}>
            Cancel
          </button>
        )}
      </div>

      <div className="subgenre-management-toggle">
        <button
          className="btn btn-secondary btn-small"
          onClick={() => setShowManagement(!showManagement)}
        >
          {showManagement ? 'Hide' : 'Manage'} Sub-Genres ({subgenres?.length || 0})
        </button>
      </div>

      {showManagement && (
        <div className="subgenre-management">
          <div className="subgenre-add">
            <input
              type="text"
              placeholder="New sub-genre name..."
              value={newSubgenre}
              onChange={(e) => setNewSubgenre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSubgenre.trim()) addMutation.mutate(newSubgenre.trim());
              }}
            />
            <button
              className="btn btn-primary btn-small"
              onClick={() => newSubgenre.trim() && addMutation.mutate(newSubgenre.trim())}
              disabled={!newSubgenre.trim()}
            >
              Add
            </button>
          </div>

          <div className="subgenre-list">
            {subgenres?.map(sg => (
              <div key={sg.id} className="subgenre-item">
                {editingId === sg.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editName.trim()) updateMutation.mutate({ id: sg.id, name: editName.trim() });
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                    <button className="btn btn-small" onClick={() => updateMutation.mutate({ id: sg.id, name: editName.trim() })}>Save</button>
                    <button className="btn btn-small" onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="subgenre-name">{sg.name}</span>
                    <button className="btn btn-small" onClick={() => { setEditingId(sg.id); setEditName(sg.name); }}>Edit</button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => {
                        if (window.confirm(`Remove "${sg.name}"? It will be removed from all tagged books.`)) {
                          deleteMutation.mutate(sg.id);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GeminiEnrichment;
