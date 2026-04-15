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
      const parsedIncoming = storedIncoming ? JSON.parse(storedIncoming) : [];
      if (storedIncoming) setIncomingCalls(parsedIncoming);
      if (storedOngoing) setOngoingCalls(JSON.parse(storedOngoing));
      if (storedActive) {
        const parsedActive = JSON.parse(storedActive);
        setActiveCallData(parsedActive);
        setCurrentIncomingCall(parsedActive);
      } else if (Array.isArray(parsedIncoming) && parsedIncoming.length > 0) {
        setCurrentIncomingCall(parsedIncoming[0]);
      }
    } catch (e) {
      console.error('Failed to restore call state:', e);
    }
  }, []);

  // Add incoming call with full caller information
  const addIncomingCall = useCallback((callData) => {
    setIncomingCalls(prev => {
      if (prev.some(c => c.id === callData.id)) {
        return prev;
      }
      const next = [...prev, callData];
      try { localStorage.setItem('incomingCalls', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    setCurrentIncomingCall(prev => prev || callData); // Pin to first active call until accept/reject/end
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
      setCurrentIncomingCall(ongoingCall);
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
      setCurrentIncomingCall(curr => {
        if (curr && curr.id === callId) {
          return next[0] || activeCallData || null;
        }
        return curr;
      });
      return next;
    });
  }, [activeCallData]);

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
      setCurrentIncomingCall(prev => (prev && prev.id === callId ? incomingCalls[0] || null : prev));
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
