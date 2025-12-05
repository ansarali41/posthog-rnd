/**
 * Authentication utilities
 * Handles user authentication and protected route access
 */

const AUTH_TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';

/**
 * Get authentication token from storage
 */
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get current user from storage
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Save authentication data
 */
export function setAuth(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear authentication data
 */
export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Login user
 * Uses relative path which will be proxied by Vite to auth service
 */
export async function login(email, password) {
  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    setAuth(data.access_token, data.user);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Register user
 * Uses relative path which will be proxied by Vite to auth service
 */
export async function register(email, password, name) {
  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    setAuth(data.access_token, data.user);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Logout user
 */
export function logout() {
  clearAuth();
  window.location.href = '/login.html';
}

/**
 * Get authorization header for API requests
 */
export function getAuthHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Redirect to login if not authenticated
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    // Save current URL to redirect back after login
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/login.html') {
      sessionStorage.setItem('redirect_after_login', currentPath);
    }
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

/**
 * Check authentication and redirect if needed
 * Call this at the start of protected pages
 */
export function checkAuth() {
  return requireAuth();
}

export default {
  getAuthToken,
  getCurrentUser,
  isAuthenticated,
  setAuth,
  clearAuth,
  login,
  register,
  logout,
  getAuthHeader,
  requireAuth,
  checkAuth,
};

