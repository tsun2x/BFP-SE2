import { useState, useEffect } from 'react';
import IncidentDetailsPanel from '../components/incidentdetailspanel';
import IncidentReportModal from '../components/IncidentReportModal';
import apiClient from '../utils/apiClient';
import '../style/callHistory.css';

const formatStatus = (s) => {
  if (!s) return 'Pending';
  const map = {
    'Pending Dispatch': 'Pending',
    Dispatched: 'Dispatch On the Way',
    'On Scene': 'Ongoing Response',
    'Under Control': 'Fire Under Control',
    Resolved: 'Resolved',
    Cancelled: 'Cancelled',
  };
  return map[s] ?? s;
};

export default function EmergencyCallHistory() {
  const [calls, setCalls] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reportAlarmId, setReportAlarmId] = useState(null);

  useEffect(() => {
    apiClient
      .get('/incidents')
      .then((data) => {
        const mapped = (data.incidents || []).map((a) => {
          const details = a.details || '';
          const typeMatch = details.match(/Incident:\s*([^|]+)/);
          const incidentType = typeMatch ? typeMatch[1].trim() : '—';
          return {
            id: a.alarm_id,
            alarm_id: a.alarm_id,
            caller: a.full_name || 'Unknown',
            number: a.phone_number || '—',
            location: '',
            type: incidentType,
            alarm: a.current_alarm_level || '—',
            narrative: '',
            status: formatStatus(a.status),
            timeline: [],
            datetime: a.call_time ? new Date(a.call_time).toLocaleString('en-PH') : '—',
            callTime: a.call_time || null,
          };
        });
        setCalls(mapped);
      })
      .catch((err) => {
        console.error('Failed to fetch alarms:', err);
        setFetchError(err.message || 'Failed to load call history');
      })
      .finally(() => setLoadingData(false));
  }, []);

  const openPanel = (call) => {
    setSelected(call);
    setPanelOpen(true);
  };
  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setSelected(null), 200);
  };

  const handleStatusChange = async (newStatus, updatedIncident) => {
    try {
      await apiClient.patch(`/incidents/${updatedIncident.alarm_id}/status`, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status in DB:', err);
    }
    setCalls((prev) =>
      prev.map((item) => (item.id === updatedIncident.id ? { ...item, status: newStatus } : item))
    );
  };

  const filterByPeriod = (items) => {
    const now = new Date();
    return items.filter((c) => {
      const t = c.callTime ? new Date(c.callTime) : null;
      if (!t || isNaN(t.getTime())) return true;
      if (selectedPeriod === 'day')
        return (
          t.getFullYear() === now.getFullYear() &&
          t.getMonth() === now.getMonth() &&
          t.getDate() === now.getDate()
        );
      if (selectedPeriod === 'month')
        return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth();
      if (selectedPeriod === 'custom') {
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

  const filteredCalls = filterByPeriod(calls).filter((c) => {
    const matchesSearch =
      c.caller.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadgeClass = (status) => {
    const key = status.toLowerCase().replace(/\s/g, '-');
    return (
      {
        pending: 'status-yellow',
        'dispatch-on-the-way': 'status-blue',
        resolved: 'status-green',
        cancelled: 'status-red',
      }[key] || 'status-default'
    );
  };

  return (
    <div className="call-page">
      <h1 className="call-title">Emergency Call History</h1>

      {/* SEARCH AND FILTER BAR */}
      <div className="call-search-row">
        <div className="call-search-wrapper">
          <span className="call-search-icon">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            className="call-search-input"
            placeholder="Search Caller, Number, Location, or Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-dropdowns">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Dispatch On the Way">Dispatch On the Way</option>
            <option value="Resolved">Resolved</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="Alarm 1">Alarm 1</option>
            <option value="Alarm 2">Alarm 2</option>
            <option value="Alarm 3">Alarm 3</option>
            <option value="Alarm 4">Alarm 4</option>
            <option value="Task Force">Task Force</option>
          </select>
        </div>
      </div>

      {/* PERIOD FILTER */}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: '8px',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="date"
                value={dateFrom}
                max={dateTo || new Date().toISOString().split('T')[0]}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  background: 'var(--card-bg, #fff)',
                  color: 'var(--text, #111)',
                }}
              />
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>to</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  background: 'var(--card-bg, #fff)',
                  color: 'var(--text, #111)',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="call-table-card">
        {loadingData ? (
          <p style={{ padding: '1rem', textAlign: 'center' }}>Loading...</p>
        ) : fetchError ? (
          <p style={{ padding: '1rem', textAlign: 'center', color: '#c81e1e' }}>
            Error: {fetchError}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Caller</th>
                <th>Number</th>
                <th>Incident Type</th>
                <th>Alarm Level</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '1rem' }}>
                    No records found. Submit an incident via the Incident Report page to see history
                    here.
                  </td>
                </tr>
              ) : (
                filteredCalls.map((c) => (
                  <tr key={c.id}>
                    <td>{c.caller}</td>
                    <td>{c.number}</td>
                    <td>{c.type}</td>
                    <td>{c.alarm}</td>
                    <td>{c.datetime}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(c.status)}`}>
                        <span className="status-dot"></span>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button className="call-view-btn" onClick={() => openPanel(c)}>
                        Details
                      </button>
                      <button
                        className="call-view-btn"
                        style={{ background: '#c81e1e', color: '#fff', borderColor: '#c81e1e' }}
                        onClick={() => setReportAlarmId(c.alarm_id)}
                      >
                        📋 Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* RIGHT-SIDE DETAILS PANEL */}
      <IncidentDetailsPanel
        open={panelOpen}
        onClose={closePanel}
        incident={selected}
        onUpdateStatus={handleStatusChange}
      />

      {/* INCIDENT REPORT MODAL */}
      {reportAlarmId && (
        <IncidentReportModal alarmId={reportAlarmId} onClose={() => setReportAlarmId(null)} />
      )}
    </div>
  );
}
