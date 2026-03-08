import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "../style/branchstatus.css";
import apiClient from "../utils/apiClient";

export default function BranchStatus() {
  const { user } = useAuth();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStationsReadiness();
  }, []);

  const fetchStationsReadiness = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get("/stations-readiness-overview");
      const stationsData = Array.isArray(data) ? data : data?.overview || [];

      setStations(stationsData);
      setError("");
    } catch (err) {
      console.error("Error fetching stations readiness:", err);
      setError(err.message || "Failed to load station data");
    } finally {
      setLoading(false);
    }
  };

  const totalStations = stations.length;
  const readyCount = stations.filter((s) => s.readinessStatus === "READY").length;
  const notReadyCount = stations.filter((s) => s.readinessStatus === "NOT_READY").length;
  const partialCount = stations.filter((s) => s.readinessStatus === "PARTIALLY_READY").length;
  const unknownCount = stations.filter((s) => !s.readinessStatus || s.readinessStatus === "UNKNOWN").length;

  return (
    <div className="status-page">
      <div className="page-header">
        <h1 className="page-title">Station Status Overview</h1>
        <p className="page-subtitle">Branch Monitoring Panel</p>
      </div>

      {error && (
        <div className="error-box">
          {error}
          <button onClick={fetchStationsReadiness}>Retry</button>
        </div>
      )}

      {!loading && stations.length > 0 && (
        <div className="summary-grid">
          <div className="summary-card">
            <div className="card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="9"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </div>
            <div className="card-content">
              <h3>{totalStations}</h3>
              <p>Total Stations</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="card-content">
              <h3>{readyCount}</h3>
              <p>Ready</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div className="card-content">
              <h3>{partialCount}</h3>
              <p>Partially Ready</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <div className="card-content">
              <h3>{notReadyCount}</h3>
              <p>Not Ready</p>
            </div>
          </div>
        </div>
      )}

      <hr className="summary-divider" />

      {loading ? (
        <div className="state-message">Loading station readiness data...</div>
      ) : stations.length === 0 ? (
        <div className="state-message">No stations available</div>
      ) : (
        <div className="stations-grid">
          {stations.map((station) => {
            const status = station.readinessStatus || "UNKNOWN";
            const readinessPercentage = station.readinessPercentage || 0;
            const submittedBy = station.lastSubmittedBy || "Unknown";
            const submittedAt = station.lastReadinessUpdate
              ? new Date(station.lastReadinessUpdate).toLocaleDateString()
              : "Never";

            return (
              <div key={station.stationId} className={`station-card ${status.toLowerCase()}`}>
                <div className="station-header">
                  <h2>{station.stationName}</h2>
                  <small>{station.stationType === "MAIN" ? "Main Station" : "Branch Station"}</small>
                </div>

                <div className="station-status">
                  <span className={`status-badge ${status.toLowerCase().replace(/_/g, "_")}`}>
                    {status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="readiness-info">
                  <div className="readiness-top">
                    <span>Readiness</span>
                    <strong>{readinessPercentage}%</strong>
                  </div>

                  <div className="readiness-bar-container">
                    <div className="readiness-bar" style={{ width: `${readinessPercentage}%` }} />
                  </div>

                  <div className="station-meta">
                    <div>Last by: {submittedBy}</div>
                    <div>Date: {submittedAt}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="refresh-container">
        <button className="refresh-button" onClick={fetchStationsReadiness}>
          Refresh Data
        </button>
      </div>
    </div>
  );
}
