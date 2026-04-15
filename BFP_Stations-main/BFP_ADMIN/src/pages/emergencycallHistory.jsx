import { useState, useEffect } from "react";
import IncidentDetailsPanel from "../components/incidentdetailspanel";
import IncidentReportModal from "../components/IncidentReportModal";
import apiClient from "../utils/apiClient";
import "../style/callHistory.css";

const formatStatus = (s) => {
  if (!s) return "Pending";
  const map = {
    "Pending Dispatch": "Pending",
    Dispatched: "Dispatch On the Way",
    "On Scene": "Ongoing Response",
    "Under Control": "Fire Under Control",
    Resolved: "Resolved",
    Cancelled: "Cancelled",
  };
  return map[s] ?? s;
};

export default function EmergencyCallHistory() {
  const [calls, setCalls] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("day");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reportAlarmId, setReportAlarmId] = useState(null);

  const mergeEvidenceItem = (incident, evidence) => {
    const existing = incident?.evidenceItems || [];
    const alreadyExists = existing.some((item) => {
      if (evidence.evidenceId && item.evidenceId) {
        return Number(item.evidenceId) === Number(evidence.evidenceId);
      }
      return (
        String(item.previewUrl || "") === String(evidence.previewUrl || "") &&
        String(item.uploadedAt || "") === String(evidence.uploadedAt || "")
      );
    });
    if (alreadyExists) return incident;

    const timeline = (incident?.timeline || []).concat({
      status: "Caller Photo Evidence",
      time: evidence.uploadedAt || new Date().toISOString(),
    });

    return {
      ...incident,
      evidenceItems: [evidence, ...existing],
      timeline,
    };
  };

  useEffect(() => {
    apiClient
      .get("/incidents")
      .then((data) => {
        const mapped = (data.incidents || []).map((a) => {
          return {
            id: a.alarm_id,
            alarm_id: a.alarm_id,
            caller: a.full_name || "Unknown",
            number: a.phone_number || "—",
            location: a.location || "—",
            type: a.incident_type || "—",
            alarm: a.current_alarm_level || "—",
            narrative: a.narrative || "—",
            status: formatStatus(a.status),
            timeline: a.timeline || [],
            evidenceItems: [],
            datetime: a.call_time
              ? new Date(a.call_time).toLocaleString("en-PH")
              : "—",
            callTime: a.call_time || null,
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

  useEffect(() => {
    const handleIncidentStatusUpdated = (event) => {
      const detail = event?.detail || {};
      if (detail.reason !== "evidence-uploaded") return;

      const alarmId = Number(detail.alarmId || 0) || null;
      if (!alarmId) return;

      const evidence = {
        evidenceId: Number(detail.evidenceId || 0) || null,
        previewUrl: detail.previewUrl || detail.mediaUrl || null,
        callerName: detail.callerName || null,
        callerPhoneNumber: detail.callerPhoneNumber || null,
        capturePhase: detail.capturePhase || "in_call",
        uploadedAt: detail.uploadedAt || new Date().toISOString(),
      };

      if (!evidence.previewUrl) return;

      setCalls((prev) =>
        prev.map((item) => {
          if (Number(item.alarm_id || item.id) !== alarmId) return item;
          return mergeEvidenceItem(item, evidence);
        }),
      );

      setSelected((prev) => {
        if (!prev) return prev;
        if (Number(prev.alarm_id || prev.id) !== alarmId) return prev;
        return mergeEvidenceItem(prev, evidence);
      });
    };

    window.addEventListener("incident-status-updated", handleIncidentStatusUpdated);
    return () => {
      window.removeEventListener(
        "incident-status-updated",
        handleIncidentStatusUpdated,
      );
    };
  }, []);

  const openPanel = async (call) => {
    setSelected(call);
    setPanelOpen(true);

    // Fetch evidence items from backend so photos show in details
    try {
      const res = await apiClient.get(`/incidents/${call.alarm_id}/evidence`);
      const items = (res?.data?.items || []).map((item) => ({
        evidenceId: item.evidenceId,
        previewUrl: item.previewUrl,
        callerName: item.caller?.name || call.caller,
        callerPhoneNumber: item.caller?.phoneNumber || call.number,
        capturePhase: item.capturePhase || "in_call",
        uploadedAt: item.uploadedAt,
      }));
      if (items.length > 0) {
        const updated = { ...call, evidenceItems: items };
        setSelected(updated);
        setCalls((prev) =>
          prev.map((c) =>
            c.id === call.id ? { ...c, evidenceItems: items } : c
          )
        );
      }
    } catch (err) {
      console.warn("Failed to fetch evidence for alarm", call.alarm_id, err);
    }
  };
  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setSelected(null), 200);
  };

  const handleStatusChange = async (newStatus, updatedIncident) => {
    try {
      await apiClient.patch(`/incidents/${updatedIncident.alarm_id}/status`, {
        status: newStatus,
      });
    } catch (err) {
      console.error("Failed to update status in DB:", err);
    }
    setCalls((prev) =>
      prev.map((item) =>
        item.id === updatedIncident.id ? { ...item, status: newStatus } : item,
      ),
    );
  };

  const filterByPeriod = (items) => {
    const now = new Date();
    return items.filter((c) => {
      const t = c.callTime ? new Date(c.callTime) : null;
      if (!t || isNaN(t.getTime())) return true;
      if (selectedPeriod === "day")
        return (
          t.getFullYear() === now.getFullYear() &&
          t.getMonth() === now.getMonth() &&
          t.getDate() === now.getDate()
        );
      if (selectedPeriod === "month")
        return (
          t.getFullYear() === now.getFullYear() &&
          t.getMonth() === now.getMonth()
        );
      if (selectedPeriod === "custom") {
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
      c.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status) => {
    const key = status.toLowerCase().replace(/\s/g, "-");
    return (
      {
        pending: "status-yellow",
        "dispatch-on-the-way": "status-blue",
        resolved: "status-green",
        cancelled: "status-red",
      }[key] || "status-default"
    );
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
            placeholder="Search Caller Name, Number, or Type..."
            className="officer-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="officer-filters">
          <select
            className="officer-filter-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Dispatch On the Way">Dispatch On the Way</option>
            <option value="Resolved">Resolved</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* PERIOD FILTER */}
      <div className="period-selector">
        <label className="period-label">Reporting Period:</label>
        <div className="period-buttons">
          <button
            className={`period-btn ${selectedPeriod === "day" ? "active" : ""}`}
            onClick={() => setSelectedPeriod("day")}
          >
            Daily
          </button>
          <button
            className={`period-btn ${selectedPeriod === "month" ? "active" : ""}`}
            onClick={() => setSelectedPeriod("month")}
          >
            Monthly
          </button>
          <button
            className={`period-btn ${selectedPeriod === "year" ? "active" : ""}`}
            onClick={() => setSelectedPeriod("year")}
          >
            Yearly
          </button>
          <button
            className={`period-btn ${selectedPeriod === "custom" ? "active" : ""}`}
            onClick={() => setSelectedPeriod("custom")}
          >
            Date Range
          </button>
          {selectedPeriod === "custom" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginLeft: "8px",
                flexWrap: "wrap",
              }}
            >
              <input
                type="date"
                value={dateFrom}
                max={dateTo || new Date().toISOString().split("T")[0]}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  fontSize: "14px",
                  background: "var(--card-bg, #fff)",
                  color: "var(--text, #111)",
                }}
              />
              <span style={{ color: "var(--muted)", fontSize: "14px" }}>
                to
              </span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  fontSize: "14px",
                  background: "var(--card-bg, #fff)",
                  color: "var(--text, #111)",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="call-table-card">
        {loadingData ? (
          <p style={{ padding: "1rem", textAlign: "center" }}>Loading...</p>
        ) : fetchError ? (
          <p style={{ padding: "1rem", textAlign: "center", color: "#c81e1e" }}>
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
                  <td
                    colSpan={7}
                    style={{ textAlign: "center", padding: "1rem" }}
                  >
                    No records found. Submit an incident via the Incident Report
                    page to see history here.
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
                      <span
                        className={`status-badge ${getStatusBadgeClass(c.status)}`}
                      >
                        <span className="status-dot"></span>
                        {c.status}
                      </span>
                    </td>
                    <td
                      style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                    >
                      <button
                        className="call-view-btn"
                        onClick={() => openPanel(c)}
                      >
                        Details
                      </button>
                      <button
                        className="call-view-btn"
                        style={{
                          background: "#c81e1e",
                          color: "#fff",
                          borderColor: "#c81e1e",
                        }}
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
        <IncidentReportModal
          alarmId={reportAlarmId}
          onClose={() => setReportAlarmId(null)}
        />
      )}
    </div>
  );
}
