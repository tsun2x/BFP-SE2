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
  const [stationStatus, setStationStatus] = useState('NOT READY');
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
    setStationStatus(status);
    if (percentage !== null) {
      setReadinessPercentage(percentage);
      setChecklistUpdated(true);
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
      setStationStatus('NOT READY');
      setReadinessPercentage(0);
    }
  };

  // Reset checklist status (for new day or manual reset)
  const resetChecklistStatus = () => {
    setChecklistUpdated(false);
    setStationStatus('NOT READY');
    setReadinessPercentage(0);
  };

  // Get CSS class for status
  const getStatusClass = () => {
    return stationStatus.toLowerCase().replace(/\s/g, '-');
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
