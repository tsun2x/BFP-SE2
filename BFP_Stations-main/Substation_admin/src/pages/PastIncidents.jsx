import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';
import '../style/pastincidents.css';

const RANGE_OPTIONS = [
  { key: '24h', label: 'Past 24 Hours', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: 'Past 7 Days', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: 'Past 30 Days', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: '12m', label: 'Past 12 Months', ms: 365 * 24 * 60 * 60 * 1000 },
];

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function stationLabel(incident) {
  return (
    incident.station_name ||
    incident.stationName ||
    (incident.assigned_station_id ? `Station #${incident.assigned_station_id}` : 'Unassigned')
  );
}

function formatDurationMinutes(mins) {
  if (!Number.isFinite(mins) || mins < 0) return '—';
  if (mins < 60) return `${mins.toFixed(1)} min`;
  return `${(mins / 60).toFixed(1)} hr`;
}

function computeDispatchLagMinutes(incident) {
  const call = safeDate(incident.call_time || incident.created_at);
  const dispatch = safeDate(incident.dispatch_time);
  if (!call || !dispatch) return null;
  const delta = (dispatch.getTime() - call.getTime()) / 60000;
  return delta >= 0 ? delta : null;
}

function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getIncidentCoordinates(incident) {
  const lat = parseCoordinate(
    incident.latitude ?? incident.user_latitude ?? incident.coordinates?.lat,
  );
  const lng = parseCoordinate(
    incident.longitude ?? incident.user_longitude ?? incident.coordinates?.lng,
  );

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
}

