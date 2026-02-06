import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const STORAGE_KEY = 'firetruck_local_user';

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { user: AuthUser; password: string };
          setUser(parsed.user);
          setToken(null);
        }
      } catch (error) {
      }
    };
    loadUser();
  }, []);

  const login = async (idNumber: string, password: string) => {
    if (!idNumber || !password) {
      throw new Error('Please enter your BFP ID and password.');
    }

    setIsLoading(true);

    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);

      if (existing) {
        const parsed = JSON.parse(existing) as { user: AuthUser; password: string };
        if (parsed.user.idNumber === idNumber && parsed.password === password) {
          setUser(parsed.user);
          setToken(null);
          return;
        }
        throw new Error('Invalid ID or password.');
      }

      const newUser: AuthUser = {
        id: Date.now(),
        idNumber,
        name: idNumber,
        firstName: null,
        lastName: null,
        rank: null,
        substation: null,
        role: 'driver',
        assignedStationId: null,
        stationName: null,
        stationType: null,
      };

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: newUser, password }),
      );

      setUser(newUser);
      setToken(null);
    } catch (error: any) {
      const message = error?.message || 'Login failed. Please try again.';
      Alert.alert('Login failed', message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
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
