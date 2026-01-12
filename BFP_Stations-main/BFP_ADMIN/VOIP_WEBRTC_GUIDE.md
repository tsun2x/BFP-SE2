# WebRTC & VoIP Integration Guide for BFP Emergency System

## Overview
This document provides recommendations for integrating WebRTC and VoIP capabilities to enable real-time voice communication between:
- Mobile app (caller/dispatcher)
- Web admin portal (dispatcher/officers)
- Emergency dispatch centers
- Field officers

---

## Recommended Solutions

### 1. **WebRTC (Recommended for MVP)**

#### Advantages:
- ✅ Browser-native technology (no plugins required)
- ✅ P2P encrypted communication
- ✅ Low latency for emergency situations
- ✅ Cost-effective (peer-to-peer)
- ✅ Works cross-platform (mobile + web)
- ✅ Real-time data channels for location sharing

#### Disadvantages:
- Requires signaling server
- Complex NAT traversal
- Bandwidth-intensive for group calls

#### Implementation Stack:
```
Frontend: Twilio Client.js / Simple-Peer / PeerConnection API
Signaling: Socket.io + Node.js
Backend: TURN/STUN servers (coturn, AWS)
```

---

### 2. **Twilio (Production-Ready Alternative)**

#### Advantages:
- ✅ Ready-to-use platform
- ✅ Excellent documentation
- ✅ Built-in conference calling
- ✅ Call recording & analytics
- ✅ Scalability guaranteed
- ✅ SLA & Support

#### Disadvantages:
- Recurring monthly costs
- Vendor lock-in
- Less control over infrastructure

#### Pricing:
- Incoming calls: $0.013/min
- Outgoing calls: $0.013/min
- Conference calls: $0.0100/min per participant

---

### 3. **Asterisk + FreePBX (On-Premises Option)**

#### Advantages:
- ✅ Complete control
- ✅ One-time setup cost
- ✅ No recurring SaaS fees
- ✅ Suitable for large-scale deployments

#### Disadvantages:
- High technical complexity
- Requires dedicated servers
- Maintenance overhead
- Steep learning curve

---

## Recommended Architecture for BFP

### **Phase 1: MVP with WebRTC + Socket.io**

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP                           │
│              (Caller - React Native)                    │
└────────────────┬────────────────────────────────────────┘
                 │ WebRTC Signaling (Socket.io)
                 │
         ┌───────▼────────────────┐
         │   Signaling Server     │
         │  (Node.js + Socket.io) │
         └───────┬────────────────┘
                 │
    ┌────────────┼────────────────┐
    │            │                │
┌───▼───────┐ ┌─▼──────────┐ ┌──▼───────────┐
│  Web App  │ │  Dispatcher│ │ Field Officer│
│  (Admin)  │ │   (Field)  │ │  (Mobile)    │
└───────────┘ └────────────┘ └──────────────┘

STUN/TURN Servers:
- Google STUN: stun.l.google.com:19302
- Self-hosted TURN: coturn server
```

---

## Implementation Steps

### Step 1: Set Up Signaling Server (Node.js + Socket.io)

```javascript
// backend/services/voipSignaling.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const peers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins the system
  socket.on('join', (userData) => {
    peers.set(socket.id, {
      id: socket.id,
      name: userData.name,
      role: userData.role, // dispatcher, officer, mobile
      location: userData.location
    });
    
    // Broadcast user list
    io.emit('users-updated', Array.from(peers.values()));
  });

  // WebRTC Offer
  socket.on('offer', (data) => {
    io.to(data.to).emit('offer', {
      from: socket.id,
      offer: data.offer,
      caller: peers.get(socket.id)
    });
  });

  // WebRTC Answer
  socket.on('answer', (data) => {
    io.to(data.to).emit('answer', {
      from: socket.id,
      answer: data.answer
    });
  });

  // ICE Candidates
  socket.on('ice-candidate', (data) => {
    io.to(data.to).emit('ice-candidate', {
      from: socket.id,
      candidate: data.candidate
    });
  });

  // End Call
  socket.on('end-call', (data) => {
    io.to(data.to).emit('call-ended');
  });

  socket.on('disconnect', () => {
    peers.delete(socket.id);
    io.emit('users-updated', Array.from(peers.values()));
  });
});

server.listen(5001, () => {
  console.log('VoIP Signaling Server running on port 5001');
});
```

---

### Step 2: WebRTC Client (React)

```javascript
// src/hooks/useWebRTC.js
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