function formatCoordinatesForDisplay(coordinates) {
  if (!coordinates) return 'N/A';
  return `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
}

function buildIncidentLocationLabel(incident) {
  const coordinates = getIncidentCoordinates(incident);
  const coordinateLabel = formatCoordinatesForDisplay(coordinates);
  const locationText = String(incident.location || '').trim();

  if (locationText && coordinateLabel !== 'N/A') {
    return `${locationText} (${coordinateLabel})`;
  }

  if (locationText) {
    return locationText;
  }

  return coordinateLabel !== 'N/A' ? coordinateLabel : 'Unknown';
}

function csvEscape(value) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

function formatDateForCsv(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function PastIncidents() {
  const { user } = useAuth();
  const [allIncidents, setAllIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRange, setSelectedRange] = useState('30d');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');

  const stationName =
    user?.stationInfo?.station_name ||
    user?.station_name ||
    user?.substation ||
    user?.station ||
    'Branch BFP';

  const stationId = Number(user?.assignedStationId || user?.assigned_station_id || 0) || null;

  useEffect(() => {
    const loadIncidents = async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        const data = await apiClient.get('/incidents');
        setAllIncidents(data?.incidents || []);
        setError('');
      } catch (err) {
        setAllIncidents([]);
        setError(err?.message || 'Failed to load incidents');
      } finally {
        setLoading(false);
      }
    };

    loadIncidents(true);

    const onIncidentUpdated = () => loadIncidents(false);
    window.addEventListener('incident-status-updated', onIncidentUpdated);
    return () => {
      window.removeEventListener('incident-status-updated', onIncidentUpdated);
    };
  }, []);

  const stationLockedIncidents = useMemo(() => {
    return allIncidents.filter((incident) => {
      if (!stationId) return stationLabel(incident) === stationName;
      return Number(incident.assigned_station_id || 0) === stationId;
    });
  }, [allIncidents, stationId, stationName]);

  const periodCards = useMemo(() => {
    const now = Date.now();
    return RANGE_OPTIONS.map((range) => {
      const startMs = now - range.ms;
      const count = stationLockedIncidents.filter((incident) => {
        const call = safeDate(incident.call_time || incident.created_at);
        return call && call.getTime() >= startMs;
      }).length;
      return { ...range, count };
    });
  }, [stationLockedIncidents]);

  const scopedIncidents = useMemo(() => {
    const now = Date.now();
    const activeRange = RANGE_OPTIONS.find((r) => r.key === selectedRange);
    const startMs = activeRange ? now - activeRange.ms : 0;

    return stationLockedIncidents.filter((incident) => {
      const call = safeDate(incident.call_time || incident.created_at);
      if (!call || call.getTime() < startMs) return false;

      if (statusFilter !== 'all' && String(incident.status || '') !== statusFilter) {
        return false;
      }

      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystack = [
          incident.full_name,
          incident.phone_number,
          incident.incident_type,
          incident.location,
          incident.status,
          incident.alarm_id,
        ]
          .map((v) => String(v || '').toLowerCase())
          .join(' ');
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [stationLockedIncidents, selectedRange, statusFilter, query]);

  const trendRows = useMemo(() => {
    const byDay = new Map();
    for (const incident of scopedIncidents) {
      const call = safeDate(incident.call_time || incident.created_at);
      if (!call) continue;
      const dayKey = call.toISOString().slice(0, 10);
      byDay.set(dayKey, (byDay.get(dayKey) || 0) + 1);
    }

    const sorted = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, count]) => ({ day, count }));

    const max = sorted.reduce((m, item) => Math.max(m, item.count), 0) || 1;
    return sorted.map((item) => ({ ...item, pct: (item.count / max) * 100 }));
  }, [scopedIncidents]);

  const statusSummary = useMemo(() => {
    const statusMap = {
      pending: 0,
      active: 0,
      resolved: 0,
      cancelled: 0,
    };

    for (const incident of scopedIncidents) {
      const status = String(incident.status || '');
      if (status === 'Resolved') statusMap.resolved += 1;
      else if (status === 'Cancelled') statusMap.cancelled += 1;
      else if (['Dispatched', 'On Scene', 'Under Control'].includes(status)) statusMap.active += 1;
      else statusMap.pending += 1;
    }

    return statusMap;
  }, [scopedIncidents]);

  const avgDispatchLag = useMemo(() => {
    const values = scopedIncidents
      .map((incident) => computeDispatchLagMinutes(incident))
      .filter((v) => v !== null);
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [scopedIncidents]);

  const exportCsv = () => {
    const rows = [
      [
        'alarm_id',
        'caller',
        'phone_number',
        'incident_type',
        'location_text',
        'latitude',
        'longitude',
        'station',
        'status',
        'call_time',
        'dispatch_time',
        'resolved_time',
        'dispatch_lag_minutes',
        'narrative',
      ],
      ...[...scopedIncidents]
        .sort((a, b) => {
          const da = safeDate(a.call_time || a.created_at)?.getTime() || 0;
          const db = safeDate(b.call_time || b.created_at)?.getTime() || 0;
          return db - da;
        })
        .map((incident) => {
          const lag = computeDispatchLagMinutes(incident);
          const coordinates = getIncidentCoordinates(incident);
          return [
            incident.alarm_id,
            incident.full_name || '',
            incident.phone_number || '',
            incident.incident_type || '',
            buildIncidentLocationLabel(incident),
            coordinates?.lat ?? '',
            coordinates?.lng ?? '',
            stationName,
            incident.status || '',
            formatDateForCsv(incident.call_time || incident.created_at),
            formatDateForCsv(incident.dispatch_time),
            formatDateForCsv(incident.resolve_time),
            lag !== null ? lag.toFixed(2) : '',
            incident.narrative || '',
          ];
        }),
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    link.href = url;
    link.download = `past-incidents-${selectedRange}-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="past-incidents-page">
      <div className="past-incidents-header">
        <h1>Past Incidents</h1>
        <p>Station-locked analytics for {stationName}.</p>
        <button
          className="past-export-btn"
          onClick={exportCsv}
          disabled={loading || scopedIncidents.length === 0}
        >
          Export Filtered CSV
        </button>
      </div>

      <div className="past-period-cards">
        {periodCards.map((card) => (
          <button
            key={card.key}
            className={`past-period-card ${selectedRange === card.key ? 'active' : ''}`}
            onClick={() => setSelectedRange(card.key)}
          >
            <div className="period-label">{card.label}</div>
            <div className="period-value">{loading ? '…' : card.count}</div>
          </button>
        ))}
      </div>

      <div className="past-filters">
        <input
          className="past-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search caller, phone, location, alarm id..."
        />
        <input value={stationName} disabled aria-label="Station" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="Pending Dispatch">Pending Dispatch</option>
          <option value="Dispatched">Dispatched</option>
          <option value="On Scene">On Scene</option>
          <option value="Under Control">Under Control</option>
          <option value="Resolved">Resolved</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="past-kpi-strip">
        <div className="kpi-item">
          <span>Total</span>
          <strong>{loading ? '…' : scopedIncidents.length}</strong>
        </div>
        <div className="kpi-item">
          <span>Pending</span>
          <strong>{loading ? '…' : statusSummary.pending}</strong>
        </div>
        <div className="kpi-item">
          <span>Active</span>
          <strong>{loading ? '…' : statusSummary.active}</strong>
        </div>
        <div className="kpi-item">
          <span>Resolved</span>
          <strong>{loading ? '…' : statusSummary.resolved}</strong>
        </div>
      </div>

      <div className="past-grid">
        <section className="past-card">
          <h3>Incidents Trend ({RANGE_OPTIONS.find((r) => r.key === selectedRange)?.label})</h3>
          {error ? (
            <p className="past-empty">{error}</p>
          ) : loading ? (
            <p className="past-empty">Loading trend…</p>
          ) : trendRows.length === 0 ? (
            <p className="past-empty">No incidents in selected range.</p>
          ) : (
            <div className="trend-list">
              {trendRows.map((row) => (
                <div key={row.day} className="trend-row">
                  <span className="trend-day">{row.day}</span>
                  <div className="trend-bar-wrap">
                    <div className="trend-bar" style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="trend-count">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="past-card">
          <h3>Station Snapshot</h3>
          <div className="station-table-wrap">
            <table className="station-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Incidents</th>
                  <th>Pending</th>
                  <th>Active</th>
                  <th>Avg Dispatch Lag</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{stationName}</td>
                  <td>{loading ? '…' : scopedIncidents.length}</td>
                  <td>{loading ? '…' : statusSummary.pending}</td>
                  <td>{loading ? '…' : statusSummary.active}</td>
                  <td>{loading ? '…' : formatDurationMinutes(avgDispatchLag)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="past-card full">
        <h3>Recent Incidents in Selected Range</h3>
        {loading ? (
          <p className="past-empty">Loading incidents…</p>
        ) : scopedIncidents.length === 0 ? (
          <p className="past-empty">No incidents match your filters.</p>
        ) : (
          <div className="station-table-wrap">
            <table className="station-table">
              <thead>
                <tr>
                  <th>Alarm ID</th>
                  <th>Caller</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Call Time</th>
                </tr>
              </thead>
              <tbody>
                {[...scopedIncidents]
                  .sort((a, b) => {
                    const da = safeDate(a.call_time || a.created_at)?.getTime() || 0;
                    const db = safeDate(b.call_time || b.created_at)?.getTime() || 0;
                    return db - da;
                  })
                  .slice(0, 120)
                  .map((incident) => (
                    <tr key={incident.alarm_id}>
                      <td>ALM-{incident.alarm_id}</td>
                      <td>{incident.full_name || 'Unknown'}</td>
                      <td>{incident.incident_type || 'Emergency'}</td>
                      <td>{buildIncidentLocationLabel(incident)}</td>
                      <td>{incident.status || 'Pending'}</td>
                      <td>
                        {safeDate(incident.call_time || incident.created_at)
                          ? new Date(incident.call_time || incident.created_at).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
