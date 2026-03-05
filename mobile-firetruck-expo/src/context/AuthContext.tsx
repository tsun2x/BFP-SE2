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
};

export type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (idNumber: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
};

export type RegisterData = {
  firstName: string;
  lastName: string;
  idNumber: string;
  rank: string;
  password: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'firetruck_token';
const USER_KEY = 'firetruck_user';

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
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
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

      const authUser: AuthUser = {
        id: data.user.id,
        idNumber: data.user.idNumber,
        name: data.user.name,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        rank: data.user.rank,
        substation: data.user.substation,
        role: data.user.role,
        assignedStationId: data.user.assignedStationId,
        stationName: data.user.stationInfo?.station_name || null,
        stationType: data.user.stationInfo?.station_type || null,
      };

      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(authUser));

      setToken(data.token);
      setUser(authUser);
    } catch (error: any) {
      const message = error?.message || 'Login failed. Please try again.';
      Alert.alert('Login failed', message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (regData: RegisterData) => {
    if (!regData.firstName || !regData.lastName || !regData.idNumber || !regData.rank || !regData.password) {
      throw new Error('All fields are required.');
    }

    setIsLoading(true);
    try {
      console.log('[Auth] SIGNUP URL:', API_URL + '/api/signup');
      const res = await fetch(API_URL + '/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          firstName: regData.firstName,
          lastName: regData.lastName,
          idNumber: regData.idNumber,
          rank: regData.rank,
          password: regData.password,
          role: 'driver',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      Alert.alert('Success', 'Account created! Please log in.');
    } catch (error: any) {
      const message = error?.message || 'Registration failed.';
      Alert.alert('Registration failed', message);
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
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
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
