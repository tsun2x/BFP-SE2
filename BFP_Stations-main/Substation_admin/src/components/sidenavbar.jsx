import { NavLink, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "../style/navbar.css";

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      navigate("/login", { replace: true });
    }
  };

  return (
    <aside className="sidebar">

      {/* Logo / Avatar */}
      <div className="station-name">Branch BFP</div>

      <hr className="station-divider" />

      {/* MAIN NAVIGATION */}
      <nav className="nav">
        <NavLink to="/" className="nav-item">
          <i className="fa-solid fa-chart-line"></i> Dashboard
        </NavLink>

        <NavLink to="/substation/reports" className="nav-item">
          <i className="fa-solid fa-inbox"></i> Reports
        </NavLink>

        <NavLink to="/officers" className="nav-item">
          <i className="fa-solid fa-users"></i> Fire Officers
        </NavLink>

        <NavLink to="/emergency-calls" className="nav-item">
          <i className="fa-solid fa-phone"></i> Call History
        </NavLink>

        <NavLink to="/incident-report" className="nav-item">
          <i className="fa-solid fa-clipboard-list"></i> Incident Report
        </NavLink>

        <NavLink to="/station-readiness" className="nav-item">
          <i className="fa-solid fa-list-check"></i> Station Readiness
        </NavLink>

        <hr />

        <NavLink to="/settings" className="nav-item">
          <i className="fa-solid fa-gear"></i> Settings
        </NavLink>

        <NavLink to="/test" className="nav-item">
          <i className="fa-solid fa-phone-volume"></i> VoIP Test
        </NavLink>
      </nav>

      {/* LOGOUT BUTTON */}
      <button className="logout-btn" onClick={handleLogout}>
        Log Out
      </button>

    </aside>
  );
}
