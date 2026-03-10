import React, { createContext, useContext, useState, useCallback } from 'react';
import { NODE_API_URL } from '../config';

interface User {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  login: async () => ({ success: false }),
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Persist auth across Fast Refresh / hot reloads using a global singleton.
// This is cleared only when the app process is fully killed — acceptable for demos.
interface AuthCache { token: string | null; user: User | null; }
const _g = global as any;
if (!_g.__bfpAuthCache) _g.__bfpAuthCache = { token: null, user: null };
const authCache: AuthCache = _g.__bfpAuthCache;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(authCache.token);
  const [user, setUser] = useState<User | null>(authCache.user);

  const login = useCallback(async (phone: string, password: string) => {
    const url = `${NODE_API_URL}/api/login`;
    console.log('[Auth] LOGIN URL:', url);
    console.log('[Auth] NODE_API_URL:', NODE_API_URL);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ idNumber: phone, password }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      console.log('[Auth] Response status:', res.status);

      const text = await res.text();
      console.log('[Auth] Response body (first 200):', text.substring(0, 200));

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return { success: false, error: 'Server returned non-JSON response' };
      }

      if (!res.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      setToken(data.token);
      const u: User = {
        id: data.user.id,
        name: data.user.name,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        phone: phone,
        role: data.user.role,
      };
      setUser(u);
      authCache.token = data.token;
      authCache.user = u;

      return { success: true };
    } catch (err: any) {
      console.error('[Auth] Login fetch error:', err.name, err.message);
      if (err.name === 'AbortError') {
        return { success: false, error: 'Request timed out (15s). Backend unreachable.' };
      }
      return { success: false, error: `Network error: ${err.message}` };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    authCache.token = null;
    authCache.user = null;
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
