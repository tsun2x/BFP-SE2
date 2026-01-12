import React, { useEffect, useContext, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { io } from 'socket.io-client';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider, CallContext } from './context/CallContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { ToastContainer, useToast } from "./components/Toast";
import { getMockIncidentByIndex } from './data/mockIncidents';

import Login from "./pages/login";
import Signup from "./pages/signup";

import Sidebar from "./components/sidenavbar";
import Topnavbar from "./components/topnavbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/dashboard";
import EmergencyCallHistory from "./pages/emergencycallHistory";
import Officers from "./pages/officersLoginHistory";
import IncidentReport from "./pages/IncidentReport";
import StationReadiness from "./pages/stationreadiness";
import Settings from "./pages/Settings";
import TestPage from "./pages/TestPage";

import { StatusProvider } from "./context/StatusContext";
import CallModal from "./components/CallModal";
import IncomingCallModal from "./components/IncomingCallModal";
import "./layout.css";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { incomingCalls, ongoingCalls, addIncomingCall, acceptCall, endCall } = useContext(CallContext);
  const { addNotification } = useNotifications();
  const { toasts, success, info } = useToast();
  const socketRef = useRef(null);
  const { user } = useAuth();
  const [voiceConsoleOpen, setVoiceConsoleOpen] = React.useState(false);
  const [voiceConsoleMinimized, setVoiceConsoleMinimized] = React.useState(false);
  const voiceCardRef = useRef(null);
  const dragStateRef = useRef({ dragging: false, startX: 0, startY: 0, lastTx: 0, lastTy: 0 });

  // pages without layout
  const noLayoutRoutes = ["/login", "/signup"];

  const hideLayout = noLayoutRoutes.includes(location.pathname);

  // Trigger mock incident for testing
  const triggerMockIncident = () => {
    const mockIncident = getMockIncidentByIndex(Math.floor(Math.random() * 3));
    try {
      // Add to CallContext so IncidentReport can auto-fill
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

      // Also emit over socket so backend can save/broadcast like a real incident
      if (socketRef.current) {
        socketRef.current.emit('new-incident', {
          alarmId: Date.now(),
          phoneNumber: mockIncident.phoneNumber,
          firstName: mockIncident.firstName,
          lastName: mockIncident.lastName,
          incidentType: mockIncident.incidentType,
          alarmLevel: mockIncident.alarmLevel,
          location: mockIncident.location,
          narrative: mockIncident.narrative,
          coordinates: mockIncident.coordinates,
        });
      }

      navigate('/incident-report');
    } catch (e) {
      console.error('Failed to trigger mock incident:', e);
    }
  };

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

  // Socket: listen for incidents and join station-specific room
  useEffect(() => {
    const socket = io('http://10.80.242.64:5000');
    socketRef.current = socket;

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

    // Broadcast incidents from other stations
    socket.on('new-incident', (data) => {
      try {
        console.log('[Frontend] Received new-incident from socket:', data);

        // Emit back to server to save to database (existing behavior)
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
                lat: Number(data.coordinates.lat ?? data.coordinates.latitude ?? 0),
                lng: Number(data.coordinates.lng ?? data.coordinates.longitude ?? 0),
              }
            : { lat: 14.5995, lng: 120.9842 },
          timestamp: new Date(),
        };

        addIncomingCall(callObj);
        addNotification({
          title: `New Incident  ${data.incidentType || 'Unknown type'}`,
          message: data.location || 'Another station',
          type: 'incident',
          payload: callObj,
        });
        info(
          `New incident from ${data.location || 'another station'} (${data.incidentType || 'Unknown type'})`,
          undefined,
          { sticky: true, actionLabel: 'View Incident', onAction: () => navigate('/incident-report') }
        );
      } catch (e) {
        console.warn('Failed to process incoming incident', e);
      }
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
              lat: Number(data.coordinates.lat ?? data.coordinates.latitude ?? 0),
              lng: Number(data.coordinates.lng ?? data.coordinates.longitude ?? 0),
            }
          : { lat: 14.5995, lng: 120.9842 },
        timestamp: new Date(),
      };

      addIncomingCall(callObj);
      addNotification({
        title: `New Incident  ${data.incidentType || 'Unknown type'}`,
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

    socket.on('disconnect', () => console.log('Socket disconnected'));

    return () => { socket.disconnect(); };
  }, [navigate, addIncomingCall, addNotification, info, user?.assignedStationId, user?.assigned_station_id]);

  const showVoiceConsoleOverlay =
    location.pathname !== '/station-readiness' &&
    voiceConsoleOpen &&
    !voiceConsoleMinimized;

  return (
    <>
      {/* If LOGIN or SIGNUP → show ONLY the page */}
      {hideLayout ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      ) : (
        // Else → show sidebar + topbar + page
        <div className="app-layout">
          <Sidebar />

          <div className="main-container">
            <Topnavbar />

            <main className="content-area">
              {/* Global toast notifications for incidents and system messages */}
              <ToastContainer toasts={toasts} />
              <Routes>
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/emergency-calls" element={<ProtectedRoute><EmergencyCallHistory /></ProtectedRoute>} />
                <Route path="/officers" element={<ProtectedRoute><Officers /></ProtectedRoute>} />
                <Route path="/incident-report" element={<ProtectedRoute><IncidentReport /></ProtectedRoute>} />
                <Route path="/station-readiness" element={<ProtectedRoute><StationReadiness /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/test" element={<ProtectedRoute><TestPage /></ProtectedRoute>} />
              </Routes>
            </main>
          </div>

          {/* Dev-only: Mock Incident Trigger Button */}
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

          {/* Fixed Ongoing Calls Horizontal Stack */}
          <div className="fixed-call-stack-horizontal">
            {ongoingCalls.map((call) => (
              <CallModal
                key={call.id}
                callData={{
                  ...call,
                  date: call.startTime ? new Date(call.startTime).toLocaleDateString() : "",
                  time: call.startTime ? new Date(call.startTime).toLocaleTimeString() : "",
                }}
                onClose={() => endCall(call.id)}
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

          {/* Incoming Calls Modal */}
          {incomingCalls.map((call) => (
            <IncomingCallModal
              key={call.id}
              callNumber={call.phoneNumber || call.number || "Unknown"}
              onAccept={() => {
                acceptCall(call.id);
                // After accepting, navigate to Incident Report and open the global voice console overlay
                setVoiceConsoleOpen(true);
                navigate('/incident-report');
              }}
            />
          ))}

          {/* Global Voice Console Overlay (iframe keeps running even when hidden) */}
          {showVoiceConsoleOverlay && (
            <div className="voice-console-overlay">
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
                    src={`${import.meta.env.VITE_PHP_BACKEND_URL || "http://127.0.0.1/SE_BFP"}/station_client.html?stationId=${import.meta.env.VITE_STATION_ID || "103"}`}
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
    <StatusProvider>
      <AuthProvider>
        <CallProvider>
          <NotificationProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </NotificationProvider>
        </CallProvider>
      </AuthProvider>
    </StatusProvider>
  );
}
