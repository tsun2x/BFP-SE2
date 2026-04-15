import { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useStatus } from '../context/StatusContext';
import { CallContext } from '../context/CallContext';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import MapContainerComponent from '../components/MapContainer';
import Toast from '../components/Toast';
import apiClient from '../utils/apiClient';
import { PHP_BACKEND_URL } from '../utils/runtimeConfig';
import '../style/incidentreport.css';
import '../style/confirmmodal.css';

const INCIDENT_REPORT_PREVIEW_KEY = 'incidentReportPreview';

function buildIncidentPreviewKey(alarmId) {
  const numericAlarmId = Number(alarmId || 0) || null;
  return numericAlarmId
    ? `${INCIDENT_REPORT_PREVIEW_KEY}:${numericAlarmId}`
    : INCIDENT_REPORT_PREVIEW_KEY;
}

function splitFullName(fullName) {
  const normalized = String(fullName || '').trim();
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const parts = normalized.split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

function parseTimelineDetails(details) {
  const text = String(details || '');
  const incidentType = text.match(/Incident:\s*([^|]+)/i)?.[1]?.trim() || '';
  const reportLocation = text.match(/Location:\s*([^|]+)/i)?.[1]?.trim() || '';
  const narrative = text.match(/Narrative:\s*(.+)$/i)?.[1]?.trim() || '';

  return {
    incidentType,
    location: reportLocation,
    narrative,
  };
}

function parseCoordinateValue(...candidates) {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') {
      continue;
    }

    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
}

function resolveCoordinates(payload) {
  const coords = payload?.coordinates || {};
  const lat = parseCoordinateValue(
    coords.lat,
    coords.latitude,
    coords.user_latitude,
    payload?.latitude,
    payload?.user_latitude,
  );
  const lng = parseCoordinateValue(
    coords.lng,
    coords.longitude,
    coords.user_longitude,
    payload?.longitude,
    payload?.user_longitude,
  );

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
}

