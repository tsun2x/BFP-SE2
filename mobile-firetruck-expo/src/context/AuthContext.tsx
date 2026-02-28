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
    if (!idNumber) {
      throw new Error('Please enter your BFP ID.');
    }

    setIsLoading(true);

    try {
      // Quick demo login - bypass API call
      const trimmedId = idNumber.trim();
      
      setUser({
        id: Date.now(),
        idNumber: trimmedId,
        name: 'Firetruck Driver',
        firstName: 'Firetruck',
        lastName: 'Driver',
        rank: 'Driver',
        substation: 'Main Station',
        role: 'driver',
        assignedStationId: 1,
        stationName: 'BFP Main Station',
        stationType: 'Central',
      });
      
      setToken('demo-token');
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

