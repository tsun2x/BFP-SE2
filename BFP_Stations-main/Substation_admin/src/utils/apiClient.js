/**
 * API Client with JWT token support
 */

import { API_BASE } from './runtimeConfig';

const getApiUrl = () => {
  return API_BASE;
};

const getToken = () => {
  return localStorage.getItem('authToken');
};

export const apiCall = async (endpoint, options = {}) => {
  const url = `${getApiUrl()}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Don't redirect if we're on the login page or calling the login endpoint
      const isLoginRequest =
        endpoint === '/login' || endpoint === '/signup' || endpoint === '/signup-station';
      if (!isLoginRequest) {
        // Token might be expired, clear auth
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || `API error: ${response.status}`);
      }
      return { success: true, data: text };
    }

    if (!response.ok) {
      throw new Error(data.message || `API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Create an object with helper methods for common HTTP verbs
const apiClient = {
  get: (endpoint, options = {}) => {
    return apiCall(endpoint, { ...options, method: 'GET' });
  },
  post: (endpoint, data = {}, options = {}) => {
    return apiCall(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  patch: (endpoint, data = {}, options = {}) => {
    return apiCall(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  put: (endpoint, data = {}, options = {}) => {
    return apiCall(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: (endpoint, options = {}) => {
    return apiCall(endpoint, { ...options, method: 'DELETE' });
  },
};

export default apiClient;
