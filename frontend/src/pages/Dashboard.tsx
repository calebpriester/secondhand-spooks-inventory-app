import { useQuery } from '@tanstack/react-query';
import { bookApi } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: bookApi.getStats,
  });

  if (isLoading) {
    return <div className="loading">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="error">Failed to load statistics</div>;
  }

  return (
    <div className="dashboard">
      <h2>Inventory Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Books</h3>
          <p className="stat-value">{stats.total_books}</p>
        </div>

        <div className="stat-card">
          <h3>Total Value</h3>
          <p className="stat-value">${stats.total_value.toFixed(2)}</p>
        </div>

        <div className="stat-card">
          <h3>Total Cost</h3>
          <p className="stat-value">${stats.total_cost.toFixed(2)}</p>
        </div>

        <div className="stat-card">
          <h3>Est. Profit</h3>
          <p className="stat-value profit">${stats.estimated_profit.toFixed(2)}</p>
        </div>
      </div>

      <div className="breakdown-section">
        <div className="breakdown-card">
          <h3>Books by Category</h3>
          <table className="breakdown-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {stats.by_category.map((cat) => (
                <tr key={cat.category}>
                  <td>{cat.category}</td>
                  <td>{cat.count}</td>
                  <td>${cat.total_value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="breakdown-card">
          <h3>Books by Condition</h3>
          <table className="breakdown-table">
            <thead>
              <tr>
                <th>Condition</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {stats.by_condition.map((cond) => (
                <tr key={cond.condition}>
                  <td>{cond.condition}</td>
                  <td>{cond.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="breakdown-card">
          <h3>Top 10 Authors</h3>
          <table className="breakdown-table">
            <thead>
              <tr>
                <th>Author</th>
                <th>Books</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_authors.map((author) => (
                <tr key={author.author}>
                  <td>{author.author}</td>
                  <td>{author.count}</td>
                  <td>${author.total_value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
