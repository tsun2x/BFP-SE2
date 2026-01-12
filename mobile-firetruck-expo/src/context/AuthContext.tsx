import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
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
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (idNumber: string, password: string) => {
    if (!idNumber || !password) {
      throw new Error('Please enter your BFP ID and password.');
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idNumber, password }),
      });

      const rawText = await response.text();

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        console.error('Failed to parse login response:', rawText);
        throw new Error('Unexpected server response.');
      }

      if (!response.ok) {
        const message = data?.message || 'Invalid ID or password.';
        throw new Error(message);
      }

      if (!data?.token || !data?.user) {
        console.error('Login response missing token or user:', data);
        throw new Error('Login failed. Please try again.');
      }

      const payloadUser = data.user;

      setUser({
        id: payloadUser.id,
        idNumber: payloadUser.idNumber,
        name: payloadUser.name,
        firstName: payloadUser.firstName ?? null,
        lastName: payloadUser.lastName ?? null,
        rank: payloadUser.rank ?? null,
        substation: payloadUser.substation ?? null,
        role: payloadUser.role,
        assignedStationId: payloadUser.assignedStationId ?? null,
        stationName: payloadUser.stationInfo?.station_name ?? null,
        stationType: payloadUser.stationInfo?.station_type ?? null,
      });
      setToken(data.token);
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
