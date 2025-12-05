# Session Replay Troubleshooting

## How PostHog Session Replay Works

PostHog session replay works differently than you might expect:

1. **Buffering**: PostHog continuously buffers session recordings in the browser
2. **Saving**: Sessions are only saved/uploaded to PostHog when events are captured
3. **Sample Rate**: The `sampleRate` function is evaluated at session START, not dynamically

## Current Implementation

Our implementation:
- ✅ Session recording is **enabled** (`sampleRate: 1.0`)
- ✅ PostHog is **buffering** all sessions
- ✅ Sessions are **saved** only when error events occur (since we only send error events)
- ✅ Session ID is included in error events for linking

## Why Session Replay Might Not Be Working

### 1. PostHog API Key Not Configured
**Check**: Is `VITE_POSTHOG_API_KEY` set in your `.env` file?

**Fix**: 
```bash
cd frontend
echo "VITE_POSTHOG_API_KEY=your_actual_key_here" >> .env
```

### 2. Session Replay Not Enabled in PostHog Dashboard
**Check**: Go to PostHog Dashboard → Project Settings → Session Replay
- Is "Session Replay" enabled?
- Are there any domain restrictions?

**Fix**: Enable Session Replay in your PostHog project settings

### 3. No Errors Occurred Yet
**Check**: Session replay only saves when errors occur. Have you triggered an error?

**Test**: 
- Open browser console
- Trigger an error (e.g., try to create a duplicate item)
- Check PostHog dashboard for the error event

### 4. Browser Console Check
**Check**: Open browser console and look for:
- `✅ PostHog initialized with session replay`
- `🎥 Session recording enabled (buffering - will save on errors)`
- `🎥 Error occurred - session will be saved with error event`

### 5. PostHog Dashboard Check
**Check**: 
1. Go to PostHog Dashboard → Activity
2. Look for `error_occurred` events
3. Click on an error event
4. Check if there's a "Session Replay" link

## Testing Session Replay

1. **Trigger an Error**:
   - Try to create a duplicate item (will fail with "Item already exists")
   - Or trigger a network error (backend not running)

2. **Check PostHog**:
   - Go to PostHog Dashboard
   - Find the `error_occurred` event
   - Click on it
   - Look for session replay link

3. **Check Console**:
   - Open browser DevTools → Console
   - Look for PostHog initialization messages
   - Look for session recording messages

## Expected Behavior

- ✅ PostHog initializes on page load
- ✅ Session recording buffers continuously
- ✅ When error occurs, error event is captured
- ✅ Session is saved to PostHog with the error event
- ✅ Session replay link is available in PostHog dashboard

## Verification Steps

1. **Check PostHog Initialization**:
   ```javascript
   // In browser console
   window.posthog?.get_session_id() // Should return a session ID
   ```

2. **Check if Recording**:
   ```javascript
   // In browser console  
   window.posthog?.sessionRecording?.isRecording() // Should return true/false
   ```

3. **Check Error Events**:
   - Go to PostHog Dashboard → Activity
   - Filter by event: `error_occurred`
   - Check if events have `$session_id` property

## Common Issues

### Issue: "Session replay not showing in PostHog"
**Solution**: 
- Make sure Session Replay is enabled in PostHog project settings
- Check that your domain is authorized
- Wait a few minutes for PostHog to process the session

### Issue: "No session ID in error events"
**Solution**:
- Check browser console for PostHog initialization errors
- Verify `VITE_POSTHOG_API_KEY` is set correctly
- Check network tab for PostHog API calls

### Issue: "Session recording not starting"
**Solution**:
- PostHog buffers sessions continuously - this is normal
- Sessions are saved when error events occur
- Check PostHog dashboard for saved sessions

## Notes

- PostHog buffers sessions continuously (this is expected)
- Sessions are only saved when events are captured
- Since we only send error events, only error sessions are saved
- This is the closest we can get to "record only on errors" with PostHog's architecture

