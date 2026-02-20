import "../style/dashboard.css";
import useEmergencyCalls from "../hooks/useEmergencyCalls";
import { useState } from "react";

export default function Dashboard() {
  const { loadMockIncomingCalls, incomingCallCount } = useEmergencyCalls();
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Mock incident data for different periods
  const incidentStats = {
    day: {
      dispatched: 3,
      fireIncidents: 2,
      totalCalls: 8,
      subStationReports: 1,
      onlineOfficers: 8,
      responseTime: '12 min',
      resolvedIncidents: 5
    },
    month: {
      dispatched: 22,
      fireIncidents: 16,
      totalCalls: 72,
      subStationReports: 39,
      onlineOfficers: 8,
      responseTime: '15 min',
      resolvedIncidents: 68
    },
    year: {
      dispatched: 186,
      fireIncidents: 142,
      totalCalls: 524,
      subStationReports: 312,
      onlineOfficers: 8,
      responseTime: '14 min',
      resolvedIncidents: 498
    }
  };

  const currentStats = incidentStats[selectedPeriod];

  return (
    <div className="dashboard-page">

      {/* Page Header */}
      <div className="dashboard-header">
        <h1>Bureau of Fire Protection Dashboard</h1>
        <p>Zamboanga City Fire District - Operational Statistics and Incident Monitoring</p>
      </div>

      {/* Period Selector */}
      <div className="period-selector">
        <label className="period-label">Reporting Period:</label>
        <div className="period-buttons">
          <button 
            className={`period-btn ${selectedPeriod === 'day' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('day')}
          >
            Daily
          </button>
          <button 
            className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('month')}
          >
            Monthly
          </button>
          <button 
            className={`period-btn ${selectedPeriod === 'year' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('year')}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* TOP STATS ROW */}
      <div className="stats-container">

        {/* CARD 1 - Dispatched Incidents */}
        <div className="stat-card">
          <div className="stat-header">
            <h3>Dispatched Incidents</h3>
            <div className="stat-icon dispatched">
              <i className="fa-solid fa-truck"></i>
            </div>
          </div>
          <div className="stat-value">{currentStats.dispatched}</div>
          <div className="stat-period">
            {selectedPeriod === 'day' ? 'Today' : selectedPeriod === 'month' ? 'This Month' : 'This Year'}
          </div>
        </div>

        {/* CARD 2 - Fire Incidents */}
        <div className="stat-card">
          <div className="stat-header">
            <h3>Fire Incidents</h3>
            <div className="stat-icon fire">
              <i className="fa-solid fa-fire-flame-curved"></i>
            </div>
          </div>
          <div className="stat-value">{currentStats.fireIncidents}</div>
          <div className="stat-period">
            {selectedPeriod === 'day' ? 'Today' : selectedPeriod === 'month' ? 'This Month' : 'This Year'}
          </div>
        </div>

        {/* CARD 3 - Total Calls */}
        <div className="stat-card">
          <div className="stat-header">
            <h3>Emergency Calls</h3>
            <div className="stat-icon calls">
              <i className="fa-solid fa-phone"></i>
            </div>
          </div>
          <div className="stat-value">{currentStats.totalCalls}</div>
          <div className="stat-period">
            {selectedPeriod === 'day' ? 'Today' : selectedPeriod === 'month' ? 'This Month' : 'This Year'}
          </div>
        </div>

        {/* CARD 4 - Sub-Station Reports */}
        <div className="stat-card">
          <div className="stat-header">
            <h3>Sub-Station Reports</h3>
            <div className="stat-icon reports">
              <i className="fa-solid fa-file-lines"></i>
            </div>
          </div>
          <div className="stat-value">{currentStats.subStationReports}</div>
          <div className="stat-period">
            {selectedPeriod === 'day' ? 'Today' : selectedPeriod === 'month' ? 'This Month' : 'This Year'}
          </div>
        </div>

        {/* CARD 5 - Response Time */}
        <div className="stat-card">
          <div className="stat-header">
            <h3>Average Response Time</h3>
            <div className="stat-icon response">
              <i className="fa-solid fa-stopwatch"></i>
            </div>
          </div>
          <div className="stat-value">{currentStats.responseTime}</div>
          <div className="stat-period">
            {selectedPeriod === 'day' ? 'Today' : selectedPeriod === 'month' ? 'This Month' : 'This Year'}
          </div>
        </div>

        {/* CARD 6 - Resolved Incidents */}
        <div className="stat-card">
          <div className="stat-header">
            <h3>Resolved Incidents</h3>
            <div className="stat-icon resolved">
              <i className="fa-solid fa-check"></i>
            </div>
          </div>
          <div className="stat-value">{currentStats.resolvedIncidents}</div>
          <div className="stat-period">
            {selectedPeriod === 'day' ? 'Today' : selectedPeriod === 'month' ? 'This Month' : 'This Year'}
          </div>
        </div>

        {/* CARD 7 - Active Personnel */}
        <div className="stat-card">
          <div className="stat-header">
            <h3>Active Personnel</h3>
            <div className="stat-icon personnel">
              <i className="fa-solid fa-users"></i>
            </div>
          </div>
          <div className="stat-value">{currentStats.onlineOfficers}</div>
          <div className="stat-period">Currently On Duty</div>
        </div>

      </div>

      {/* MAIN CONTENT GRID */}
      <div className="main-grid">

        {/* LEFT - INCIDENT ANALYSIS */}
        <div className="analysis-section">
          <div className="section-card">
            <h3>Incident Analysis</h3>
            <div className="chart-container">
              <div className="simple-chart">
                <div className="chart-bars">
                  <div className="chart-bar" style={{ height: '65%' }}>
                    <span className="bar-label">Mon</span>
                  </div>
                  <div className="chart-bar" style={{ height: '80%' }}>
                    <span className="bar-label">Tue</span>
                  </div>
                  <div className="chart-bar" style={{ height: '45%' }}>
                    <span className="bar-label">Wed</span>
                  </div>
                  <div className="chart-bar" style={{ height: '90%' }}>
                    <span className="bar-label">Thu</span>
                  </div>
                  <div className="chart-bar" style={{ height: '70%' }}>
                    <span className="bar-label">Fri</span>
                  </div>
                  <div className="chart-bar" style={{ height: '55%' }}>
                    <span className="bar-label">Sat</span>
                  </div>
                  <div className="chart-bar" style={{ height: '30%' }}>
                    <span className="bar-label">Sun</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3>Incident Classification</h3>
            <div className="classification-grid">
              <div className="class-item">
                <div className="class-icon fire-class">
                  <i className="fa-solid fa-fire-flame-curved"></i>
                </div>
                <div className="class-details">
                  <h4>Fire Related</h4>
                  <div className="class-stats">
                    <span className="class-count">{currentStats.fireIncidents}</span>
                    <span className="class-percent">72%</span>
                  </div>
                </div>
              </div>
              <div className="class-item">
                <div className="class-icon medical-class">
                  <i className="fa-solid fa-kit-medical"></i>
                </div>
                <div className="class-details">
                  <h4>Medical</h4>
                  <div className="class-stats">
                    <span className="class-count">3</span>
                    <span className="class-percent">18%</span>
                  </div>
                </div>
              </div>
              <div className="class-item">
                <div className="class-icon rescue-class">
                  <i className="fa-solid fa-hands-helping"></i>
                </div>
                <div className="class-details">
                  <h4>Rescue</h4>
                  <div className="class-stats">
                    <span className="class-count">2</span>
                    <span className="class-percent">10%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT - RECENT INCIDENTS */}
        <div className="incidents-section">
          <div className="section-card">
            <div className="section-header">
              <h3>Recent Incidents</h3>
            </div>
            
            <div className="incidents-list">
              {/* Incident 1 */}
              <div className="incident-item high-priority">
                <div className="incident-content">
                  <div className="incident-header">
                    <span className="incident-id">INC-2024-001</span>
                  </div>
                  <h4>Electrical Fire</h4>
                  <p className="incident-location">
                    <i className="fa-solid fa-location-dot"></i>
                    Brgy. Mikalig, Zamboanga City
                  </p>
                  <div className="incident-meta">
                    <span className="reporter">Juan Dela Cruz</span>
                    <span className="time">2 minutes ago</span>
                  </div>
                </div>
                <div className="incident-actions">
                  <button className="action-btn respond">Respond</button>
                </div>
              </div>

              {/* Incident 2 */}
              <div className="incident-item medium-priority">
                <div className="incident-content">
                  <div className="incident-header">
                    <span className="incident-id">INC-2024-002</span>
                  </div>
                  <h4>Structural Fire</h4>
                  <p className="incident-location">
                    <i className="fa-solid fa-location-dot"></i>
                    Gov. Camins Avenue, Zamboanga City
                  </p>
                  <div className="incident-meta">
                    <span className="reporter">Maria Reyes</span>
                    <span className="time">15 minutes ago</span>
                  </div>
                </div>
                <div className="incident-actions">
                  <span className="status-badge completed">COMPLETED</span>
                </div>
              </div>

              {/* Incident 3 */}
              <div className="incident-item low-priority">
                <div className="incident-content">
                  <div className="incident-header">
                    <span className="incident-id">INC-2024-003</span>
                  </div>
                  <h4>Medical Emergency</h4>
                  <p className="incident-location">
                    <i className="fa-solid fa-location-dot"></i>
                    Pasonanca, Zamboanga City
                  </p>
                  <div className="incident-meta">
                    <span className="reporter">Carlos Santos</span>
                    <span className="time">1 hour ago</span>
                  </div>
                </div>
                <div className="incident-actions">
                  <span className="status-badge completed">COMPLETED</span>
                </div>
              </div>
            </div>

            <div className="section-footer">
              <button className="load-more-btn" onClick={loadMockIncomingCalls}>
                Load More Incidents ({incomingCallCount})
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
