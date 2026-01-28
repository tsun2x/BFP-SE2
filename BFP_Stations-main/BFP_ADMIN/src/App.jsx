import React, { useState, useEffect } from "react";
import { io } from 'socket.io-client';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";

import Login from "./pages/login";
import Signup from "./pages/signup";

import Sidebar from "./components/sidenavbar";
import Topnavbar from "./components/topnavbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/dashboard";
import Reports from "./pages/reports";
import EmergencyCallHistory from "./pages/emergencycallHistory";
import Officers from "./pages/officersLoginHistory";
import IncidentReport from "./pages/IncidentReport";
import BranchStatus from "./pages/branchstatus";
import StationReadiness from "./pages/stationreadiness";
import ContentManagement from "./pages/ContentManagement";
import Settings from "./pages/Settings";
import TestPage from "./pages/TestPage";

import { StatusProvider } from "./context/StatusContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CallProvider, CallContext } from "./context/CallContext";
import { NotificationProvider, useNotifications } from "./context/NotificationContext";
import { ToastContainer, useToast } from "./components/Toast";

import CallModal from "./components/CallModal";
import IncomingCallModal from "./components/IncomingCallModal";
import { getMockIncidentByIndex } from "./data/mockIncidents";
import "./layout.css";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addIncomingCall } = React.useContext(CallContext);
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { toasts, success, info } = useToast();

  // pages without layout
  const noLayoutRoutes = ["/login", "/signup"];

  const hideLayout = noLayoutRoutes.includes(location.pathname);

  // ==== Call states ====
  const [ongoingCalls, setOngoingCalls] = useState([]);
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [voiceConsoleOpen, setVoiceConsoleOpen] = useState(false);
  const [voiceConsoleMinimized, setVoiceConsoleMinimized] = useState(false);
  const voiceCardRef = React.useRef(null);
  const dragStateRef = React.useRef({ dragging: false, startX: 0, startY: 0, lastTx: 0, lastTy: 0 });

  // Allow any page to open/close the global voice console via window events
  useEffect(() => {
    const openHandler = () => {
      setVoiceConsoleOpen(true);
      setVoiceConsoleMinimized(false);
    };
    const closeHandler = () => setVoiceConsoleOpen(false);
    window.addEventListener('open-voice-console', openHandler);
    window.addEventListener('close-voice-console', closeHandler);
    return () => {
      window.removeEventListener('open-voice-console', openHandler);
      window.removeEventListener('close-voice-console', closeHandler);
    };
  }, []);

  // Drag handling for the voice console card so it can be moved around the screen
  useEffect(() => {
    const handleMouseMove = (e) => {
      const state = dragStateRef.current;
      const card = voiceCardRef.current;
      if (!state.dragging || !card) return;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const tx = state.lastTx + dx;
      const ty = state.lastTy + dy;
      card.style.transform = `translate(${tx}px, ${ty}px)`;
    };

    const handleMouseUp = (e) => {
      const state = dragStateRef.current;
      if (!state.dragging) return;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      state.dragging = false;
      state.lastTx += dx;
      state.lastTy += dy;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleVoiceHeaderMouseDown = (e) => {
    e.preventDefault();
    const state = dragStateRef.current;
    state.dragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
  };

  const triggerIncomingCall = (callerData) => {
    // Create full call object with caller information
    const callObj = {
      id: Date.now(),
      number: callerData.phoneNumber || callerData.number || "Unknown",
      firstName: callerData.firstName || "",
      lastName: callerData.lastName || "",
      phoneNumber: callerData.phoneNumber || callerData.number || "",
      location: callerData.location || "",
      coordinates: callerData.coordinates || { lat: 14.5995, lng: 120.9842 },
      timestamp: new Date()
    };

    // Add to global call context
    addIncomingCall(callObj);

    // Also add to local state for backwards compatibility
    setIncomingCalls([...incomingCalls, callObj]);

    // Navigate to incident report so admin can handle the call
    navigate("/incident-report");
  };

  // Dev: trigger a mock incident like Substation_admin does
  const triggerMockIncident = () => {
    const mockIncident = getMockIncidentByIndex(Math.floor(Math.random() * 3));
    try {
      addIncomingCall(mockIncident);
      addNotification({
        title: `New Incident – ${mockIncident.incidentType}`,
        message: mockIncident.location || "Unknown location",
        type: "incident",
        payload: mockIncident,
      });
      success(
        `New incident: ${mockIncident.incidentType || "Unknown"} at ${mockIncident.location || "Unknown location"}`
      );
      navigate('/incident-report');
    } catch (e) {
      console.error('Failed to trigger mock incident:', e);
    }
  };

  // Socket: listen for incidents and join station-specific room
  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      console.log('Connected to socket server', socket.id);

      const envStation = Number(import.meta.env.VITE_STATION_ID || 0) || null;
      const stationId =
        envStation ||
        user?.assignedStationId ||
        user?.assigned_station_id ||
        user?.stationInfo?.station_id ||
        null;

      if (stationId) {
        socket.emit('join-station', { stationId });
      }
    });

    // Existing broadcasted incidents (e.g., from other stations)
    socket.on('new-incident', (data) => {
      console.log('[Frontend] Received new-incident from socket:', data);

      socket.emit('new-incident', data);

      const callObj = {
        id: data.alarmId || Date.now(),
        number: data.phoneNumber || 'Unknown',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phoneNumber: data.phoneNumber || '',
        location: data.location || '',
        incidentType: data.incidentType || '',
        narrative: data.narrative || '',
        alarmLevel: data.alarmLevel || '',
        coordinates: data.coordinates
          ? {
              lat: Number(data.coordinates.lat ?? data.coordinates.latitude),
              lng: Number(data.coordinates.lng ?? data.coordinates.longitude)
            }
          : { lat: 14.5995, lng: 120.9842 },
        timestamp: new Date()
      };

      addIncomingCall(callObj);
      addNotification({
        title: `New Incident – ${data.incidentType || 'Unknown type'}`,
        message: data.location || 'Another station',
        type: 'incident',
        payload: callObj,
      });
      // Sticky toast with action to view incident
      info(
        `New incident: ${data.incidentType || 'Unknown'} at ${data.location || 'unknown location'}`,
        undefined,
        { sticky: true, actionLabel: 'View Incident', onAction: () => navigate('/incident-report') }
      );
    });

    // Incidents dispatched specifically to this station from end-user app
    socket.on('incoming-incident', (data) => {
      console.log('[Frontend] Received incoming-incident for this station:', data);

      const callObj = {
        id: data.alarmId || Date.now(),
        number: data.phoneNumber || 'Unknown',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phoneNumber: data.phoneNumber || '',
        location: data.location || '',
        incidentType: data.incidentType || '',
        narrative: data.narrative || '',
        alarmLevel: data.alarmLevel || '',
        coordinates: data.coordinates
          ? {
              lat: Number(data.coordinates.lat ?? data.coordinates.latitude),
              lng: Number(data.coordinates.lng ?? data.coordinates.longitude)
            }
          : { lat: 14.5995, lng: 120.9842 },
        timestamp: new Date()
      };

      addIncomingCall(callObj);
      setIncomingCalls(prev => [...prev, callObj]);
      addNotification({
        title: `New Incident – ${data.incidentType || 'Unknown type'}`,
        message: data.location || 'From end-user',
        type: 'incident',
        payload: callObj,
      });
      info(
        `New incident from end-user: ${data.incidentType || 'Unknown'} at ${data.location || 'unknown location'}`,
        undefined,
        { sticky: true, actionLabel: 'View Incident', onAction: () => navigate('/incident-report') }
      );
    });

    socket.on('disconnect', () => console.log('Socket disconnected from server'));

    return () => {
      socket.disconnect();
    };
  }, [addIncomingCall, navigate, user?.assignedStationId, user?.assigned_station_id]);

  const acceptCall = (callId) => {
    const call = incomingCalls.find(c => c.id === callId);
    if (!call) return;
    setOngoingCalls([
      ...ongoingCalls,
      {
        ...call,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        status: "Ongoing"
      },
    ]);
    setIncomingCalls(incomingCalls.filter(c => c.id !== callId));

    // After accepting, navigate to Incident Report and open the global voice console overlay
    setVoiceConsoleOpen(true);
    navigate('/incident-report');
  };

  const rejectCall = (callId) => {
    setIncomingCalls(incomingCalls.filter(c => c.id !== callId));
  };

  const endOngoingCall = (callId) => {
    setOngoingCalls(ongoingCalls.filter(c => c.id !== callId));
  };
  // ==================

  const showVoiceConsoleOverlay =
    location.pathname !== '/station-readiness' &&
    voiceConsoleOpen &&
    !voiceConsoleMinimized;

  return (
    <>
      {hideLayout ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      ) : (
        <div className="app-layout">
          <Sidebar />
          <div className="main-container">
            <Topnavbar />

            <main className="content-area">
              {/* Global toast notifications for incidents and system messages */}
              <ToastContainer toasts={toasts} />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/emergency-calls" element={<ProtectedRoute><EmergencyCallHistory /></ProtectedRoute>} />
                <Route path="/officers" element={<ProtectedRoute><Officers /></ProtectedRoute>} />
                <Route path="/incident-report" element={<ProtectedRoute><IncidentReport /></ProtectedRoute>} />
                <Route path="/branch-status" element={<ProtectedRoute><BranchStatus /></ProtectedRoute>} />
                <Route path="/station-readiness" element={<ProtectedRoute><StationReadiness /></ProtectedRoute>} />
                <Route path="/content-management" element={<ProtectedRoute><ContentManagement /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/test" element={<ProtectedRoute><TestPage /></ProtectedRoute>} />
              </Routes>

              {/* Dev-only mock incident trigger (floating button) */}
              {import.meta.env.DEV && (
                <button
                  onClick={triggerMockIncident}
                  style={{
                    position: 'fixed',
                    bottom: '16px',
                    right: '16px',
                    zIndex: 9999,
                    padding: '10px 14px',
                    backgroundColor: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                  }}
                  title="Trigger mock incident for testing"
                >
                  🧪 Mock Incident
                </button>
              )}
            </main>
          </div>

          {/* ==== Fixed Ongoing Calls Horizontal Stack ==== */}
          <div className="fixed-call-stack-horizontal">
            {ongoingCalls.map(call => (
              <CallModal
                key={call.id}
                callData={call}
                onClose={() => endOngoingCall(call.id)}
                topMode
              />
            ))}
            {voiceConsoleOpen && voiceConsoleMinimized && (
              <div
                className="top-card-horizontal"
                onClick={() => setVoiceConsoleMinimized(false)}
                style={{ cursor: 'pointer' }}
              >
                <div className="modal-card-horizontal">
                  <div className="card-info">
                    <p><strong>Voice Console</strong></p>
                    <p>Click to reopen station voice console</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==== Incoming Calls Modal ==== */}
          {incomingCalls.map(call => (
            <IncomingCallModal
              key={call.id}
              callNumber={call.number}
              onAccept={() => acceptCall(call.id)}
              onReject={() => rejectCall(call.id)}
            />
          ))}

          {/* Global Voice Console Overlay (iframe keeps running even when hidden) */}
          {showVoiceConsoleOverlay && (
            <div
              className="voice-console-overlay"
            >
              <div
                className="voice-console-card"
                ref={voiceCardRef}
              >
                <div
                  className="voice-console-header"
                  onMouseDown={handleVoiceHeaderMouseDown}
                >
                  <h3>Station Voice Console</h3>
                  <div>
                    <button
                      type="button"
                      className="voice-console-close"
                      onClick={() => setVoiceConsoleMinimized(true)}
                      style={{ marginRight: '8px' }}
                    >
                      –
                    </button>
                    <button
                      type="button"
                      className="voice-console-close"
                      onClick={() => setVoiceConsoleOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="voice-console-body">
                  <iframe
                    title="Station Voice Console"
                    src={`${import.meta.env.VITE_PHP_BACKEND_URL || "http://127.0.0.1/SE_BFP"}/station_client.html?stationId=${import.meta.env.VITE_STATION_ID || "101"}`}
                    className="voice-console-iframe"
                    allow="microphone; autoplay"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <StatusProvider>
          <NotificationProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </NotificationProvider>
        </StatusProvider>
      </CallProvider>
    </AuthProvider>
  );
}
