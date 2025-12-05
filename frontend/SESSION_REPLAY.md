# PostHog Session Replay Guide

## Overview

This implementation provides comprehensive session replay (video recording) capabilities for both frontend errors and custom issues, with full integration between frontend and backend.

## Features

### ✅ Automatic Error Recording
- **Frontend Errors**: Automatically starts recording when JavaScript errors occur
- **Promise Rejections**: Captures unhandled promise rejections
- **API Errors**: Records when API calls fail
- **Backend Errors**: Links backend errors with frontend session replays

### ✅ Manual Issue Reporting
- Users can manually report issues with session replay
- Custom issue descriptions with full context
- Automatic session replay link generation

### ✅ Session Management
- Start/stop recording manually
- Check recording status
- Get session replay URLs
- Link backend errors with frontend sessions

## Frontend Usage

### Basic Setup

```javascript
import { initErrorHandler } from './src/main.js';

// Initialize error handling (automatically sets up session replay)
initErrorHandler();
```

### Manual Error Capture

```javascript
import { captureManualError } from './src/main.js';

try {
  // Your code
} catch (error) {
  captureManualError(error, {
    context: 'user_action',
    action: 'submit_form',
  });
}
```

### API Error Capture

```javascript
import { captureApiError } from './src/main.js';

fetch('/api/endpoint')
  .catch(error => {
    captureApiError(error, {
      endpoint: '/api/endpoint',
      method: 'GET',
    });
  });
```

### Report Custom Issue

```javascript
import { reportCustomIssue } from './src/main.js';

// User reports an issue
reportCustomIssue('Button is not working when clicked', {
  page: window.location.href,
  user_action: 'clicked_submit_button',
  browser: navigator.userAgent,
});
```

### Manual Recording Control

```javascript
import { 
  startRecordingForIssue, 
  getSessionInfo 
} from './src/main.js';

// Start recording before an issue occurs
startRecordingForIssue();

// Get session information
const sessionInfo = getSessionInfo();
console.log('Session ID:', sessionInfo.sessionId);
console.log('Replay URL:', sessionInfo.replayUrl);
console.log('Is Recording:', sessionInfo.isRecording);
```

### API Interceptor (Automatic Session ID)

The API interceptor automatically includes the session ID in all API requests:

```javascript
import { setupApiInterceptor } from './src/main.js';

// This is already called in main.js, but you can call it manually if needed
setupApiInterceptor();

// Now all fetch/axios requests will include X-Session-ID header
fetch('/api/endpoint'); // Automatically includes session ID
```

## Backend Integration

### Automatic Session Linking

The backend automatically captures session IDs from the `X-Session-ID` header and links them with errors:

```typescript
// Backend automatically includes session ID in error tracking
// No additional code needed - it's handled by PosthogInterceptor
```

### Manual Backend Error Tracking

```typescript
import { PosthogService } from '@posthog/posthog';

// Track backend error with session replay link
this.posthogService.trackBackendError({
  errorName: 'DatabaseError',
  errorMessage: 'Failed to connect to database',
  errorStack: error.stack,
  userId: 'user123',
  sessionId: request.headers['x-session-id'], // From frontend
  endpoint: '/api/users',
  method: 'POST',
  context: {
    database: 'postgres',
    query: 'SELECT * FROM users',
  },
});
```

## Session Replay URLs

All errors include session replay URLs in the format:
```
https://app.posthog.com/replay/{session_id}
```

These URLs are automatically included in:
- PostHog event properties
- Discord notifications
- Error tracking events

## Configuration

### Environment Variables

```env
# Frontend (.env)
VITE_POSTHOG_API_KEY=your_posthog_api_key
VITE_POSTHOG_HOST=https://app.posthog.com
VITE_DISCORD_WEBHOOK_URL=your_discord_webhook_url

# Backend (.env)
POSTHOG_API_KEY=your_posthog_api_key
POSTHOG_HOST=https://app.posthog.com
```

### PostHog Session Replay Settings

In PostHog Dashboard:
1. Go to **Project Settings** → **Session Replay**
2. Enable **Session Replay**
3. Configure recording rules:
   - Record sessions with errors: ✅
   - Record sessions matching events: `frontend_error`, `backend_error`, `custom_issue_reported`

## How It Works

### Frontend Flow

1. **Error Occurs** → Error handler captures it
2. **Session Recording** → Automatically starts if not already active
3. **PostHog Event** → Error sent with session ID
4. **Discord Notification** → Includes session replay link
5. **API Request** → Includes session ID in `X-Session-ID` header

### Backend Flow

1. **Request Arrives** → Interceptor extracts session ID from header
2. **Error Occurs** → Error tracked with session ID
3. **PostHog Event** → Includes session replay URL
4. **Linked** → Backend error linked to frontend session replay

## Example: Complete Error Flow

```javascript
// 1. User encounters an error
try {
  // Some code that fails
  undefinedFunction();
} catch (error) {
  // 2. Error is captured with session replay
  captureManualError(error, {
    context: 'checkout_process',
    step: 'payment_validation',
  });
  
  // 3. Session replay is automatically started
  // 4. Error sent to PostHog with session ID
  // 5. Discord notification sent with replay link
  // 6. Backend API calls include session ID
}
```

## Testing

### Test Error Recording

1. Open the demo page (`index.html`)
2. Click "🔥 Trigger Global Error"
3. Check:
   - Console: Should show "🎥 Started session recording"
   - PostHog: Event should appear with session ID
   - Discord: Notification should include replay link

### Test Custom Issue Reporting

1. Click "📝 Report Custom Issue"
2. Enter issue description
3. Check Discord for notification with replay link

### Test Session Info

1. Click "🎥 Show Session Info"
2. Should display:
   - Session ID
   - Recording status
   - Replay URL

## Best Practices

1. **Start Recording Early**: Call `startRecordingForIssue()` before user actions that might fail
2. **Include Context**: Always provide context when capturing errors
3. **Link Sessions**: Ensure API requests include session ID (automatic with interceptor)
4. **Monitor Recording**: Check `isRecording()` before important operations
5. **User Privacy**: Session replay respects masking settings (sensitive inputs are masked)

## Troubleshooting

### Session Recording Not Starting

- Check PostHog API key is configured
- Verify PostHog session replay is enabled in dashboard
- Check browser console for errors

### Session ID Not in Backend

- Ensure API interceptor is set up (`setupApiInterceptor()`)
- Check that requests include `X-Session-ID` header
- Verify backend interceptor reads the header

### Discord Notifications Not Working

- Verify `VITE_DISCORD_WEBHOOK_URL` is set
- Check Discord webhook URL is valid
- Check browser console for errors

## API Reference

### Frontend Functions

- `initErrorHandler()` - Initialize error handling
- `captureManualError(error, context)` - Capture manual error
- `captureApiError(error, requestInfo)` - Capture API error
- `reportCustomIssue(description, context)` - Report custom issue
- `startRecordingForIssue()` - Start recording manually
- `getSessionInfo()` - Get session information
- `setupApiInterceptor()` - Setup API interceptor

### Backend Functions

- `trackApiRequest(details)` - Track API request (includes session ID)
- `trackBackendError(details)` - Track backend error with session link

