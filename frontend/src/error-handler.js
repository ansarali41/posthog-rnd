/**
 * Error Handler with PostHog and Discord Integration
 * Captures frontend errors and sends them to Discord
 */

import { 
  initPostHog, 
  getPostHog, 
  startSessionRecording, 
  getSessionId, 
  getSessionReplayUrl,
  isRecording 
} from './posthog-config.js';

const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL || '';

let errorHandlerInitialized = false;

/**
 * Send error to Discord webhook
 */
async function sendToDiscord(errorData) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('⚠️ Discord webhook URL not configured. Set VITE_DISCORD_WEBHOOK_URL in your .env file');
    return;
  }

  try {
    const posthog = getPostHog();
    const sessionId = getSessionId() || 'unknown';
    const sessionUrl = getSessionReplayUrl() || 'Session replay not available';

    const embed = {
      title: '🚨 Frontend Error Detected',
      description: `**${errorData.errorName}**: ${errorData.errorMessage}`,
      color: 15158332, // Red color
      fields: [
        {
          name: '📍 URL',
          value: errorData.url || 'Unknown',
          inline: true,
        },
        {
          name: '👤 User',
          value: errorData.userId || 'Anonymous',
          inline: true,
        },
        {
          name: '🕐 Timestamp',
          value: new Date().toISOString(),
          inline: true,
        },
        {
          name: '📁 File',
          value: errorData.filename || 'Unknown',
          inline: true,
        },
        {
          name: '📍 Line',
          value: errorData.lineno?.toString() || 'Unknown',
          inline: true,
        },
        {
          name: '📍 Column',
          value: errorData.colno?.toString() || 'Unknown',
          inline: true,
        },
        {
          name: '🎥 Session Replay',
          value: sessionUrl,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    // Add stack trace if available (truncated)
    if (errorData.errorStack) {
      const truncatedStack = errorData.errorStack.substring(0, 1000);
      embed.fields.push({
        name: '📚 Stack Trace',
        value: `\`\`\`${truncatedStack}\`\`\``,
        inline: false,
      });
    }

    // Add additional context if available
    if (errorData.context && Object.keys(errorData.context).length > 0) {
      embed.fields.push({
        name: '📋 Context',
        value: `\`\`\`json\n${JSON.stringify(errorData.context, null, 2)}\`\`\``,
        inline: false,
      });
    }

    const payload = {
      embeds: [embed],
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send error to Discord:', response.statusText);
    } else {
      console.log('✅ Error sent to Discord');
    }
  } catch (error) {
    console.error('Error sending to Discord:', error);
  }
}

/**
 * Capture error and send to PostHog and Discord
 */
/**
 * Unified error handler - ONLY tracks errors
 * This is the single entry point for all frontend error tracking
 */
function captureError(error, context = {}) {
  const posthog = getPostHog();

  // When error occurs, ensure recording is active and capture error event
  // PostHog will save the session because it has an error_occurred event
  if (posthog) {
    // Set error flag
    errorOccurred = true;
    
    // Start recording if not already started (PostHog buffers sessions)
    try {
      if (posthog.sessionRecording) {
        // Ensure recording is active (it should be with sampleRate: 1.0)
        // Capture error event - PostHog dashboard rules will save sessions with this event
        console.log('🎥 Error occurred - session recording active, error event will trigger save');
      }
    } catch (e) {
      console.warn('Could not verify session recording:', e);
    }
  }

  // Prepare error data
  const errorData = {
    errorName: error.name || 'Error',
    errorMessage: error.message || 'Unknown error',
    errorStack: error.stack,
    filename: error.filename || window.location.href,
    lineno: error.lineno,
    colno: error.colno,
    url: window.location.href,
    userId: posthog?.get_distinct_id() || 'anonymous',
    userAgent: navigator.userAgent,
    context: context,
  };

  // Send to PostHog - ONLY error events, no other tracking
  if (posthog) {
    const sessionId = getSessionId();
    
    // Use unified error event name matching backend
    posthog.capture('error_occurred', {
      error_name: errorData.errorName,
      error_message: errorData.errorMessage,
      error_stack: errorData.errorStack,
      error_type: 'frontend_error',
      error_filename: errorData.filename,
      error_lineno: errorData.lineno,
      error_colno: errorData.colno,
      url: errorData.url,
      user_agent: errorData.userAgent,
      context: {
        ...errorData.context,
        recording_started: isRecording(),
      },
      $session_id: sessionId,
      session_replay_url: getSessionReplayUrl(),
      timestamp: new Date().toISOString(),
      // Only include user ID if user is logged in (safe field only)
      user_id: errorData.userId !== 'anonymous' ? errorData.userId : undefined,
    });
  }

  // Send to Discord
  sendToDiscord(errorData);

  // Log to console (internal log with full stack trace)
  console.error('🚨 Error captured:', {
    name: errorData.errorName,
    message: errorData.errorMessage,
    stack: errorData.errorStack,
    context: errorData.context,
  });
}

/**
 * Initialize error handlers
 */
export function initErrorHandler() {
  if (errorHandlerInitialized) {
    return;
  }

  // Initialize PostHog first
  initPostHog();

  // Global error handler
  window.addEventListener('error', (event) => {
    captureError({
      name: 'Error',
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }, {
      type: 'global_error',
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));

    captureError({
      name: 'UnhandledPromiseRejection',
      message: error.message,
      stack: error.stack || `Promise rejection: ${event.reason}`,
      filename: window.location.href,
      lineno: null,
      colno: null,
    }, {
      type: 'unhandled_promise_rejection',
      reason: event.reason,
    });
  });

  // Console error interceptor (optional - for catching console.error calls)
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Only capture if it looks like an error object
    if (args[0] instanceof Error) {
      captureError(args[0], {
        type: 'console_error',
      });
    }
    originalConsoleError.apply(console, args);
  };

  errorHandlerInitialized = true;
  console.log('✅ Error handler initialized');
}

/**
 * Manually capture an error (for use in try-catch blocks)
 */
export function captureManualError(error, context = {}) {
  const errorObj = error instanceof Error 
    ? error 
    : new Error(String(error));

  captureError(errorObj, {
    ...context,
    type: 'manual_error',
  });
}

/**
 * Capture API error (for use in API interceptors)
 */
export function captureApiError(error, requestInfo = {}) {
  const errorObj = error instanceof Error 
    ? error 
    : new Error(String(error));

  captureError(errorObj, {
    type: 'api_error',
    ...requestInfo,
  });
}

/**
 * Report a custom issue with session replay
 * Use this when users want to report a problem manually
 * This is treated as an error for tracking purposes
 */
export function reportCustomIssue(issueDescription, context = {}) {
  const posthog = getPostHog();
  
  // Start recording ONLY when issue is reported (treated as error)
  if (!isRecording()) {
    startSessionRecording();
    console.log('🎥 Session recording started for custom issue');
  }

  // Treat custom issue as an error for unified tracking
  const error = new Error(issueDescription);
  error.name = 'CustomIssueReport';
  
  captureError(error, {
    type: 'custom_issue',
    ...context,
  });
}

/**
 * Start recording for a custom issue
 * Call this before the issue occurs to capture the full context
 * Note: Recording should only start when errors occur, but this allows
 * pre-emptive recording if user suspects an issue
 */
export function startRecordingForIssue() {
  if (!isRecording()) {
    return startSessionRecording();
  }
  return isRecording();
}

/**
 * Get session replay information
 */
export function getSessionInfo() {
  return {
    sessionId: getSessionId(),
    replayUrl: getSessionReplayUrl(),
    isRecording: isRecording(),
  };
}

export default {
  init: initErrorHandler,
  capture: captureManualError,
  captureApi: captureApiError,
  reportIssue: reportCustomIssue,
  startRecording: startRecordingForIssue,
  getSessionInfo: getSessionInfo,
};

