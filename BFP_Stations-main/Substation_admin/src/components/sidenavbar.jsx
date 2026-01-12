import { NavLink, useNavigate } from "react-router-dom";
import "../style/navbar.css";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // clear session (optional)
    // localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <aside className="sidebar">

      {/* Logo / Avatar */}
      <div className="station-name">Branch BFP</div>

      {/* MAIN NAVIGATION */}
      <nav className="nav">
        <NavLink to="/" className="nav-item">
          <i className="fa-solid fa-chart-line"></i> Dashboard
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
