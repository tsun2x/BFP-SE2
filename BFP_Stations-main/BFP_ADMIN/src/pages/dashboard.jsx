import "../style/dashboard.css";
import { useState, useEffect, useMemo } from "react";
import apiClient from "../utils/apiClient";

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [allIncidents, setAllIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState("");

  useEffect(() => {
    const loadIncidents = (showLoader = false) => {
      if (showLoader) setLoading(true);
      apiClient
        .get("/incidents")
        .then((data) => setAllIncidents(data?.incidents || []))
        .catch(() => setAllIncidents([]))
        .finally(() => setLoading(false));
    };

    const handleIncidentStatusUpdated = () => loadIncidents(false);
    loadIncidents(true);
    window.addEventListener(
      "incident-status-updated",
      handleIncidentStatusUpdated,
    );

    return () => {
      window.removeEventListener(
        "incident-status-updated",
        handleIncidentStatusUpdated,
      );
    };
  }, []);

  // Station list and filtered incidents
  const uniqueStations = useMemo(() => {
    const set = new Set();
    for (const inc of allIncidents) {
      if (inc.station_name) set.add(inc.station_name);
      else if (inc.station_id) set.add(String(inc.station_id));
    }
    return [...set].sort();
  }, [allIncidents]);

  const filteredIncidents = useMemo(() => {
    // Start with station filtering (if selected)
    let items = allIncidents;
    if (selectedStation) {
      items = items.filter((inc) => {
        const sname =
          inc.station_name ||
          (inc.station_id ? String(inc.station_id) : inc.location);
        return sname === selectedStation;
      });
    }

    // Apply reporting period filter
    const now = new Date();
    let start = null;
    let end = null;

    if (selectedPeriod === "day") {
      // Today
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else if (selectedPeriod === "month") {
      // Last 30 days
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (selectedPeriod === "year") {
      // Last 365 days
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    } else if (selectedPeriod === "custom" && dateFrom) {
      start = new Date(dateFrom);
      start.setHours(0, 0, 0, 0);
      if (dateTo) {
        end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
      }
    }

    if (start || end) {
      items = items.filter((inc) => {
        const t =
          inc.call_time || inc.created_at || inc.reported_at || inc.timestamp;
        if (!t) return false;
        const d = new Date(t);
        if (isNaN(d)) return false;
        if (start && end) return d >= start && d <= end;
        if (start) return d >= start;
        return true;
      });
    }

    return items;
  }, [allIncidents, selectedStation, selectedPeriod, dateFrom, dateTo]);

  // Friendly label for the selected reporting period
  const periodLabel = useMemo(() => {
    if (selectedPeriod === "day") return "Today";
    if (selectedPeriod === "month") return "Last 30 days";
    if (selectedPeriod === "year") return "Last 365 days";
    if (selectedPeriod === "custom") {
      if (dateFrom && dateTo) return `${dateFrom} → ${dateTo}`;
      if (dateFrom) return dateFrom;
      return "Custom";
    }
    return "All time";
  }, [selectedPeriod, dateFrom, dateTo]);

  // Calculate statistics (based on filtered incidents)
  const totalIncidents = filteredIncidents.length;
  const pending = filteredIncidents.filter(
    (i) => i.status === "Pending Dispatch",
  ).length;
  const dispatched = filteredIncidents.filter((i) =>
    ["Dispatched", "On Scene", "Under Control"].includes(i.status),
  ).length;
  const resolved = filteredIncidents.filter(
    (i) => i.status === "Resolved",
  ).length;

  // Get location breakdown (based on filtered incidents)
  const locationBreakdown = useMemo(() => {
    const map = new Map();
    for (const inc of filteredIncidents) {
      const key = String(
        inc.location || inc.station_name || "Unknown location",
      ).trim();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredIncidents]);

  const recentIncidents = filteredIncidents.slice(0, 8);

  const statusBadge = (status) => {
    if (status === "Dispatched")
      return <span className="status-badge dispatched">DISPATCHED</span>;
    if (status === "On Scene")
      return <span className="status-badge dispatched">ON SCENE</span>;
    if (status === "Under Control")
      return <span className="status-badge completed">UNDER CONTROL</span>;
    if (status === "Resolved")
      return <span className="status-badge completed">RESOLVED</span>;
    if (status === "Cancelled")
      return <span className="status-badge">CANCELLED</span>;
    return <span className="status-badge">PENDING</span>;
  };

  const timeAgo = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="dashboard-header">
        <h1>Bureau of Fire Protection Dashboard</h1>
        <p>
          Zamboanga City Fire District - Operational Statistics and Incident
          Monitoring
        </p>
      </div>

      {/* Period Selector */}
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

      {/* Station Filter */}
      <div className="station-filter" style={{ margin: "12px 0" }}>
        <label className="period-label" style={{ marginRight: 8 }}>
          Station:
        </label>
        <select
          value={selectedStation}
          onChange={(e) => setSelectedStation(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            fontSize: "14px",
          }}
        >
          <option value="">All Stations</option>
          {uniqueStations.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* TOP STATS ROW */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-header">
            <h3>Total Incidents</h3>
            <div className="stat-icon calls">
              <i className="fa-solid fa-phone-volume"></i>
            </div>
          </div>
          <div className="stat-value">{loading ? "…" : totalIncidents}</div>
          <div className="stat-period">{periodLabel}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Pending</h3>
            <div className="stat-icon fire">
              <i className="fa-solid fa-hourglass-half"></i>
            </div>
          </div>
          <div className="stat-value">{loading ? "…" : pending}</div>
          <div className="stat-period">Awaiting dispatch</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Active Dispatches</h3>
            <div className="stat-icon dispatched">
              <i className="fa-solid fa-truck"></i>
            </div>
          </div>
          <div className="stat-value">{loading ? "…" : dispatched}</div>
          <div className="stat-period">Dispatched / On scene</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Resolved</h3>
            <div className="stat-icon resolved">
              <i className="fa-solid fa-check"></i>
            </div>
          </div>
          <div className="stat-value">{loading ? "…" : resolved}</div>
          <div className="stat-period">Completed incidents</div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="main-grid">
        {/* LEFT - LOCATION ANALYSIS */}
        <div className="analysis-section">
          <div className="section-card">
            <h3>Top Incident Locations</h3>
            {locationBreakdown.length === 0 ? (
              <div style={{ color: "var(--muted)", padding: "12px 0" }}>
                No location data available.
              </div>
            ) : (
              <div className="incidents-list">
                {locationBreakdown.map((item) => (
                  <div
                    key={item.location}
                    className="incident-item low-priority"
                    style={{ cursor: "default" }}
                  >
                    <div className="incident-content">
                      <h4>{item.location}</h4>
                      <p className="incident-location">
                        <i className="fa-solid fa-location-dot"></i>&nbsp;
                        Incident count: {item.count}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT - RECENT INCIDENTS */}
        <div className="incidents-section">
          <div className="section-card">
            <div className="section-header">
              <h3>Recent Incident Reports</h3>
            </div>

            <div
              className="incidents-list"
              style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 12 }}
            >
              {loading ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "var(--muted)",
                  }}
                >
                  Loading incidents…
                </div>
              ) : recentIncidents.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "var(--muted)",
                  }}
                >
                  No incidents found
                </div>
              ) : (
                recentIncidents.map((inc) => (
                  <div
                    key={inc.alarm_id}
                    className="incident-item medium-priority"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedIncident(inc)}
                    title="Click to view full report details"
                  >
                    <div className="incident-content">
                      <div className="incident-header">
                        <span className="incident-id">ALM-{inc.alarm_id}</span>
                      </div>
                      <h4>
                        {inc.incident_type ||
                          inc.initial_alarm_level ||
                          "Emergency Alarm"}
                      </h4>
                      <p className="incident-location">
                        <i className="fa-solid fa-location-dot"></i>&nbsp;
                        {inc.location || "Unknown location"}
                      </p>
                      <div className="incident-meta">
                        <span className="reporter">
                          {inc.full_name || "Unknown caller"}
                        </span>
                        <span className="time">{timeAgo(inc.call_time)}</span>
                      </div>
                    </div>
                    <div className="incident-actions">
                      {statusBadge(inc.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      {/* INCIDENT DETAIL MODAL */}
      {selectedIncident && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: 16,
          }}
          onClick={() => setSelectedIncident(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              width: "min(720px, 100%)",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>
              Incident Report ALM-{selectedIncident.alarm_id}
            </h3>
            <p>
              <strong>Caller:</strong> {selectedIncident.full_name || "Unknown"}
            </p>
            <p>
              <strong>Phone:</strong> {selectedIncident.phone_number || "N/A"}
            </p>
            <p>
              <strong>Location:</strong>{" "}
              {selectedIncident.location || "Unknown"}
            </p>
            <p>
              <strong>Incident Type:</strong>{" "}
              {selectedIncident.incident_type || "N/A"}
            </p>
            <p>
              <strong>Alarm Level:</strong>{" "}
              {selectedIncident.current_alarm_level ||
                selectedIncident.initial_alarm_level ||
                "N/A"}
            </p>
            <p>
              <strong>Status:</strong> {selectedIncident.status || "N/A"}
            </p>
            <p>
              <strong>Call Time:</strong>{" "}
              {selectedIncident.call_time
                ? new Date(selectedIncident.call_time).toLocaleString()
                : "N/A"}
            </p>
            <p>
              <strong>Dispatch Time:</strong>{" "}
              {selectedIncident.dispatch_time
                ? new Date(selectedIncident.dispatch_time).toLocaleString()
                : "N/A"}
            </p>
            <p>
              <strong>Resolved Time:</strong>{" "}
              {selectedIncident.resolve_time
                ? new Date(selectedIncident.resolve_time).toLocaleString()
                : "N/A"}
            </p>
            <p>
              <strong>Narrative:</strong>{" "}
              {selectedIncident.narrative || "No narrative"}
            </p>

            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                className="load-more-btn"
                onClick={() => setSelectedIncident(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
