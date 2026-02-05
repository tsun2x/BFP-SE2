import { createContext, useState, useCallback, useEffect } from "react";

export const CallContext = createContext();

export function CallProvider({ children }) {
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [ongoingCalls, setOngoingCalls] = useState([]);
  const [activeCallData, setActiveCallData] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [currentIncomingCall, setCurrentIncomingCall] = useState(null); // Full caller info

  // Restore persisted call state (if any) so reloads don't cancel active calls
  useEffect(() => {
    try {
      const storedIncoming = localStorage.getItem('incomingCalls');
      const storedOngoing = localStorage.getItem('ongoingCalls');
      const storedActive = localStorage.getItem('activeCallData');
      if (storedIncoming) setIncomingCalls(JSON.parse(storedIncoming));
      if (storedOngoing) setOngoingCalls(JSON.parse(storedOngoing));
      if (storedActive) setActiveCallData(JSON.parse(storedActive));
    } catch (e) {
      console.error('Failed to restore call state:', e);
    }
  }, []);

  // Add incoming call with full caller information
  const addIncomingCall = useCallback((callData) => {
    setIncomingCalls(prev => {
      const next = [...prev, callData];
      try { localStorage.setItem('incomingCalls', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    setCurrentIncomingCall(callData); // Store for auto-fill on IncidentReport
  }, []);

  // Accept incoming call
  const acceptCall = useCallback((callId) => {
    const call = incomingCalls.find(c => c.id === callId);
    if (call) {
      const ongoingCall = {
        ...call,
        startTime: new Date(),
        status: "ongoing"
      };
      setOngoingCalls(prev => {
        const next = [...prev, ongoingCall];
        try { localStorage.setItem('ongoingCalls', JSON.stringify(next)); } catch (e) {}
        return next;
      });
      setActiveCallData(ongoingCall);
      try { localStorage.setItem('activeCallData', JSON.stringify(ongoingCall)); } catch (e) {}
      setIncomingCalls(prev => {
        const next = prev.filter(c => c.id !== callId);
        try { localStorage.setItem('incomingCalls', JSON.stringify(next)); } catch (e) {}
        return next;
      });
    }
  }, [incomingCalls]);

  // Reject incoming call
  const rejectCall = useCallback((callId) => {
    setIncomingCalls(prev => {
      const next = prev.filter(c => c.id !== callId);
      try { localStorage.setItem('incomingCalls', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    setCurrentIncomingCall(null); // Clear when rejected
  }, []);

  // End ongoing call
  const endCall = useCallback((callId) => {
    const call = ongoingCalls.find(c => c.id === callId);
    if (call) {
      const endTime = new Date();
      const duration = Math.floor((endTime - call.startTime) / 1000);
      
      const completedCall = {
        ...call,
        endTime,
        duration,
        status: "completed"
      };
      
      setCallHistory(prev => {
        const next = [...prev, completedCall];
        try { localStorage.setItem('callHistory', JSON.stringify(next)); } catch (e) {}
        return next;
      });
      setOngoingCalls(prev => {
        const next = prev.filter(c => c.id !== callId);
        try { localStorage.setItem('ongoingCalls', JSON.stringify(next)); } catch (e) {}
        return next;
      });
      setActiveCallData(null);
      try { localStorage.removeItem('activeCallData'); } catch (e) {}
    }
  }, [ongoingCalls]);

  // Create incident from call
  const createIncidentFromCall = useCallback((callId, incidentData) => {
    const call = incomingCalls.find(c => c.id === callId) || 
                 ongoingCalls.find(c => c.id === callId);
    
    if (call) {
      return {
        ...incidentData,
        callId: call.id,
        callData: call,
        createdAt: new Date()
      };
    }
    return null;
  }, [incomingCalls, ongoingCalls]);

  return (
    <CallContext.Provider
      value={{
        incomingCalls,
        ongoingCalls,
        activeCallData,
        callHistory,
        currentIncomingCall,
        addIncomingCall,
        acceptCall,
        rejectCall,
        endCall,
        createIncidentFromCall
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
