# Emergency Call System - Complete Implementation Guide

## 🎯 Overview

This is a complete emergency call management system for the BFP Admin Portal that includes:
- ✅ Static mock call data (realistic scenarios)
- ✅ Call state management (React Context)
- ✅ Easy-to-use React hooks
- ✅ Visual call management UI component
- ✅ Integration with incident report system
- ✅ WebRTC/VoIP implementation guide

---

## 📁 Project Structure

```
src/
├── data/
│   └── callData.js                 # Mock call data (static JSON)
├── context/
│   └── CallContext.jsx             # Global call state management
├── hooks/
│   └── useEmergencyCalls.js        # Easy-to-use hook for calls
├── components/
│   ├── CallManager.jsx             # Full call management UI
│   ├── IncomingCallModal.jsx       # Incoming call display
│   └── CallModal.jsx               # Ongoing call display
└── style/
    └── callmanager.css             # Call manager styles
    
Documentation/
├── EMERGENCY_CALL_SYSTEM.md        # This system overview
├── VOIP_WEBRTC_GUIDE.md            # VoIP/WebRTC implementation
└── FIXES_APPLIED.md                # All previous fixes
```

---

## 🚀 Quick Start

### 1. Use the Pre-built Call Manager Component

Add this to any page (e.g., Dashboard):

```jsx
import CallManager from '../components/CallManager';

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <CallManager />
    </div>
  );
}
```

### 2. Use the Hook in Your Components

```jsx
import useEmergencyCalls from '../hooks/useEmergencyCalls';

function MyComponent() {
  const {
    incomingCalls,
    ongoingCalls,
    acceptCall,
    loadMockIncomingCalls
  } = useEmergencyCalls();

  return (
    <div>
      <button onClick={loadMockIncomingCalls}>
        Load Mock Calls
      </button>
      <p>Incoming: {incomingCalls.length}</p>
    </div>
  );
}
```

---

## 📞 Mock Call Data

### Sample Incoming Call Structure

```javascript
{
  id: 1,
  phoneNumber: "+63-921-234-5678",
  callerId: "CALLER_001",
  callerName: "Juan Santos",
  timestamp: Date object,
  status: "incoming",
  location: {
    latitude: 14.5995,
    longitude: 120.9842,
    address: "Manila City Hall, Manila"
  },
  emergencyType: "FIRE",  // FIRE, RESCUE, MEDICAL
  description: "Large fire at residential building"
}
```

### Available Mock Calls

**File:** `src/data/callData.js`

Includes:
- 3 realistic incoming calls (different emergency types)
- 1 ongoing call example (with assigned officers)
- 3 completed call history records

---

## 🎮 Using the Call System

### Option A: Load All Mock Calls

```javascript
const { loadMockIncomingCalls } = useEmergencyCalls();

<button onClick={loadMockIncomingCalls}>
  Load Mock Calls
</button>
```

### Option B: Simulate Single Call

```javascript
const { simulateIncoming } = useEmergencyCalls();

simulateIncoming({
  callerName: "Custom Name",
  phoneNumber: "+63-900-000-0000",
  emergencyType: "FIRE",
  description: "Custom emergency description"
});
```

### Option C: Accept/Reject/End Calls

```javascript
const {
  incomingCalls,
  ongoingCalls,
  acceptCall,
  rejectCall,
  endCall
} = useEmergencyCalls();

// Accept an incoming call
acceptCall(callId);

// Reject an incoming call
rejectCall(callId);

// End an ongoing call
endCall(callId);
```

---

## 📊 Call Flow Diagram

```
┌─────────────────────────────────────┐
│   Mobile App / External Caller      │
│   (Sends emergency call)            │
└────────────────┬────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Mock Call Data    │
        │  (simulated)       │
        └────────┬───────────┘
                 │
                 ▼
      ┌──────────────────────────┐
      │  Incoming Call Modal     │
      │  (User sees call details)│
      └──┬──────────────────┬────┘
         │                  │
    Accept ❌              Reject ❌
         │                  │
         ▼                  ▼
   ┌──────────┐        Call ended
   │ Ongoing  │
   │  Call    │
   └────┬─────┘
        │
        ├─ Create Incident Report
        ├─ Assign Officers
        ├─ Track Location
        ▼
   ┌──────────────────┐
   │ Completed Call   │
   │ (History)        │
   └──────────────────┘
```

---

## 🔧 Integration with Incident Report

When a call is accepted:

```javascript
// In CallManager or your component
const handleCreateIncident = () => {
  navigate("/incident-report", {
    state: {
      callData: activeCall,
      fromCall: true
    }
  });
};
```

**Pre-filled incident data will include:**
- Caller information
- Phone number
- Location (latitude/longitude)
- Emergency type
- Description
- Call timestamp

---

## 📱 API Reference

### useEmergencyCalls Hook

```javascript
const {
  // State
  incomingCalls,           // Array<Call>
  ongoingCalls,            // Array<Call>
  activeCallData,          // Call | null
  callHistory,             // Array<Call>
  
  // Actions
  acceptCall,              // (callId) => void
  rejectCall,              // (callId) => void
  endCall,                 // (callId) => void
  createIncidentFromCall,  // (callId, data) => Incident
  
  // Utilities
  simulateIncoming,        // (customData?) => Call
  loadMockIncomingCalls,   // () => void
  loadMockOngoingCalls,    // () => void
  
  // Computed
  hasIncomingCalls,        // boolean
  hasOngoingCalls,         // boolean
  incomingCallCount,       // number
  ongoingCallCount         // number
} = useEmergencyCalls();
```

