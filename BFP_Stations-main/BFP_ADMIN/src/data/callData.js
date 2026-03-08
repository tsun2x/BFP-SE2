/**
 * Static Call Data
 * This simulates incoming calls from the mobile app
 */

export const mockIncomingCalls = [
  {
    id: 1,
    phoneNumber: "+63-921-234-5678",
    callerId: "CALLER_001",
    callerName: "Juan Santos",
    timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
    status: "incoming",
    location: {
      latitude: 14.5995,
      longitude: 120.9842,
      address: "Manila City Hall, Manila"
    },
    emergencyType: "FIRE",
    description: "Large fire at residential building"
  },
  {
    id: 2,
    phoneNumber: "+63-917-654-3210",
    callerId: "CALLER_002",
    callerName: "Maria Cruz",
    timestamp: new Date(Date.now() - 2 * 60000), // 2 minutes ago
    status: "incoming",
    location: {
      latitude: 14.6091,
      longitude: 120.9824,
      address: "Makati Avenue, Makati City"
    },
    emergencyType: "RESCUE",
    description: "Person trapped in vehicle after accident"
  },
  {
    id: 3,
    phoneNumber: "+63-919-876-5432",
    callerId: "CALLER_003",
    callerName: "Pedro Reyes",
    timestamp: new Date(Date.now() - 1 * 60000), // 1 minute ago
    status: "incoming",
    location: {
      latitude: 14.5994,
      longitude: 120.9844,
      address: "BGC Bonifacio Global City, Taguig"
    },
    emergencyType: "MEDICAL",
    description: "Person experiencing chest pain"
  }
];

export const mockOngoingCalls = [
  {
    id: 101,
    phoneNumber: "+63-916-123-4567",
    callerId: "CALLER_004",
    callerName: "Rosa Fernandez",
    timestamp: new Date(Date.now() - 15 * 60000), // Started 15 minutes ago
    status: "ongoing",
    duration: "15:30", // 15 minutes 30 seconds
    location: {
      latitude: 14.5756,
      longitude: 121.0340,
      address: "Ortigas Avenue, Pasig City"
    },
    emergencyType: "FIRE",
    description: "Small fire in office building - under control",
    assignedOfficers: [
      { id: 1, name: "Officer John Dela Cruz", badge: "BFP-00123" },
      { id: 2, name: "Officer Maria Santos", badge: "BFP-00456" }
    ]
  }
];

export const mockCallHistory = [
  {
    id: 201,
    phoneNumber: "+63-912-345-6789",
    callerId: "CALLER_005",
    callerName: "Antonio Ramos",
    startTime: new Date(Date.now() - 60 * 60000), // 1 hour ago
    endTime: new Date(Date.now() - 55 * 60000),
    duration: "05:45",
    status: "completed",
    location: {
      latitude: 14.5500,
      longitude: 120.9800,
      address: "Ermita, Manila"
    },
    emergencyType: "RESCUE",
    description: "Child stuck in tree - successfully rescued",
    caseNumber: "BFP-2025-001234"
  },
  {
    id: 202,
    phoneNumber: "+63-918-765-4321",
    callerId: "CALLER_006",
    callerName: "Sofia Mercado",
    startTime: new Date(Date.now() - 120 * 60000), // 2 hours ago
    endTime: new Date(Date.now() - 110 * 60000),
    duration: "10:20",
    status: "completed",
    location: {
      latitude: 14.6350,
      longitude: 121.0440,
      address: "Cainta, Rizal"
    },
    emergencyType: "FIRE",
    description: "Residential fire - extinguished",
    caseNumber: "BFP-2025-001235"
  },
  {
    id: 203,
    phoneNumber: "+63-920-555-6666",
    callerId: "CALLER_007",
    callerName: "Robert Gonzales",
    startTime: new Date(Date.now() - 180 * 60000), // 3 hours ago
    endTime: new Date(Date.now() - 170 * 60000),
    duration: "08:15",
    status: "completed",
    location: {
      latitude: 14.5890,
      longitude: 120.9700,
      address: "Luneta Park, Manila"
    },
    emergencyType: "MEDICAL",
    description: "Elderly patient with breathing difficulty - transported to hospital",
    caseNumber: "BFP-2025-001236"
  }
];

/**
 * Get mock incoming calls
 * @returns {Array} Array of incoming calls
 */
export const getIncomingCalls = () => {
  return mockIncomingCalls;
};

/**
 * Get mock ongoing calls
 * @returns {Array} Array of ongoing calls
 */
export const getOngoingCalls = () => {
  return mockOngoingCalls;
};

/**
 * Get mock call history
 * @returns {Array} Array of completed calls
 */
export const getCallHistory = () => {
  return mockCallHistory;
};

/**
 * Simulate receiving a call
 * @param {Object} callData - Call data
 * @returns {Object} New call object
 */
export const simulateIncomingCall = (callData = {}) => {
  const defaultCall = {
    id: Date.now(),
    phoneNumber: callData.phoneNumber || "+63-900-000-0000",
    callerId: callData.callerId || `CALLER_${Date.now()}`,
    callerName: callData.callerName || "Unknown Caller",
    timestamp: new Date(),
    status: "incoming",
    location: callData.location || {
      latitude: 14.5995,
      longitude: 120.9842,
      address: "Manila, Philippines"
    },
    emergencyType: callData.emergencyType || "GENERAL",
    description: callData.description || "Emergency call received"
  };
  return defaultCall;
};
