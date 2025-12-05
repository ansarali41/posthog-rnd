# Monorepo Structure

This backend is structured as a NestJS monorepo with the following organization:

## Directory Structure

```
backend/
├── apps/
│   ├── api/              # Main API application (port 3001)
│   │   └── src/
│   │       ├── items/    # Item management module
│   │       ├── guards/    # JWT auth guards
│   │       ├── strategies/# JWT strategy
│   │       ├── app.module.ts
│   │       └── main.ts
│   │
│   └── auth/             # Authentication service (port 3002)
│       └── src/
│           ├── auth/     # Auth module
│           ├── app.module.ts
│           └── main.ts
│
├── libs/
│   ├── posthog/          # Shared PostHog library
│   │   └── src/
│   │       ├── posthog.service.ts
│   │       ├── posthog.interceptor.ts
│   │       ├── posthog.module.ts
│   │       ├── posthog.controller.ts
│   │       └── dto/
│   │
│   └── common/           # Shared entities and utilities
│       └── src/
│           └── entities/
│               └── user.entity.ts
│
├── package.json
├── nest-cli.json
└── tsconfig.json
```

## Applications

### API App (`apps/api`)
- **Port**: 3001
- **Purpose**: Main REST API for item management
- **Features**:
  - Item CRUD operations
  - JWT authentication required
  - PostHog event tracking
  - Swagger documentation

### Auth App (`apps/auth`)
- **Port**: 3002
- **Purpose**: User authentication service
- **Features**:
  - User registration
  - User login
  - JWT token generation
  - User profile endpoint
  - Swagger documentation

## Shared Libraries

### PostHog Library (`libs/posthog`)
- **Purpose**: Centralized PostHog integration
- **Exports**:
  - `PosthogModule` - Global module
  - `PosthogService` - Event tracking service
  - `PosthogInterceptor` - Automatic API tracking
  - `PosthogController` - PostHog info endpoints
- **Used by**: API app

### Common Library (`libs/common`)
- **Purpose**: Shared entities and utilities
- **Exports**:
  - `User` entity - User model
- **Used by**: Both API and Auth apps

## Running the Applications

### Development Mode

**Run API app:**
```bash
npm run start:dev:api
```

**Run Auth app:**
```bash
npm run start:dev:auth
```

**Run both (in separate terminals):**
```bash
# Terminal 1
npm run start:dev:api

# Terminal 2
npm run start:dev:auth
```

### Production Mode

**Build:**
```bash
npm run build
```

**Run:**
```bash
# API
node dist/apps/api/main.js

# Auth
node dist/apps/auth/main.js
```

## PostHog Integration

PostHog is integrated in the API app through the shared library:

1. **Automatic Tracking**: The `PosthogInterceptor` automatically tracks:
   - `api_call` - When API is called
   - `api_response` - When API responds
   - `api_error` - When API errors

2. **User Identification**: Uses authenticated user ID from JWT token

3. **Manual Tracking**: Controllers can also track custom events:
   ```typescript
   this.posthogService.track(userId, 'custom_event', { ... });
   ```

## Authentication Flow

1. User registers/logs in via Auth app (port 3002)
2. Auth app returns JWT token
3. User includes token in API requests to API app (port 3001)
4. API app validates token and extracts user info
5. PostHog tracks events with user ID

## Database

Both apps share the same PostgreSQL database:
- **Users table**: Managed by Auth app
- **Items table**: Managed by API app

## Environment Variables

See `.env.example` for required configuration:
- Database credentials
- PostHog API key
- JWT secret
- Port numbers

