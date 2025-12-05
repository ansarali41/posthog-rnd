# PostHog Session Recording Setup - Error Only

## Problem
PostHog is recording full sessions, but we want to record ONLY when errors occur.

## Solution
Configure PostHog Dashboard to use **Recording Rules** that only save sessions with error events.

## Steps to Configure

### 1. Go to PostHog Dashboard
- Navigate to: **Project Settings** → **Session Replay** → **Recording Rules**

### 2. Create Recording Rule
Click **"Add Recording Rule"** and configure:

**Rule Type**: "Record sessions matching event"
**Event Name**: `error_occurred`
**Sample Rate**: `100%` (or as needed)

### 3. Disable Default Recording
- In **Session Replay Settings**, set **Default Sample Rate** to `0%`
- This ensures no sessions are recorded by default

### 4. Save Configuration
- Save the recording rule
- PostHog will now ONLY record sessions that have `error_occurred` events

## How It Works

1. **Default**: `sampleRate: 0` - No recording by default
2. **On Error**: We capture `error_occurred` event
3. **PostHog Rule**: Dashboard rule saves sessions with `error_occurred` events
4. **Result**: Only error sessions are recorded and saved

## Alternative: Code-Based Approach

If you want to control this in code (limited by PostHog's API):

```javascript
// In posthog-config.js
session_recording: {
  sampleRate: 0, // Don't record by default
  // Recording will be controlled by dashboard rules
}
```

Then in PostHog dashboard, configure:
- **Recording Rules**: Record sessions with event `error_occurred`

## Verification

1. **Trigger an error** (e.g., create duplicate item)
2. **Check PostHog Dashboard** → Activity → Filter by `error_occurred`
3. **Click on error event** → Should see session replay link
4. **View replay** → Should show only the error context (not full session)

## Important Notes

- PostHog's `sampleRate` is evaluated at session START, not dynamically
- We can't programmatically start recording mid-session
- **Solution**: Use PostHog Dashboard recording rules to filter sessions
- Only sessions with `error_occurred` events will be saved
- This effectively gives you "error-only" recordings

## Current Implementation

- ✅ `sampleRate: 0` - No default recording
- ✅ Error events captured with `error_occurred` event name
- ✅ PostHog dashboard rules filter sessions by event
- ✅ Only error sessions are saved

## Troubleshooting

**Issue**: Still seeing full sessions
**Solution**: 
1. Check PostHog dashboard recording rules
2. Ensure rule is set to `error_occurred` event
3. Verify default sample rate is 0%

**Issue**: No sessions being recorded
**Solution**:
1. Check if errors are being captured (PostHog → Activity)
2. Verify recording rule is active
3. Check PostHog API key is configured

