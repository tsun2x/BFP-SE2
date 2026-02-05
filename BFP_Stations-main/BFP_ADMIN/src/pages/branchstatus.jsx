import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "../style/branchstatus.css";

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
      const token = localStorage.getItem("authToken");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(`${apiUrl}/stations-readiness-overview`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch station readiness data");
      }

      const data = await response.json();
      // Ensure data is an array - handle both direct array and wrapped response
      const stationsData = Array.isArray(data) ? data : (data?.overview || []);
      setStations(stationsData);
      setError("");
    } catch (err) {
      console.error("Error fetching stations readiness:", err);
      setError(err.message || "Failed to load station data");
    } finally {
      setLoading(false);
    }
  };

  const statusMap = {
    READY: { class: "status-ready", icon: "fa-solid fa-circle-check" },
    NOT_READY: {
      class: "status-notready",
      icon: "fa-solid fa-circle-xmark",
    },
    PARTIALLY_READY: { class: "status-partial", icon: "fa-solid fa-circle-half-stroke" },
    UNKNOWN: { class: "status-unknown", icon: "fa-solid fa-circle-question" },
  };

  return (
    <div className="status-page">
      <h1 className="page-title">Station Status Overview</h1>

      {error && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#fee', 
          color: '#c00', 
          borderRadius: '8px', 
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          {error}
          <button 
            onClick={fetchStationsReadiness}
            style={{ marginLeft: '16px', padding: '8px 16px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', opacity: 0.6 }}>
          Loading station readiness data...
        </div>
      ) : stations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', opacity: 0.6 }}>
          No stations available
        </div>
      ) : (
        <div className="stations-grid">
          {stations.map((station) => {
            const status = station.readinessStatus || "UNKNOWN";
            const readinessPercentage = station.readinessPercentage || 0;
            const submittedBy = station.lastSubmittedBy || "Unknown";
            const submittedAt = station.lastReadinessUpdate ? new Date(station.lastReadinessUpdate).toLocaleDateString() : "Never";

            return (
              <div key={station.stationId} className="station-card">
                <div className="station-header">
                  <h2>{station.stationName}</h2>
                  <small style={{ opacity: 0.7, fontSize: '12px' }}>
                    {station.stationType === 'MAIN' ? 'Main Station' : 'Branch Station'}
                  </small>
                </div>

                <div className="station-status">
                  <i
                    className={`status-icon ${statusMap[status]?.icon} ${statusMap[status]?.class}`}
                  ></i>

                  <span
                    className={`status-text ${statusMap[status]?.class}`}
                  >
                    {status.replace(/_/g, " ")}
                  </span>
                </div>

                <div style={{ marginTop: '12px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Readiness:</span>
                    <strong>{readinessPercentage}%</strong>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    backgroundColor: '#eee', 
                    borderRadius: '4px', 
                    overflow: 'hidden',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      width: `${readinessPercentage}%`,
                      height: '100%',
                      backgroundColor: readinessPercentage === 100 ? '#4caf50' : readinessPercentage >= 50 ? '#ffc107' : '#f44336',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    <div>Last by: {submittedBy}</div>
                    <div>Date: {submittedAt}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button 
          onClick={fetchStationsReadiness}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#2196f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
}
