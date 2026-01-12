import React, { useState } from "react";
import useEmergencyCalls from "../hooks/useEmergencyCalls";
import "../style/callmanager.css";

/**
 * Emergency Call Manager Component
 * Demonstrates how to use the call system with mock data
 * Shows incoming, ongoing, and completed calls
 */
export default function CallManager() {
  const {
    incomingCalls,
    ongoingCalls,
    callHistory,
    acceptCall,
    rejectCall,
    endCall,
    loadMockIncomingCalls,
    simulateIncoming
  } = useEmergencyCalls();

  const [showHistory, setShowHistory] = useState(false);

  const handleSimulateCall = () => {
    simulateIncoming({
      callerName: "Emergency Caller",
      phoneNumber: "+63-900-999-9999",
      emergencyType: "FIRE",
      description: "New emergency detected in the system"
    });
  };

  return (
    <div className="call-manager">
      <div className="call-manager-header">
        <h2>📞 Emergency Call Management System</h2>
        <p>Manage incoming, ongoing, and completed emergency calls</p>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button onClick={loadMockIncomingCalls} className="btn btn-primary">
          📥 Load Mock Incoming Calls ({incomingCalls.length})
        </button>
        <button onClick={handleSimulateCall} className="btn btn-success">
          ➕ Simulate New Call
        </button>
        <button 
          onClick={() => setShowHistory(!showHistory)} 
          className="btn btn-info"
        >
          📋 {showHistory ? "Hide" : "Show"} History ({callHistory.length})
        </button>
      </div>

      {/* Statistics */}
      <div className="statistics">
        <div className="stat-card">
          <span className="stat-label">Incoming Calls</span>
          <span className="stat-value incoming">{incomingCalls.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ongoing Calls</span>
          <span className="stat-value ongoing">{ongoingCalls.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed Calls</span>
          <span className="stat-value completed">{callHistory.length}</span>
        </div>
      </div>

      {/* Incoming Calls Section */}
      <div className="calls-section incoming-calls">
        <h3>🔴 Incoming Calls ({incomingCalls.length})</h3>
        
        {incomingCalls.length === 0 ? (
          <div className="empty-state">
            <p>No incoming calls</p>
          </div>
        ) : (
          <div className="calls-grid">
            {incomingCalls.map(call => (
              <div key={call.id} className="call-card incoming-card">
                <div className="call-header">
                  <h4>{call.callerName}</h4>
                  <span className={`badge emergency-type ${call.emergencyType.toLowerCase()}`}>
                    {call.emergencyType}
                  </span>
                </div>

                <div className="call-details">
                  <div className="detail">
                    <span className="label">📱 Phone:</span>
                    <span className="value">{call.phoneNumber}</span>
                  </div>
                  <div className="detail">
                    <span className="label">📍 Location:</span>
                    <span className="value">{call.location?.address}</span>
                  </div>
                  <div className="detail">
                    <span className="label">⚠️ Issue:</span>
                    <span className="value">{call.description}</span>
                  </div>
                  <div className="detail">
                    <span className="label">🗺️ Coords:</span>
                    <span className="value small">
                      {call.location?.latitude.toFixed(4)}, {call.location?.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className="call-actions">
                  <button 
                    onClick={() => acceptCall(call.id)}
                    className="btn btn-accept"
                  >
                    ✅ Accept
                  </button>
                  <button 
                    onClick={() => rejectCall(call.id)}
                    className="btn btn-reject"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ongoing Calls Section */}
      <div className="calls-section ongoing-calls">
        <h3>🟢 Ongoing Calls ({ongoingCalls.length})</h3>
        
        {ongoingCalls.length === 0 ? (
          <div className="empty-state">
            <p>No ongoing calls</p>
          </div>
        ) : (
          <div className="calls-grid">
            {ongoingCalls.map(call => (
              <div key={call.id} className="call-card ongoing-card">
                <div className="call-header">
                  <h4>{call.callerName}</h4>
                  <span className={`badge emergency-type ${call.emergencyType.toLowerCase()}`}>
                    {call.emergencyType}
                  </span>
                </div>

                <div className="call-details">
                  <div className="detail">
                    <span className="label">📱 Phone:</span>
                    <span className="value">{call.phoneNumber}</span>
                  </div>
                  <div className="detail">
                    <span className="label">📍 Location:</span>
                    <span className="value">{call.location?.address}</span>
                  </div>
                  <div className="detail">
                    <span className="label">⏱️ Duration:</span>
                    <span className="value">
                      {call.duration || "Just connected"}
                    </span>
                  </div>
                  <div className="detail">
                    <span className="label">👥 Assigned Officers:</span>
                    <span className="value">
                      {call.assignedOfficers?.length || 0} officer(s)
                    </span>
                  </div>
                </div>

                <div className="call-actions">
                  <button 
                    onClick={() => endCall(call.id)}
                    className="btn btn-end"
                  >
                    ⏹️ End Call
                  </button>
                  <button className="btn btn-incident">
                    📝 Create Incident
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call History Section */}
      {showHistory && (
        <div className="calls-section call-history">
          <h3>📋 Call History ({callHistory.length})</h3>
          
          {callHistory.length === 0 ? (
            <div className="empty-state">
              <p>No call history</p>
            </div>
          ) : (
            <div className="history-table">
              <table>
                <thead>
                  <tr>
                    <th>Caller</th>
                    <th>Phone</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {callHistory.map(call => (
                    <tr key={call.id}>
                      <td>{call.callerName}</td>
                      <td>{call.phoneNumber}</td>
                      <td>
                        <span className={`badge emergency-type ${call.emergencyType.toLowerCase()}`}>
                          {call.emergencyType}
                        </span>
                      </td>
                      <td className="text-small">{call.location?.address}</td>
                      <td>{call.duration}</td>
                      <td>
                        <span className="badge completed">✓ Completed</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="info-box">
        <h4>💡 How to Use</h4>
        <ul>
          <li>Click "Load Mock Incoming Calls" to populate with example data</li>
          <li>Click "Accept" to answer an incoming call and move it to ongoing</li>
          <li>Click "Reject" to decline an incoming call</li>
          <li>Click "Create Incident" to generate an incident report from an ongoing call</li>
          <li>Use "Simulate New Call" to add random calls during testing</li>
        </ul>
      </div>
    </div>
  );
}
