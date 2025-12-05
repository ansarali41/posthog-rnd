# Quick Start Guide

## Prerequisites

- Node.js 18+
- PostgreSQL running
- PostHog account (free at https://app.posthog.com)

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up database:**
```bash
createdb posthog_demo
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your credentials:
# - POSTHOG_API_KEY (from https://app.posthog.com/personal-api-keys)
# - JWT_SECRET (any secure string)
# - Database credentials
```

4. **Start both applications:**

**Terminal 1 - Auth Service:**
```bash
npm run start:dev:auth
```
Runs on http://localhost:3002

**Terminal 2 - API Service:**
```bash
npm run start:dev:api
```
Runs on http://localhost:3001

## Quick Test

1. **Register a user:**
```bash
curl -X POST http://localhost:3002/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

2. **Login to get token:**
```bash
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Copy the `access_token` from the response.

3. **Create an item (with token):**
```bash
curl -X POST http://localhost:3001/items \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Item","description":"Item description"}'
```

4. **Check PostHog:**
- Go to https://app.posthog.com
- Navigate to Activity
- You should see events: `api_call`, `api_response`, `api_item_create_called`, `item_created`

## Swagger Documentation

- **Auth API**: http://localhost:3002/api
- **Main API**: http://localhost:3001/api

Use the "Authorize" button in Swagger to add your JWT token.

## PostHog Events Tracked

- `api_call` - Every API request (with URL, body, headers)
- `api_response` - Every API response (with status, response body)
- `api_error` - Every API error (with error message)
- `api_item_create_called` - When create endpoint is called
- `item_created` - When item is saved to database
- `api_item_search_called` - When search endpoint is called
- `item_searched` - When search is performed
- `api_items_list_called` - When list endpoint is called

All events include authenticated user ID from JWT token.

