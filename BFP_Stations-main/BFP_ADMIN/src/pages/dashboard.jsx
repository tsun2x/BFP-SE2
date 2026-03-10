import "../style/dashboard.css";
import useEmergencyCalls from "../hooks/useEmergencyCalls";
import { useState, useEffect } from "react";
import apiClient from '../utils/apiClient';

export default function Dashboard() {
  const { loadMockIncomingCalls, incomingCallCount } = useEmergencyCalls();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [allIncidents, setAllIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/incidents')
      .then(data => setAllIncidents(data?.incidents || []))
      .catch(() => setAllIncidents([]))
      .finally(() => setLoading(false));
  }, []);

  const filterByPeriod = (incidents, period) => {
    const now = new Date();
    return incidents.filter(inc => {
      const t = inc.call_time ? new Date(inc.call_time) : null;
      if (!t || isNaN(t.getTime())) return false;
      if (period === 'day') return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth() && t.getDate() === now.getDate();
      if (period === 'month') return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth();
      if (period === 'custom') {
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from) from.setHours(0, 0, 0, 0);
        if (to) to.setHours(23, 59, 59, 999);
        if (from && t < from) return false;
        if (to && t > to) return false;
        return true;
      }
      return t.getFullYear() === now.getFullYear();
    });
  };

  const periodLabel = selectedPeriod === 'day' ? 'Today'
    : selectedPeriod === 'month' ? 'This Month'
    : selectedPeriod === 'custom'
      ? (dateFrom || dateTo)
        ? `${dateFrom ? new Date(dateFrom).toLocaleDateString() : 'Start'} – ${dateTo ? new Date(dateTo).toLocaleDateString() : 'Today'}`
        : 'Custom Range'
    : 'This Year';

  const periodIncidents = filterByPeriod(allIncidents, selectedPeriod);
  const totalCalls = periodIncidents.length;
  const dispatched = periodIncidents.filter(i => i.status === 'dispatched' || i.status === 'resolved').length;
  const resolved = periodIncidents.filter(i => i.status === 'resolved').length;
  const pending = periodIncidents.filter(i => i.status === 'pending').length;

  const responseTimes = periodIncidents
    .filter(i => i.dispatch_time && i.call_time)
    .map(i => (new Date(i.dispatch_time) - new Date(i.call_time)) / 60000);
  const avgResponseTime = responseTimes.length
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  periodIncidents.forEach(i => { if (i.call_time) dayCounts[new Date(i.call_time).getDay()]++; });
  const maxDayCount = Math.max(...dayCounts, 1);

  const recentIncidents = allIncidents.slice(0, 5);

  const timeAgo = (isoStr) => {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const statusClass = (status) => {
    if (status === 'pending') return 'high-priority';
    if (status === 'dispatched') return 'medium-priority';
    return 'low-priority';
  };

  const statusBadge = (status) => {
    if (status === 'dispatched') return <span className="status-badge dispatched">DISPATCHED</span>;
    if (status === 'resolved') return <span className="status-badge completed">COMPLETED</span>;
    return <button className="action-btn respond">Pending</button>;
  };

  return (
    <div className="dashboard-page">

      {/* Page Header */}
      <div className="dashboard-header">
        <h1>Bureau of Fire Protection Dashboard</h1>
        <p>Zamboanga City Fire District - Operational Statistics and Incident Monitoring</p>
      </div>

      {/* Period Selector */}
      <div className="period-selector">
        <label className="period-label">Reporting Period:</label>
        <div className="period-buttons">
          <button 
            className={`period-btn ${selectedPeriod === 'day' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('day')}
          >
            Daily
          </button>
          <button 
            className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('month')}
          >
            Monthly
          </button>
          <button 
            className={`period-btn ${selectedPeriod === 'year' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('year')}
          >
            Yearly
          </button>
          <button
            className={`period-btn ${selectedPeriod === 'custom' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('custom')}
          >
            Date Range
          </button>
          {selectedPeriod === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || new Date().toISOString().split('T')[0]}
                onChange={e => setDateFrom(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--card-bg, #fff)', color: 'var(--text, #111)' }}
              />
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>to</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setDateTo(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--card-bg, #fff)', color: 'var(--text, #111)' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* TOP STATS ROW */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-header"><h3>Dispatched Incidents</h3><div className="stat-icon dispatched"><i className="fa-solid fa-truck"></i></div></div>
          <div className="stat-value">{loading ? '…' : dispatched}</div>
          <div className="stat-period">{periodLabel}</div>
        </div>
        <div className="stat-card">
          <div className="stat-header"><h3>Emergency Calls</h3><div className="stat-icon calls"><i className="fa-solid fa-phone"></i></div></div>
          <div className="stat-value">{loading ? '…' : totalCalls}</div>
          <div className="stat-period">{periodLabel}</div>
        </div>
        <div className="stat-card">
          <div className="stat-header"><h3>Pending Alarms</h3><div className="stat-icon fire"><i className="fa-solid fa-bell"></i></div></div>
          <div className="stat-value">{loading ? '…' : pending}</div>
          <div className="stat-period">{periodLabel}</div>
        </div>
        <div className="stat-card">
          <div className="stat-header"><h3>Avg Response Time</h3><div className="stat-icon response"><i className="fa-solid fa-stopwatch"></i></div></div>
          <div className="stat-value">{loading ? '…' : avgResponseTime !== null ? `${avgResponseTime} min` : 'N/A'}</div>
          <div className="stat-period">{periodLabel}</div>
        </div>
        <div className="stat-card">
          <div className="stat-header"><h3>Resolved Incidents</h3><div className="stat-icon resolved"><i className="fa-solid fa-check"></i></div></div>
          <div className="stat-value">{loading ? '…' : resolved}</div>
          <div className="stat-period">{periodLabel}</div>
        </div>
        <div className="stat-card">
          <div className="stat-header"><h3>Active Dispatches</h3><div className="stat-icon reports"><i className="fa-solid fa-fire-flame-curved"></i></div></div>
          <div className="stat-value">{loading ? '…' : dispatched - resolved}</div>
          <div className="stat-period">{periodLabel}</div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="main-grid">

        {/* LEFT - INCIDENT ANALYSIS */}
        <div className="analysis-section">
          <div className="section-card">
            <h3>Incident Analysis</h3>
            <div className="chart-container">
              <div className="simple-chart">
                <div className="chart-bars">
                  {dayLabels.map((label, idx) => (
                    <div
                      key={label}
                      className="chart-bar"
                      style={{ height: `${Math.max(5, Math.round((dayCounts[idx] / maxDayCount) * 100))}%` }}
                      title={`${label}: ${dayCounts[idx]}`}
                    >
                      <span className="bar-label">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3>Incident Status Breakdown</h3>
            <div className="classification-grid">
              <div className="class-item">
                <div className="class-icon fire-class"><i className="fa-solid fa-hourglass-half"></i></div>
                <div className="class-details">
                  <h4>Pending</h4>
                  <div className="class-stats">
                    <span className="class-count">{pending}</span>
                    <span className="class-percent">{totalCalls ? Math.round((pending / totalCalls) * 100) : 0}%</span>
                  </div>
                </div>
              </div>
              <div className="class-item">
                <div className="class-icon medical-class"><i className="fa-solid fa-truck"></i></div>
                <div className="class-details">
                  <h4>Dispatched</h4>
                  <div className="class-stats">
                    <span className="class-count">{Math.max(0, dispatched - resolved)}</span>
                    <span className="class-percent">{totalCalls ? Math.round((Math.max(0, dispatched - resolved) / totalCalls) * 100) : 0}%</span>
                  </div>
                </div>
              </div>
              <div className="class-item">
                <div className="class-icon rescue-class"><i className="fa-solid fa-check"></i></div>
                <div className="class-details">
                  <h4>Resolved</h4>
                  <div className="class-stats">
                    <span className="class-count">{resolved}</span>
                    <span className="class-percent">{totalCalls ? Math.round((resolved / totalCalls) * 100) : 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT - RECENT INCIDENTS */}
        <div className="incidents-section">
          <div className="section-card">
            <div className="section-header">
              <h3>Recent Incidents</h3>
            </div>
            
            <div className="incidents-list">
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>Loading incidents…</div>
              ) : recentIncidents.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>No incidents found</div>
              ) : recentIncidents.map(inc => (
                <div key={inc.alarm_id} className={`incident-item ${statusClass(inc.status)}`}>
                  <div className="incident-content">
                    <div className="incident-header">
                      <span className="incident-id">ALM-{inc.alarm_id}</span>
                    </div>
                    <h4>{inc.initial_alarm_level || 'Emergency Alarm'}</h4>
                    <p className="incident-location">
                      <i className="fa-solid fa-location-dot"></i>
                      {inc.station_name || (inc.user_latitude ? `${Number(inc.user_latitude).toFixed(4)}, ${Number(inc.user_longitude).toFixed(4)}` : 'Unknown location')}
                    </p>
                    <div className="incident-meta">
                      <span className="reporter">{inc.full_name || 'Unknown caller'}</span>
                      <span className="time">{timeAgo(inc.call_time)}</span>
                    </div>
                  </div>
                  <div className="incident-actions">
                    {statusBadge(inc.status)}
                  </div>
                </div>
              ))}
            </div>

            <div className="section-footer">
              <button className="load-more-btn" onClick={loadMockIncomingCalls}>
                Load More ({incomingCallCount})
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
