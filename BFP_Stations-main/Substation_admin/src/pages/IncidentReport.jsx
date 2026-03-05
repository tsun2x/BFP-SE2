import { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import { useStatus } from "../context/StatusContext";
import { CallContext } from "../context/CallContext";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "../components/ConfirmModal";
import MapContainerComponent from "../components/MapContainer";
import Toast from "../components/Toast";
import apiClient from "../utils/apiClient";
import "../style/incidentReport.css";
import "../style/confirmModal.css";

export default function IncidentReport() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    location: "",
    incidentType: "",
    alarmLevel: "",
    narrative: ""
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [userEditedPhone, setUserEditedPhone] = useState(false);
  const [showVoiceConsole, setShowVoiceConsole] = useState(false);

  const location = useLocation();

  // Use status context
  const { updateAlarmLevel } = useStatus();
  
  // Use call context to get incoming call data
  const { currentIncomingCall } = useContext(CallContext);
  
  // Use auth context (optional - for tracking which admin created incident)
  const { user } = useAuth();

  // Auto-fill form when incoming call is received
  useEffect(() => {
    if (currentIncomingCall) {
      setFormData(prev => ({
        ...prev,
        firstName: currentIncomingCall.firstName || "",
        lastName: currentIncomingCall.lastName || "",
        phoneNumber: userEditedPhone
          ? prev.phoneNumber
          : (currentIncomingCall.phoneNumber || currentIncomingCall.number || ""),
        location: currentIncomingCall.location || "",
        incidentType: currentIncomingCall.incidentType || "",
        narrative: currentIncomingCall.narrative || "",
        alarmLevel: currentIncomingCall.alarmLevel || ""
      }));
      
      if (currentIncomingCall.coordinates) {
        setSelectedLocation({
          lat: Number(currentIncomingCall.coordinates.lat ?? currentIncomingCall.coordinates.latitude ?? 0),
          lng: Number(currentIncomingCall.coordinates.lng ?? currentIncomingCall.coordinates.longitude ?? 0)
        });
      }
    }
  }, [currentIncomingCall, userEditedPhone]);

  // If URL has ?voice=1, auto-open the voice console once
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('voice') === '1') {
      window.dispatchEvent(new Event('open-voice-console'));
    }
  }, [location.search]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "phoneNumber") {
      setUserEditedPhone(true);
    }
    
    // Update status when alarm level changes
    if (name === "alarmLevel") {
      updateAlarmLevel(value);
    }
  };

  const handleSubmitClick = () => {
    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    // Submit the incident report
    submitIncidentReport();
    
    // Close modal
    setShowConfirmModal(false);
  };

  const submitIncidentReport = async () => {
    // Validate form
    if (!formData.phoneNumber || !selectedLocation) {
      setToastMessage("Phone number and location are required");
      setToastType("error");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/create-incident', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        location: formData.location,
        incidentType: formData.incidentType,
        alarmLevel: formData.alarmLevel,
        narrative: formData.narrative,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng
      });

      setToastMessage(`Incident created successfully! Alarm ID: ${response.alarmId}`);
      setToastType("success");
      // Keep form and map so station can still see the incident after submission
    } catch (error) {
      console.error("Submit error:", error);
      const errorMessage = error.message || "Failed to submit incident report";
      setToastMessage(errorMessage);
      setToastType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubmit = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className="incident-wrapper">

      <div className="incident-container">

        {/* LEFT — MAP */}
        <div className="incident-map">
          <MapContainerComponent
            selectedLocation={selectedLocation}
            onLocationSelect={(location) => {
              setSelectedLocation(location);
              setFormData(prev => ({
                ...prev,
                location: `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
              }));
            }}
            locationName={formData.location}
          />
        </div>

        {/* RIGHT — FORM */}
        <div className="incident-form">
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="section-title" style={{ marginTop: 0 }}>Caller Information</h2>
            <button
              type="button"
              className="submit-btn"
              style={{ padding: "8px 14px", fontSize: "12px" }}
              onClick={() => window.dispatchEvent(new Event('open-voice-console'))}
            >
              Open Voice Console
            </button>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label>First Name</label>
              <input 
                type="text" 
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter first name" 
              />
            </div>
            <div className="form-item">
              <label>Last Name</label>
              <input 
                type="text" 
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Enter last name" 
              />
            </div>
          </div>

          <div className="form-item">
            <label>Caller Phone Number</label>
            <input 
              type="text" 
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="09xx xxx xxxx" 
            />
          </div>

          <h2 className="section-title">Location</h2>
          <div className="form-item">
            <label>Exact Location</label>
            <input 
              type="text" 
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="House number, street, barangay" 
            />
          </div>

          <h2 className="section-title">Incident Details</h2>

          <div className="form-item">
            <label>Type of Incident</label>
            <select 
              name="incidentType"
              value={formData.incidentType}
              onChange={handleInputChange}
            >
              <option value="">Select Type</option>
              <option value="Fire">Fire</option>
              <option value="Medical Emergency">Medical Emergency</option>
            </select>
          </div>

          <div className="form-item">
            <label>Alarm Level</label>
            <select 
              name="alarmLevel"
              value={formData.alarmLevel}
              onChange={handleInputChange}
            >
              <option value="">Select Alarm Level</option>
              <option value="1st Alarm">1st Alarm</option>
              <option value="2nd Alarm">2nd Alarm</option>
              <option value="3rd Alarm">3rd Alarm</option>
              <option value="4th Alarm">4th Alarm</option>
              <option value="5th Alarm">5th Alarm</option>
              <option value="Task Force Alpha">Task Force Alpha</option>
              <option value="Task Force Bravo">Task Force Bravo</option>
              <option value="Task Force Charlie">Task Force Charlie</option>
              <option value="Task Force Delta">Task Force Delta</option>
              <option value="General Alarm">General Alarm</option>
            </select>
          </div>

          <div className="form-item">
            <label>Narrative Report</label>
            <textarea 
              name="narrative"
              value={formData.narrative}
              onChange={handleInputChange}
              placeholder="Describe the situation..."
            ></textarea>
          </div>

          <div className="form-buttons">
            <button className="cancel-btn" disabled={loading}>Cancel</button>
            <button className="submit-btn" onClick={handleSubmitClick} disabled={loading}>
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </div>

        </div> {/* END FORM */}

      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmModal
          title="Confirm Incident Report"
          message={`Are you sure you want to send this incident report? This will change the station readiness to ${formData.alarmLevel} and notify all responding units.`}
          onConfirm={handleConfirmSubmit}
          onCancel={handleCancelSubmit}
        />
      )}

      {/* Voice Console Floating Modal */}
      {false && showVoiceConsole && (
        <div className="voice-console-overlay">
          <div className="voice-console-card">
            <div className="voice-console-header">
              <h3>Station Voice Console</h3>
              <button
                type="button"
                className="voice-console-close"
                onClick={() => setShowVoiceConsole(false)}
              >
                ×
              </button>
            </div>
            <div className="voice-console-body">
              <iframe
                title="Station Voice Console"
                src={`${import.meta.env.VITE_PHP_BACKEND_URL || "http://127.0.0.1/SE_BFP"}/station_client.html`}
                className="voice-console-iframe"
                allow="microphone; autoplay"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

