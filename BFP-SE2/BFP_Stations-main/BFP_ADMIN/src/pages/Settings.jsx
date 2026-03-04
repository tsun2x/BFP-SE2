import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import apiClient from "../utils/apiClient";
import { useToast } from "../components/Toast";
import "../style/settings.css";
import ConfirmModal from "../components/ConfirmModal";

export default function Settings() {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("profile");
  const [geoLoading, setGeoLoading] = useState(false);
  const [stationSaved, setStationSaved] = useState(false);
  const toast = useToast();
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [isSavingStation, setIsSavingStation] = useState(false);
  const [isDeletingStation, setIsDeletingStation] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [stationErrors, setStationErrors] = useState({});
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

  // Load user data on mount
  useEffect(() => {
    if (user) {
      const fullName = user.full_name || user.fullName || user.name || ""
      const nameParts = typeof fullName === 'string' ? fullName.trim().split(/\s+/).filter(Boolean) : []
      const derivedFirstName = nameParts.length ? nameParts[0] : ""
      const derivedLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ""

      setProfile((prev) => ({
        ...prev,
        firstName: user.first_name || user.firstName || derivedFirstName || prev.firstName,
        lastName: user.last_name || user.lastName || derivedLastName || prev.lastName,
        email: user.email || prev.email,
        phone: user.phone_number || user.phone || prev.phone,
        station: user.station_name || user.stationInfo?.station_name || user.substation || user.station || prev.station,
        badgeNumber: user.id_number || user.idNumber || prev.badgeNumber,
        rank: user.rank || prev.rank || "Fire Officer 1",
      }));
      
      // Load assigned station info if available
      if (user.stationInfo) {
        setStationSettings({
          stationName: user.stationInfo.station_name || "",
          latitude: user.stationInfo.latitude || "",
          longitude: user.stationInfo.longitude || "",
          contactNumber: user.stationInfo.contact_number || "",
          stationType: user.stationInfo.station_type || "Substation",
        });
      }
    }
  }, [user]);

  useEffect(() => {
    // Hydrate from cached full profile (separate from AuthContext user/localStorage.user)
    try {
      const cached = JSON.parse(localStorage.getItem('meProfile') || 'null')
      if (cached) {
        setProfile((prev) => ({
          ...prev,
          firstName: cached.first_name || cached.firstName || prev.firstName,
          lastName: cached.last_name || cached.lastName || prev.lastName,
          email: cached.email || prev.email,
          phone: cached.phone_number || cached.phone || prev.phone,
          station: cached.station_name || cached.substation || cached.station || prev.station,
          badgeNumber: cached.id_number || cached.idNumber || prev.badgeNumber,
          rank: cached.rank || prev.rank
        }))
      }
    } catch (e) {}

    const hydrateMe = async () => {
      try {
        const data = await apiClient.get('/me')
        const me = data?.user || data
        if (!me) return

        setProfile((prev) => ({
          ...prev,
          firstName: me.first_name || me.firstName || prev.firstName,
          lastName: me.last_name || me.lastName || prev.lastName,
          email: me.email || prev.email,
          phone: me.phone_number || me.phone || prev.phone,
          station: me.station_name || me.substation || me.station || prev.station,
          badgeNumber: me.id_number || me.idNumber || prev.badgeNumber,
          rank: me.rank || prev.rank
        }))

        try {
          const stored = JSON.parse(localStorage.getItem('user') || '{}')
          localStorage.setItem('user', JSON.stringify({ ...stored, ...me }))
        } catch (e) {}

        try {
          localStorage.setItem('meProfile', JSON.stringify(me))
        } catch (e) {}
      } catch (err) {
        console.error('Failed to hydrate /me:', err)
      }
    }

    hydrateMe()
  }, [])

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
            toast.error("Unable to get your location. Please check browser permissions.");
          setGeoLoading(false);
        }
      );
    } else {
        toast.error("Geolocation is not supported by your browser.");
      setGeoLoading(false);
    }
  };

  const handleStationChange = (field, value) => {
    setStationSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveStationSettings = async () => {
    // basic client-side validation
    setStationErrors({});
    if (!stationSettings.stationName || stationSettings.stationName.trim() === "") {
      setStationErrors({ stationName: "Station name is required" });
      toast.error("Station name is required");
      return;
    }

    const lat = stationSettings.latitude !== '' ? parseFloat(stationSettings.latitude) : null;
    const lng = stationSettings.longitude !== '' ? parseFloat(stationSettings.longitude) : null;
    if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) {
      setStationErrors({ latitude: "Latitude must be between -90 and 90" });
      toast.error("Latitude must be between -90 and 90");
      return;
    }
    if (lng !== null && (isNaN(lng) || lng < -180 || lng > 180)) {
      setStationErrors({ longitude: "Longitude must be between -180 and 180" });
      toast.error("Longitude must be between -180 and 180");
      return;
    }

    setIsSavingStation(true);
    try {
      toast.info("Saving station...");
      // If the current user is admin (can create/update any station)
      if (user?.role === "admin") {
        if (editingStationId) {
          await apiClient.put(`/firestations/${editingStationId}`, {
            stationName: stationSettings.stationName,
            contactNumber: stationSettings.contactNumber || null,
            latitude: lat,
            longitude: lng,
          });
          toast.success("Station updated successfully");
        } else {
          await apiClient.post(`/firestations`, {
            stationName: stationSettings.stationName,
            contactNumber: stationSettings.contactNumber || null,
            latitude: lat,
            longitude: lng,
            stationType: stationSettings.stationType || "Substation",
          });
          toast.success("Station created successfully");
        }

        setShowFormModal(false);
        await fetchStations();
        setEditingStationId(null);
        setStationSaved(true);
        setTimeout(() => setStationSaved(false), 3000);
        return;
      }

      // Non-admin: update assigned station
      await apiClient.put(`/update-station`, {
        stationName: stationSettings.stationName,
        latitude: lat,
        longitude: lng,
        contactNumber: stationSettings.contactNumber || null,
      });
      setShowFormModal(false);
      setStationSaved(true);
      setTimeout(() => setStationSaved(false), 3000);
      toast.success("Station settings updated successfully");
    } catch (error) {
      toast.error(`Error: ${error.message || "Failed to save station"}`);
    } finally {
      setIsSavingStation(false);
    }
  };

  const fetchStations = async () => {
    setIsLoadingStations(true);
    try {
      const data = await apiClient.get("/firestations");
      // backend might return { stations: [...] } or { data: [...] } or array directly
      const stationList = Array.isArray(data) ? data : (data.stations || data.firestations || data.data || []);
      setStations(stationList);
    } catch (err) {
      toast.error(`Failed to load stations: ${err.message}`);
    } finally {
      setIsLoadingStations(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const handleEditClick = async (id) => {
    try {
      const data = await apiClient.get(`/firestations/${id}`);
      const s = data.station || data;
      setStationSettings({
        stationName: s.station_name || "",
        contactNumber: s.contact_number || "",
        latitude: s.latitude || "",
        longitude: s.longitude || "",
        stationType: s.station_type || "Substation",
      });
      setEditingStationId(id);
      // show the edit form in a modal instead of the right-side panel
      setShowFormModal(true);
    } catch (err) {
      console.error(err);
      toast.error('Unable to load station details');
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteModalStationId(id);
    setDeletePassword('');
  };

  const handleConfirmDelete = async () => {
    setIsDeletingStation(true);
    try {
      // Verify password
      await apiClient.post('/verify-password', { password: deletePassword });

      // Delete
      await apiClient.delete(`/firestations/${deleteModalStationId}`);
      toast.success('Station deleted');
      await fetchStations();
      setDeleteModalStationId(null);
      setDeletePassword('');
    } catch (err) {
      console.error('Delete station error:', err);
      toast.error(err.message || 'Unable to delete station');
    } finally {
      setIsDeletingStation(false);
    }
  };

  const handleCreateClick = () => {
    setStationSettings({ stationName: '', contactNumber: '', latitude: '', longitude: '', stationType: 'Substation' });
    setEditingStationId(null);
    setShowFormModal(true);
  };

  const handleSaveProfile = async () => {
    setProfileErrors({});
    if (!profile.firstName || !profile.lastName) {
      setProfileErrors({ name: 'First and last name are required' });
      toast.error('First and last name are required');
      return;
    }
    if (profile.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.email)) {
      setProfileErrors({ email: 'Invalid email' });
      toast.error('Invalid email address');
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload = {
        first_name: profile.firstName,
        last_name: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        station: profile.station,
        badge_number: profile.badgeNumber,
        rank: profile.rank,
      };
      await apiClient.put('/me', payload);
      toast.success('Profile updated');
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        const updated = { ...stored, ...payload };
        localStorage.setItem('user', JSON.stringify(updated));
      } catch (e) {}
    } catch (err) {
      console.error('Profile save error', err);
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const current = window.prompt('Enter current password:');
    if (!current) return;
    const newPass = window.prompt('Enter new password (min 8 chars):');
    if (!newPass) return;
    if (newPass.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setIsChangingPassword(true);
    try {
      await apiClient.post('/change-password', { currentPassword: current, newPassword: newPass });
      toast.success('Password changed. Please login again.');
      logout();
    } catch (err) {
      console.error('Change password error', err);
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
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
                    {isLoadingStations ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading stations...</div>
                    ) : stations.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No stations found. Create one to get started.</div>
                    ) : (
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
                              <button className="btn btn-danger" onClick={() => handleDeleteClick(s.station_id)} disabled={isDeletingStation}>Del</button>
                              <button className="btn btn-outline" onClick={() => handleEditClick(s.station_id)} disabled={isLoadingStations}>Edit</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                            <button className="btn btn-outline" onClick={() => { setShowFormModal(false); setEditingStationId(null); }} disabled={isSavingStation}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveStationSettings} disabled={isSavingStation}>{isSavingStation ? 'Saving...' : (editingStationId ? 'Update Station' : 'Create Station')}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Modal for delete confirmation with password */}
                  {deleteModalStationId && (
                    <div className="modal-overlay">
                      <div className="modal-card">
                        <div className="modal-icon">
                          <i className="fa-solid fa-trash"></i>
                        </div>
                        <h3 className="modal-title">Delete Station</h3>
                        <p className="modal-message">This action cannot be undone. Please enter your password to confirm deletion.</p>
                        
                        <div className="form-group">
                          <label>Password</label>
                          <input 
                            type="password" 
                            value={deletePassword} 
                            onChange={(e) => setDeletePassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleConfirmDelete()}
                            placeholder="Enter your password"
                            autoFocus
                            className="modal-input"
                          />
                        </div>
                        
                        <div className="modal-actions">
                          <button className="modal-btn cancel" onClick={() => { setDeleteModalStationId(null); setDeletePassword(''); }}>
                            <i className="fa-solid fa-xmark"></i> Cancel
                          </button>
                          <button className="modal-btn confirm" onClick={handleConfirmDelete}>
                            <i className="fa-solid fa-trash"></i> Delete Station
                          </button>
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
