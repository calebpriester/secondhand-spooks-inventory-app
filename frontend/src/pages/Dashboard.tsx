import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
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

const CONDITION_COLORS: Record<string, string> = {
  'Like New': '#00FFA3',
  'Very Good': '#A78BFA',
  'Good': '#FFB347',
  'Acceptable': '#FF6B6B',
  'Unknown': '#67E8F9',
};

function PricingAnalysisTab({ cleanedFilter }: { cleanedFilter?: boolean }) {
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [authorFilter, setAuthorFilter] = useState<string>('');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['pricingStats', cleanedFilter, categoryFilter, authorFilter],
    queryFn: () => bookApi.getPricingStats({
      cleaned: cleanedFilter,
      category: categoryFilter || undefined,
      author: authorFilter || undefined,
    }),
  });

  const stackedData = useMemo(() => {
    if (!stats?.price_by_condition) return [];
    const conditions = new Set<string>();
    const byPrice = new Map<number, Record<string, number>>();

    for (const row of stats.price_by_condition) {
      conditions.add(row.condition);
      if (!byPrice.has(row.price)) byPrice.set(row.price, {});
      byPrice.get(row.price)![row.condition] = row.count;
    }

    return Array.from(byPrice.entries())
      .sort(([a], [b]) => a - b)
      .map(([price, counts]) => ({ price, ...counts }));
  }, [stats?.price_by_condition]);

  const conditions = useMemo(() => {
    if (!stats?.price_by_condition) return [];
    return [...new Set(stats.price_by_condition.map(r => r.condition))];
  }, [stats?.price_by_condition]);

  // Derive filter options from the unfiltered breakdown tables
  const categoryOptions = stats?.by_category.map(c => c.category) ?? [];
  const authorOptions = stats?.by_author.map(a => a.author) ?? [];

  if (isLoading) return <div className="loading">Loading pricing analysis...</div>;
  if (!stats) return null;

  const activeFilters = [categoryFilter, authorFilter].filter(Boolean);
  const filterDesc = activeFilters.length > 0
    ? activeFilters.join(' / ')
    : 'All';

  return (
    <>
      <div className="pricing-summary-bar">
        <span><strong>{stats.summary.total_priced}</strong> priced books</span>
        <span className="pricing-summary-sep">|</span>
        <span><strong>${stats.summary.price_range_min} – ${stats.summary.price_range_max}</strong> range</span>
        <span className="pricing-summary-sep">|</span>
        <span><strong>{stats.summary.unique_price_count}</strong> distinct prices</span>
      </div>

      <div className="pricing-filters">
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="pricing-filter-select"
        >
          <option value="">All Categories</option>
          {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={authorFilter}
          onChange={e => setAuthorFilter(e.target.value)}
          className="pricing-filter-select"
        >
          <option value="">All Authors (2+)</option>
          {authorOptions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {activeFilters.length > 0 && (
          <button
            className="pricing-filter-clear"
            onClick={() => { setCategoryFilter(''); setAuthorFilter(''); }}
          >
            Clear
          </button>
        )}
      </div>

      {stackedData.length > 0 && (
        <div className="charts-section">
          <div className="chart-card full-width">
            <h3>Price Distribution — {filterDesc}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stackedData}>
                <XAxis
                  dataKey="price"
                  stroke="#a09c9d"
                  fontSize={12}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <YAxis stroke="#a09c9d" fontSize={12} />
                <Tooltip
                  {...tooltipStyle}
                  labelFormatter={(label: any) => `$${label}`}
                />
                <Legend wrapperStyle={{ color: '#e8e8e0', fontSize: 12 }} />
                {conditions.map(cond => (
                  <Bar
                    key={cond}
                    dataKey={cond}
                    stackId="condition"
                    fill={CONDITION_COLORS[cond] || '#7C3AED'}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <p className="chart-note">{stats.summary.total_priced} books across {stats.summary.unique_price_count} price points, stacked by condition</p>
          </div>
        </div>
      )}

      {stats.by_category.length > 0 && !categoryFilter && (
        <div className="breakdown-section">
          <div className="breakdown-card breakdown-card-pricing full-width-breakdown">
            <h3>Price Distribution by Category</h3>
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Priced</th>
                  <th>Avg</th>
                  <th>Range</th>
                  <th>Distribution</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_category.map(cat => (
                  <tr key={cat.category}>
                    <td>{cat.category}</td>
                    <td>{cat.total_priced}</td>
                    <td>${cat.avg_price.toFixed(2)}</td>
                    <td>${cat.min_price} – ${cat.max_price}</td>
                    <td className="price-distribution-cell">
                      {cat.price_points.map(pp => (
                        <span key={pp.price} className="price-chip">
                          ${pp.price}: {pp.count} ({pp.percentage}%)
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.by_condition.length > 0 && (
        <div className="breakdown-section">
          <div className="breakdown-card breakdown-card-pricing full-width-breakdown">
            <h3>Price Distribution by Condition</h3>
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Condition</th>
                  <th>Priced</th>
                  <th>Avg</th>
                  <th>Range</th>
                  <th>Distribution</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_condition.map(cond => (
                  <tr key={cond.condition}>
                    <td>{cond.condition}</td>
                    <td>{cond.total_priced}</td>
                    <td>${cond.avg_price.toFixed(2)}</td>
                    <td>${cond.min_price} – ${cond.max_price}</td>
                    <td className="price-distribution-cell">
                      {cond.price_points.map(pp => (
                        <span key={pp.price} className="price-chip">
                          ${pp.price}: {pp.count} ({pp.percentage}%)
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.by_author.length > 0 && !authorFilter && (
        <div className="breakdown-section">
          <div className="breakdown-card breakdown-card-pricing full-width-breakdown">
            <h3>Price Distribution by Author (2+ books)</h3>
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Author</th>
                  <th>Priced</th>
                  <th>Avg</th>
                  <th>Range</th>
                  <th>Distribution</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_author.map(auth => (
                  <tr key={auth.author}>
                    <td>{auth.author}</td>
                    <td>{auth.total_priced}</td>
                    <td>${auth.avg_price.toFixed(2)}</td>
                    <td>${auth.min_price} – ${auth.max_price}</td>
                    <td className="price-distribution-cell">
                      {auth.price_points.map(pp => (
                        <span key={pp.price} className="price-chip">
                          ${pp.price}: {pp.count} ({pp.percentage}%)
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function Dashboard() {
  const [cleanedFilter, setCleanedFilter] = useState<boolean | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'inventory' | 'pricing'>('inventory');

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['stats', cleanedFilter],
    queryFn: () => bookApi.getStats(cleanedFilter),
  });

  if (isLoading) {
    return <div className="loading">Loading statistics...</div>;
  }

  if (isError || !stats) {
    return (
      <div className="loading">
        <p>Failed to load statistics.</p>
        <button onClick={() => refetch()} className="btn btn-primary" style={{ marginTop: '1rem' }}>Try Again</button>
      </div>
    );
  }

  const filterLabel = cleanedFilter === true ? 'Cleaned' : cleanedFilter === false ? 'Not Cleaned' : 'All';

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Inventory Dashboard</h2>
        <div className="dashboard-header-controls">
          <div className="dashboard-tab-toggle">
            <button
              className={`dashboard-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              Inventory Stats
            </button>
            <button
              className={`dashboard-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
              onClick={() => setActiveTab('pricing')}
            >
              Pricing Analysis
            </button>
          </div>
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
      </div>

      {activeTab === 'inventory' ? (
        <>
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

          {(stats.reading.pulled_to_read_count > 0 || stats.reading.kept_count > 0 || stats.books_missing_price > 0 || (stats.blind_date && stats.blind_date.without_blurb_count > 0)) && (
            <div className="inventory-alerts">
              {stats.reading.pulled_to_read_count > 0 && (
                <span className="inventory-alert-item alert-reading">
                  <span className="inventory-alert-count">{stats.reading.pulled_to_read_count}</span>
                  <span className="inventory-alert-label">pulled to read</span>
                </span>
              )}
              {stats.reading.kept_count > 0 && (
                <span className="inventory-alert-item alert-reading">
                  <span className="inventory-alert-count">{stats.reading.kept_count}</span>
                  <span className="inventory-alert-label">kept (${stats.reading.total_kept_cost.toFixed(2)})</span>
                </span>
              )}
              {stats.books_missing_price > 0 && (
                <span className="inventory-alert-item alert-pricing">
                  <span className="inventory-alert-count">{stats.books_missing_price}</span>
                  <span className="inventory-alert-label"><strong>need pricing</strong></span>
                </span>
              )}
              {stats.blind_date && stats.blind_date.without_blurb_count > 0 && (
                <span className="inventory-alert-item alert-blind-date">
                  <span className="inventory-alert-count">{stats.blind_date.without_blurb_count}</span>
                  <span className="inventory-alert-label"><strong>need blurbs</strong></span>
                </span>
              )}
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

          {stats.blind_date && stats.blind_date.active_count > 0 && (
            <div className="stats-grid blind-date-stats-grid">
              <div className="stat-card stat-card-blind-date">
                <h3>Blind Dates</h3>
                <p className="stat-value">{stats.blind_date.active_count}</p>
              </div>
              <div className="stat-card stat-card-blind-date">
                <h3>Total Value</h3>
                <p className="stat-value">${stats.blind_date.total_value.toFixed(2)}</p>
              </div>
              <div className="stat-card stat-card-blind-date">
                <h3>Have Blurbs</h3>
                <p className="stat-value">{stats.blind_date.with_blurb_count}</p>
              </div>
              <div className="stat-card stat-card-blind-date">
                <h3>Need Blurbs</h3>
                <p className="stat-value">{stats.blind_date.without_blurb_count}</p>
              </div>
            </div>
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
        </>
      ) : (
        <PricingAnalysisTab cleanedFilter={cleanedFilter} />
      )}
    </div>
  );
}

export default Dashboard;
