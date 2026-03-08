import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import apiClient from "../utils/apiClient";
import { useToast } from "../components/Toast";
import "../style/settings.css";

export default function Settings() {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("profile");
  const [geoLoading, setGeoLoading] = useState(false);
  const [stationSaved, setStationSaved] = useState(false);
  const toast = useToast();
  const [isSavingStation, setIsSavingStation] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [stationErrors, setStationErrors] = useState({});

  // Personnel tab state
  const [personnel, setPersonnel] = useState([]);
  const [personnelLoading, setPersonnelLoading] = useState(false);
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
    contactNumber: user?.stationInfo?.contact_number || user?.stationInfo?.contactNumber || "",
  });

  // Keep station settings in sync when user object updates (e.g., after login)
  useEffect(() => {
    setStationSettings({
      stationName: user?.stationInfo?.station_name || "",
      latitude: user?.stationInfo?.latitude || "",
      longitude: user?.stationInfo?.longitude || "",
      contactNumber: user?.stationInfo?.contact_number || user?.stationInfo?.contactNumber || "",
    });
  }, [user]);

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
      setProfile((prev) => ({
        ...prev,
        firstName: user.first_name || user.firstName || prev.firstName,
        middleName: user.middle_name || user.middleName || prev.middleName || "",
        lastName: user.last_name || user.lastName || prev.lastName,
        email: user.email || prev.email,
        phone: user.phone_number || user.phone || prev.phone,
        station: user.station_name || user.stationInfo?.station_name || user.substation || user.station || prev.station,
        badgeNumber: user.id_number || user.idNumber || prev.badgeNumber,
        rank: user.rank || prev.rank || "Fire Officer 1",
      }));
    }
  }, [user]);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("meProfile") || "null");
      if (cached) {
        setProfile((prev) => ({
          ...prev,
          firstName: cached.first_name || cached.firstName || prev.firstName,
          middleName: cached.middle_name || cached.middleName || prev.middleName || "",
          lastName: cached.last_name || cached.lastName || prev.lastName,
          email: cached.email || prev.email,
          phone: cached.phone_number || cached.phone || prev.phone,
          station: cached.station_name || cached.substation || cached.station || prev.station,
          badgeNumber: cached.id_number || cached.idNumber || prev.badgeNumber,
          rank: cached.rank || prev.rank,
        }));
      }
    } catch (e) {}

    const hydrateMe = async () => {
      try {
        const data = await apiClient.get("/me");
        const me = data?.user || data;
        if (!me) return;

        setProfile((prev) => ({
          ...prev,
          firstName: me.first_name || me.firstName || prev.firstName,
          middleName: me.middle_name || me.middleName || prev.middleName || "",
          lastName: me.last_name || me.lastName || prev.lastName,
          email: me.email || prev.email,
          phone: me.phone_number || me.phone || prev.phone,
          station: me.station_name || me.substation || me.station || prev.station,
          badgeNumber: me.id_number || me.idNumber || prev.badgeNumber,
          rank: me.rank || prev.rank,
        }));

        try {
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem("user", JSON.stringify({ ...stored, ...me }));
        } catch (e) {}

        try {
          localStorage.setItem("meProfile", JSON.stringify(me));
        } catch (e) {}
      } catch (err) {
        console.error("Failed to hydrate /me:", err);
      }
    };

    hydrateMe();
  }, []);

  useEffect(() => {
    if (activeTab !== 'personnel') return;
    const stationId = user?.assigned_station_id || user?.assignedStationId || user?.stationInfo?.station_id;
    if (!stationId) return;
    const fetchPersonnel = async () => {
      setPersonnelLoading(true);
      try {
        const res = await apiClient.get(`/officers?station_id=${stationId}`);
        setPersonnel(res?.data || res || []);
      } catch (err) {
        toast.error(`Failed to load personnel: ${err.message}`);
      } finally {
        setPersonnelLoading(false);
      }
    };
    fetchPersonnel();
  }, [activeTab, user]);

  const handleNotificationChange = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleAppearanceChange = (field, value) => {
    setAppearance((prev) => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (field, value) => {
    setSecurity((prev) => ({ ...prev, [field]: value }));
  };

  const handleGetCoordinates = () => {
    setGeoLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setStationSettings((prev) => ({
            ...prev,
            latitude: latitude.toFixed(8),
            longitude: longitude.toFixed(8),
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
    setStationSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveStationSettings = async () => {
    setStationErrors({});
    if (!stationSettings.stationName || stationSettings.stationName.trim() === "") {
      setStationErrors({ stationName: "Station name is required" });
      toast.error("Station name is required");
      return;
    }

    const lat = stationSettings.latitude !== "" ? parseFloat(stationSettings.latitude) : null;
    const lng = stationSettings.longitude !== "" ? parseFloat(stationSettings.longitude) : null;
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
      await apiClient.put("/update-station", {
        stationName: stationSettings.stationName,
        latitude: lat,
        longitude: lng,
        contactNumber: stationSettings.contactNumber || null,
      });

      setStationSaved(true);
      setTimeout(() => setStationSaved(false), 3000);
      toast.success("Station settings updated successfully");
    } catch (error) {
      console.error("Error saving station settings:", error);
      toast.error(error.message || "Failed to save station settings");
    } finally {
      setIsSavingStation(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileErrors({});
    if (!profile.firstName || !profile.lastName) {
      setProfileErrors({ name: "First and last name are required" });
      toast.error("First and last name are required");
      return;
    }
    if (profile.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.email)) {
      setProfileErrors({ email: "Invalid email" });
      toast.error("Invalid email address");
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload = {
        first_name: profile.firstName,
        middle_name: profile.middleName,
        last_name: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        station: profile.station,
        badge_number: profile.badgeNumber,
        rank: profile.rank,
      };
      await apiClient.put("/me", payload);
      toast.success("Profile updated");

      try {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        const updated = { ...stored, ...payload };
        localStorage.setItem("user", JSON.stringify(updated));
      } catch (e) {}
    } catch (err) {
      console.error("Profile save error", err);
      toast.error(err.message || "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const current = window.prompt("Enter current password:");
    if (!current) return;
    const newPass = window.prompt("Enter new password (min 8 chars):");
    if (!newPass) return;
    if (newPass.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.post("/change-password", { currentPassword: current, newPassword: newPass });
      toast.success("Password changed. Please login again.");
      logout();
    } catch (err) {
      console.error("Change password error", err);
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: "fa-user" },
    { id: "notifications", label: "Notifications", icon: "fa-bell" },
    { id: "security", label: "Security", icon: "fa-shield-halved" },
    { id: "station", label: "Station Settings", icon: "fa-building" },
    { id: "personnel", label: "Personnel", icon: "fa-id-badge" },
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
            {tabs.map((tab) => (
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
                    <label>Middle Name</label>
                    <input
                      type="text"
                      value={profile.middleName}
                      onChange={(e) => handleProfileChange("middleName", e.target.value)}
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
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? "Saving..." : "Save Changes"}
                  </button>
                  <button className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              <p className="section-description">Manage your emergency alert preferences</p>

              <div className="notification-groups">
                <div className="notification-group">
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
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn btn-primary">Save Preferences</button>
              </div>
            </div>
          )}

          {/* Personnel */}
          {activeTab === "personnel" && (
            <div className="settings-section">
              <h2>Personnel</h2>
              <p className="section-description">Officers assigned to your station</p>

              {personnelLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading personnel...</div>
              ) : personnel.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No personnel found for this station.</div>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Name</th>
                        <th style={{ padding: '10px 14px', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Rank</th>
                        <th style={{ padding: '10px 14px', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Role</th>
                        <th style={{ padding: '10px 14px', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personnel.map((p, i) => (
                        <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.name || '—'}</td>
                          <td style={{ padding: '10px 14px', color: '#555' }}>{p.rank || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ background: '#e8f4fd', color: '#1a6bb0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' }}>
                              {p.role}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#555' }}>{p.phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>{personnel.length} officer{personnel.length !== 1 ? 's' : ''} at this station</p>
                </div>
              )}
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
                  <button
                    className="btn btn-outline"
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </button>
                  <button className="btn btn-danger">Sign Out All Devices</button>
                </div>
              </div>
            </div>
          )}

          {/* Station Settings - My Assigned Station (Read-only view with limited editing) */}
          {activeTab === "station" && (
            <div className="settings-section">
              <h2>My Assigned Station</h2>
              <p className="section-description">View and update your assigned fire station information</p>
              
              <div className="settings-form">
                {stationSaved && (
                  <div className="success-message" style={{ 
                    padding: '12px 16px', 
                    backgroundColor: '#d4edda', 
                    color: '#155724', 
                    borderRadius: '6px', 
                    marginBottom: '16px',
                    border: '1px solid #c3e6cb'
                  }}>
                    ✓ Station settings saved successfully!
                  </div>
                )}

                {/* Station name is read-only */}
                <div className="form-group">
                  <label>Station Name</label>
                  <input
                    type="text"
                    value={stationSettings.stationName}
                    readOnly
                    placeholder="No assigned station"
                    style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Contact the Main admin to change your assigned station.
                  </p>
                </div>

                <div className="form-group">
                  <label>Contact Number</label>
                  <input
                    type="text"
                    value={stationSettings.contactNumber}
                    onChange={(e) => handleStationChange("contactNumber", e.target.value)}
                    placeholder="e.g., 991-XXX-XXXX"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Latitude</label>
                    <input
                      type="number"
                      value={stationSettings.latitude}
                      onChange={(e) => handleStationChange("latitude", e.target.value)}
                      placeholder="e.g., 7.515"
                      step="0.00000001"
                    />
                  </div>
                  <div className="form-group">
                    <label>Longitude</label>
                    <input
                      type="number"
                      value={stationSettings.longitude}
                      onChange={(e) => handleStationChange("longitude", e.target.value)}
                      placeholder="e.g., 122.015"
                      step="0.00000001"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn btn-secondary" onClick={handleGetCoordinates} disabled={geoLoading}>
                    {geoLoading ? "Getting location..." : "Get Coordinates"}
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveStationSettings} disabled={isSavingStation}>
                    {isSavingStation ? "Saving..." : "Save Station"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
