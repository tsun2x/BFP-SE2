import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Alert, Vibration } from 'react-native';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';
import io, { Socket } from 'socket.io-client';

// ── BFP Alarm Levels ────────────────────────────────────────────────────
export const ALARM_LEVELS = [
  { key: '1st Alarm', label: '1st Alarm', color: '#FFC107', icon: 'flame-outline' },
  { key: '2nd Alarm', label: '2nd Alarm', color: '#FF9800', icon: 'flame' },
  { key: '3rd Alarm', label: '3rd Alarm', color: '#FF5722', icon: 'flame' },
  { key: '4th Alarm', label: '4th Alarm', color: '#F44336', icon: 'flame' },
  { key: '5th Alarm', label: '5th Alarm', color: '#D32F2F', icon: 'flame' },
  { key: 'Task Force Alpha', label: 'TF Alpha', color: '#9C27B0', icon: 'shield' },
  { key: 'Task Force Bravo', label: 'TF Bravo', color: '#7B1FA2', icon: 'shield' },
  { key: 'Task Force Delta', label: 'TF Delta', color: '#4A148C', icon: 'shield' },
  { key: 'General Alarm', label: 'General Alarm', color: '#000000', icon: 'warning' },
] as const;

// ── Fire Status Phases ──────────────────────────────────────────────────
export const STATUS_PHASES = [
  { key: 'Standby', label: 'Standby', color: '#607D8B', icon: 'time-outline', description: 'Awaiting dispatch' },
  { key: 'En Route', label: 'En Route', color: '#2196F3', icon: 'car-sport', description: 'Proceeding to fire site' },
  { key: 'On Scene', label: 'On Scene', color: '#FF9800', icon: 'location', description: 'Arrived — fighting fire' },
  { key: 'Fire Out', label: 'Fire Out', color: '#4CAF50', icon: 'checkmark-circle', description: 'Fire extinguished' },
] as const;

export type MissionContextType = {
  fireStatus: string;
  alarmLevel: string;
  activeAlarmId: number | null;
  truckId: number;
  connected: boolean;
  socketRef: React.MutableRefObject<Socket | null>;
  setFireStatus: (s: string) => void;
  setAlarmLevel: (a: string) => void;
  setActiveAlarmId: (id: number | null) => void;
  broadcastStatus: (newStatus: string, newAlarm: string, lat?: number, lng?: number) => Promise<void>;
  handleStatusChange: (newStatus: string) => void;
  handleAlarmChange: (newAlarm: string) => void;
  handleEndMission: () => void;
};

const MissionContext = createContext<MissionContextType | undefined>(undefined);

export const MissionProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const [fireStatus, setFireStatus] = useState<string>('Standby');
  const [alarmLevel, setAlarmLevel] = useState<string>('1st Alarm');
  const [activeAlarmId, setActiveAlarmId] = useState<number | null>(null);
  const [truckId] = useState<number>(1);
  const [connected, setConnected] = useState(false);

  // Connect socket on mount
  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('[Truck] Socket connected:', socket.id);
      socket.emit('join-truck', { truckId });
    });

    // Listen for dispatch assignments from admin
    socket.on('incoming-incident', (data: any) => {
      console.log('[Truck] Received dispatch:', data);
      if (data.alarmId) {
        setActiveAlarmId(data.alarmId);
        setAlarmLevel(data.alarmLevel || '1st Alarm');
        setFireStatus('Standby');
        Vibration.vibrate([0, 500, 200, 500]);
        Alert.alert(
          'DISPATCH RECEIVED',
          `Incident #${data.alarmId}\n${data.incidentType || 'Fire'} at ${data.location || 'Unknown'}\nAlarm: ${data.alarmLevel || '1st Alarm'}`,
          [{ text: 'ACKNOWLEDGE', style: 'default' }]
        );
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('[Truck] Socket disconnected');
    });

    return () => { socket.disconnect(); };
  }, [truckId]);

  // Broadcast status update to backend + socket
  const broadcastStatus = useCallback(async (newStatus: string, newAlarm: string, lat?: number, lng?: number) => {
    const payload: any = {
      truckId,
      alarmId: activeAlarmId,
      alarmLevel: newAlarm,
      fireStatus: newStatus,
      driverName: user?.name || 'Unknown Driver',
      updatedAt: new Date().toISOString(),
    };
    if (lat !== undefined) payload.latitude = lat;
    if (lng !== undefined) payload.longitude = lng;

    // Emit via socket for instant broadcast
    if (socketRef.current?.connected) {
      socketRef.current.emit('truck-status-update', payload);
    }

    // Persist via REST API
    const url = `${API_URL}/api/firetrucks/status`;
    console.log('[Truck] PUT →', url, '| token?', !!token);
    try {
      const resp = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          truck_id: truckId,
          alarm_id: activeAlarmId,
          alarm_level: newAlarm,
          fire_status: newStatus,
          driver_name: user?.name,
          latitude: lat,
          longitude: lng,
        }),
      });
      console.log('[Truck] REST response:', resp.status, resp.statusText);
    } catch (e: any) {
      console.error('[Truck] REST status update failed:', e?.message || e);
    }
  }, [truckId, activeAlarmId, token, user?.name]);

  const handleStatusChange = useCallback((newStatus: string) => {
    if (newStatus === 'Standby' && fireStatus !== 'Fire Out') return;
    setFireStatus(newStatus);
    broadcastStatus(newStatus, alarmLevel);
    Vibration.vibrate(100);
  }, [fireStatus, alarmLevel, broadcastStatus]);

  const handleAlarmChange = useCallback((newAlarm: string) => {
    setAlarmLevel(newAlarm);
    broadcastStatus(fireStatus, newAlarm);
    Vibration.vibrate([0, 100, 50, 100]);
  }, [fireStatus, broadcastStatus]);

  const handleEndMission = useCallback(() => {
    Alert.alert('End Mission', 'Are you sure you want to end this mission and return to Standby?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Mission',
        style: 'destructive',
        onPress: () => {
          setFireStatus('Standby');
          setAlarmLevel('1st Alarm');
          setActiveAlarmId(null);
          broadcastStatus('Standby', '1st Alarm');
        },
      },
    ]);
  }, [broadcastStatus]);

  return (
    <MissionContext.Provider value={{
      fireStatus, alarmLevel, activeAlarmId, truckId, connected, socketRef,
      setFireStatus, setAlarmLevel, setActiveAlarmId,
      broadcastStatus, handleStatusChange, handleAlarmChange, handleEndMission,
    }}>
      {children}
    </MissionContext.Provider>
  );
};

export const useMission = (): MissionContextType => {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error('useMission must be used within a MissionProvider');
  return ctx;
};
