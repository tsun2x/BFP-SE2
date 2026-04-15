import { NavLink, useNavigate } from "react-router-dom";
import "../style/sidebar.css";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const stationName =
    user?.stationInfo?.station_name ||
    user?.station_name ||
    user?.substation ||
    user?.station ||
    "Zamboanga Central\nFire Station";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      {/* Logo / Avatar */}
      <div className="station-name">{stationName}</div>

      {/* MAIN NAVIGATION */}
      <nav className="nav">
        <NavLink to="/" className="nav-item">
          <i className="fa-solid fa-chart-line"></i> Dashboard
        </NavLink>

        <NavLink to="/past-incidents" className="nav-item">
          <i className="fa-solid fa-clock-rotate-left"></i> Past Incidents
        </NavLink>

        <NavLink to="/reports" className="nav-item">
          <i className="fa-solid fa-inbox"></i> Reports
        </NavLink>

        <hr />

        <NavLink to="/officers" className="nav-item">
          <i className="fa-solid fa-users"></i> Fire Officers
        </NavLink>

        <NavLink to="/emergency-calls" className="nav-item">
          <i className="fa-solid fa-phone"></i> Call History
        </NavLink>

        <hr />

        <NavLink to="/incident-report" className="nav-item">
          <i className="fa-solid fa-clipboard-list"></i> Incident Report
        </NavLink>

        <NavLink to="/branch-status" className="nav-item">
          <i className="fa-solid fa-square-check"></i> Station Status
        </NavLink>

        <NavLink to="/station-readiness" className="nav-item">
          <i className="fa-solid fa-list-check"></i> Station Readiness
        </NavLink>

        <NavLink to="/content-management" className="nav-item">
          <i className="fa-solid fa-layer-group"></i> Content Management
        </NavLink>

        <hr />

        <NavLink to="/settings" className="nav-item">
          <i className="fa-solid fa-gear"></i> Settings
        </NavLink>
      </nav>

      {/* LOGOUT BUTTON */}
      <button className="logout-btn" onClick={handleLogout}>
        Log Out
      </button>
    </aside>
  );
}
