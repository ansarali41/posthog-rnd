/**
 * API Interceptor to include session ID in requests
 * This links backend errors with frontend session replays
 */

import { getSessionId } from './posthog-config.js';
import { captureApiError } from './error-handler.js';
import { getAuthHeader, requireAuth } from './auth.js';

/**
 * Setup fetch interceptor to include session ID
 */
export function setupApiInterceptor() {
  // Intercept fetch requests
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url, options = {}] = args;
    
    // Get current session ID
    const sessionId = getSessionId();
    
    // Add session ID and auth token to headers
    const headers = new Headers(options.headers || {});
    if (sessionId) {
      headers.set('X-Session-ID', sessionId);
    }
    
    // Add authentication header if user is logged in
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) {
      headers.set('Authorization', authHeader.Authorization);
    }
    
    // Make the request with updated headers
    try {
      const response = await originalFetch(url, {
        ...options,
        headers,
      });
      
      // If response is an error, capture it
      if (!response.ok) {
        const error = new Error(`API Error: ${response.status} ${response.statusText}`);
        captureApiError(error, {
          endpoint: url,
          method: options.method || 'GET',
          status: response.status,
        });
      }
      
      return response;
    } catch (error) {
      // Capture network errors
      captureApiError(error, {
        endpoint: url,
        method: options.method || 'GET',
        type: 'network_error',
      });
      throw error;
    }
  };
  
  console.log('✅ API interceptor setup complete');
}

/**
 * Setup axios interceptor (if axios is used)
 */
export function setupAxiosInterceptor(axios) {
  // Request interceptor - add session ID
  axios.interceptors.request.use(
    (config) => {
      const sessionId = getSessionId();
      if (sessionId) {
        config.headers['X-Session-ID'] = sessionId;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  
  // Response interceptor - capture errors
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      captureApiError(error, {
        endpoint: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
      });
      return Promise.reject(error);
    }
  );
  
  console.log('✅ Axios interceptor setup complete');
}

export default {
  setupFetch: setupApiInterceptor,
  setupAxios: setupAxiosInterceptor,
};

