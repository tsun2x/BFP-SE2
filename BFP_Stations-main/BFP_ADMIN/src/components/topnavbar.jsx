import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useStatus } from "../context/StatusContext";
import { AuthContext } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { CallContext } from "../context/CallContext";

import "../style/topnavbar.css";

export default function Topnavbar() {
  const [showNotif, setShowNotif] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Use status context
  const { stationStatus, getStatusClass, getReadinessPercentage, checklistUpdated } = useStatus();
  
  // Use auth context
  const { user, logout } = useContext(AuthContext);
  const { notifications, clearNotifications } = useNotifications();
  const { addIncomingCall } = useContext(CallContext);

  const navigate = useNavigate();

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  // 🔊 preload sounds
  const notifSound = new Audio("/sounds/notif.mp3");
  const openSound = new Audio("/sounds/open.mp3");

  // 🔘 Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔔 Trigger notification sound on first load
  useEffect(() => {
    if (hasUnread) notifSound.play();
  }, [hasUnread]);

  const toggleNotification = () => {
    openSound.play(); // 🔊 sound when opening

    setShowNotif((prev) => !prev);

    if (!showNotif) setHasUnread(false); // removes red dot
  };

  const readinessPercentage = getReadinessPercentage();
  const isNotReady = !checklistUpdated && readinessPercentage === 0;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu);
  };

  return (
    <header className="topnav">
      <div className="topnav-right">
        
        <div className="notif-wrapper" ref={notifRef}>
          <button
            className={`notif-btn ${showNotif ? "notif-active" : ""}`}
            onClick={toggleNotification}
          >
            <i className="fa-solid fa-bell"></i>

            {hasUnread && <span className="notif-indicator"></span>}
          </button>

          {showNotif && (
            <div className="notif-dropdown">
              <h4>Notifications</h4>
              {notifications.length === 0 && (
                <div className="notif-item">
                  <p className="notif-title">No notifications yet</p>
                  <span className="notif-time">You're up to date</span>
                </div>
              )}

              {notifications.map((n) => (
                <div key={n.id} className="notif-item">
                  <div className="notif-text">
                    <p className="notif-title">{n.title}</p>
                    <span className="notif-time">{n.message}</span>
                  </div>
                  <button
                    type="button"
                    className="notif-view-btn"
                    onClick={() => {
                      if (n.payload) {
                        addIncomingCall(n.payload);
                      }
                      clearNotifications();
                      setShowNotif(false);
                      navigate('/incident-report');
                    }}
                  >
                    View
                  </button>
                </div>
              ))}

              {isNotReady && (
                <div className="notif-item warning">
                  <p className="notif-title">⚠️ Checklist Not Updated</p>
                  <span className="notif-time">Station readiness at 0%</span>
                </div>
              )}

              <div className="notif-item">
                <p className="notif-title">Station Readiness: {readinessPercentage}%</p>
                <span className="notif-time">Just now</span>
              </div>

              <button className="notif-view-all">View All</button>
            </div>
          )}
        </div>

        {/* User Avatar with Menu */}
        <div className="user-avatar-wrapper" ref={userMenuRef}>
          <button 
            className="user-avatar"
            onClick={handleUserMenuClick}
            title={user?.name || "User"}
          >
            <i className="fa-solid fa-user"></i>
          </button>
          
          {showUserMenu && (
            <div className="user-menu-dropdown">
              <div className="user-menu-header">
                <h5>{user?.name || "User"}</h5>
                <p className="user-rank">{user?.rank || "Officer"}</p>
              </div>
              <div className="user-menu-divider"></div>
              <button className="user-menu-item" onClick={handleLogout}>
                <i className="fa-solid fa-sign-out-alt"></i>
                Logout
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}