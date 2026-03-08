import { createContext, useState, useEffect, useContext } from "react";
import apiClient, { apiCall } from "../utils/apiClient";

export const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount (persist JWT across page refreshes)
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");

    // Optimistically restore stored user immediately so refresh doesn't blank the UI
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(Boolean(token));
      } catch (e) {}
    }

    if (token) {
      // Verify token with the backend /me endpoint which requires a valid JWT
      verifyToken(token)
        .then((userData) => {
          if (userData) {
            // Use the authoritative user object returned from backend
            setUser(userData);
            setIsAuthenticated(true);
            try {
              localStorage.setItem("user", JSON.stringify(userData));
            } catch (e) {}
          }
        })
        .catch((error) => {
          console.error("Error verifying token (network?):", error);
          // Treat errors as transient; keep stored session. Only explicit 401 should log the user out.
        })
        .finally(() => setIsLoading(false));
    } else {
      // No token means not authenticated.
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  // Verify token by calling protected /me endpoint which returns decoded user info
  const verifyToken = async (token) => {
    try {
      const data = await apiCall('/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return data?.user || false;
    } catch (error) {
      console.error("Token verification error:", error);
      throw error;
    }
  };

  const getApiUrl = () => {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  };

  const login = async (idNumber, password) => {
    setIsLoading(true);
    try {
      const data = await apiClient.post('/login', { idNumber, password });

      // Store token and user info in localStorage (persists across page refreshes)
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      setUser(data.user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData) => {
    setIsLoading(true);
    try {
      // Determine which endpoint to use
      // Use /signup-station when station details are provided (stationName or coordinates)
      // Otherwise use /signup which is the regular user signup flow
      const hasStationDetails = userData.stationName || userData.latitude || userData.longitude;
      const endpoint = hasStationDetails ? '/signup-station' : '/signup';

      const data = await apiClient.post(endpoint, userData);

      return { success: true, message: data.message };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/logout', {});
    } catch (e) {}

    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, signup, logout, verifyToken }}>
      {children}
    </AuthContext.Provider>
  );
}
