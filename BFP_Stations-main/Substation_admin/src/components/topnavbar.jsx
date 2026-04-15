import { useState, useRef, useEffect, useContext, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStatus } from '../context/StatusContext';
import { useNotifications } from '../context/NotificationContext';
import { AuthContext } from '../context/AuthContext';
import '../style/topnavbar.css';

const INCIDENT_REPORT_PREVIEW_KEY = 'incidentReportPreview';

function buildIncidentPreviewKey(alarmId) {
  const numericAlarmId = Number(alarmId || 0) || null;
  return numericAlarmId
    ? `${INCIDENT_REPORT_PREVIEW_KEY}:${numericAlarmId}`
    : null;
}

function formatTimeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Topnavbar() {
  const [showNotif, setShowNotif] = useState(false);

  // Use status context
  const { stationStatus, getStatusClass, getReadinessPercentage, checklistUpdated } = useStatus();

  // Use global notification context
  const { notifications, unreadCount, markAsRead, clearNotifications } = useNotifications();

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Resolve avatar: localStorage cache takes priority, then context, then null
  const avatarUrl = useMemo(() => {
    try {
      const uid = user?.user_id || user?.id || '';
      if (uid) {
        const cached = localStorage.getItem(`profilePic_${uid}`);
        if (cached) return cached;
      }
      return user?.profile_picture_url || null;
    } catch {
      return null;
    }
  }, [user?.user_id, user?.id, user?.profile_picture_url]);
  const initials = (user?.first_name?.[0] || user?.name?.[0] || '?').toUpperCase();

  const notifRef = useRef(null);
  const notifSoundRef = useRef(null);
  const openSoundRef = useRef(null);
  const prevUnreadRef = useRef(0);

  useEffect(() => {
    notifSoundRef.current = new Audio('/sounds/notif.mp3');
    openSoundRef.current = new Audio('/sounds/open.mp3');
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notification sound — only when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      notifSoundRef.current?.play().catch(() => {});
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const toggleNotification = () => {
    openSoundRef.current?.play().catch(() => {});
    setShowNotif((prev) => !prev);
  };

  const handleViewNotification = useCallback(
    (n) => {
      markAsRead(n.id);
      if (n.payload) {
        try {
          const alarmId = n.payload?.alarmId || n.payload?.id || null;
          const storageKey = buildIncidentPreviewKey(alarmId);
          const serializedPayload = JSON.stringify(n.payload);

          if (storageKey) {
            sessionStorage.setItem(storageKey, serializedPayload);
            localStorage.setItem(storageKey, serializedPayload);
            sessionStorage.removeItem(INCIDENT_REPORT_PREVIEW_KEY);
            localStorage.removeItem(INCIDENT_REPORT_PREVIEW_KEY);
          } else {
            sessionStorage.setItem(INCIDENT_REPORT_PREVIEW_KEY, serializedPayload);
            localStorage.setItem(INCIDENT_REPORT_PREVIEW_KEY, serializedPayload);
          }
        } catch (error) {
          console.warn('[Notification] Failed to store incident preview:', error);
        }
      }
      setShowNotif(false);
      navigate('/incident-report?notification=1', {
        state: {
          incidentPreview: n.payload || null,
          alarmId: n.payload?.alarmId || n.payload?.id || null,
        },
      });
    },
    [markAsRead, navigate]
  );

  const readinessPercentage = getReadinessPercentage();
  const isNotReady = !checklistUpdated && readinessPercentage === 0;

  return (
    <header className="topnav">
      <div className="topnav-left">
        <h2 className="topnav-title">BFP Station Status</h2>

        <div className={`status-chip ${getStatusClass()} ${isNotReady ? 'not-updated' : ''}`}>
          <span className="status-dot"></span>
          <span className="status-text">{stationStatus}</span>
          <span className="readiness-percentage">{readinessPercentage}%</span>
          {isNotReady && <span className="warning-text">⚠️</span>}
        </div>

        {isNotReady && (
          <div className="status-warning">
            <span>Checklist not updated - Station not ready</span>
          </div>
        )}
      </div>

      <div className="topnav-right">
        <div className="notif-wrapper" ref={notifRef}>
          <button
            className={`notif-btn ${showNotif ? 'notif-active' : ''}`}
            onClick={toggleNotification}
          >
            <i className="fa-solid fa-bell"></i>
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotif && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <h4>Notifications</h4>
                {notifications.length > 0 && (
                  <button className="notif-clear-btn" onClick={clearNotifications}>
                    Clear All
                  </button>
                )}
              </div>

              <div className="notif-list">
                {notifications.length === 0 && (
                  <div className="notif-empty">
                    <i className="fa-regular fa-bell-slash notif-empty-icon"></i>
                    <p>No notifications yet</p>
                    <span>You're up to date</span>
                  </div>
                )}

                {notifications.map((n) => (
                  <div key={n.id} className={`notif-item ${n.read ? '' : 'notif-unread'}`}>
                    <div className="notif-text">
                      <p className="notif-title">{n.title}</p>
                      <span className="notif-message">{n.message}</span>
                      <span className="notif-time">{formatTimeAgo(n.createdAt)}</span>
                    </div>
                    <button
                      type="button"
                      className="notif-view-btn"
                      onClick={() => handleViewNotification(n)}
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
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          className="user-avatar"
          style={{
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{initials}</span>
          )}
        </div>
      </div>
    </header>
  );
}
