import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import BlindDate from './pages/BlindDate';
import './App.css';

const queryClient = new QueryClient();

function App() {
  const [inventoryKey, setInventoryKey] = useState(0);

  return (
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
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
