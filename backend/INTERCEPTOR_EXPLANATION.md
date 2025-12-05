# PostHog Interceptor - How It Works

## Location

The interceptor is located in:
- **File**: `libs/posthog/src/posthog.interceptor.ts`
- **Registered in**: `apps/api/src/main.ts` (line 21)

## Registration

The interceptor is registered globally in `apps/api/src/main.ts`:

```typescript
// Line 19-21 in apps/api/src/main.ts
// Enable PostHog interceptor for API tracking
const posthogService = app.get(PosthogService);
app.useGlobalInterceptors(new PosthogInterceptor(posthogService));
```

This means **ALL** API endpoints in the API app are automatically tracked.

## How It Works

### Flow Diagram

```
1. Request comes in
   ↓
2. PosthogInterceptor.intercept() is called FIRST
   ↓
3. Interceptor extracts:
   - Method (GET, POST, etc.)
   - URL and path
   - Query parameters
   - Request body
   - Request headers
   - User ID (from JWT token or header)
   ↓
4. Request continues to controller
   ↓
5. Controller processes request
   ↓
6. Response comes back (success or error)
   ↓
7. Interceptor tracks ONE "api_request" event with:
   - All request details (method, URL, body, headers)
   - Response details (status code, response body)
   - Error details (if error occurred)
   - Duration
   ↓
8. Response sent to client
```

### Step-by-Step Process

#### 1. **Request Interception** (Before Controller)

When a request comes in, the interceptor extracts all request information but **does not track yet**:

```typescript
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Extract request information
    const method = request.method;        // "POST", "GET", etc.
    const url = request.url;              // "/items"
    const path = request.route?.path;     // "/items"
    const query = request.query;          // Query parameters
    const body = this.sanitizeBody(request.body);  // Request body
    const headers = this.sanitizeHeaders(request.headers);  // Headers
    
    // Get user ID from JWT token (set by JwtAuthGuard)
    const userId = request.user?.id?.toString() || 'anonymous';
    
    // Store start time for duration calculation
    const startTime = Date.now();
    
    // Note: We DON'T track here - we wait for the response
```

#### 2. **Request Processing**

The request continues to your controller:

```typescript
// In items.controller.ts
async create(@Body() createItemDto: CreateItemDto, @Request() req) {
    // This runs normally
    return this.itemsService.create(createItemDto, userId);
}
```

#### 3. **Response Interception** (After Controller)

After the controller returns, the interceptor tracks **ONE complete event** with all request and response details:

```typescript
return next.handle().pipe(
    tap({
        next: (data) => {
            // Success response
            const duration = Date.now() - startTime;
            const statusCode = response.statusCode;  // 201, 200, etc.
            
            // Track ONE "api_request" event with ALL details
            this.posthogService.trackApiRequest({
                method, url, path, query,
                requestBody: body,        // Request body
                requestHeaders: headers,  // Request headers
                statusCode,               // 201
                responseBody: data,       // { id: 1, name: "Item", ... }
                duration,                 // 45ms
                userId,
                success: true
            });
        },
        error: (error) => {
            // Error response
            // Track ONE "api_request" event with ALL details including error
            this.posthogService.trackApiRequest({
                method, url, path, query,
                requestBody: body,        // Request body
                requestHeaders: headers,  // Request headers
                statusCode: error.status, // 400, 500, etc.
                errorMessage: error.message,
                errorStack: error.stack,
                duration,
                userId,
                success: false
            });
        }
    })
);
```

**Event tracked**: `api_request` with **ALL** properties in one event:
- **Request details**:
  - `method`: "POST"
  - `url`: "/items"
  - `path`: "/items"
  - `query_params`: {}
  - `request_body`: { "name": "Item", "description": "..." }
  - `request_headers`: { "content-type": "application/json", ... }
- **Response details** (on success):
  - `status_code`: 201
  - `response_body`: { id: 1, name: "Item", ... }
  - `success`: true
- **Error details** (on error):
  - `status_code`: 400
  - `error_message`: "Validation failed"
  - `error_stack`: "..."
  - `success`: false
- **Metadata**:
  - `duration_ms`: 45
  - `$current_url`: "/items"

## Example: POST /items Request

### What Happens:

1. **Request arrives** → Interceptor intercepts and extracts request details
2. **Controller executes** → Creates item in database
3. **Response returns** → Interceptor tracks **ONE** `api_request` event:
   ```json
   {
     "event": "api_request",
     "properties": {
       "method": "POST",
       "url": "/items",
       "path": "/items",
       "query_params": {},
       "request_body": { "name": "My Item", "description": "..." },
       "request_headers": { "content-type": "application/json", ... },
       "status_code": 201,
       "response_body": { "id": 1, "name": "My Item", ... },
       "duration_ms": 45,
       "success": true,
       "$current_url": "/items",
       "userId": "1"
     }
   }
   ```

4. **Service also tracks** `item_created` (business event - separate from API tracking)

## Security Features

The interceptor automatically sanitizes sensitive data:

### Request Body Sanitization:
- Fields like `password`, `token`, `secret` are redacted as `[REDACTED]`
- Large bodies (>1000 chars) are truncated

### Headers Sanitization:
- `authorization`, `cookie`, `x-api-key` are redacted as `[REDACTED]`

### Response Sanitization:
- Large responses (>2000 chars) are truncated with preview

## User Identification

The interceptor gets user ID from:

1. **JWT Token** (preferred): `request.user.id` (set by `JwtAuthGuard`)
2. **Header**: `x-user-id` header (fallback)
3. **Anonymous**: `'anonymous'` if neither available

## Why Use Interceptor?

✅ **Automatic**: No need to add tracking code in every controller
✅ **Consistent**: All endpoints tracked the same way
✅ **Complete**: Captures request, response, and errors
✅ **Centralized**: Easy to modify tracking logic in one place
✅ **Non-intrusive**: Doesn't affect your business logic

## Viewing Events

All events are sent to PostHog and can be viewed at:
- **PostHog Dashboard**: https://app.posthog.com → Activity
- **Local Log**: `GET /posthog/events` endpoint

## Files Involved

1. **Interceptor**: `libs/posthog/src/posthog.interceptor.ts`
2. **Service**: `libs/posthog/src/posthog.service.ts`
3. **Registration**: `apps/api/src/main.ts` (line 21)
4. **Module**: `libs/posthog/src/posthog.module.ts` (exports interceptor)

