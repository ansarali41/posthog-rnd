# PostHog Frontend Error Logging

Frontend error logging with PostHog integration and Discord notifications.

## Features

- ✅ Automatic error capture (global errors, promise rejections)
- ✅ PostHog integration with session replay (video recording)
- ✅ Discord webhook notifications with session replay links
- ✅ Manual error capture API
- ✅ API error tracking with session linking
- ✅ Custom issue reporting with video recording
- ✅ Manual session recording control
- ✅ Backend-frontend session linking

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add:
   - `VITE_POSTHOG_API_KEY` - Your PostHog API key
   - `VITE_DISCORD_WEBHOOK_URL` - Your Discord webhook URL

3. **Get Discord Webhook URL:**
   - Go to your Discord channel
   - Right-click → Edit Channel → Integrations → Webhooks
   - Create New Webhook
   - Copy the webhook URL

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

## Usage

### Automatic Error Handling

Errors are automatically captured when:
- Global JavaScript errors occur
- Unhandled promise rejections happen
- Console errors are logged

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
  .then(response => {
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
  })
  .catch(error => {
    captureApiError(error, {
      endpoint: '/api/endpoint',
      method: 'GET',
    });
  });
```

### Custom Issue Reporting

```javascript
import { reportCustomIssue } from './src/main.js';

// User reports a custom issue with session replay
reportCustomIssue('Button is not working', {
  page: window.location.href,
  user_action: 'clicked_submit',
});
```

### Session Recording Control

```javascript
import { startRecordingForIssue, getSessionInfo } from './src/main.js';

// Start recording before an issue occurs
startRecordingForIssue();

// Get session information
const info = getSessionInfo();
console.log('Session ID:', info.sessionId);
console.log('Replay URL:', info.replayUrl);
```

**Note**: See [SESSION_REPLAY.md](./SESSION_REPLAY.md) for complete session replay documentation.

## How It Works

1. **Error occurs** → Error handler captures it
2. **PostHog** → Error is sent to PostHog with session replay
3. **Discord** → Error notification is sent to Discord webhook
4. **Session Replay** → PostHog starts recording the session

## Discord Notification Format

Discord notifications include:
- Error name and message
- URL and user information
- File, line, and column numbers
- Stack trace
- Session replay link
- Additional context

## Testing

Open `index.html` in your browser and click the test buttons to trigger different types of errors.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_POSTHOG_API_KEY` | PostHog API key | Yes |
| `VITE_POSTHOG_HOST` | PostHog host URL | No (default: https://app.posthog.com) |
| `VITE_DISCORD_WEBHOOK_URL` | Discord webhook URL | Yes |

