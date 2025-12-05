/**
 * Main entry point
 * Initialize error handling and PostHog
 */

import { initErrorHandler } from './error-handler.js';
import { setupApiInterceptor } from './api-interceptor.js';
import { checkAuth } from './auth.js';

// Check authentication for protected pages (skip for login page)
if (!window.location.pathname.includes('login.html')) {
  if (!checkAuth()) {
    // Redirect will happen in checkAuth, exit early
    throw new Error('Authentication required');
  }
}

// Initialize error handler on page load
initErrorHandler();

// Setup API interceptor to include session ID and auth token in requests
setupApiInterceptor();

// Example: Test error handler (remove in production)
if (import.meta.env.DEV) {
  console.log('✅ Frontend error handler loaded');
  
  // Uncomment to test error handling:
  // setTimeout(() => {
  //   throw new Error('Test error - this should be captured and sent to Discord');
  // }, 3000);
}

// Export error handler functions for manual use
export { 
  initErrorHandler, 
  captureManualError, 
  captureApiError,
  reportCustomIssue,
  startRecordingForIssue,
  getSessionInfo
} from './error-handler.js';

// Export API interceptor setup
export { setupApiInterceptor, setupAxiosInterceptor } from './api-interceptor.js';