export const useWebRTC = (userId, userName, userRole) => {
  const [peers, setPeers] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(new Map());
  const localStreamRef = useRef(null);

  // Initialize WebRTC
  useEffect(() => {
    // Connect to signaling server
    socketRef.current = io('http://localhost:5001');

    // Join the system
    socketRef.current.emit('join', {
      id: userId,
      name: userName,
      role: userRole
    });

    // Get local media stream
    const getLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false // Audio-only for emergency calls
        });
        localStreamRef.current = stream;
      } catch (error) {
        console.error('Error accessing media:', error);
      }
    };

    getLocalStream();

    // Listen for users
    socketRef.current.on('users-updated', (usersList) => {
      setPeers(usersList.filter(u => u.id !== userId));
    });

    // Handle incoming offer
    socketRef.current.on('offer', async (data) => {
      setActiveCall({
        from: data.from,
        caller: data.caller,
        offer: data.offer
      });

      // Create peer connection
      const peerConnection = createPeerConnection(data.from, true);
      peerConnectionRef.current.set(data.from, peerConnection);

      // Set remote description
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send answer
      socketRef.current.emit('answer', {
        to: data.from,
        answer: answer
      });
    });

    // Handle answer
    socketRef.current.on('answer', async (data) => {
      const peerConnection = peerConnectionRef.current.get(data.from);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    });

    // Handle ICE candidates
    socketRef.current.on('ice-candidate', async (data) => {
      const peerConnection = peerConnectionRef.current.get(data.from);
      if (peerConnection && data.candidate) {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    });

    // Handle call ended
    socketRef.current.on('call-ended', () => {
      endCall();
    });

    return () => {
      socketRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [userId, userName, userRole]);

  const createPeerConnection = (peerId, isInitiator) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          to: peerId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Remote stream received:', event.streams);
      // Play remote audio
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play();
    };

    return peerConnection;
  };

  const initiateCall = async (targetUserId) => {
    const peerConnection = createPeerConnection(targetUserId, true);
    peerConnectionRef.current.set(targetUserId, peerConnection);

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Send offer
    socketRef.current.emit('offer', {
      to: targetUserId,
      offer: offer
    });

    setActiveCall({ to: targetUserId });
  };

  const endCall = () => {
    // Close all peer connections
    peerConnectionRef.current.forEach(pc => pc.close());
    peerConnectionRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }

    setActiveCall(null);

    // Notify peer
    if (activeCall?.to) {
      socketRef.current.emit('end-call', { to: activeCall.to });
    } else if (activeCall?.from) {
      socketRef.current.emit('end-call', { to: activeCall.from });
    }
  };

  return {
    peers,
    activeCall,
    initiateCall,
    endCall
  };
};
```

---

### Step 3: UI Component for VoIP Calls

```javascript
// src/components/VoIPCallPanel.jsx
import React from 'react';
import { useWebRTC } from '../hooks/useWebRTC';

export default function VoIPCallPanel() {
  const { peers, activeCall, initiateCall, endCall } = useWebRTC(
    'user-123',
    'Officer John',
    'dispatcher'
  );

  return (
    <div className="voip-panel">
      <div className="available-users">
        <h3>Available Dispatchers/Officers</h3>
        {peers.map(peer => (
          <div key={peer.id} className="peer-card">
            <p>{peer.name}</p>
            <p className="role">{peer.role}</p>
            <button onClick={() => initiateCall(peer.id)}>
              📞 Call
            </button>
          </div>
        ))}
      </div>

      {activeCall && (
        <div className="active-call">
          <div className="call-info">
            <h3>Call Active</h3>
            <p className="duration">Duration: {activeCall.duration}</p>
          </div>
          <button onClick={endCall} className="end-call-btn">
            ❌ End Call
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Installation Instructions

### 1. Install VoIP Signaling Server

```bash
cd backend
npm install socket.io express http
npm install socket.io-client --save

# Create voipSignaling.js file and add the code above
```

### 2. Install Client Libraries

```bash
cd frontend
npm install socket.io-client
```

### 3. Start Signaling Server

```bash
node backend/services/voipSignaling.js
```

---

## Security Considerations

1. **Encryption**: Use WebRTC's built-in DTLS-SRTP encryption
2. **Authentication**: Verify JWT tokens before establishing calls
3. **Authorization**: Only allow authorized users to initiate calls
4. **Rate Limiting**: Prevent call spam
5. **Monitoring**: Log all call initiation attempts

```javascript
// Add JWT verification
socketRef.current.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
  } catch {
    socket.disconnect();
  }
});
```

---

## Performance Optimization

1. **Audio Codec**: Use OPUS codec (better for speech)
2. **Bandwidth**: Limit to 64kbps for emergency calls
3. **Latency**: Target <100ms for emergency response
4. **Connection**: Use Aggressive ICE gathering for faster connection

```javascript
const offerOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: false,
  voiceActivityDetection: true,
  iceGatheringPolicy: 'gather_now'
};
```

---

## Cost Comparison (Monthly for 100 Officers)

| Solution | Cost | Setup |
|----------|------|-------|
| WebRTC (DIY) | $50-100 (server) | 2-4 weeks |
| Twilio | $500-1000 | 1-2 days |
| Asterisk | $500 (one-time) | 4-8 weeks |

---

## Recommended Next Steps

1. ✅ **Week 1-2**: Implement basic WebRTC signaling
2. ✅ **Week 3-4**: Integrate into mobile and web apps
3. ✅ **Week 5-6**: Testing and optimization
4. ✅ **Week 7-8**: Deploy with TURN servers

---

## References

- [WebRTC Documentation](https://webrtc.org/)
- [Socket.io Guide](https://socket.io/docs/)
- [Twilio Programmable Voice](https://www.twilio.com/voice)
- [Asterisk Documentation](https://www.asterisk.org/)

---

## Support

For questions or issues, contact your development team or refer to the official documentation links above.
