import React, { useEffect, useContext, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
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
import ReportSub from "./pages/ReportSub";
import StationReadiness from "./pages/stationreadiness";
import Settings from "./pages/Settings";
import TestPage from "./pages/TestPage";

import { StatusProvider } from "./context/StatusContext";
import CallModal from "./components/CallModal";
import useTwilioVoice from "./hooks/useTwilioVoice";
import "./layout.css";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { incomingCalls, ongoingCalls, addIncomingCall, acceptCall, rejectCall, endCall } = useContext(CallContext);
  const { addNotification } = useNotifications();
  const { toasts, success, info } = useToast();
  const socketRef = useRef(null);
  const { user } = useAuth();
  const [voiceConsoleOpen, setVoiceConsoleOpen] = React.useState(false);
  const [voiceConsoleMinimized, setVoiceConsoleMinimized] = React.useState(false);
  const voiceCardRef = useRef(null);
  const dragStateRef = useRef({ dragging: false, startX: 0, startY: 0, lastTx: 0, lastTy: 0 });

  // Derive stationId once so socket useEffect only re-runs when it actually changes
  const stationId =
    Number(import.meta.env.VITE_STATION_ID || 0) ||
    user?.assignedStationId ||
    user?.assigned_station_id ||
    null;

  // ==== Twilio Voice SDK ====
  const twilioIdentity = user
    ? `ADM_SUB_${user.assigned_station_id || user.assignedStationId || 0}`
    : null;
  const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const {
    incomingCall: twilioIncomingCall,
    activeCall: twilioActiveCall,
    status: twilioStatus,
    acceptIncoming: twilioAcceptIncoming,
    rejectIncoming: twilioRejectIncoming,
    hangUp: twilioHangUp,
    error: twilioError,
  } = useTwilioVoice(twilioIdentity, jwtToken, {
    onIncomingCall: (call) => {
      console.log('[Twilio] Incoming call received in Substation:', call.parameters?.From);
    },
    onCallDisconnected: () => {
      console.log('[Twilio] Call disconnected');
    },
  });

  React.useEffect(() => {
    console.log(`[Twilio] Status: ${twilioStatus}, Identity: ${twilioIdentity}, Error: ${twilioError || 'none'}`);
  }, [twilioStatus, twilioIdentity, twilioError]);

  // pages without layout
  const noLayoutRoutes = ["/login", "/signup"];

  const hideLayout = noLayoutRoutes.includes(location.pathname);

  useEffect(() => {
    const handler = (e) => {
      // When navigating via browser back/forward, React state may be restored from bfcache.
      // Enforce auth based on token presence to prevent viewing protected pages after logout.
      const token = localStorage.getItem('authToken');
      const isPublic = noLayoutRoutes.includes(window.location.pathname);
      if (!token && !isPublic) {
        window.location.replace('/login');
      }
    };
    window.addEventListener('pageshow', handler);
    return () => window.removeEventListener('pageshow', handler);
  }, []);

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

  // Stable refs for socket callbacks — prevents socket useEffect from re-running on every render
  const addIncomingCallRef = useRef(addIncomingCall);
  const addNotificationRef = useRef(addNotification);
  const infoRef = useRef(info);
  const navigateRef = useRef(navigate);
  const rejectCallRef = useRef(rejectCall);
  const twilioRejectRef = useRef(twilioRejectIncoming);
  const twilioIncomingRef = useRef(twilioIncomingCall);
  useEffect(() => { addIncomingCallRef.current = addIncomingCall; }, [addIncomingCall]);
  useEffect(() => { addNotificationRef.current = addNotification; }, [addNotification]);
  useEffect(() => { infoRef.current = info; }, [info]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { rejectCallRef.current = rejectCall; }, [rejectCall]);
  useEffect(() => { twilioRejectRef.current = twilioRejectIncoming; }, [twilioRejectIncoming]);
  useEffect(() => { twilioIncomingRef.current = twilioIncomingCall; }, [twilioIncomingCall]);

  // Socket: listen for incidents and join station-specific room
  // Only reconnects when stationId actually changes
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server', socket.id);
      if (stationId) {
        socket.emit('join-station', { stationId });
        socket.emit('station-online', { stationId });
        console.log('[Socket] Emitted station-online for station', stationId);
      }
    });

    const buildCallObj = (data) => ({
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
    });

    // Broadcast incidents from other stations — notification only, no modal pop-up
    socket.on('new-incident', (data) => {
      try {
        console.log('[Frontend] Received new-incident broadcast:', data);
        addNotificationRef.current({
          title: `New Incident  ${data.incidentType || 'Unknown type'}`,
          message: data.location || 'Another station',
          type: 'incident',
        });
        infoRef.current(
          `New incident from ${data.location || 'another station'} (${data.incidentType || 'Unknown type'})`,
          undefined,
          { sticky: false }
        );
      } catch (e) {
        console.warn('Failed to process incoming incident', e);
      }
    });

    // Incidents dispatched specifically to this station from end-user app
    socket.on('incoming-incident', (data) => {
      // Ignore if this incident is for a different station
      if (stationId && data?.assignedStationId && Number(data.assignedStationId) !== Number(stationId)) {
        return;
      }

      console.log('[Frontend] Received incoming-incident for this station:', data);
      // ACK handshake: tell backend we received the incident so failover timer starts
      socket.emit('incident-received', { alarmId: data.alarmId });
      const callObj = buildCallObj(data);
      addIncomingCallRef.current(callObj);
      addNotificationRef.current({
        title: `New Incident  ${data.incidentType || 'Unknown type'}`,
        message: data.location || 'From end-user',
        type: 'incident',
        payload: callObj,
      });
      infoRef.current(
        `New incident from end-user: ${data.incidentType || 'Unknown'} at ${data.location || 'unknown location'}`,
        undefined,
        { sticky: true, actionLabel: 'View Incident', onAction: () => navigateRef.current('/incident-report') }
      );
    });

    // Auto-reject: backend tells this station its 20s is up — dismiss modal & reject Twilio
    socket.on('auto-reject', (data) => {
      const alarmId = data?.alarmId;
      console.log(`[AutoReject] Station ${stationId}: failover timeout, auto-rejecting alarm ${alarmId}`);
      if (alarmId) {
        rejectCallRef.current(alarmId);
      }
      try { if (twilioIncomingRef.current) twilioRejectRef.current(); } catch (e) { console.warn('[AutoReject] Twilio reject error:', e); }
    });

    // Firetruck status/alarm update from driver
    socket.on('truck-status-update', (data) => {
      try {
        console.log('[Frontend] Received truck-status-update:', data);
        const alarmText = data.alarmLevel || '';
        const statusText = data.fireStatus || '';
        const driverText = data.driverName || 'Unknown';
        const truckText = data.truckId ? `Truck #${data.truckId}` : 'Firetruck';

        addNotificationRef.current({
          title: `${truckText} — ${statusText}`,
          message: `${driverText} | Alarm: ${alarmText}`,
          type: 'incident',
        });
        infoRef.current(
          `${truckText} is now "${statusText}" | Alarm: ${alarmText} (${driverText})`,
          undefined,
          { sticky: false }
        );
      } catch (e) { console.error('[truck-status-update] handler error:', e); }
    });

    socket.on('disconnect', () => console.log('Socket disconnected'));

    return () => { socket.disconnect(); };
  }, [stationId]);

  // Re-emit station-online whenever user logs in (socket may already be connected)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user) return;
    if (stationId && socket.connected) {
      socket.emit('join-station', { stationId });
      socket.emit('station-online', { stationId });
      console.log('[Socket] Re-emitted station-online for station', stationId);
    }
  }, [user, stationId]);


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
                <Route path="/substation/reports" element={<ProtectedRoute><ReportSub /></ProtectedRoute>} />
                <Route path="/emergency-calls" element={<ProtectedRoute><EmergencyCallHistory /></ProtectedRoute>} />
                <Route path="/officers" element={<ProtectedRoute><Officers /></ProtectedRoute>} />
                <Route path="/incident-report" element={<ProtectedRoute><IncidentReport /></ProtectedRoute>} />
                <Route path="/branch-status" element={<Navigate to="/station-readiness" replace />} />
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
            {/* Voice console minimized banner removed — Twilio SDK handles voice */}
          </div>

          {/* Incoming Emergency Call Modal */}
          {incomingCalls.length > 0 && (
            <div className="modal-overlay" style={{ zIndex: 10001, background: 'rgba(0,0,0,0.7)' }}>
              <div className="modal-card" style={{ textAlign: 'center', maxWidth: '420px', padding: '32px 28px', borderRadius: '16px', animation: 'pulse 1.5s infinite' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📞</div>
                <h2 style={{ margin: '0 0 8px', color: '#dc3545', fontSize: '1.5em' }}>Incoming Emergency</h2>
                <p style={{ margin: '4px 0', fontSize: '1.1em' }}><strong>Type:</strong> {incomingCalls[0].incidentType || 'Unknown'}</p>
                <p style={{ margin: '4px 0' }}><strong>From:</strong> {incomingCalls[0].phoneNumber || incomingCalls[0].number || 'Unknown'}</p>
                {incomingCalls[0].location && <p style={{ margin: '4px 0' }}><strong>Location:</strong> {incomingCalls[0].location}</p>}
                {incomingCalls[0].alarmLevel && <p style={{ margin: '4px 0' }}><strong>Alarm:</strong> {incomingCalls[0].alarmLevel}</p>}
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button onClick={() => {
                    const call = incomingCalls[0];
                    const token = localStorage.getItem('authToken');
                    console.log('[Accept] Sending accept for alarm', call.id, 'station', stationId, 'token?', !!token);
                    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/incidents/${call.id}/accept`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ stationId }),
                    }).then(r => console.log('[Accept] Response:', r.status)).catch(e => console.warn('[Accept] Failed:', e));
                    acceptCall(call.id);
                    try { if (twilioIncomingCall) twilioAcceptIncoming(); } catch (e) {}
                    navigate('/incident-report');
                  }} style={{ padding: '12px 32px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em', boxShadow: '0 2px 8px rgba(40,167,69,0.4)' }}>Accept</button>
                  <button onClick={() => { rejectCall(incomingCalls[0].id); try { if (twilioIncomingCall) twilioRejectIncoming(); } catch(e){} }} style={{ padding: '12px 32px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em' }}>Dismiss</button>
                </div>
              </div>
            </div>
          )}

          {/* Twilio Active Call Banner */}
          {twilioActiveCall && (
            <div style={{ position: 'fixed', top: '8px', right: '8px', zIndex: 10000, background: '#28a745', color: '#fff', padding: '10px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }}></span>
              <span>On Call — {twilioActiveCall.parameters?.From || 'Emergency'}</span>
              <button onClick={twilioHangUp} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' }}>Hang Up</button>
            </div>
          )}

          {/* Active Incident Banner (socket-based, when no Twilio call active) */}
          {!twilioActiveCall && ongoingCalls.length > 0 && (
            <div style={{ position: 'fixed', top: '8px', right: '8px', zIndex: 10000, background: '#28a745', color: '#fff', padding: '10px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }}></span>
              <span>Active Incident — {ongoingCalls[0].incidentType || 'Emergency'} ({ongoingCalls[0].phoneNumber || 'Unknown'})</span>
              <button onClick={() => endCall(ongoingCalls[0].id)} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' }}>End</button>
            </div>
          )}

          {/* Twilio Status Indicator */}
          {twilioIdentity && (
            <div style={{ position: 'fixed', bottom: '60px', right: '16px', zIndex: 9998, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#666', background: '#f8f9fa', padding: '4px 10px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: twilioStatus === 'ready' ? '#28a745' : twilioStatus === 'busy' ? '#ffc107' : '#dc3545' }}></span>
              Twilio: {twilioStatus} ({twilioIdentity})
            </div>
          )}

          {/* Voice is handled directly by useTwilioVoice hook — no iframe needed */}
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
