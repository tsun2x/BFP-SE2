import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  login: (idNumber: string, name: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (idNumber: string, name: string) => {
    if (!idNumber || !name) {
      throw new Error('Please enter your BFP badge number and name.');
    }

    setIsLoading(true);

    try {
      const trimmedId = idNumber.trim();
      const trimmedName = name.trim();

      const [firstName, ...rest] = trimmedName.split(' ');
      const lastName = rest.join(' ') || null;

      setUser({
        id: Date.now(),
        idNumber: trimmedId,
        name: trimmedName,
        firstName: firstName || null,
        lastName,
        rank: null,
        substation: null,
        role: 'driver',
        assignedStationId: null,
        stationName: null,
        stationType: null,
      });

      setToken(null);
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
