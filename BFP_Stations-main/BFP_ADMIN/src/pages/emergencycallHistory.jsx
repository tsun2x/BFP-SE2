import { useState, useEffect } from "react";
import IncidentDetailsPanel from "../components/incidentdetailspanel";
import IncidentReportModal from "../components/IncidentReportModal";
import "../style/callHistory.css";
import apiClient from "../utils/apiClient";

function fmtDateTime(val) {
  if (!val) return '—';
  try { return new Date(val).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return val; }
}

export default function EmergencyCallHistory() {
  const [calls, setCalls] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    setLoadingCalls(true);
    apiClient.get('/incidents')
      .then((data) => {
        const raw = data?.incidents || data || [];
        setCalls(raw.map((a) => ({
          id: a.alarm_id,          // real alarm_id for report modal
          alarm_id: a.alarm_id,
          caller: a.full_name || 'Unknown Caller',
          number: a.phone_number || '—',
          location: '—',
          type: a.details?.match(/Incident: ([^|]+)/)?.[1]?.trim() || '—',
          alarm: a.current_alarm_level || a.initial_alarm_level || '—',
          narrative: a.details || '',
          status: a.status || 'Pending',
          datetime: fmtDateTime(a.call_time),
          timeline: [],
        })));
      })
      .catch((e) => setFetchError(e.message || 'Failed to load incidents'))
      .finally(() => setLoadingCalls(false));
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reportAlarmId, setReportAlarmId] = useState(null);

  // Open right-side panel
  const openPanel = (call) => {
    setSelected(call);
    setPanelOpen(true);
  };

  // Close right-side panel
  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setSelected(null), 200);
  };

  // Update status from panel
  const handleStatusChange = (newStatus, updatedIncident) => {
    setCalls((prev) =>
      prev.map((item) =>
        item.id === updatedIncident.id
          ? { ...item, status: newStatus }
          : item
      )
    );
  };

  // Search
  const filteredCalls = calls.filter((c) =>
    c.caller.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Status Badge UI Mapping
  const getStatusBadgeClass = (status) => {
    const key = status.toLowerCase().replace(/\s/g, "-");

    return {
      "pending": "status-yellow",
      "dispatch-on-the-way": "status-blue",
      "resolved": "status-green",
      "cancelled": "status-red",
    }[key] || "status-default";
  };

  return (
    <div className="call-page">
      <h1 className="call-title">Emergency Call History</h1>

      {/* SEARCH + FILTERS */}
      <div className="officer-search-card">

        {/* SEARCH */}
        <div className="search-input-wrapper">
          <i className="fa-solid fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search Caller Name..."
            className="officer-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* FILTERS */}
        <div className="officer-filters">

          <div className="officer-filter-group">
            <label>Date</label>
            <input type="date" className="officer-filter-input" />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="call-table-card">
        {loadingCalls && <div style={{ padding: 24, textAlign: 'center', color: '#aaa' }}>Loading incidents...</div>}
        {fetchError && <div style={{ padding: 16, color: '#ff6b6b' }}>{fetchError}</div>}
        <table>
          <thead>
            <tr>
              <th>Caller</th>
              <th>Number</th>
              <th>Type</th>
              <th>Date & Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredCalls.map((c) => (
              <tr key={c.id}>
                <td>{c.caller}</td>
                <td>{c.number}</td>
                <td>{c.type}</td>
                <td>{c.datetime}</td>

                {/* BEAUTIFUL STATUS BADGE */}
                <td>
                  <span className={`status-badge ${getStatusBadgeClass(c.status)}`}>
                    <span className="status-dot"></span>
                    {c.status}
                  </span>
                </td>

                <td>
                  <button className="call-view-btn" onClick={() => openPanel(c)}>
                    Details
                  </button>
                  <button
                    className="call-view-btn"
                    style={{ marginLeft: 8, background: '#c81e1e' }}
                    onClick={() => setReportAlarmId(c.id)}
                  >
                    📋 Report
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <IncidentReportModal
          alarmId={reportAlarmId}
          onClose={() => setReportAlarmId(null)}
        />
      )}
    </div>
  );
}
