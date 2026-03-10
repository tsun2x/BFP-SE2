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
import { getMockIncidentByIndex } from "./data/mockIncidents";
import useTwilioVoice from "./hooks/useTwilioVoice";
import "./layout.css";

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const SOCKET_BASE = API_BASE.replace(/\/api$/, '');

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addIncomingCall, rejectCall: ctxRejectCall } = React.useContext(CallContext);
  const { user, token } = useAuth();
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
  const [pendingTwilioAccept, setPendingTwilioAccept] = useState(false);
  const voiceCardRef = React.useRef(null);
  const dragStateRef = React.useRef({ dragging: false, startX: 0, startY: 0, lastTx: 0, lastTy: 0 });
  const socketRef = React.useRef(null);
  const twilioRejectRef = React.useRef(null);
  const twilioIncomingRef = React.useRef(null);
  const ctxRejectCallRef = React.useRef(ctxRejectCall);
  const notifiedTruckStatusRef = React.useRef(new Set());

  // ==== Twilio Voice SDK ====
  const twilioIdentity = user
    ? (user.role === 'admin' ? 'ADM_MAIN' : `ADM_SUB_${user.assigned_station_id || user.assignedStationId || 0}`)
    : null;

  const {
    incomingCall: twilioIncomingCall,
    activeCall: twilioActiveCall,
    status: twilioStatus,
    acceptIncoming: twilioAcceptIncoming,
    rejectIncoming: twilioRejectIncoming,
    hangUp: twilioHangUp,
    makeCall: twilioMakeCall,
    error: twilioError,
  } = useTwilioVoice(twilioIdentity, token, {
    onIncomingCall: (call) => {
      console.log('[Twilio] Incoming call received in Admin:', call.parameters?.From);
    },
    onCallDisconnected: () => {
      console.log('[Twilio] Call disconnected');
    },
  });

  // Keep refs up to date so socket handlers always have the latest
  React.useEffect(() => { twilioRejectRef.current = twilioRejectIncoming; }, [twilioRejectIncoming]);
  React.useEffect(() => { twilioIncomingRef.current = twilioIncomingCall; }, [twilioIncomingCall]);
  React.useEffect(() => { ctxRejectCallRef.current = ctxRejectCall; }, [ctxRejectCall]);

  // Auto-accept Twilio incoming call if admin already accepted via socket modal
  React.useEffect(() => {
    if (pendingTwilioAccept && twilioIncomingCall) {
      console.log('[AutoAccept] Twilio call arrived after socket accept — auto-accepting');
      twilioAcceptIncoming();
      setPendingTwilioAccept(false);
    }
  }, [pendingTwilioAccept, twilioIncomingCall, twilioAcceptIncoming]);

  // Log Twilio status for debugging
  React.useEffect(() => {
    console.log(`[Twilio] Status: ${twilioStatus}, Identity: ${twilioIdentity}, Error: ${twilioError || 'none'}`);
  }, [twilioStatus, twilioIdentity, twilioError]);

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
    const socket = io(SOCKET_BASE);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server', socket.id);

      // Main admin ONLY joins the main-admin room (not any station-X room)
      // It will receive incoming-incident only after all substations are exhausted
      socket.emit('join-main-admin');
      console.log('[Socket] Main admin joined main-admin room only');
    });

    // Broadcast incidents from other stations — notification only, NO modal
    socket.on('new-incident', (data) => {
      try {
        console.log('[Frontend] Received new-incident broadcast:', data);
        addNotification({
          title: `New Incident – ${data.incidentType || 'Unknown type'}`,
          message: data.location || 'Another station',
          type: 'incident',
        });
        info(
          `New incident from ${data.location || 'another station'} (${data.incidentType || 'Unknown type'})`,
          undefined,
          { sticky: false }
        );
      } catch (e) { console.error('[new-incident] handler error:', e); }
    });

    // Incidents dispatched specifically to this station from end-user app
    socket.on('incoming-incident', (data) => {
      try {
        console.log('[Frontend] Received incoming-incident for main admin:', data);

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

        // ACK handshake: tell backend we received the incident so failover timer starts
        socket.emit('incident-received', { alarmId: data.alarmId });
        addIncomingCall(callObj);
        setIncomingCalls(prev => [...prev, callObj]);
        addNotification({
          title: `Incoming Emergency – ${data.incidentType || 'Unknown type'}`,
          message: data.location || 'From end-user',
          type: 'incident',
          payload: callObj,
        });
        info(
          `Incoming emergency: ${data.incidentType || 'Unknown'} at ${data.location || 'unknown location'}`,
          undefined,
          { sticky: true, actionLabel: 'View Incident', onAction: () => navigate('/incident-report') }
        );
      } catch (e) { console.error('[incoming-incident] handler error:', e); }
    });

    // Auto-reject: backend tells main admin its 15s is up — dismiss modal & reject Twilio
    socket.on('auto-reject', (data) => {
      const alarmId = data?.alarmId;
      console.log(`[AutoReject] Main admin: failover timeout, auto-rejecting alarm ${alarmId}`);
      // Remove from local incoming calls (dismiss socket modal)
      if (alarmId) {
        setIncomingCalls(prev => prev.filter(c => c.id !== alarmId));
        // Also remove from CallContext + localStorage
        try { ctxRejectCallRef.current(alarmId); } catch (e) {}
      }
      // Reject Twilio incoming call if still ringing (use refs to avoid stale closure)
      try { if (twilioIncomingRef.current) twilioRejectRef.current(); } catch (e) { console.warn('[AutoReject] Twilio reject error:', e); }
    });

    // Firetruck status/alarm update from driver — only notify once per truck+status+alarm combo
    socket.on('truck-status-update', (data) => {
      try {
        console.log('[Frontend] Received truck-status-update:', data);
        const alarmText = data.alarmLevel || '';
        const statusText = data.fireStatus || '';
        const driverText = data.driverName || 'Unknown';
        const truckText = data.truckId ? `Truck #${data.truckId}` : 'Firetruck';

        // Dedup: include alarm level so escalations always trigger a new notification
        const dedupeKey = `${data.truckId}-${statusText}-${alarmText}`;
        if (notifiedTruckStatusRef.current.has(dedupeKey)) {
          console.log(`[Frontend] Skipping duplicate notification for ${dedupeKey}`);
          return;
        }
        notifiedTruckStatusRef.current.add(dedupeKey);

        addNotification({
          title: `${truckText} — ${statusText}`,
          message: `${driverText} | Alarm: ${alarmText}`,
          type: 'truck-status',
        });
        info(
          `${truckText} is now "${statusText}" | Alarm: ${alarmText} (${driverText})`,
          undefined,
          { sticky: false }
        );
      } catch (e) { console.error('[truck-status-update] handler error:', e); }
    });

    // Dedicated alarm level escalation notification
    socket.on('alarm-level-update', (data) => {
      try {
        console.log('[Frontend] Received alarm-level-update:', data);
        const truckText = data.truckId ? `Truck #${data.truckId}` : 'Firetruck';
        const prevLevel = data.previousAlarmLevel || 'Unknown';
        const newLevel = data.newAlarmLevel || 'Unknown';
        const driverText = data.driverName || 'Unknown';

        addNotification({
          title: `ALARM ESCALATED — Incident #${data.alarmId || '?'}`,
          message: `${truckText}: ${prevLevel} → ${newLevel} (${driverText})`,
          type: 'alarm-escalation',
          payload: { alarmId: data.alarmId },
        });
        info(
          `🚨 ALARM ESCALATED: ${prevLevel} → ${newLevel} | ${truckText} (${driverText})`,
          undefined,
          { sticky: true, actionLabel: 'View Incident', onAction: () => navigate('/incident-report') }
        );
      } catch (e) { console.error('[alarm-level-update] handler error:', e); }
    });

    socket.on('disconnect', () => console.log('Socket disconnected from server'));

    return () => {
      socket.disconnect();
    };
  }, [addIncomingCall, navigate, user?.assignedStationId, user?.assigned_station_id]);

  // Re-emit join-main-admin whenever user logs in (socket may already be connected)
  React.useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user) return;
    if (socket.connected) {
      socket.emit('join-main-admin');
      console.log('[Socket] Re-emitted join-main-admin after user login');
    }
  }, [user]);

  const acceptCall = (callId) => {
    const call = incomingCalls.find(c => c.id === callId);
    if (!call) return;

    // Fire-and-forget: tell backend so failover timer is cancelled
    const stationId = user?.assignedStationId || user?.assigned_station_id || 'main';
    const token = localStorage.getItem('authToken');
    console.log('[Accept] Sending accept for alarm', callId, 'station', stationId, 'token?', !!token);
    fetch(`${API_BASE}/incidents/${callId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stationId }),
    }).then(r => console.log('[Accept] Response:', r.status)).catch(e => console.warn('[Accept] Failed:', e));

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
            {/* Voice console minimized banner removed — Twilio SDK handles voice */}
          </div>

          {/* ==== Incoming Emergency Call Modal (socket-based) ==== */}
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
                  <button onClick={() => { acceptCall(incomingCalls[0].id); if (twilioIncomingCall) { try { twilioAcceptIncoming(); } catch(e){} } else { setPendingTwilioAccept(true); } }} style={{ padding: '12px 32px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em', boxShadow: '0 2px 8px rgba(40,167,69,0.4)' }}>Accept</button>
                  <button onClick={() => { rejectCall(incomingCalls[0].id); try { if (twilioIncomingCall) twilioRejectIncoming(); } catch(e){} }} style={{ padding: '12px 32px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em' }}>Dismiss</button>
                </div>
              </div>
            </div>
          )}

          {/* Twilio Voice Incoming Call modal removed — socket modal handles UX,
              auto-reject handles Twilio SDK call dismissal via refs */}

          {/* ==== Twilio Active Call Banner ==== */}
          {twilioActiveCall && (
            <div style={{ position: 'fixed', top: '8px', right: '8px', zIndex: 10000, background: '#28a745', color: '#fff', padding: '10px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
              <span>On Call — {twilioActiveCall.parameters?.From || twilioActiveCall.parameters?.To || 'Active'}</span>
              <button onClick={twilioHangUp} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' }}>Hang Up</button>
            </div>
          )}

          {/* ==== Twilio Status Indicator ==== */}
          {twilioIdentity && (
            <div style={{ position: 'fixed', bottom: '60px', right: '16px', zIndex: 9998, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#666', background: '#f8f9fa', padding: '4px 10px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: twilioStatus === 'ready' ? '#28a745' : twilioStatus === 'busy' ? '#ffc107' : '#dc3545' }}></span>
              Twilio: {twilioStatus} ({twilioIdentity})
            </div>
          )}

          {/* ==== Floating Voice Console Panel ==== */}
          {showVoiceConsoleOverlay && (
            <div
              ref={voiceCardRef}
              style={{ position: 'fixed', bottom: '100px', right: '20px', zIndex: 10002, width: '300px', background: '#1a1a2e', color: '#fff', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}
            >
              <div
                onMouseDown={handleVoiceHeaderMouseDown}
                style={{ background: '#16213e', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'move', userSelect: 'none' }}
              >
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>🎙️ Voice Console</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setVoiceConsoleMinimized(true)} style={{ background: '#ffc107', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', lineHeight: '18px', padding: 0 }}>—</button>
                  <button onClick={() => setVoiceConsoleOpen(false)} style={{ background: '#dc3545', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', lineHeight: '18px', padding: 0, color: '#fff' }}>×</button>
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ marginBottom: '12px', fontSize: '13px', color: '#aaa' }}>
                  Identity: <strong style={{ color: '#fff' }}>{twilioIdentity}</strong>
                </div>
                {twilioActiveCall ? (
                  <>
                    <div style={{ color: '#28a745', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28a745', animation: 'pulse 1s infinite', display: 'inline-block' }}></span>
                      On Call — {twilioActiveCall.parameters?.From || twilioActiveCall.parameters?.To || 'Emergency'}
                    </div>
                    <button onClick={twilioHangUp} style={{ width: '100%', padding: '10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>📵 Hang Up</button>
                  </>
                ) : twilioIncomingCall ? (
                  <>
                    <div style={{ color: '#ffc107', fontWeight: 'bold', marginBottom: '12px' }}>📞 Incoming call ringing...</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={twilioAcceptIncoming} style={{ flex: 1, padding: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Accept</button>
                      <button onClick={twilioRejectIncoming} style={{ flex: 1, padding: '10px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Reject</button>
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#888', textAlign: 'center', padding: '12px 0' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📡</div>
                    <div style={{ fontSize: '13px' }}>Twilio: <strong style={{ color: twilioStatus === 'ready' ? '#28a745' : '#ffc107' }}>{twilioStatus}</strong></div>
                    <div style={{ fontSize: '11px', marginTop: '4px', color: '#666' }}>Waiting for incoming call...</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Minimized voice console tab */}
          {voiceConsoleOpen && voiceConsoleMinimized && (
            <div
              onClick={() => setVoiceConsoleMinimized(false)}
              style={{ position: 'fixed', bottom: '100px', right: '20px', zIndex: 10002, background: twilioActiveCall ? '#28a745' : '#1a1a2e', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
            >
              🎙️ {twilioActiveCall ? 'On Call' : 'Voice Console'} ▲
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
