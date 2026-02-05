/**
 * Authenticated Fetch Wrapper
 * Automatically includes JWT token in headers
 * Handles 401 errors by logging out user
 */

export const createAuthenticatedFetch = (logout) => {
  return async (url, options = {}) => {
    const token = localStorage.getItem('authToken');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // If 401 (Unauthorized), token expired or invalid
    if (response.status === 401) {
      console.warn('Token expired or invalid - logging out');
      logout();
      // Redirect will happen automatically via ProtectedRoute
      throw new Error('Token expired. Please login again.');
    }
    
    return response;
  };
};
