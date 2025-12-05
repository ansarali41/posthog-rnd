# PostHog Backend Monorepo

NestJS monorepo with separate applications for API and Authentication, plus shared libraries.

## Structure

```
backend/
├── apps/
│   ├── api/          # Main API application (port 3001)
│   └── auth/         # Authentication service (port 3002)
├── libs/
│   ├── posthog/      # Shared PostHog library
│   └── common/        # Shared entities and utilities
└── package.json
```

## Applications

### API App (`apps/api`)
- Main REST API
- Item management endpoints
- PostHog event tracking
- JWT authentication required
- Port: 3001
- Swagger: http://localhost:3001/api

### Auth App (`apps/auth`)
- User registration
- User login
- JWT token generation
- User profile
- Port: 3002
- Swagger: http://localhost:3002/api

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up PostgreSQL database:**
```bash
createdb posthog_demo
```

3. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Required environment variables:**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=posthog_demo

# PostHog
POSTHOG_API_KEY=phc_your_personal_api_key_here
POSTHOG_HOST=https://app.posthog.com

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Server Ports
PORT=3001          # API app
AUTH_PORT=3002     # Auth app
FRONTEND_URL=http://localhost:3000
```

## Running the Applications

### Run API App
```bash
npm run start:dev:api
# or
npm run start:dev
```

### Run Auth App
```bash
npm run start:dev:auth
```

### Run Both (in separate terminals)
```bash
# Terminal 1
npm run start:dev:api

# Terminal 2
npm run start:dev:auth
```

## API Endpoints

### Authentication (Auth App - port 3002)

**Register:**
```
POST http://localhost:3002/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Login:**
```
POST http://localhost:3002/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Get Profile:**
```
GET http://localhost:3002/auth/profile
Authorization: Bearer <token>
```

### API (API App - port 3001)

All endpoints require JWT authentication:

**Create Item:**
```
POST http://localhost:3001/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Item Name",
  "description": "Item Description"
}
```

**Search Items:**
```
GET http://localhost:3001/items/search?q=search_term
Authorization: Bearer <token>
```

**List All Items:**
```
GET http://localhost:3001/items
Authorization: Bearer <token>
```

## Using Authentication

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

3. **Use token in API calls:**
```bash
curl -X GET http://localhost:3001/items \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Swagger Documentation

- **API Swagger**: http://localhost:3001/api
- **Auth Swagger**: http://localhost:3002/api

Both Swagger UIs support "Authorize" button to add JWT token.

## PostHog Integration

PostHog tracking is integrated in the API app:
- All API calls are tracked with user ID from JWT token
- Events include: `api_call`, `api_response`, `api_error`
- User identification uses the authenticated user ID

## Development

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Test
```bash
npm run test
```

## Monorepo Structure

- **apps/api**: Main API application
- **apps/auth**: Authentication service
- **libs/posthog**: Shared PostHog library (used by API app)
- **libs/common**: Shared entities (User, etc.)

## Notes

- Both apps share the same database
- JWT tokens are valid for 7 days
- Passwords are hashed using bcrypt
- User emails must be unique
