# PostHog Integration Documentation

Complete guide for PostHog integration with NestJS backend and frontend, including API tracking, error tracking, session replay, and change comparison.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Setup Instructions](#setup-instructions)
4. [Configuration](#configuration)
5. [How It Works](#how-it-works)
6. [API Tracking](#api-tracking)
7. [Error Tracking](#error-tracking)
8. [Session Replay](#session-replay)
9. [Previous Call Comparison](#previous-call-comparison)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This project integrates PostHog for comprehensive API tracking, error monitoring, and session replay. It tracks all POST, PUT, and PATCH requests with automatic comparison to previous calls, enabling you to see what changed between API invocations.

### Key Capabilities

- ✅ **API Request Tracking**: Tracks all write requests (POST, PUT, PATCH) with request/response bodies
- ✅ **Change Comparison**: Automatically compares current API call with previous call to same endpoint
- ✅ **Error Tracking**: Unified error tracking for frontend and backend with session replay links
- ✅ **Session Replay**: Frontend session recording linked to backend errors
- ✅ **Previous Call History**: Retrieves previous API call details from PostHog for comparison

---

## Features

### Backend Features

1. **Write Request Tracking** (POST, PUT, PATCH)
   - Captures request body, response body, status code, duration
   - Includes user ID, session ID, and metadata
   - Tracks to PostHog as `api_write_request` event

2. **Previous Call Comparison**
   - Queries PostHog API for previous call to same endpoint
   - Compares request/response bodies
   - Generates change diff showing what changed
   - Marks first calls vs subsequent calls

3. **Error Tracking**
   - Captures all backend errors with full context
   - Includes stack traces, request details, user info
   - Links to frontend session replay when available
   - Tracks as `error_occurred` event

### Frontend Features

1. **Error Tracking**
   - Captures global errors, promise rejections, API errors
   - Sends to PostHog and Discord webhook
   - Includes session replay links

2. **Session Replay**
   - Records browser interactions (clicks, typing, navigation)
   - Only saves sessions with errors (via dashboard rules)
   - Links backend errors to frontend session replays

3. **API Interceptor**
   - Automatically includes JWT token and session ID in requests
   - Captures API errors automatically

---

## Setup Instructions

### Prerequisites

- PostHog account (https://app.posthog.com)
- Node.js and npm installed
- PostgreSQL database (for backend)

### Step 1: Get PostHog Credentials

1. **Project API Key** (for sending events):
   - Go to: https://app.posthog.com/project/settings
   - Copy your Project API Key (starts with `phc_`)

2. **Personal API Key** (for querying events):
   - Go to: https://app.posthog.com/personal-api-keys
   - Click "Create personal API key"
   - Name it (e.g., "Backend Query Key")
   - **Enable `Query: Read` scope** (important!)
   - Copy the key (starts with `phx_`)

3. **Project ID**:
   - Go to: https://app.posthog.com/project/settings
   - Check the URL: `https://app.posthog.com/project/{PROJECT_ID}/settings`
   - Copy the numeric project ID (e.g., `254828`)

### Step 2: Backend Configuration

Create/update `backend/.env`:

```env
# PostHog Configuration
POSTHOG_API_KEY=phc_your_project_api_key_here          # Project API Key (for sending events)
POSTHOG_PERSONAL_API_KEY=phx_your_personal_api_key     # Personal API Key (for querying events)
POSTHOG_HOST=https://app.posthog.com                   # PostHog host
POSTHOG_PROJECT_ID=254828                              # Your project ID (numeric)

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=posthog_demo

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Step 3: Frontend Configuration

Create/update `frontend/.env`:

```env
# PostHog Configuration
VITE_POSTHOG_API_KEY=phc_your_project_api_key_here     # Same Project API Key
VITE_POSTHOG_HOST=https://app.posthog.com
VITE_POSTHOG_PROJECT_ID=254828                         # Same Project ID

# Discord Webhook (optional)
VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Step 4: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 5: Configure PostHog Dashboard

#### Session Replay Recording Rules

1. Go to: https://app.posthog.com/project/settings/session-replay
2. Click "Recording conditions" → "Web" tab
3. Select "Event triggers"
4. Add event: `error_occurred`
5. Set trigger matching to "Start when **any** trigger below matches"
6. Set Sampling to `100%`
7. Set default sample rate to `0%` (so only error sessions are recorded)

**Result**: Only sessions with `error_occurred` events will be recorded.

---

## Configuration

### Backend Configuration

#### PostHog Service (`backend/libs/posthog/src/posthog.service.ts`)

- **Event Tracking**: Sends events to PostHog
- **Previous Call Query**: Queries PostHog API for previous API calls
- **Change Comparison**: Compares current vs previous calls
- **Error Tracking**: Unified error tracking method

#### PostHog Interceptor (`backend/libs/posthog/src/posthog.interceptor.ts`)

- **Applied to**: All controllers using `@UseInterceptors(PosthogInterceptor)`
- **Tracks**: POST, PUT, PATCH requests only
- **Captures**: Request body, response body, headers, query params, duration
- **Links**: Includes session ID from frontend (`X-Session-ID` header)

### Frontend Configuration

#### PostHog Config (`frontend/src/posthog-config.js`)

- **Session Recording**: Enabled with `sampleRate: 1.0`
- **Auto-capture**: Disabled (only errors tracked)
- **Pageviews**: Disabled (only errors tracked)

#### Error Handler (`frontend/src/error-handler.js`)

- **Global Error Handler**: Captures all JavaScript errors
- **Promise Rejection Handler**: Captures unhandled promise rejections
- **API Error Handler**: Captures API errors automatically
- **Discord Integration**: Sends error notifications to Discord

---

## How It Works

### API Request Flow

```
1. Frontend makes API request (POST/PUT/PATCH)
   ↓
2. Frontend adds X-Session-ID header (PostHog session ID)
   ↓
3. Backend interceptor captures request
   ↓
4. Backend queries PostHog for previous call to same endpoint
   ↓
5. Backend processes request and gets response
   ↓
6. Backend compares current vs previous call
   ↓
7. Backend sends api_write_request event to PostHog with:
   - Current request/response
   - Previous request/response (if found)
   - Change diff
   - is_first_call flag
```

### Error Flow

```
1. Error occurs (frontend or backend)
   ↓
2. Error handler captures error
   ↓
3. Frontend: Starts session recording (if not already)
   ↓
4. Error sent to PostHog as error_occurred event
   ↓
5. Backend errors include session_replay_url
   ↓
6. Discord notification sent (if configured)
```

---

## API Tracking

### Tracked Events

#### `api_write_request` Event

Triggered for: POST, PUT, PATCH requests

**Properties:**
```json
{
  "method": "POST",
  "path": "/api/items",
  "url": "/api/items",
  "status_code": 201,
  "duration_ms": 45,
  "timestamp": "2025-12-05T15:12:50.981Z",
  "request_body": { "name": "Item", "description": "..." },
  "response_body": { "id": 1, "name": "Item", ... },
  "previous_request_body": { "name": "Old Item", ... },
  "previous_response_body": { "id": 1, "name": "Old Item", ... },
  "previous_timestamp": "2025-12-05T15:12:20.000Z",
  "previous_status_code": 201,
  "previous_duration_ms": 50,
  "previous_call": {
    "request_body": {...},
    "response_body": {...},
    "timestamp": "...",
    "status_code": 201,
    "duration_ms": 50,
    "method": "POST",
    "path": "/api/items",
    "url": "/api/items",
    "user_id": "1",
    "event_id": "abc-123"
  },
  "changes": {
    "request_body": {
      "name": { "previous": "Old Item", "current": "Item" }
    },
    "response_body": {
      "name": { "previous": "Old Item", "current": "Item" }
    }
  },
  "change_summary": "Request body changed; Response body changed",
  "is_first_call": false,
  "$session_id": "019aef05-a48a-7bf3-b436-cd68ae3fff5e",
  "user_id": "1"
}
```

### Not Tracked

- GET requests (read-only)
- DELETE requests
- HEAD, OPTIONS, etc.

---

## Error Tracking

### Backend Errors

**Event**: `error_occurred`

**Properties:**
```json
{
  "error_name": "BadRequestException",
  "error_message": "Item already exists",
  "error_type": "backend_error",
  "error_stack": "BadRequestException: Item already exists at...",
  "context": {
    "method": "POST",
    "url": "/api/items",
    "path": "/api/items",
    "requestBody": {...},
    "requestHeaders": {...},
    "statusCode": 400,
    "duration": 45
  },
  "$session_id": "019aef05-a48a-7bf3-b436-cd68ae3fff5e",
  "session_replay_url": "https://app.posthog.com/project/254828/replay/019aef05-...",
  "user_id": "1"
}
```

### Frontend Errors

**Event**: `error_occurred`

**Properties:**
```json
{
  "error_name": "Error",
  "error_message": "Failed to fetch",
  "error_type": "frontend_error",
  "error_stack": "Error: Failed to fetch at...",
  "error_filename": "https://localhost:3000/index.html",
  "error_lineno": 123,
  "error_colno": 45,
  "url": "https://localhost:3000/index.html",
  "user_agent": "Mozilla/5.0...",
  "$session_id": "019aef05-a48a-7bf3-b436-cd68ae3fff5e",
  "session_replay_url": "https://app.posthog.com/project/254828/replay/019aef05-...",
  "user_id": "1"
}
```

---

## Session Replay

### How It Works

1. **Frontend**: PostHog records all browser sessions (with `sampleRate: 1.0`)
2. **Dashboard Rules**: Only sessions with `error_occurred` events are saved
3. **Backend Errors**: Include `session_replay_url` linking to frontend session
4. **Result**: When backend error occurs, you can see what user was doing in browser

### Configuration

**Frontend** (`frontend/src/posthog-config.js`):
```javascript
session_recording: {
  sampleRate: 1.0,  // Record all sessions
  maskAllInputs: true,
  recordCanvas: true,
}
```

**PostHog Dashboard**:
- Recording Rules → Event triggers → `error_occurred`
- Default sample rate: `0%`
- Trigger matching: "Start when any trigger matches"

### Session Replay URL Format

```
https://app.posthog.com/project/{PROJECT_ID}/replay/{SESSION_ID}
```

---

## Previous Call Comparison

### How It Works

1. **Query PostHog**: When API request comes in, query PostHog for previous call
2. **Compare**: Compare current request/response with previous
3. **Generate Diff**: Create structured diff showing changes
4. **Include in Event**: Add previous call data and changes to current event

### Query Process

1. Uses Personal API Key with `query:read` scope
2. Queries PostHog Query API: `/api/projects/{projectId}/query/`
3. Filters by: `method` and `path`
4. Orders by: `timestamp DESC`
5. Limits to: 1 result (most recent)

### Change Detection

The system detects:
- **Added fields**: Fields present in current but not previous
- **Removed fields**: Fields present in previous but not current
- **Changed fields**: Fields with different values (shows previous → current)

### Example Change Output

```json
{
  "changes": {
    "request_body": {
      "name": {
        "previous": "Old Item",
        "current": "New Item"
      },
      "description": {
        "added": "Updated description"
      }
    },
    "response_body": {
      "updatedAt": {
        "previous": "2025-12-05T09:00:00Z",
        "current": "2025-12-05T09:05:00Z"
      }
    }
  },
  "change_summary": "Request body changed; Response body changed"
}
```

### Important Notes

- **Processing Delay**: PostHog needs 10-30 seconds to process events before they're queryable
- **First Calls**: Will show `is_first_call: true` (no previous call exists)
- **API Key**: Requires Personal API Key with `query:read` scope (not Project API Key)

---

## Troubleshooting

### Issue: `is_first_call: true` even after multiple calls

**Possible Causes:**
1. PostHog events not processed yet (wait 30 seconds)
2. Personal API Key missing `query:read` scope
3. Project ID not set in `.env`
4. Query API format incorrect

**Solutions:**
1. Wait 30 seconds between API calls
2. Check Personal API Key has `query:read` scope enabled
3. Verify `POSTHOG_PROJECT_ID` is set in `.env`
4. Check backend logs for query errors

### Issue: "API key missing required scope 'query:read'"

**Solution:**
1. Go to: https://app.posthog.com/personal-api-keys
2. Edit your Personal API Key
3. Enable `Query: Read` scope
4. Save and restart backend server

### Issue: "Recording not found" for session replay

**Possible Causes:**
1. Session recording not enabled
2. Project ID incorrect in session replay URL
3. Session ID format incorrect

**Solutions:**
1. Verify `sampleRate: 1.0` in frontend PostHog config
2. Check `POSTHOG_PROJECT_ID` is set correctly
3. Verify session replay rules are configured in dashboard
4. Wait a few minutes for recording to process

### Issue: PostHog Query API returns 400/403 errors

**Check:**
1. Personal API Key is set (not Project API Key)
2. Personal API Key has `query:read` scope
3. Project ID is correct (numeric, from URL)
4. Query format matches PostHog API requirements

### Issue: Previous call not found

**Check Logs For:**
- `🔍 Querying PostHog for previous call`
- `✅ Found previous call` or `⚠️ No previous call found`
- Any error messages from PostHog API

**Common Reasons:**
- First call to endpoint (expected)
- PostHog still processing event (wait 30 seconds)
- Query API failing (check API key and scope)

---

## API Reference

### Backend Methods

#### `PosthogService.trackWriteRequestWithComparison()`

Tracks write request and compares with previous call.

```typescript
await posthogService.trackWriteRequestWithComparison({
  method: 'POST',
  path: '/api/items',
  url: '/api/items',
  requestBody: {...},
  responseBody: {...},
  statusCode: 201,
  userId: '1',
  duration: 45,
  sessionId: '019aef05-...',
});
```

#### `PosthogService.trackError()`

Tracks error with full context.

```typescript
posthogService.trackError({
  errorName: 'BadRequestException',
  errorMessage: 'Item already exists',
  errorStack: '...',
  userId: '1',
  sessionId: '019aef05-...',
  context: {...},
  errorType: 'backend_error',
});
```

### Frontend Methods

#### `captureError(error, context)`

Captures frontend error.

```javascript
import { captureManualError } from './src/main.js';

try {
  // Your code
} catch (error) {
  captureManualError(error, { type: 'custom_error' });
}
```

#### `captureApiError(error, requestInfo)`

Captures API error.

```javascript
import { captureApiError } from './src/main.js';

fetch('/api/items')
  .catch(error => {
    captureApiError(error, { endpoint: '/api/items' });
  });
```

---

## Environment Variables Reference

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTHOG_API_KEY` | Yes | Project API Key (for sending events) |
| `POSTHOG_PERSONAL_API_KEY` | Yes | Personal API Key (for querying events) |
| `POSTHOG_HOST` | No | PostHog host (default: https://app.posthog.com) |
| `POSTHOG_PROJECT_ID` | Yes | Numeric project ID from PostHog URL |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_POSTHOG_API_KEY` | Yes | Project API Key |
| `VITE_POSTHOG_HOST` | No | PostHog host (default: https://app.posthog.com) |
| `VITE_POSTHOG_PROJECT_ID` | Yes | Numeric project ID |
| `VITE_DISCORD_WEBHOOK_URL` | No | Discord webhook for error notifications |

---

## PostHog Dashboard

### Viewing Events

1. **API Requests**: Go to Events → Filter by `api_write_request`
2. **Errors**: Go to Events → Filter by `error_occurred`
3. **Session Replays**: Go to Session Replay → Filter by event or user

### Useful Filters

- **Event**: `api_write_request` or `error_occurred`
- **Property**: `method`, `path`, `user_id`, `is_first_call`
- **Time Range**: Last 24 hours, 7 days, etc.

### Viewing Change Comparison

1. Click on an `api_write_request` event
2. View Properties tab
3. Check:
   - `previous_call` object (complete previous call data)
   - `changes` object (structured diff)
   - `change_summary` (human-readable summary)
   - `is_first_call` (true/false)

---

## Best Practices

1. **Wait Between Calls**: PostHog needs 10-30 seconds to process events
2. **Use Personal API Key**: For querying, always use Personal API Key with `query:read` scope
3. **Set Project ID**: Always set `POSTHOG_PROJECT_ID` in `.env` (don't rely on extraction from API key)
4. **Monitor Logs**: Check backend logs for query errors and warnings
5. **Session Replay Rules**: Configure dashboard rules to only save error sessions
6. **Sensitive Data**: PostHog automatically sanitizes passwords, tokens, etc.

---

## Support

### PostHog Resources

- **API Documentation**: https://posthog.com/api
- **Query API**: https://posthog.com/docs/api/query
- **Session Replay**: https://posthog.com/docs/session-replay
- **Personal API Keys**: https://app.posthog.com/personal-api-keys

### Common Issues

See [Troubleshooting](#troubleshooting) section above.

---

## Summary

This integration provides:

✅ **Complete API Tracking**: All write requests tracked with full context  
✅ **Change Detection**: Automatic comparison with previous calls  
✅ **Error Monitoring**: Unified error tracking with session replay links  
✅ **Session Replay**: Frontend recordings linked to backend errors  
✅ **Historical Analysis**: Query previous API calls from PostHog  

All data is stored in PostHog, enabling powerful analysis and debugging capabilities.

