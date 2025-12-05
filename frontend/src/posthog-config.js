/**
 * PostHog Configuration
 * Initialize PostHog with error tracking and session replay
 */

import posthog from 'posthog-js';

// Get PostHog API key from environment or use placeholder
const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY || 'YOUR_POSTHOG_API_KEY';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
const POSTHOG_PROJECT_ID = import.meta.env.VITE_POSTHOG_PROJECT_ID || null;

// Get Discord webhook URL from environment
const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL || '';

let posthogInitialized = false;
// Track if error has occurred (to enable recording) - module level so it's accessible
let errorOccurred = false;

/**
 * Initialize PostHog
 */
export function initPostHog() {
  if (posthogInitialized) {
    return posthog;
  }

  if (!POSTHOG_API_KEY || POSTHOG_API_KEY === 'YOUR_POSTHOG_API_KEY') {
    console.warn('⚠️ PostHog API key not configured. Set VITE_POSTHOG_API_KEY in your .env file');
    return null;
  }

  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST,
    // Session replay configuration
    // Enable recording - PostHog dashboard rules will control which sessions are saved
    session_recording: {
      recordCrossOriginIframes: false,
      maskAllInputs: true, // Mask sensitive inputs
      maskTextSelector: '[data-sensitive]', // Custom selector for sensitive text
      recordCanvas: true,
      // Enable recording - PostHog will buffer sessions
      // Dashboard recording rules will only save sessions with error_occurred events
      sampleRate: 1.0, // Record all sessions (but only save those with errors via dashboard rules)
      minimumSampleRate: 0,
    },
    // DO NOT capture pageviews or pageleaves - only errors
    capture_pageview: false,
    capture_pageleave: false,
    // DO NOT enable autocapture - only track errors
    autocapture: false,
    loaded: (posthogInstance) => {
      console.log('✅ PostHog initialized for error tracking only');
      posthogInitialized = true;
      
      // Session recording is enabled - PostHog will record all sessions
      // Configure dashboard rules to only save sessions with error_occurred events
      if (posthogInstance.sessionRecording) {
        console.log('🎥 Session recording enabled - recording all sessions');
        console.log('📝 Configure PostHog Dashboard Recording Rules to only save error sessions:');
        console.log('   1. Go to Project Settings → Session Replay → Recording Rules');
        console.log('   2. Add rule: Record sessions with event "error_occurred"');
        console.log('   3. Set default sample rate to 0% (so only error sessions are saved)');
      }
      
      // Store error flag for tracking
      posthogInstance._setErrorOccurred = (value) => {
        errorOccurred = value;
      };
      
      posthogInstance._hasErrorOccurred = () => errorOccurred;
    },
  });

  return posthog;
}

/**
 * Get PostHog instance
 */
export function getPostHog() {
  return posthog;
}

/**
 * Start session recording manually
 * Sets the error flag so PostHog will record this session
 */
export function startSessionRecording() {
  if (!posthogInitialized) {
    initPostHog();
  }
  
  try {
    // Set the error flag
    errorOccurred = true;
    
    if (posthog._setErrorOccurred) {
      posthog._setErrorOccurred(true);
    }
    
    // Try to start recording when error occurs
    // PostHog will record from this point forward
    if (posthog.sessionRecording) {
      // PostHog's sessionRecording API
      // We need to enable recording for this session
      try {
        // Use PostHog's internal API to start recording
        if (typeof posthog.sessionRecording.startRecording === 'function') {
          posthog.sessionRecording.startRecording();
          console.log('🎥 Session recording started (error occurred)');
        } else {
          // Fallback: PostHog will use recording rules
          console.log('🎥 Error occurred - session will be saved via recording rules');
        }
      } catch (e) {
        console.warn('Could not start recording:', e);
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('Could not verify session recording:', error);
    return false;
  }
}

/**
 * Stop session recording manually
 */
export function stopSessionRecording() {
  try {
    posthog.stopSessionRecording();
    console.log('⏹️ Session recording stopped');
    return true;
  } catch (error) {
    console.warn('Could not stop session recording:', error);
    return false;
  }
}

/**
 * Check if session recording is active
 */
export function isRecording() {
  try {
    // Check if error has occurred (which enables recording)
    if (posthog._hasErrorOccurred && posthog._hasErrorOccurred()) {
      return true;
    }
    // Also check if PostHog's session recording module is available
    return !!(posthog.sessionRecording && posthogInitialized);
  } catch (error) {
    return false;
  }
}

/**
 * Get current session ID
 */
export function getSessionId() {
  try {
    return posthog.get_session_id() || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get session replay URL
 */
export function getSessionReplayUrl() {
  const sessionId = getSessionId();
  if (!sessionId) {
    return null;
  }
  
  // Get project ID from environment variable (preferred) or try to extract from API key
  let projectId = POSTHOG_PROJECT_ID;
  
  if (!projectId) {
    // Fallback: Try to extract from API key (may not work for all API key formats)
    const apiKey = POSTHOG_API_KEY || '';
    const projectIdMatch = apiKey.match(/phc_([^_]+)/);
    projectId = projectIdMatch ? projectIdMatch[1] : null;
  }
  
  // PostHog session replay URL format: /project/{projectId}/replay/{sessionId}
  if (projectId) {
    return `${POSTHOG_HOST}/project/${projectId}/replay/${sessionId}`;
  }
  
  // Fallback without project ID (may not work)
  console.warn('⚠️ PostHog project ID not found. Set VITE_POSTHOG_PROJECT_ID in .env file');
  return `${POSTHOG_HOST}/replay/${sessionId}`;
}

export default posthog;

