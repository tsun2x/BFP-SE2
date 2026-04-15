import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export type AuthUser = {
  id: number;
  idNumber: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
  substation?: string | null;
  role: string;
  assignedStationId?: number | null;
  stationName?: string | null;
  stationType?: string | null;
  stationContactNumber?: string | null;
};

export type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (idNumber: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'firetruck_token';
const USER_KEY = 'firetruck_user';

const mapApiUserToAuthUser = (apiUser: any): AuthUser => ({
  id: Number(apiUser?.id || 0) || 0,
  idNumber: apiUser?.idNumber || '',
  name: apiUser?.name || '',
  firstName: apiUser?.firstName ?? null,
  lastName: apiUser?.lastName ?? null,
  rank: apiUser?.rank ?? null,
  substation: apiUser?.substation ?? null,
  role: apiUser?.role || 'driver',
  assignedStationId:
    Number(apiUser?.assignedStationId || apiUser?.assigned_station_id || 0) ||
    null,
  stationName: apiUser?.stationInfo?.station_name || null,
  stationType: apiUser?.stationInfo?.station_type || null,
  stationContactNumber: apiUser?.stationInfo?.contact_number || null,
});

const sanitizeToken = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  // Basic JWT shape check: header.payload.signature
  if (!/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Restore session on app start
  useEffect(() => {
    const restore = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        const validToken = sanitizeToken(storedToken);
        if (validToken && storedUser) {
          setToken(validToken);
          setUser(JSON.parse(storedUser));

          // Always refresh from backend so assigned station/name stays in sync.
          try {
            const meRes = await fetch(API_URL + '/api/me', {
              method: 'GET',
              headers: {
                Authorization: 'Bearer ' + validToken,
                'ngrok-skip-browser-warning': 'true',
              },
            });

            if (meRes.ok) {
              const meData = await meRes.json();
              const refreshedUser = mapApiUserToAuthUser(meData?.user || {});
              if (refreshedUser.id) {
                setUser(refreshedUser);
                await AsyncStorage.setItem(USER_KEY, JSON.stringify(refreshedUser));
              }
            }
          } catch {
            // Keep cached user if /me fails.
          }
        } else if (storedToken || storedUser) {
          // Clear corrupted or legacy auth cache so requests don't send malformed tokens.
          await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
          await AsyncStorage.removeItem(USER_KEY).catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    };
    restore();
  }, []);

  const login = async (idNumber: string, password: string) => {
    if (!idNumber || !password) {
      throw new Error('Please enter your BFP ID and password.');
    }

    setIsLoading(true);
    try {
      console.log('[Auth] LOGIN URL:', API_URL + '/api/login');
      const res = await fetch(API_URL + '/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ idNumber, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const role = String(data?.user?.role || '').toLowerCase();
      if (role !== 'driver') {
        throw new Error('This app is for driver accounts only. Please sign in with a driver role account.');
      }

      let authUser: AuthUser = mapApiUserToAuthUser(data?.user || {});

      const validToken = sanitizeToken(data?.token);
      if (!validToken) {
        throw new Error('Login succeeded but server returned an invalid token. Please try again.');
      }

      await AsyncStorage.setItem(TOKEN_KEY, validToken);

      // Refresh profile from /me right after login so station mapping is always authoritative.
      try {
        const meRes = await fetch(API_URL + '/api/me', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + validToken,
            'ngrok-skip-browser-warning': 'true',
          },
        });

        if (meRes.ok) {
          const meData = await meRes.json();
          const refreshedUser = mapApiUserToAuthUser(meData?.user || {});
          if (refreshedUser.id) {
            authUser = refreshedUser;
          }
        }
      } catch {
        // Fallback to login payload if /me fails.
      }

      await AsyncStorage.setItem(USER_KEY, JSON.stringify(authUser));

      setToken(validToken);
      setUser(authUser);
    } catch (error: any) {
      const message = error?.message || 'Login failed. Please try again.';
      Alert.alert('Login failed', message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Call backend logout if we have a token
    if (token) {
      try {
        await fetch(API_URL + '/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
            'ngrok-skip-browser-warning': 'true',
          },
        });
      } catch (e) {
        // ignore
      }
    }
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    await AsyncStorage.removeItem(USER_KEY).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
