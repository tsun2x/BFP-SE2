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

      const data = await apiClient.get('/stations-readiness-overview');
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

  /* ========================= */
  /* SUMMARY CALCULATIONS      */
  /* ========================= */
  const totalStations = stations.length;
  const readyCount = stations.filter(
    (s) => s.readinessStatus === "READY"
  ).length;
  const notReadyCount = stations.filter(
    (s) => s.readinessStatus === "NOT_READY"
  ).length;
  const partialCount = stations.filter(
    (s) => s.readinessStatus === "PARTIALLY_READY"
  ).length;
  const unknownCount = stations.filter(
    (s) =>
      !s.readinessStatus || s.readinessStatus === "UNKNOWN"
  ).length;

  return (
    <div className="status-page">
      {/* HEADER */}
      <div className="page-header">
        <h1 className="page-title">Station Status Overview</h1>
        <p className="page-subtitle">
          City Command Monitoring Panel
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="error-box">
          {error}
          <button onClick={fetchStationsReadiness}>
            Retry
          </button>
        </div>
      )}

      {/* SUMMARY DASHBOARD */}
      {!loading && stations.length > 0 && (
        <div className="summary-grid">
          <div className="summary-card">
            <div className="card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </div>
            <div className="card-content">
              <h3>{totalStations}</h3>
              <p>Total Stations</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div className="card-content">
              <h3>{readyCount}</h3>
              <p>Ready</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
            </div>
            <div className="card-content">
              <h3>{partialCount}</h3>
              <p>Partially Ready</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
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

      {/* STATES */}
      {loading ? (
        <div className="state-message">
          Loading station readiness data...
        </div>
      ) : stations.length === 0 ? (
        <div className="state-message">
          No stations available
        </div>
      ) : (
        <div className="stations-grid">
          {stations.map((station) => {
            const status =
              station.readinessStatus || "UNKNOWN";
            const readinessPercentage =
              station.readinessPercentage || 0;
            const submittedBy =
              station.lastSubmittedBy || "Unknown";
            const submittedAt =
              station.lastReadinessUpdate
                ? new Date(
                    station.lastReadinessUpdate
                  ).toLocaleDateString()
                : "Never";

            return (
              <div
                key={station.stationId}
                className={`station-card ${status.toLowerCase()}`}
              >
                <div className="station-header">
                  <h2>{station.stationName}</h2>
                  <div className="station-type">
                    {station.stationType === "MAIN"
                      ? (
                        <>
                          <span className="main-badge">MAIN</span>
                          <span>Central Fire Station</span>
                        </>
                      )
                      : "Branch Station"}
                  </div>
                </div>

                <div className="station-status">
                  <span
                    className={`status-badge ${status.toLowerCase().replace(/_/g, '_')}`}
                  >
                    {status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="readiness-info">
                  <div className="readiness-top">
                    <span>Readiness</span>
                    <strong>
                      {readinessPercentage}%
                    </strong>
                  </div>

                  <div className="readiness-bar-container">
                    <div
                      className="readiness-bar"
                      style={{
                        width: `${readinessPercentage}%`,
                      }}
                    />
                  </div>

                  <div className="station-meta">
                    <div>
                      Last by: {submittedBy}
                    </div>
                    <div>
                      Date: {submittedAt}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REFRESH BUTTON */}
      <div className="refresh-container">
        <button
          className="refresh-button"
          onClick={fetchStationsReadiness}
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
}
