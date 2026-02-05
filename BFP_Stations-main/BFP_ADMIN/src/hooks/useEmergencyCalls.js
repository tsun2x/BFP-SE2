import { useContext, useCallback } from "react";
import { CallContext } from "../context/CallContext";
import { getIncomingCalls, getOngoingCalls, getCallHistory, simulateIncomingCall } from "../data/callData";

/**
 * Hook to manage emergency calls
 * Provides easy access to call data and actions
 */
export const useEmergencyCalls = () => {
  const callContext = useContext(CallContext);

  if (!callContext) {
    throw new Error("useEmergencyCalls must be used within CallProvider");
  }

  const {
    incomingCalls,
    ongoingCalls,
    activeCallData,
    callHistory,
    addIncomingCall,
    acceptCall,
    rejectCall,
    endCall,
    createIncidentFromCall
  } = callContext;

  // Simulate incoming call from mobile app
  const simulateIncoming = useCallback((customData = {}) => {
    const newCall = simulateIncomingCall(customData);
    addIncomingCall(newCall);
    return newCall;
  }, [addIncomingCall]);

  // Load mock calls
  const loadMockIncomingCalls = useCallback(() => {
    const mockCalls = getIncomingCalls();
    mockCalls.forEach(call => addIncomingCall(call));
  }, [addIncomingCall]);

  // Load mock ongoing calls
  const loadMockOngoingCalls = useCallback(() => {
    const mockCalls = getOngoingCalls();
    mockCalls.forEach(call => addIncomingCall(call));
  }, [addIncomingCall]);

  return {
    // State
    incomingCalls,
    ongoingCalls,
    activeCallData,
    callHistory,
    
    // Actions
    acceptCall,
    rejectCall,
    endCall,
    createIncidentFromCall,
    simulateIncoming,
    loadMockIncomingCalls,
    loadMockOngoingCalls,
    
    // Utilities
    hasIncomingCalls: incomingCalls.length > 0,
    hasOngoingCalls: ongoingCalls.length > 0,
    incomingCallCount: incomingCalls.length,
    ongoingCallCount: ongoingCalls.length
  };
};

export default useEmergencyCalls;
