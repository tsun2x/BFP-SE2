import { createContext, useState, useEffect, useContext } from "react";

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
          } else {
            // Invalid token -> clear and force login
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            setUser(null);
            setIsAuthenticated(false);
          }
        })
        .catch((error) => {
          console.error("Error verifying token (network?):", error);
          // Treat network errors as transient: if we have a stored user, restore it optimistically
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
              setIsAuthenticated(true);
            } catch (e) {
              localStorage.removeItem("authToken");
              localStorage.removeItem("user");
              setUser(null);
              setIsAuthenticated(false);
            }
          } else {
            // No stored user -> clear token to be safe
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            setUser(null);
            setIsAuthenticated(false);
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // Verify token by calling protected /me endpoint which returns decoded user info
  const verifyToken = async (token) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) return false;
      if (!response.ok) return false;

      const data = await response.json();
      // Expecting { user: { ... } }
      return data?.user || false;
    } catch (error) {
      console.error("Token verification error:", error);
      return false;
    }
  };

  const getApiUrl = () => {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  };

  const login = async (idNumber, password) => {
    setIsLoading(true);
    try {
      const apiUrl = getApiUrl();
      
      // Use the new Node.js backend endpoint (no .php extension)
      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idNumber, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

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
      const apiUrl = getApiUrl();
      
      // Determine which endpoint to use
      // Use /signup-station when station details are provided (stationName or coordinates)
      // Otherwise use /signup which is the regular user signup flow
      const hasStationDetails = userData.stationName || userData.latitude || userData.longitude;
      const endpoint = hasStationDetails ? '/signup-station' : '/signup';
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
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
