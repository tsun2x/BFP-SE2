import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useStatus } from "../context/StatusContext";
import "../style/stationreadiness.css";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";

export default function StationReadiness() {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState({
    firetruck: false,
    scba: false,
    hoses: false,
    radio: false,
    water: false,
    crew: false,
    oic: false,
    driver: false,
    generator: false,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Use status context
  const { updateStationStatus } = useStatus();

  const toggleItem = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // COMPUTE STATUS
  const criticalFail =
    !checklist.firetruck ||
    !checklist.radio ||
    !checklist.driver ||
    !checklist.scba;

  const partiallyReady = Object.values(checklist).includes(false);

  let finalStatus = "READY";
  if (criticalFail) finalStatus = "NOT_READY";
  else if (partiallyReady) finalStatus = "PARTIALLY_READY";

  // Calculate readiness percentage
  const checkedItems = Object.values(checklist).filter(item => item).length;
  const readinessPercentage = Math.round((checkedItems / Object.keys(checklist).length) * 100);

  const openConfirm = () => setModalOpen(true);

  const submitReadiness = async () => {
    setModalOpen(false);
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      if (!token) {
        throw new Error("Not authenticated. Please log in.");
      }

      if (!user?.assignedStationId) {
        throw new Error("Your account is not assigned to a station.");
      }

      const payload = {
        status: finalStatus,
        readinessPercentage,
        equipmentChecklist: checklist
      };

      const response = await fetch(`${apiUrl}/station-readiness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit readiness');
      }

      // Update UI status
      updateStationStatus(finalStatus, readinessPercentage);

      setToastMessage(`Station readiness submitted: ${finalStatus.replace(/_/g, " ")} (${readinessPercentage}%)`);
      setToastType("success");

      console.log("Submitted Station Readiness:", {
        stationId: user.assignedStationId,
        checklist,
        finalStatus,
        readinessPercentage,
        time: new Date(),
      });
    } catch (error) {
      console.error("Error submitting readiness:", error);
      setToastMessage(error.message || "Failed to submit readiness");
      setToastType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="readiness-wrapper">
      <h1 className="readiness-title">BFP Station Readiness</h1>

      <div className="readiness-container">
        {/* Header */}
        <div className="readiness-header">
          <h2>Station: {user?.stationInfo?.station_name || 'Not Assigned'}</h2>
          {user?.stationInfo && (
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
              Submitted by: {user?.name || 'Officer'}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="readiness-content">

          {/* Equipment Checklist */}
          <div className="checklist-section">
            <h3 className="section-title">Equipment Checklist</h3>
            <div className="checklist-items">
              {[
                ["firetruck", "Firetruck Operational"],
                ["scba", "SCBA Sets Complete"],
                ["hoses", "Hoses Functional"],
                ["radio", "Radio Communication Working"],
                ["water", "Water Supply Adequate"],
              ].map(([key, label]) => (
                <label key={key} className="check-row">
                  <input
                    type="checkbox"
                    checked={checklist[key]}
                    onChange={() => toggleItem(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Personnel & Station */}
          <div className="checklist-section">
            <h3 className="section-title">Personnel & Station</h3>
            <div className="checklist-items">
              {[
                ["crew", "Minimum Crew On Duty"],
                ["oic", "Officer-In-Charge Present"],
                ["driver", "Driver Available"],
                ["generator", "Generator Functional"],
              ].map(([key, label]) => (
                <label key={key} className="check-row">
                  <input
                    type="checkbox"
                    checked={checklist[key]}
                    onChange={() => toggleItem(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Section */}
          <div className="status-section">
            <h3>Station Status</h3>
            <div className={`status-meter ${finalStatus.replace(/_/g, "").toLowerCase()}`}>
              <span>{finalStatus.replace(/_/g, " ")}</span>
              <span className="readiness-percent">{readinessPercentage}%</span>
            </div>
            <p className="status-note">Review your checklist before confirming readiness.</p>
            <button className="confirm-button" onClick={openConfirm} disabled={loading}>
              {loading ? "Submitting..." : "Confirm Readiness"}
            </button>
          </div>

        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <ConfirmModal
          title="Submit Readiness?"
          message={`Your station status is "${finalStatus.replace(/_/g, " ")}" with ${readinessPercentage}% readiness. Submit to Headquarters?`}
          onConfirm={submitReadiness}
          onCancel={() => setModalOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage("")}
        />
      )}
    </div>
  );
}
