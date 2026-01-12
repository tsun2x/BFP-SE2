/**
 * Emergency Call System - Usage Examples
 * This file demonstrates how to use the call system in different scenarios
 */

// ============================================
// EXAMPLE 1: Basic Usage in Dashboard
// ============================================

import useEmergencyCalls from '../hooks/useEmergencyCalls';

function DashboardExample() {
  const {
    incomingCallCount,
    ongoingCallCount,
    loadMockIncomingCalls
  } = useEmergencyCalls();

  return (
    <div className="dashboard">
      <h2>Emergency Status</h2>
      
      <div className="status-cards">
        <div className="card">
          <h3>Incoming Calls</h3>
          <p className="number">{incomingCallCount}</p>
          <button onClick={loadMockIncomingCalls}>
            Load Test Calls
          </button>
        </div>
        
        <div className="card">
          <h3>Active Calls</h3>
          <p className="number">{ongoingCallCount}</p>
        </div>
      </div>
    </div>
  );
}


// ============================================
// EXAMPLE 2: Call Center UI
// ============================================

import { useNavigate } from 'react-router-dom';

function CallCenterUI() {
  const navigate = useNavigate();
  const {
    incomingCalls,
    ongoingCalls,
    acceptCall,
    rejectCall,
    endCall
  } = useEmergencyCalls();

  const handleCreateIncident = (call) => {
    // Navigate to incident report with pre-filled data
    navigate('/incident-report', {
      state: {
        callData: call,
        fromCall: true
      }
    });
  };

  return (
    <div className="call-center">
      {/* Incoming Calls */}
      <section className="incoming">
        <h3>Incoming Calls ({incomingCalls.length})</h3>
        {incomingCalls.map(call => (
          <div key={call.id} className="call-item">
            <div className="call-info">
              <span className="caller-name">{call.callerName}</span>
              <span className="type-badge">{call.emergencyType}</span>
            </div>
            <div className="call-actions">
              <button 
                onClick={() => acceptCall(call.id)}
                className="btn-accept"
              >
                ✓ Accept
              </button>
              <button 
                onClick={() => rejectCall(call.id)}
                className="btn-reject"
              >
                ✗ Reject
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Ongoing Calls */}
      <section className="ongoing">
        <h3>Ongoing Calls ({ongoingCalls.length})</h3>
        {ongoingCalls.map(call => (
          <div key={call.id} className="call-item active">
            <div className="call-info">
              <span className="caller-name">{call.callerName}</span>
              <span className="duration">⏱ {call.duration}</span>
            </div>
            <div className="call-actions">
              <button 
                onClick={() => handleCreateIncident(call)}
                className="btn-incident"
              >
                📝 Incident
              </button>
              <button 
                onClick={() => endCall(call.id)}
                className="btn-end"
              >
                ⏹ End
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}


// ============================================
// EXAMPLE 3: Incoming Call Notification Handler
// ============================================

function NotificationService() {
  const {
    incomingCalls,
    hasIncomingCalls
  } = useEmergencyCalls();

  // Show notification when new call arrives
  useEffect(() => {
    if (hasIncomingCalls && incomingCalls.length > 0) {
      const latestCall = incomingCalls[incomingCalls.length - 1];
      
      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('Emergency Call Received!', {
          body: `${latestCall.callerName} - ${latestCall.emergencyType}`,
          icon: '/emergency-icon.png'
        });
      }

      // Sound alert
      playAlert();
      
      // Flash notification banner
      showNotificationBanner(latestCall);
    }
  }, [incomingCalls, hasIncomingCalls]);

  return null; // This is a service component
}


// ============================================
// EXAMPLE 4: Call History Report
// ============================================

function CallHistoryReport() {
  const { callHistory } = useEmergencyCalls();

  const calculateStats = () => {
    const stats = {
      total: callHistory.length,
      byType: {},
      totalDuration: 0
    };

    callHistory.forEach(call => {
      // Count by emergency type
      stats.byType[call.emergencyType] = 
        (stats.byType[call.emergencyType] || 0) + 1;
      
      // Total duration
      stats.totalDuration += call.duration || 0;
    });

    return stats;
  };

  const stats = calculateStats();

  return (
    <div className="call-history-report">
      <h2>Call History Report</h2>
      
      <div className="summary">
        <div className="stat">
          <span className="label">Total Calls</span>
          <span className="value">{stats.total}</span>
        </div>
        <div className="stat">
          <span className="label">Total Duration</span>
          <span className="value">{stats.totalDuration} mins</span>
        </div>
      </div>

      <div className="breakdown">
        <h3>By Emergency Type</h3>
        {Object.entries(stats.byType).map(([type, count]) => (
          <div key={type}>
            <span>{type}: {count} calls</span>
          </div>
        ))}
      </div>

      <table className="call-table">
        <thead>
          <tr>
            <th>Caller</th>
            <th>Phone</th>
            <th>Type</th>
            <th>Location</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {callHistory.map(call => (
            <tr key={call.id}>
              <td>{call.callerName}</td>
              <td>{call.phoneNumber}</td>
              <td>{call.emergencyType}</td>
              <td>{call.location?.address}</td>
              <td>{call.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ============================================
// EXAMPLE 5: Map Integration with Call Locations
// ============================================

import { useEffect, useRef } from 'react';

function CallLocationMap() {
  const mapRef = useRef(null);
  const {
    incomingCalls,
    ongoingCalls,
    callHistory
  } = useEmergencyCalls();

  // Combine all calls
  const allCalls = [...incomingCalls, ...ongoingCalls, ...callHistory];

  useEffect(() => {
    if (mapRef.current && allCalls.length > 0) {
      // Example: Initialize map with Leaflet or Google Maps
      const map = new window.L.Map(mapRef.current).setView(
        [14.5994, 120.9844], // Manila center
        13
      );

      // Add markers for each call
      allCalls.forEach(call => {
        const { latitude, longitude, address } = call.location;
        
        const marker = L.marker([latitude, longitude])
          .bindPopup(`
            <div>
              <strong>${call.callerName}</strong><br/>
              ${call.emergencyType}<br/>
              ${address}
            </div>
          `)
          .addTo(map);

        // Color code by status
        if (incomingCalls.includes(call)) {
          marker.setIcon(L.icon({ prefix: 'fa', icon: 'fa-phone' }));
        } else if (ongoingCalls.includes(call)) {
          marker.setIcon(L.icon({ prefix: 'fa', icon: 'fa-check' }));
        }
      });
    }
  }, [allCalls, incomingCalls, ongoingCalls]);

  return <div ref={mapRef} style={{ width: '100%', height: '600px' }} />;
}


// ============================================
// EXAMPLE 6: Mobile-Responsive Call Panel
// ============================================

function MobileCallPanel() {
  const [activeTab, setActiveTab] = useState('incoming');
  const {
    incomingCalls,
    ongoingCalls,
    acceptCall,
    endCall
  } = useEmergencyCalls();

  return (
    <div className="mobile-panel">
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'incoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          📥 Incoming ({incomingCalls.length})
        </button>
        <button 
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          🔴 Active ({ongoingCalls.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'incoming' && (
          <div className="calls-list">
            {incomingCalls.map(call => (
              <div key={call.id} className="call-item-mobile">
                <div className="header">
                  <h4>{call.callerName}</h4>
                  <span className="type">{call.emergencyType}</span>
                </div>
                <p className="phone">{call.phoneNumber}</p>
                <p className="location">{call.location?.address}</p>
                <button 
                  onClick={() => acceptCall(call.id)}
                  className="btn-full-width"
                >
                  Accept Call
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'active' && (
          <div className="calls-list">
            {ongoingCalls.map(call => (
              <div key={call.id} className="call-item-mobile active">
                <div className="header">
                  <h4>{call.callerName}</h4>
                  <span className="duration">{call.duration}</span>
                </div>
                <button 
                  onClick={() => endCall(call.id)}
                  className="btn-full-width danger"
                >
                  End Call
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================
// EXAMPLE 7: Testing with Auto-Simulation
// ============================================

function TestingEnvironment() {
  const {
    simulateIncoming,
    loadMockIncomingCalls,
    incomingCallCount
  } = useEmergencyCalls();

  const handleAutoSimulate = () => {
    // Generate 5 random calls at intervals
    const emergencyTypes = ['FIRE', 'RESCUE', 'MEDICAL'];
    const locations = [
      { lat: 14.5995, lon: 120.9842, address: 'Manila' },
      { lat: 14.6091, lon: 120.9824, address: 'Makati' },
      { lat: 14.5994, lon: 120.9844, address: 'BGC' }
    ];

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const location = locations[Math.floor(Math.random() * locations.length)];
        const type = emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)];

        simulateIncoming({
          callerName: `Test Caller ${i + 1}`,
          emergencyType: type,
          description: `Test emergency #${i + 1}`,
          location: {
            latitude: location.lat,
            longitude: location.lon,
            address: location.address
          }
        });
      }, i * 2000); // 2 second intervals
    }
  };

  return (
    <div className="testing-env">
      <h2>Test Environment</h2>
      <button onClick={loadMockIncomingCalls}>
        Load 3 Mock Calls
      </button>
      <button onClick={handleAutoSimulate}>
        Auto-simulate 5 Calls
      </button>
      <p>Current incoming calls: {incomingCallCount}</p>
    </div>
  );
}


// ============================================
// EXAMPLE 8: Context Menu / Right-Click Options
// ============================================

function AdvancedCallCard({ call, onAccept, onReject }) {
  const [showMenu, setShowMenu] = useState(false);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div 
        onContextMenu={handleContextMenu}
        className="call-card"
      >
        <div className="card-content">
          <h4>{call.callerName}</h4>
          <p>{call.phoneNumber}</p>
          <p>{call.emergencyType}</p>
        </div>
      </div>

      {showMenu && (
        <div 
          className="context-menu"
          style={{ top: showMenu.y, left: showMenu.x }}
        >
          <button onClick={() => { onAccept(); setShowMenu(false); }}>
            ✓ Accept
          </button>
          <button onClick={() => { onReject(); setShowMenu(false); }}>
            ✗ Reject
          </button>
          <button onClick={() => setShowMenu(false)}>
            ℹ View Details
          </button>
        </div>
      )}
    </>
  );
}


// ============================================
// EXPORTS
// ============================================

export {
  DashboardExample,
  CallCenterUI,
  NotificationService,
  CallHistoryReport,
  CallLocationMap,
  MobileCallPanel,
  TestingEnvironment,
  AdvancedCallCard
};