---

## 🎨 Visual Components

### CallManager Component

Full-featured call management UI with:
- Incoming calls display
- Ongoing calls tracking
- Call history table
- Quick action buttons
- Statistics dashboard

**Import:**
```javascript
import CallManager from '../components/CallManager';
```

**Features:**
- Load mock data
- Accept/Reject calls
- End calls
- Create incidents
- View history
- Responsive design

---

## 🔊 WebRTC/VoIP Integration

For actual voice communication, see **VOIP_WEBRTC_GUIDE.md**

**Recommended Tech Stack:**
- **Signaling:** Node.js + Socket.io
- **P2P Communication:** WebRTC
- **Server:** TURN/STUN servers
- **Encryption:** DTLS-SRTP (built-in)

**MVP Cost:** $50-100/month
**Production Ready:** 4-8 weeks

---

## 🧪 Testing Guide

### Test Scenario 1: Incoming Call

1. Click "Load Mock Incoming Calls"
2. See 3 incoming calls appear
3. Click "Accept" on one
4. Call moves to ongoing
5. Click "Create Incident"
6. Incident report pre-fills with call data

### Test Scenario 2: Multiple Calls

1. Load mock calls
2. Accept 2 calls
3. See 2 in "Ongoing Calls"
4. End one call
5. Verify moved to history

### Test Scenario 3: Custom Simulation

1. Click "Simulate New Call"
2. New call appears with random data
3. Accept it
4. End it
5. Verify in history

---

## ⚙️ Configuration

### Emergency Type Colors

**In callmanager.css:**
```css
.badge.emergency-type.fire { background: #dc3545; }      /* Red */
.badge.emergency-type.rescue { background: #fd7e14; }    /* Orange */
.badge.emergency-type.medical { background: #0dcaf0; }   /* Blue */
```

### Mock Call Locations

**In callData.js:**
- Manila City Hall (14.5995, 120.9842)
- Makati Avenue (14.6091, 120.9824)
- BGC Taguig (14.5994, 120.9844)
- Pasig City (14.5756, 121.0340)

Customize with your own coordinates!

---

## 📋 Features Checklist

### Current Implementation
- ✅ Mock call data (static JSON)
- ✅ Call state management (React Context)
- ✅ Hook-based API
- ✅ Call Manager UI component
- ✅ Accept/Reject/End calls
- ✅ Call history tracking
- ✅ Incident integration
- ✅ Responsive design
- ✅ Emergency type classification
- ✅ Location data included

### Next Steps for Production
- ⏳ WebRTC signaling server
- ⏳ Mobile app integration
- ⏳ Real-time location tracking
- ⏳ GPS coordinates validation
- ⏳ Call recording
- ⏳ Conference calling
- ⏳ Call analytics
- ⏳ Backup communication methods

---

## 🔐 Security Notes

When integrating with real calls:

```javascript
// 1. Validate JWT token
const token = localStorage.getItem('authToken');
// Verify before accepting call

// 2. Encrypt location data
// Store coordinates securely

// 3. Log all call events
// For audit trail

// 4. Rate limit call creation
// Prevent abuse

// 5. User permissions
// Only authorized personnel can accept calls
```

---

## 📚 Additional Documentation

- **VOIP_WEBRTC_GUIDE.md** - Complete VoIP implementation
- **EMERGENCY_CALL_SYSTEM.md** - System overview
- **FIXES_APPLIED.md** - All fixes and improvements

---

## 🐛 Troubleshooting

### Problem: Mock calls not appearing

**Solution:** Ensure CallProvider wraps your app in context
```javascript
import { CallProvider } from './context/CallContext';

<CallProvider>
  <App />
</CallProvider>
```

### Problem: Hook not working

**Solution:** Must be used inside CallProvider
```javascript
// ❌ Wrong - outside provider
function App() {
  const { calls } = useEmergencyCalls(); // Error!
}

// ✅ Correct - inside provider
function Dashboard() {
  const { calls } = useEmergencyCalls(); // Works!
}
```

### Problem: Incident not receiving call data

**Solution:** Ensure navigation passes state
```javascript
navigate("/incident-report", {
  state: { callData: activeCall }
});
```

Then access it in IncidentReport page:
```javascript
const location = useLocation();
const { callData } = location.state || {};
```

---

## 📞 Support

For questions or implementation help:
1. Check VOIP_WEBRTC_GUIDE.md for voice integration
2. Review example in CallManager.jsx
3. Check hook documentation in useEmergencyCalls.js
4. Review mock data in callData.js

---

## 🎉 Ready to Deploy!

The emergency call system is now:
- ✅ Fully functional with mock data
- ✅ Ready for mobile app integration
- ✅ Prepared for WebRTC implementation
- ✅ Integrated with incident reporting
- ✅ Scalable for production

**Next Steps:** Implement WebRTC signaling server following VOIP_WEBRTC_GUIDE.md

---

**System Version:** 1.0
**Last Updated:** November 28, 2025
**Status:** Ready for Testing & Integration ✅
