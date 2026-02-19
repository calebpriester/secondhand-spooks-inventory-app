import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import BlindDate from './pages/BlindDate';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

let errorToastTimeout: ReturnType<typeof setTimeout> | null = null;

function showErrorToast(message: string) {
  // Remove existing toast if any
  const existing = document.getElementById('mutation-error-toast');
  if (existing) existing.remove();
  if (errorToastTimeout) clearTimeout(errorToastTimeout);

  const toast = document.createElement('div');
  toast.id = 'mutation-error-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#FF6B6B',
    color: '#1E1B1C',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.9rem',
    zIndex: '10000',
    maxWidth: '90vw',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  });
  document.body.appendChild(toast);
  errorToastTimeout = setTimeout(() => {
    toast.remove();
    errorToastTimeout = null;
  }, 5000);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to load data';
      showErrorToast(message);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      showErrorToast(message);
    },
  }),
});

function App() {
  const [inventoryKey, setInventoryKey] = useState(0);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="app">
            <nav className="navbar">
              <div className="nav-container">
                <Link to="/" className="nav-brand">
                  <img src="/logo.png" alt="Secondhand Spooks" className="nav-logo" />
                </Link>
                <div className="nav-links">
                  <Link to="/">Dashboard</Link>
                  <Link to="/inventory" onClick={() => setInventoryKey(k => k + 1)}>Inventory</Link>
                  <Link to="/sales">Sales</Link>
                  <Link to="/blind-date">Blind Date</Link>
                </div>
              </div>
            </nav>

            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory key={inventoryKey} />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/blind-date" element={<BlindDate />} />
              </Routes>
            </main>

            <footer className="app-footer">
              <a
                href="https://github.com/calebpriester/secondhand-spooks-inventory-app"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-github-link"
              >
                <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                View on GitHub
              </a>
            </footer>
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