export default function IncidentReport() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    location: '',
    incidentType: '',
    alarmLevel: '',
    narrative: '',
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [userEditedPhone, setUserEditedPhone] = useState(false);
  const [showVoiceConsole, setShowVoiceConsole] = useState(false);

  const location = useLocation();

  // Use status context
  const { updateAlarmLevel } = useStatus();

  // Use call context to get incoming call data
  const { currentIncomingCall } = useContext(CallContext);

  // Use auth context (optional - for tracking which admin created incident)
  const { user } = useAuth();

  const applyPreviewToForm = (preview) => {
    if (!preview) return;

    setFormData((prev) => ({
      ...prev,
      firstName: preview.firstName || '',
      lastName: preview.lastName || '',
      phoneNumber: userEditedPhone ? prev.phoneNumber : preview.phoneNumber || preview.number || '',
      location: preview.location || '',
      incidentType: preview.incidentType || '',
      narrative: preview.narrative || '',
      alarmLevel: preview.alarmLevel || '',
    }));

    const resolvedCoordinates = resolveCoordinates(preview);
    if (resolvedCoordinates) {
      setSelectedLocation(resolvedCoordinates);
    }
  };

  const loadIncidentPreviewByAlarmId = async (alarmId) => {
    const numericAlarmId = Number(alarmId || 0) || null;
    if (!numericAlarmId) return;

    try {
      const data = await apiClient.get(`/incidents/${numericAlarmId}/report-data`);
      const alarm = data?.alarm || {};
      const report = data?.report || {};
      const initialDetails = parseTimelineDetails(data?.timeline?.[0]?.details);
      const callerName = splitFullName(alarm.caller_full_name);

      applyPreviewToForm({
        alarmId: numericAlarmId,
        firstName: callerName.firstName,
        lastName: callerName.lastName,
        phoneNumber: alarm.caller_phone || '',
        location: report.location || initialDetails.location || '',
        incidentType: report.incident_type || initialDetails.incidentType || '',
        narrative: report.narrative || initialDetails.narrative || '',
        alarmLevel:
          alarm.current_alarm_level || alarm.initial_alarm_level || report.alarm_level || '',
        coordinates: {
          latitude: alarm.user_latitude,
          longitude: alarm.user_longitude,
        },
      });
    } catch (error) {
      console.warn('[IncidentReport] Failed to load report data by alarm id:', error);
    }
  };

  // Auto-fill form when incoming call is received
  useEffect(() => {
    if (currentIncomingCall) {
      setFormData((prev) => ({
        ...prev,
        firstName: currentIncomingCall.firstName || '',
        lastName: currentIncomingCall.lastName || '',
        phoneNumber: userEditedPhone
          ? prev.phoneNumber
          : currentIncomingCall.phoneNumber || currentIncomingCall.number || '',
        location: currentIncomingCall.location || '',
        incidentType: currentIncomingCall.incidentType || '',
        narrative: currentIncomingCall.narrative || '',
        alarmLevel: currentIncomingCall.alarmLevel || '',
      }));

      const resolvedCoordinates = resolveCoordinates(currentIncomingCall);
      if (resolvedCoordinates) {
        setSelectedLocation(resolvedCoordinates);
      }
    }
  }, [currentIncomingCall, userEditedPhone]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('notification') !== '1') {
      return;
    }

    try {
      const routePreview = location.state?.incidentPreview || null;
      const routeAlarmId = routePreview?.alarmId || routePreview?.id || location.state?.alarmId;
      const scopedPreviewKey = buildIncidentPreviewKey(routeAlarmId);
      const hasRouteAlarmId = Boolean(Number(routeAlarmId || 0));
      const storedPreview =
        sessionStorage.getItem(scopedPreviewKey) ||
        localStorage.getItem(scopedPreviewKey) ||
        (!hasRouteAlarmId
          ? sessionStorage.getItem(INCIDENT_REPORT_PREVIEW_KEY) ||
            localStorage.getItem(INCIDENT_REPORT_PREVIEW_KEY)
          : null);
      if (!storedPreview) {
        if (routePreview) {
          applyPreviewToForm(routePreview);
          loadIncidentPreviewByAlarmId(routePreview.alarmId || routePreview.id);
        } else if (location.state?.alarmId) {
          loadIncidentPreviewByAlarmId(location.state.alarmId);
        }
        return;
      }

      const parsedStoredPreview = JSON.parse(storedPreview);
      const storedAlarmId = Number(parsedStoredPreview?.alarmId || parsedStoredPreview?.id || 0);
      const routeAlarmIdNumber = Number(routeAlarmId || 0);
      const canUseStoredPreview =
        !routeAlarmIdNumber || !storedAlarmId || routeAlarmIdNumber === storedAlarmId;
      const preview = routePreview || (canUseStoredPreview ? parsedStoredPreview : null);
      if (!preview) {
        loadIncidentPreviewByAlarmId(routeAlarmId);
        return;
      }
      applyPreviewToForm(preview);
      loadIncidentPreviewByAlarmId(preview.alarmId || preview.id || location.state?.alarmId);
    } catch (error) {
      console.warn('[IncidentReport] Failed to load notification preview:', error);
    }
  }, [location.search, location.state, userEditedPhone]);

  // If URL has ?voice=1, auto-open the voice console once
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('voice') === '1') {
      window.dispatchEvent(new Event('open-voice-console'));
    }
  }, [location.search]);

  useEffect(() => {
    const handleIncidentStatusUpdated = (event) => {
      const eventAlarmId = Number(event?.detail?.alarmId || event?.detail?.id || 0) || null;
      const routePreview = location.state?.incidentPreview || null;
      const activeAlarmId =
        Number(
          routePreview?.alarmId ||
            routePreview?.id ||
            location.state?.alarmId ||
            currentIncomingCall?.id ||
            0,
        ) || null;

      if (eventAlarmId && activeAlarmId && eventAlarmId !== activeAlarmId) {
        return;
      }

      loadIncidentPreviewByAlarmId(eventAlarmId || activeAlarmId);
    };

    window.addEventListener('incident-status-updated', handleIncidentStatusUpdated);
    return () => {
      window.removeEventListener('incident-status-updated', handleIncidentStatusUpdated);
    };
  }, [location.state, currentIncomingCall, userEditedPhone]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'phoneNumber') {
      setUserEditedPhone(true);
    }

    // Update status when alarm level changes
    if (name === 'alarmLevel') {
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
      setToastMessage('Phone number and location are required');
      setToastType('error');
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
        longitude: selectedLocation.lng,
      });

      setToastMessage(`Incident created successfully! Alarm ID: ${response.alarmId}`);
      setToastType('success');
      // Keep form and map so station can still see the incident after submission
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error.message || 'Failed to submit incident report';
      setToastMessage(errorMessage);
      setToastType('error');
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
              setFormData((prev) => ({
                ...prev,
                location: `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
              }));
            }}
            locationName={formData.location}
          />
        </div>
        {/* RIGHT — FORM */}
        <div className="incident-form">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title" style={{ marginTop: 0 }}>
              Caller Information
            </h2>
            <button
              type="button"
              className="submit-btn"
              style={{ padding: '8px 14px', fontSize: '12px' }}
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
            <select name="incidentType" value={formData.incidentType} onChange={handleInputChange}>
              <option value="">Select Type</option>
              <option value="Fire">Fire</option>
              <option value="Medical Emergency">Medical Emergency</option>
            </select>
          </div>

          <div className="form-item">
            <label>Alarm Level</label>
            <select name="alarmLevel" value={formData.alarmLevel} onChange={handleInputChange}>
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
            <button className="cancel-btn" disabled={loading}>
              Cancel
            </button>
            <button className="submit-btn" onClick={handleSubmitClick} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>{' '}
        {/* END FORM */}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
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
              {PHP_BACKEND_URL ? (
                <iframe
                  title="Station Voice Console"
                  src={`${PHP_BACKEND_URL}/station_client.html`}
                  className="voice-console-iframe"
                  allow="microphone; autoplay"
                />
              ) : (
                <div style={{ padding: '1rem' }}>
                  Set `VITE_PHP_BACKEND_URL` to enable the legacy station voice console.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
