import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import "../style/settings.css";

export default function Settings() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("profile");
  const [geoLoading, setGeoLoading] = useState(false);
  const [stationSaved, setStationSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    emergencyAlerts: true,
    systemUpdates: false,
  });

  const [stationSettings, setStationSettings] = useState({
    stationName: user?.stationInfo?.station_name || "",
    latitude: user?.stationInfo?.latitude || "",
    longitude: user?.stationInfo?.longitude || "",
    contactNumber: "",
  });
  const [stations, setStations] = useState([]);
  const [editingStationId, setEditingStationId] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [deleteModalStationId, setDeleteModalStationId] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');

  const [profile, setProfile] = useState({
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "juan.delacruz@bfp.gov.ph",
    phone: "+63 912 345 6789",
    station: "BFP Central Station",
    badgeNumber: "BFP-01234",
    rank: "Fire Officer 1",
  });

  const [appearance, setAppearance] = useState({
    theme: "light",
    language: "en",
    timezone: "Asia/Manila",
    dateFormat: "MM/DD/YYYY",
  });

  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    sessionTimeout: "30",
    passwordExpiry: "90",
    loginNotifications: true,
  });

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleAppearanceChange = (field, value) => {
    setAppearance(prev => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (field, value) => {
    setSecurity(prev => ({ ...prev, [field]: value }));
  };

  const handleGetCoordinates = () => {
    setGeoLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setStationSettings(prev => ({
            ...prev,
            latitude: latitude.toFixed(8),
            longitude: longitude.toFixed(8)
          }));
          setGeoLoading(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to get your location. Please check browser permissions.");
          setGeoLoading(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
      setGeoLoading(false);
    }
  };

  const handleStationChange = (field, value) => {
    setStationSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveStationSettings = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      // If the current user is admin (can create/update any station), use admin endpoints
      if (user?.role === 'admin') {
        if (editingStationId) {
          // Update station
          const response = await fetch(`${apiUrl}/firestations/${editingStationId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              stationName: stationSettings.stationName,
              contactNumber: stationSettings.contactNumber || null,
              latitude: stationSettings.latitude !== '' ? parseFloat(stationSettings.latitude) : undefined,
              longitude: stationSettings.longitude !== '' ? parseFloat(stationSettings.longitude) : undefined,
            })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to update station');
          alert('Station updated');
        } else {
          // Create station
          const response = await fetch(`${apiUrl}/firestations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              stationName: stationSettings.stationName,
              contactNumber: stationSettings.contactNumber || null,
              latitude: stationSettings.latitude !== '' ? parseFloat(stationSettings.latitude) : null,
              longitude: stationSettings.longitude !== '' ? parseFloat(stationSettings.longitude) : null,
              stationType: stationSettings.stationType || 'Substation'
            })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to create station');
          alert('Station created');
        }

        // Refresh station list after create/update
        await fetchStations();
        setEditingStationId(null);
        setStationSaved(true);
        setTimeout(() => setStationSaved(false), 3000);
        return;
      }

      // Otherwise, fallback to updating assigned station for non-admin users
      const response = await fetch(`${apiUrl}/update-station`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          stationName: stationSettings.stationName,
          latitude: parseFloat(stationSettings.latitude),
          longitude: parseFloat(stationSettings.longitude),
          contactNumber: stationSettings.contactNumber
        })
      });

      const data = await response.json();
      if (response.ok) {
        setStationSaved(true);
        setTimeout(() => setStationSaved(false), 3000);
        alert("Station settings updated successfully!");
      } else {
        alert(data.message || "Failed to update station settings");
      }
    } catch (error) {
      console.error("Error saving station settings:", error);
      alert("Error saving station settings: " + error.message);
    }
  };

  const fetchStations = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      console.log('Fetching stations from:', `${apiUrl}/firestations`);
      const res = await fetch(`${apiUrl}/firestations`);
      console.log('Response status:', res.status, 'ok:', res.ok);
      if (res.ok) {
        const data = await res.json();
        console.log('Fetched stations:', data.stations);
        setStations(data.stations || []);
      } else {
        const errData = await res.json();
        console.error('API error response:', errData);
      }
    } catch (err) {
      console.error('Failed to fetch stations', err);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const handleEditClick = async (id) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/firestations/${id}`);
      if (!res.ok) throw new Error('Failed to load station');
      const data = await res.json();
      setStationSettings({
        stationName: data.station.station_name || '',
        contactNumber: data.station.contact_number || '',
        latitude: data.station.latitude || '',
        longitude: data.station.longitude || '',
        stationType: data.station.station_type || 'Substation'
      });
      setEditingStationId(id);
      // show the edit form in a modal instead of the right-side panel
      setShowFormModal(true);
    } catch (err) {
      console.error(err);
      alert('Unable to load station details');
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteModalStationId(id);
    setDeletePassword('');
  };

  const handleConfirmDelete = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      console.log('[Delete] Token:', token ? 'exists' : 'missing');
      console.log('[Delete] API URL:', apiUrl);
      console.log('[Delete] Password entered:', deletePassword ? 'yes' : 'no');
      
      // Verify password before deletion
      let verifyRes;
      try {
        verifyRes = await fetch(`${apiUrl}/verify-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ password: deletePassword })
        });
      } catch (fetchErr) {
        console.error('[Delete] Fetch error:', fetchErr);
        throw new Error(`Failed to verify password: ${fetchErr.message}`);
      }
      
      console.log('[Delete] Verify response status:', verifyRes.status);
      const verifyData = await verifyRes.json();
      console.log('[Delete] Verify response:', verifyData);
      
      if (!verifyRes.ok) {
        alert('Incorrect password');
        return;
      }
      
      // Proceed with deletion
      const res = await fetch(`${apiUrl}/firestations/${deleteModalStationId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete station');
      alert('Station deleted');
      await fetchStations();
      setDeleteModalStationId(null);
      setDeletePassword('');
    } catch (err) {
      console.error('Delete station error:', err);
      alert('Unable to delete station: ' + err.message);
    }
  };

  const handleCreateClick = () => {
    setStationSettings({ stationName: '', contactNumber: '', latitude: '', longitude: '', stationType: 'Substation' });
    setEditingStationId(null);
    setShowFormModal(true);
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: "fa-user" },
    { id: "notifications", label: "Notifications", icon: "fa-bell" },
    { id: "appearance", label: "Appearance", icon: "fa-palette" },
    { id: "security", label: "Security", icon: "fa-shield-halved" },
    { id: "system", label: "System", icon: "fa-cog" },
    { id: "station", label: "Station Settings", icon: "fa-building" },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="settings-layout">
        {/* Sidebar Navigation */}
        <div className="settings-sidebar">
          <div className="settings-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`settings-nav-item ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`fa-solid ${tab.icon}`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="settings-content">
          {/* Profile Settings */}
          {activeTab === "profile" && (
            <div className="settings-section">
              <h2>Profile Information</h2>
              <p className="section-description">Update your personal information and contact details</p>
              
              <div className="settings-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => handleProfileChange("firstName", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => handleProfileChange("lastName", e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleProfileChange("email", e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => handleProfileChange("phone", e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Station</label>
                    <input
                      type="text"
                      value={profile.station}
                      onChange={(e) => handleProfileChange("station", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Badge Number</label>
                    <input
                      type="text"
                      value={profile.badgeNumber}
                      onChange={(e) => handleProfileChange("badgeNumber", e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Rank</label>
                  <select
                    value={profile.rank}
                    onChange={(e) => handleProfileChange("rank", e.target.value)}
                  >
                    <option>Fire Officer 1</option>
                    <option>Fire Officer 2</option>
                    <option>Fire Officer 3</option>
                    <option>Senior Fire Officer</option>
                    <option>Fire Inspector</option>
                    <option>Fire Chief</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button className="btn btn-primary">Save Changes</button>
                  <button className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              <p className="section-description">Choose how you want to receive notifications</p>
              
              <div className="notification-groups">
                <div className="notification-group">
                  <h3>Alert Types</h3>
                  <div className="notification-items">
                    <div className="notification-item">
                      <div className="notification-info">
                        <h4>Email Alerts</h4>
                        <p>Receive email notifications for important updates</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.emailAlerts}
                          onChange={() => handleNotificationChange("emailAlerts")}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="notification-item">
                      <div className="notification-info">
                        <h4>SMS Alerts</h4>
                        <p>Get text messages for emergency situations</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.smsAlerts}
                          onChange={() => handleNotificationChange("smsAlerts")}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="notification-item">
                      <div className="notification-info">
                        <h4>Push Notifications</h4>
                        <p>Browser notifications for real-time updates</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.pushNotifications}
                          onChange={() => handleNotificationChange("pushNotifications")}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="notification-group">
                  <h3>System Notifications</h3>
                  <div className="notification-items">
                    <div className="notification-item">
                      <div className="notification-info">
                        <h4>Emergency Alerts</h4>
                        <p>Immediate notifications for emergency incidents</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.emergencyAlerts}
                          onChange={() => handleNotificationChange("emergencyAlerts")}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="notification-item">
                      <div className="notification-info">
                        <h4>System Updates</h4>
                        <p>Notifications about system maintenance and updates</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.systemUpdates}
                          onChange={() => handleNotificationChange("systemUpdates")}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn btn-primary">Save Preferences</button>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === "appearance" && (
            <div className="settings-section">
              <h2>Appearance</h2>
              <p className="section-description">Customize the look and feel of your interface</p>
              
              <div className="settings-form">
                <div className="form-group">
                  <label>Theme</label>
                  <select
                    value={appearance.theme}
                    onChange={(e) => handleAppearanceChange("theme", e.target.value)}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Language</label>
                  <select
                    value={appearance.language}
                    onChange={(e) => handleAppearanceChange("language", e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="tl">Filipino</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Timezone</label>
                  <select
                    value={appearance.timezone}
                    onChange={(e) => handleAppearanceChange("timezone", e.target.value)}
                  >
                    <option value="Asia/Manila">Asia/Manila (UTC+8)</option>
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="Europe/London">London Time</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Date Format</label>
                  <select
                    value={appearance.dateFormat}
                    onChange={(e) => handleAppearanceChange("dateFormat", e.target.value)}
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD MMM YYYY">DD MMM YYYY</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button className="btn btn-primary">Save Appearance</button>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <div className="settings-section">
              <h2>Security</h2>
              <p className="section-description">Manage your account security and privacy</p>
              
              <div className="security-settings">
                <div className="security-group">
                  <h3>Authentication</h3>
                  <div className="security-items">
                    <div className="security-item">
                      <div className="security-info">
                        <h4>Two-Factor Authentication</h4>
                        <p>Add an extra layer of security to your account</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={security.twoFactorAuth}
                          onChange={() => handleSecurityChange("twoFactorAuth", !security.twoFactorAuth)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="security-item">
                      <div className="security-info">
                        <h4>Login Notifications</h4>
                        <p>Get notified when someone logs into your account</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={security.loginNotifications}
                          onChange={() => handleSecurityChange("loginNotifications", !security.loginNotifications)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="security-group">
                  <h3>Session Management</h3>
                  <div className="settings-form">
                    <div className="form-group">
                      <label>Session Timeout (minutes)</label>
                      <select
                        value={security.sessionTimeout}
                        onChange={(e) => handleSecurityChange("sessionTimeout", e.target.value)}
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                        <option value="240">4 hours</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Password Expiry (days)</label>
                      <select
                        value={security.passwordExpiry}
                        onChange={(e) => handleSecurityChange("passwordExpiry", e.target.value)}
                      >
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                        <option value="180">180 days</option>
                        <option value="365">1 year</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="security-actions">
                  <button className="btn btn-primary">Update Security Settings</button>
                  <button className="btn btn-outline">Change Password</button>
                  <button className="btn btn-danger">Sign Out All Devices</button>
                </div>
              </div>
            </div>
          )}

          {/* System Settings */}
          {activeTab === "system" && (
            <div className="settings-section">
              <h2>System Settings</h2>
              <p className="section-description">Advanced system configuration and maintenance</p>
              
              <div className="system-settings">
                <div className="system-group">
                  <h3>Data Management</h3>
                  <div className="system-items">
                    <button className="system-btn">
                      <i className="fa-solid fa-download"></i>
                      Export Data
                    </button>
                    <button className="system-btn">
                      <i className="fa-solid fa-upload"></i>
                      Import Data
                    </button>
                    <button className="system-btn">
                      <i className="fa-solid fa-trash"></i>
                      Clear Cache
                    </button>
                  </div>
                </div>

                <div className="system-group">
                  <h3>System Information</h3>
                  <div className="system-info">
                    <div className="info-item">
                      <label>Version</label>
                      <span>v2.1.0</span>
                    </div>
                    <div className="info-item">
                      <label>Last Updated</label>
                      <span>November 15, 2025</span>
                    </div>
                    <div className="info-item">
                      <label>Database Status</label>
                      <span className="status-online">Online</span>
                    </div>
                    <div className="info-item">
                      <label>Storage Used</label>
                      <span>2.4 GB / 10 GB</span>
                    </div>
                  </div>
                </div>

                <div className="system-group">
                  <h3>Maintenance</h3>
                  <div className="system-actions">
                    <button className="btn btn-warning">
                      <i className="fa-solid fa-sync"></i>
                      Sync Data
                    </button>
                    <button className="btn btn-info">
                      <i className="fa-solid fa-database"></i>
                      Backup Database
                    </button>
                    <button className="btn btn-danger">
                      <i className="fa-solid fa-exclamation-triangle"></i>
                      Reset System
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Station Settings */}
          {activeTab === "station" && (
            <div className="settings-section">
              <h2>Station Settings</h2>
              <p className="section-description">Create, edit, and manage fire stations</p>

              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Stations</h3>
                    <div>
                      <button className="btn btn-secondary" onClick={handleCreateClick}>+ Create Station</button>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {stations.map(s => (
                        <div key={s.station_id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{s.station_name}</div>
                            <div style={{ color: '#555', marginTop: 6 }}>
                              <strong>Contact:</strong> {s.contact_number || s.contactNumber || '-'}
                            </div>
                            <div style={{ color: '#666', marginTop: 6, fontSize: 13 }}>
                              <span style={{ marginRight: 12 }}><strong>Lat:</strong> {s.latitude}</span>
                              <span><strong>Lng:</strong> {s.longitude}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-danger" onClick={() => handleDeleteClick(s.station_id)}>Del</button>
                            <button className="btn btn-outline" onClick={() => handleEditClick(s.station_id)}>Edit</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Modal for create/edit form */}
                  {showFormModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                      <div style={{ width: 680, maxWidth: '95%', background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', position: 'relative' }}>
                        <h3 style={{ marginTop: 0 }}>{editingStationId ? 'Edit Station' : 'Create Station'}</h3>
                        <div style={{ marginTop: 8 }}>
                          <div className="form-group">
                            <label>Station Name</label>
                            <input type="text" value={stationSettings.stationName} onChange={(e) => handleStationChange('stationName', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Contact Number</label>
                            <input type="text" value={stationSettings.contactNumber} onChange={(e) => handleStationChange('contactNumber', e.target.value)} />
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Latitude</label>
                              <input type="number" step="0.00000001" value={stationSettings.latitude} onChange={(e) => handleStationChange('latitude', e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label>Longitude</label>
                              <input type="number" step="0.00000001" value={stationSettings.longitude} onChange={(e) => handleStationChange('longitude', e.target.value)} />
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Station Type</label>
                            <select value={stationSettings.stationType || 'Substation'} onChange={(e) => handleStationChange('stationType', e.target.value)}>
                              <option value="Main">Main</option>
                              <option value="Substation">Substation</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                            <button className="btn btn-outline" onClick={() => { setShowFormModal(false); setEditingStationId(null); }}>Cancel</button>
                            <button className="btn btn-primary" onClick={async () => { await handleSaveStationSettings(); setShowFormModal(false); setEditingStationId(null); }}> {editingStationId ? 'Update Station' : 'Create Station'}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Modal for delete confirmation with password */}
                  {deleteModalStationId && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                      <div style={{ width: 480, maxWidth: '95%', background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', position: 'relative' }}>
                        <h3 style={{ marginTop: 0, color: '#c41e3a' }}>Delete Station</h3>
                        <p style={{ color: '#555', marginBottom: 20 }}>This action cannot be undone. Please enter your password to confirm deletion.</p>
                        <div className="form-group">
                          <label>Password</label>
                          <input 
                            type="password" 
                            value={deletePassword} 
                            onChange={(e) => setDeletePassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleConfirmDelete()}
                            placeholder="Enter your password"
                            autoFocus
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                          <button className="btn btn-outline" onClick={() => { setDeleteModalStationId(null); setDeletePassword(''); }}>Cancel</button>
                          <button className="btn btn-danger" onClick={handleConfirmDelete}>Delete Station</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
