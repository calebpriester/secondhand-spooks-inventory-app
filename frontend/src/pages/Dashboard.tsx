import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { bookApi } from '../services/api';
import BatchEnrichment from '../components/BatchEnrichment';
import GeminiEnrichment from '../components/GeminiEnrichment';
import './Dashboard.css';

const PIE_COLORS = [
  '#00FFA3', '#00CC82', '#FF6B6B', '#FFB347',
  '#A78BFA', '#67E8F9', '#F472B6', '#FCD34D',
  '#86EFAC', '#C084FC',
];

const BAR_COLOR = '#00FFA3';

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1E1B1C',
    border: '1px solid #3d3839',
    borderRadius: '4px',
    color: '#e8e8e0',
  },
  itemStyle: { color: '#e8e8e0' },
  labelStyle: { color: '#e8e8e0' },
};

function Dashboard() {
  const [cleanedFilter, setCleanedFilter] = useState<boolean | undefined>(undefined);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', cleanedFilter],
    queryFn: () => bookApi.getStats(cleanedFilter),
  });

  if (isLoading) {
    return <div className="loading">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="error">Failed to load statistics</div>;
  }

  const filterLabel = cleanedFilter === true ? 'Cleaned' : cleanedFilter === false ? 'Not Cleaned' : 'All';

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Inventory Dashboard</h2>
        <div className="filter-toggle-group">
          <button
            className={`filter-toggle-btn ${cleanedFilter === undefined ? 'active' : ''}`}
            onClick={() => setCleanedFilter(undefined)}
          >
            All
          </button>
          <button
            className={`filter-toggle-btn ${cleanedFilter === true ? 'active' : ''}`}
            onClick={() => setCleanedFilter(true)}
          >
            Cleaned
          </button>
          <button
            className={`filter-toggle-btn ${cleanedFilter === false ? 'active' : ''}`}
            onClick={() => setCleanedFilter(false)}
          >
            Not Cleaned
          </button>
        </div>
      </div>

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

      {(stats.reading.pulled_to_read_count > 0 || stats.reading.kept_count > 0) && (
        <div className="stats-grid reading-stats-grid">
          {stats.reading.pulled_to_read_count > 0 && (
            <div className="stat-card stat-card-reading">
              <h3>Pulled to Read</h3>
              <p className="stat-value">{stats.reading.pulled_to_read_count}</p>
            </div>
          )}
          {stats.reading.kept_count > 0 && (
            <>
              <div className="stat-card stat-card-reading">
                <h3>Books Kept</h3>
                <p className="stat-value">{stats.reading.kept_count}</p>
              </div>
              <div className="stat-card stat-card-reading">
                <h3>Kept Cost</h3>
                <p className="stat-value">${stats.reading.total_kept_cost.toFixed(2)}</p>
              </div>
            </>
          )}
        </div>
      )}

      {stats.books_missing_price > 0 && (
        <div className="pricing-alert">
          <span className="pricing-alert-count">{stats.books_missing_price}</span>
          <span className="pricing-alert-text">
            <strong>books need pricing</strong> — use Inventory → Missing Price filter to find them
          </span>
        </div>
      )}

      {stats.sales && stats.sales.books_sold > 0 && (
        <>
          <div className="stats-grid sales-stats-grid">
            <div className="stat-card stat-card-sales">
              <h3>Books Sold</h3>
              <p className="stat-value">{stats.sales.books_sold}</p>
            </div>
            <div className="stat-card stat-card-sales">
              <h3>Transactions</h3>
              <p className="stat-value">{stats.sales.transaction_count}</p>
            </div>
            <div className="stat-card stat-card-sales">
              <h3>Total Revenue</h3>
              <p className="stat-value">${stats.sales.total_revenue.toFixed(2)}</p>
            </div>
            <div className="stat-card stat-card-sales">
              <h3>Actual Profit</h3>
              <p className="stat-value profit">${stats.sales.actual_profit.toFixed(2)}</p>
            </div>
            <div className="stat-card stat-card-sales">
              <h3>Avg Sale Price</h3>
              <p className="stat-value">
                ${(stats.sales.total_revenue / stats.sales.books_sold).toFixed(2)}
              </p>
            </div>
          </div>

          {stats.sales.by_event.length > 0 && (
            <div className="breakdown-section sales-event-breakdown">
              <div className="breakdown-card breakdown-card-sales">
                <h3>Sales by Event</h3>
                <table className="breakdown-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Sold</th>
                      <th>Txns</th>
                      <th>Revenue</th>
                      <th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.sales.by_event.map((ev) => (
                      <tr key={ev.event}>
                        <td>{ev.event}</td>
                        <td>{ev.count}</td>
                        <td>{ev.transaction_count}</td>
                        <td>${ev.revenue.toFixed(2)}</td>
                        <td className="profit-cell">${ev.profit.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <div className="charts-section">
        {/* Category Pie Chart */}
        {stats.by_category.length > 0 && (
          <div className="chart-card">
            <h3>Books by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.by_category.filter(c => c.category)}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(props: any) => `${props.category} (${props.percentage}%)`}
                >
                  {stats.by_category.filter(c => c.category).map((_entry, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Condition Pie Chart */}
        {stats.by_condition.length > 0 && (
          <div className="chart-card">
            <h3>Books by Condition</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.by_condition.filter(c => c.condition)}
                  dataKey="count"
                  nameKey="condition"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(props: any) => `${props.condition} (${props.percentage}%)`}
                >
                  {stats.by_condition.filter(c => c.condition).map((_entry, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Decade Bar Chart */}
        {stats.by_decade.length > 0 && (
          <div className="chart-card">
            <h3>Books by Decade Published</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.by_decade}>
                <XAxis dataKey="decade" stroke="#a09c9d" fontSize={12} />
                <YAxis stroke="#a09c9d" fontSize={12} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: any, _name: any, props: any) =>
                    [`${value} books (${props.payload.percentage}%)`, 'Count']
                  }
                />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="chart-note">Based on {stats.by_decade.reduce((sum, d) => sum + d.count, 0)} enriched books</p>
          </div>
        )}

        {/* Rating Distribution Bar Chart */}
        {stats.rating_distribution.length > 0 && (
          <div className="chart-card">
            <h3>Google Rating Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.rating_distribution}>
                <XAxis dataKey="rating_bucket" stroke="#a09c9d" fontSize={12} />
                <YAxis stroke="#a09c9d" fontSize={12} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: any, _name: any, props: any) =>
                    [`${value} books (avg: ${props.payload.avg_rating})`, 'Count']
                  }
                />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="chart-note">Based on {stats.rating_distribution.reduce((sum, r) => sum + r.count, 0)} rated books</p>
          </div>
        )}

        {/* Sub-Genre Distribution */}
        {stats.by_subgenre && stats.by_subgenre.length > 0 && (
          <div className="chart-card full-width">
            <h3>Sub-Genre Distribution</h3>
            <ResponsiveContainer width="100%" height={Math.max(300, stats.by_subgenre.length * 32)}>
              <BarChart data={stats.by_subgenre} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" stroke="#a09c9d" fontSize={12} />
                <YAxis dataKey="subgenre" type="category" width={150} stroke="#a09c9d" fontSize={12} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: any, _name: any, props: any) =>
                    [`${value} books (${props.payload.percentage}%)`, 'Count']
                  }
                />
                <Bar dataKey="count" fill="#A78BFA" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="chart-note">Across {stats.by_subgenre.reduce((sum, s) => sum + s.count, 0)} sub-genre tags ({filterLabel})</p>
          </div>
        )}
      </div>

      <div className="breakdown-section">
        <div className="breakdown-card">
          <h3>Books by Category</h3>
          <table className="breakdown-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>%</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {stats.by_category.map((cat) => (
                <tr key={cat.category}>
                  <td>{cat.category || 'Uncategorized'}</td>
                  <td>{cat.count}</td>
                  <td className="pct-cell">{cat.percentage}%</td>
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
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {stats.by_condition.map((cond) => (
                <tr key={cond.condition}>
                  <td>{cond.condition || 'Unknown'}</td>
                  <td>{cond.count}</td>
                  <td className="pct-cell">{cond.percentage}%</td>
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

      <BatchEnrichment />
      <GeminiEnrichment />
    </div>
  );
}

export default Dashboard;
