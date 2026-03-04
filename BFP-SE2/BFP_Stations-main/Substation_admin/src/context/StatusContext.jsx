import { createContext, useContext, useState, useEffect } from 'react';

// Create context
const StatusContext = createContext();

// Custom hook to use status context
export const useStatus = () => {
  const context = useContext(StatusContext);
  if (!context) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return context;
};

// Status provider component
export const StatusProvider = ({ children }) => {
  const [stationStatus, setStationStatus] = useState('NOT_READY');
  const [alarmLevel, setAlarmLevel] = useState('Alarm 0 — Normal');
  const [readinessPercentage, setReadinessPercentage] = useState(0);
  const [checklistUpdated, setChecklistUpdated] = useState(false);

  // Map alarm levels to status
  const getStatusFromAlarmLevel = (level) => {
    switch (level) {
      case 'Alarm 0 — Normal':
        return 'READY';
      case 'Alarm 1':
        return 'STANDBY';
      case 'Alarm 2':
        return 'DEPLOYED';
      case 'Alarm 3':
        return 'EMERGENCY';
      default:
        return 'READY';
    }
  };

  // Update station status and readiness
  const updateStationStatus = (status, percentage = null) => {
    const normalizedStatus = String(status || '').trim().replace(/\s+/g, '_').toUpperCase();
    setStationStatus(normalizedStatus || 'NOT_READY');
    if (percentage !== null) {
      const rp = Number(percentage);
      setReadinessPercentage(Number.isFinite(rp) ? rp : 0);
      setChecklistUpdated(true);

      try {
        localStorage.setItem(
          'stationReadiness',
          JSON.stringify({ status: normalizedStatus || 'NOT_READY', readinessPercentage: rp, checklistUpdated: true })
        );
      } catch (e) {}
    }
  };

  // Update both status and alarm level
  const updateAlarmLevel = (newAlarmLevel) => {
    setAlarmLevel(newAlarmLevel);
    const newStatus = getStatusFromAlarmLevel(newAlarmLevel);
    
    // Only set readiness if checklist has been updated
    if (checklistUpdated) {
      const newReadiness = newStatus === 'READY' ? 100 : 
                          newStatus === 'PARTIALLY READY' ? 75 : 
                          newStatus === 'STANDBY' ? 50 : 25;
      
      setStationStatus(newStatus);
      setReadinessPercentage(newReadiness);
    } else {
      // If checklist not updated, keep NOT READY with 0%
      setStationStatus('NOT_READY');
      setReadinessPercentage(0);
    }
  };

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('stationReadiness') || 'null');
      if (cached) {
        if (cached.status) setStationStatus(String(cached.status).trim().replace(/\s+/g, '_').toUpperCase());
        if (cached.readinessPercentage !== undefined) setReadinessPercentage(Number(cached.readinessPercentage) || 0);
        if (cached.checklistUpdated !== undefined) setChecklistUpdated(Boolean(cached.checklistUpdated));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    async function loadLatestReadiness() {
      try {
        const storedUser = localStorage.getItem('user');
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;

        const stationId =
          parsedUser?.assignedStationId ||
          parsedUser?.assigned_station_id ||
          parsedUser?.stationInfo?.station_id ||
          null;

        if (!stationId) return;

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const res = await fetch(`${apiUrl}/station-readiness/${stationId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;
        const data = await res.json();

        const rp = data.readinessPercentage ?? data.readiness_percentage ?? null;
        const st = data.status || data.station_status || null;

        if (rp !== null) {
          const numericRp = Number(rp);
          setReadinessPercentage(Number.isFinite(numericRp) ? numericRp : 0);
          setChecklistUpdated(true);
        }

        if (st) {
          setStationStatus(String(st).trim().replace(/\s+/g, '_').toUpperCase());
        }

        try {
          localStorage.setItem(
            'stationReadiness',
            JSON.stringify({
              status: st ? String(st).trim().replace(/\s+/g, '_').toUpperCase() : stationStatus,
              readinessPercentage: rp !== null ? Number(rp) : readinessPercentage,
              checklistUpdated: true,
            })
          );
        } catch (e) {}
      } catch (e) {}
    }

    loadLatestReadiness();
  }, []);

  // Reset checklist status (for new day or manual reset)
  const resetChecklistStatus = () => {
    setChecklistUpdated(false);
    setStationStatus('NOT_READY');
    setReadinessPercentage(0);

    try {
      localStorage.removeItem('stationReadiness');
    } catch (e) {}
  };

  // Get CSS class for status
  const getStatusClass = () => {
    return stationStatus.toLowerCase().replace(/_/g, '-').replace(/\s/g, '-');
  };

  // Get readiness percentage
  const getReadinessPercentage = () => {
    return readinessPercentage;
  };

  const value = {
    stationStatus,
    alarmLevel,
    readinessPercentage,
    checklistUpdated,
    setStationStatus,
    setAlarmLevel,
    updateAlarmLevel,
    updateStationStatus,
    resetChecklistStatus,
    getStatusClass,
    getReadinessPercentage
  };

  return (
    <StatusContext.Provider value={value}>
      {children}
    </StatusContext.Provider>
  );
};

export default StatusContext;
