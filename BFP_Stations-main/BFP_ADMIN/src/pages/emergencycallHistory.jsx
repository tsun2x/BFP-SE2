import { useState, useEffect } from "react";
import IncidentDetailsPanel from "../components/incidentdetailspanel";
import IncidentReportModal from "../components/IncidentReportModal";
import apiClient from "../utils/apiClient";
import "../style/callHistory.css";

const formatStatus = (s) => {
  if (!s) return "Pending";
  const map = {
    pending: "Pending",
    dispatched: "Dispatch On the Way",
    resolved: "Resolved",
    cancelled: "Cancelled",
  };
  return map[s.toLowerCase()] ?? s;
};

export default function EmergencyCallHistory() {
  const [calls, setCalls] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reportAlarmId, setReportAlarmId] = useState(null);

  useEffect(() => {
    apiClient.get("/incidents")
      .then((data) => {
        const mapped = (data.incidents || []).map((a) => {
          const details = a.details || "";
          const typeMatch = details.match(/Incident:\s*([^|]+)/);
          const incidentType = typeMatch ? typeMatch[1].trim() : "—";
          return {
            id: a.alarm_id,
            alarm_id: a.alarm_id,
            caller: a.full_name || "Unknown",
            number: a.phone_number || "—",
            location: "",
            type: incidentType,
            alarm: a.current_alarm_level || "—",
            narrative: "",
            status: formatStatus(a.status),
            timeline: [],
            datetime: a.call_time
              ? new Date(a.call_time).toLocaleString("en-PH")
              : "—",
          };
        });
        setCalls(mapped);
      })
      .catch((err) => {
        console.error("Failed to fetch alarms:", err);
        setFetchError(err.message || "Failed to load call history");
      })
      .finally(() => setLoadingData(false));
  }, []);

  const openPanel = (call) => { setSelected(call); setPanelOpen(true); };
  const closePanel = () => { setPanelOpen(false); setTimeout(() => setSelected(null), 200); };

  const handleStatusChange = (newStatus, updatedIncident) => {
    setCalls((prev) =>
      prev.map((item) =>
        item.id === updatedIncident.id ? { ...item, status: newStatus } : item
      )
    );
  };

  const filteredCalls = calls.filter((c) =>
    c.caller.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="officer-filters">
          <div className="officer-filter-group">
            <label>Date</label>
            <input type="date" className="officer-filter-input" />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="call-table-card">
        {loadingData ? (
          <p style={{ padding: "1rem", textAlign: "center" }}>Loading...</p>
        ) : fetchError ? (
          <p style={{ padding: "1rem", textAlign: "center", color: "#c81e1e" }}>Error: {fetchError}</p>
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
                    <td colSpan={7} style={{ textAlign: "center", padding: "1rem" }}>No records found. Submit an incident via the Incident Report page to see history here.</td>
                </tr>
              ) : filteredCalls.map((c) => (
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
                  <td style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button className="call-view-btn" onClick={() => openPanel(c)}>
                      Details
                    </button>
                    <button
                      className="call-view-btn"
                      style={{ background: "#c81e1e", color: "#fff", borderColor: "#c81e1e" }}
                      onClick={() => setReportAlarmId(c.alarm_id)}
                    >
                      📋 Report
                    </button>
                  </td>
                </tr>
              ))}
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
        <IncidentReportModal
          alarmId={reportAlarmId}
          onClose={() => setReportAlarmId(null)}
        />
      )}
    </div>
  );
}
