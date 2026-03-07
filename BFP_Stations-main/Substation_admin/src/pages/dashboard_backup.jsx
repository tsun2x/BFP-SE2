import "../style/dashboard.css";

export default function Dashboard() {
  return (
    <div className="dashboard-page">

      {/* Page Header */}
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Operational overview — dispatched incidents, incoming calls, and incident breakdown.</p>
      </div>

      {/* TOP STATS ROW */}
      <div className="stats-grid">

        {/* CARD 1 */}
        <div className="stat-card">
          <div className="stat-left">
            <h2>22</h2>
            <p>Dispatched Incidents</p>
            <span>This Month</span>
          </div>

          <div className="stat-icon">
            <i className="fa-solid fa-chart-simple"></i>
          </div>
        </div>

        {/* CARD 2 */}
        <div className="stat-card">
          <div className="stat-left">
            <h2>16</h2>
            <p>Fire Incidents</p>
            <span>This Month</span>
          </div>

          <div className="stat-icon">
            <i className="fa-solid fa-fire"></i>
          </div>
        </div>

        {/* CARD 3 */}
        <div className="stat-card">
          <div className="stat-left">
            <h2>72</h2>
            <p>Total Calls</p>
            <span>This Month</span>
          </div>

          <div className="stat-icon">
            <i className="fa-solid fa-phone-volume"></i>
          </div>
        </div>

      </div>

      {/* MAIN GRID */}
      <div className="main-content-grid">

        {/* LEFT ANALYTICS */}
        <div className="left-analytics">
          <div className="chart-card">
            <h3>Fire Incident Trend</h3>
            <div className="chart-placeholder">Chart here</div>
          </div>

          <div className="chart-card">
            <h3>Severity Breakdown</h3>
            <div className="chart-placeholder">Chart here</div>
          </div>
        </div>

        {/* RIGHT - RECENT CALLS */}
        <div className="recent-calls-card">
          <div className="recent-header">
            <h3>Recent Emergency Calls</h3>
          </div>

          {/* Call 1 */}
          <div className="call-item">
            <div>
              <p className="call-name">Juan Dela Cruz</p>
              <p className="call-type">Electrical Fire</p>
              <p className="call-location">Brgy. Mikalig</p>
            </div>
            <div className="call-meta">
              <span className="badge pending">Pending</span>
              <p className="call-time">Nov 3 — 3:42 PM</p>
            </div>
          </div>

          {/* Call 2 */}
          <div className="call-item">
            <div>
              <p className="call-name">Maria Reyes</p>
              <p className="call-type">Structural Fire</p>
              <p className="call-location">Gov. Camins Ave</p>
            </div>
            <div className="call-meta">
              <span className="badge responded">Responded</span>
              <p className="call-time">Nov 5 — 10:24 AM</p>
            </div>
          </div>

          <p className="no-more">No more recent calls</p>
        </div>

      </div>
    </div>
  );
}
