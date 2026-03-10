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
  const [geoAccuracyMeters, setGeoAccuracyMeters] = useState(null);
  const [geoQuery, setGeoQuery] = useState('');
  const [geoSearchLoading, setGeoSearchLoading] = useState(false);
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
    address: user?.stationInfo?.address || "",
    contactNumber: "",
  });
  const [stations, setStations] = useState([]);
  const [editingStationId, setEditingStationId] = useState(null);

  // Account Management tab state
  const [officers, setOfficers] = useState([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [deleteModalStationId, setDeleteModalStationId] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');

  const [profile, setProfile] = useState({
    firstName: "Juan",
    middleName: "",
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
      // Load assigned station info if available
      if (user.stationInfo) {
        setStationSettings({
          stationName: user.stationInfo.station_name || "",
          latitude: user.stationInfo.latitude || "",
          longitude: user.stationInfo.longitude || "",
          address: user.stationInfo.address || "",
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
          middleName: cached.middle_name || cached.middleName || prev.middleName || "",
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
          middleName: me.middle_name || me.middleName || prev.middleName || "",
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

  const handleSearchCoordinates = async () => {
    const q = (geoQuery || '').trim();
    if (!q) {
      toast.error('Please type a location to search');
      return;
    }
    setGeoSearchLoading(true);
    try {
      const res = await apiClient.get(`/geocode?q=${encodeURIComponent(q)}&limit=1`);
      const top = res?.results?.[0] || null;
      const lat = top?.lat !== undefined ? Number(top.lat) : NaN;
      const lng = top?.lon !== undefined ? Number(top.lon) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast.error('No coordinates found for that location');
        return;
      }
      setStationSettings((prev) => ({
        ...prev,
        latitude: lat.toFixed(8),
        longitude: lng.toFixed(8),
      }));
      toast.success('Coordinates updated from search');
    } catch (e) {
      toast.error(e?.message || 'Failed to search coordinates');
    } finally {
      setGeoSearchLoading(false);
    }
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
    setGeoAccuracyMeters(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          if (typeof accuracy === 'number' && Number.isFinite(accuracy)) {
            setGeoAccuracyMeters(accuracy);
          }
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
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
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
            address: stationSettings.address?.trim() ? stationSettings.address.trim() : null,
            latitude: lat,
            longitude: lng,
          });
          toast.success("Station updated successfully");
        } else {
          await apiClient.post(`/firestations`, {
            stationName: stationSettings.stationName,
            contactNumber: stationSettings.contactNumber || null,
            address: stationSettings.address?.trim() ? stationSettings.address.trim() : null,
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

  useEffect(() => {
    if (activeTab !== 'accounts') return;
    const fetchOfficers = async () => {
      setOfficersLoading(true);
      try {
        const res = await apiClient.get('/officers');
        const list = res?.data || res || [];
        // resolve station names from already-loaded stations list
        setOfficers(list);
      } catch (err) {
        toast.error(`Failed to load officers: ${err.message}`);
      } finally {
        setOfficersLoading(false);
      }
    };
    fetchOfficers();
  }, [activeTab]);

  const handleEditClick = async (id) => {
    try {
      const data = await apiClient.get(`/firestations/${id}`);
      const s = data.station || data;
      setStationSettings({
        stationName: s.station_name || "",
        contactNumber: s.contact_number || "",
        latitude: s.latitude || "",
        longitude: s.longitude || "",
        address: s.address || "",
        stationType: s.station_type || "Substation",
      });
      setGeoQuery('');
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
    setStationSettings({ stationName: '', contactNumber: '', latitude: '', longitude: '', address: '', stationType: 'Substation' });
    setGeoQuery('');
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
        middle_name: profile.middleName,
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
    { id: "security", label: "Security", icon: "fa-shield-halved" },
    { id: "station", label: "Station Settings", icon: "fa-building" },
    { id: "accounts", label: "Account Management", icon: "fa-users" },
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

          {/* Account Management */}
          {activeTab === "accounts" && (
            <div className="settings-section">
              <h2>Account Management</h2>
              <p className="section-description">View all registered officer accounts across all stations</p>

              {officersLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading accounts...</div>
              ) : officers.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No officer accounts found.</div>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Name</th>
                        <th style={{ padding: '10px 14px', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Rank</th>
                        <th style={{ padding: '10px 14px', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Role</th>
                        <th style={{ padding: '10px 14px', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Phone</th>
                        <th style={{ padding: '10px 14px', borderBottom: '2px solid #e0e0e0', fontWeight: 600 }}>Station</th>
                      </tr>
                    </thead>
                    <tbody>
                      {officers.map((o, i) => {
                        const stationName = stations.find(s => s.station_id === o.assigned_station_id)?.station_name || (o.assigned_station_id ? `Station #${o.assigned_station_id}` : '—');
                        return (
                          <tr key={o.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 500 }}>{o.name || '—'}</td>
                            <td style={{ padding: '10px 14px', color: '#555' }}>{o.rank || '—'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ background: '#e8f4fd', color: '#1a6bb0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' }}>
                                {o.role}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#555' }}>{o.phone || '—'}</td>
                            <td style={{ padding: '10px 14px', color: '#555' }}>{stationName}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>{officers.length} account{officers.length !== 1 ? 's' : ''} found</p>
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
                  <button className="btn btn-outline">Change Password</button>
                  <button className="btn btn-danger">Sign Out All Devices</button>
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
                              {(s.address || s.station_address) && (
                                <div style={{ color: '#666', marginTop: 6, fontSize: 13 }}>
                                  <strong>Address:</strong> {s.address || s.station_address}
                                </div>
                              )}
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
                          <div className="form-group">
                            <label>Address</label>
                            <input
                              type="text"
                              value={stationSettings.address}
                              onChange={(e) => handleStationChange('address', e.target.value)}
                              placeholder="Street / Barangay / City"
                            />
                          </div>
                          <div className="form-group">
                            <label>Search Location</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                type="text"
                                value={geoQuery}
                                onChange={(e) => setGeoQuery(e.target.value)}
                                placeholder='e.g. "Victoria, Zamboanga City"'
                              />
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={handleSearchCoordinates}
                                disabled={geoSearchLoading || isSavingStation}
                              >
                                {geoSearchLoading ? 'Searching...' : 'Search Coordinates'}
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={handleGetCoordinates}
                              disabled={geoLoading || isSavingStation}
                            >
                              {geoLoading ? 'Getting coordinates...' : 'Get Coordinates'}
                            </button>
                          </div>
                          {geoAccuracyMeters !== null && (
                            <div style={{ marginTop: 6, fontSize: 12, color: '#666', textAlign: 'right' }}>
                              Accuracy: ~{Math.round(Number(geoAccuracyMeters))} m
                            </div>
                          )}
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
