# VMS — Vehicle Management System API

A production-grade **multi-tenant SaaS backend** built with NestJS, designed for fleet operators, vehicle rental companies, and workshop managers. One deployment serves multiple independent tenants, each fully isolated at the data level.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 (TypeScript strict mode) |
| ORM | Prisma 7 with pg adapter |
| Database | PostgreSQL 15+ |
| Cache / Pub-Sub | Redis (ioredis) |
| Background Jobs | BullMQ (native, no adapter) |
| Real-time | Socket.IO via `@nestjs/platform-socket.io` |
| Auth | JWT (access 15 min + refresh 7 days) via `@nestjs/jwt` |
| Security | Helmet, express-rate-limit, bcrypt, class-validator |
| Logging | Winston via nest-winston |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in values
cp .env.example .env

# 3. Run database migrations
npm run prisma:migrate

# 4. Generate Prisma client
npm run prisma:generate

# 5. Start in development mode
npm run start:dev
```

Server starts at `http://localhost:3000`.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vms_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# App
PORT=3000
```

---

## NPM Scripts

```bash
# ── Development ───────────────────────────────────
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugger
npm run start:prod         # Start compiled output
npm run build              # Compile TypeScript

# ── Prisma ────────────────────────────────────────
npm run prisma:generate    # Regenerate Prisma client after schema changes
npm run prisma:migrate     # Create + apply migration (dev)
npm run prisma:migrate:prod # Apply migrations (production, no prompts)
npm run prisma:studio      # Open Prisma Studio GUI at http://localhost:5555
npm run prisma:reset       # Drop DB + re-run all migrations (dev only)
npm run prisma:push        # Push schema to DB without migration (prototyping)

# ── Code Quality ──────────────────────────────────
npm run lint               # Lint + auto-fix
npm run format             # Prettier format
npm run test               # Unit tests
npm run test:cov           # Coverage report
npm run test:e2e           # End-to-end tests
```

---

## Architecture

```
src/
├── auth/              JWT auth + bcrypt
├── users/             User management
├── tenants/           Tenant CRUD (SUPER_ADMIN)
├── subscriptions/     Subscription plans
├── feature-access/    Per-tenant feature flags
├── vehicles/          Fleet vehicle management
├── drivers/           Driver profiles
├── assignments/       Vehicle–driver assignments
├── bookings/          Rental bookings
├── scheduling/        Conflict-safe availability engine
├── contracts/         Vehicle source + client contracts
├── trips/             Trip lifecycle (start → end)
├── fuel/              Fuel log + odometer tracking
├── maintenance/       Maintenance logs + item breakdown
├── documents/         Document expiry tracking
├── expenses/          Operating expenses
├── income/            Revenue records
├── accounting/        Profit/loss aggregation
├── tracking/          GPS + Redis cache + WebSocket emit
├── alerts/            Expiry + maintenance + offline alerts
├── workshop/          Job card → parts → final bill
├── reports/           Mileage, fuel, usage, P&L reports
├── audit/             Immutable action log
├── jobs/              BullMQ daily scan + offline detection
├── gateways/          Socket.IO WebSocket gateway
└── common/
    ├── guards/        Auth, Roles, Tenant, Feature
    ├── interceptors/  Logging, Audit, SensitiveFields
    ├── filters/       Global exception filter
    ├── decorators/    @CurrentUser, @Roles, @Public, @Feature
    └── redis/         Global Redis client provider
```

### Global Security Layers (applied to every request)

1. **Helmet** — sets 11 security headers (CSP, HSTS, X-Frame-Options, etc.)
2. **Rate Limiter** — 100 requests / 15 min per IP (global)
3. **ValidationPipe** — `whitelist: true` + `forbidNonWhitelisted: true` (strips unknown fields, rejects bad input)
4. **AuthGuard** — verifies JWT + checks Redis token blacklist
5. **RolesGuard** — RBAC enforcement per endpoint
6. **TenantGuard** — verifies tenant + user `isActive` on every request
7. **FeatureGuard** — per-module feature flag enforcement
8. **AuditInterceptor** — records every POST/PATCH/PUT/DELETE to `AuditLog`
9. **SensitiveFieldsInterceptor** — strips `password` from all responses
10. **LoggingInterceptor** — logs method + URL + response time
11. **AllExceptionsFilter** — hides stack traces; returns generic 500 to clients

---

## Postman Setup

1. Create a **Postman Environment** with these variables:

| Variable | Initial Value |
|---|---|
| `BASE_URL` | `http://localhost:3000` |
| `ACCESS_TOKEN` | *(auto-filled by login script)* |
| `REFRESH_TOKEN` | *(auto-filled by login script)* |

2. Add this **Tests** script to the Login request to auto-save the token:

```javascript
const body = pm.response.json();
pm.environment.set("ACCESS_TOKEN", body.accessToken);
pm.environment.set("REFRESH_TOKEN", body.refreshToken);
```

3. For all protected endpoints, set the **Authorization** header:
   - Type: `Bearer Token`
   - Token: `{{ACCESS_TOKEN}}`

---

## API Reference

All endpoints return JSON. Dates use ISO 8601 format (`2025-01-15T00:00:00.000Z`).

### Role Hierarchy

| Role | Can Access |
|---|---|
| `SUPER_ADMIN` | Everything |
| `ADMIN` | All ops except tenant registration |
| `EMPLOYEE` | Operational endpoints, no admin functions |
| `DRIVER` | Start trip, end trip, push GPS, view own trip |

---

### 🔐 Authentication

#### Register Tenant (creates SUPER_ADMIN account)

```
POST {{BASE_URL}}/auth/register
Content-Type: application/json

{
  "tenantName": "FastFleet Ltd",
  "adminName": "John Doe",
  "email": "admin@fastfleet.com",
  "password": "Str0ng@Pass123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

#### Login

```
POST {{BASE_URL}}/auth/login
Content-Type: application/json

{
  "email": "admin@fastfleet.com",
  "password": "Str0ng@Pass123"
}
```

---

#### Refresh Access Token

```
POST {{BASE_URL}}/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{{REFRESH_TOKEN}}"
}
```

---

#### Logout

```
POST {{BASE_URL}}/auth/logout
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

### 🚗 Vehicles

#### Create Vehicle

```
POST {{BASE_URL}}/vehicles
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "registrationNo": "ABC-1234",
  "model": "Toyota HiAce",
  "seatCount": 12,
  "sourceType": "OWNED"
}
```

`sourceType`: `OWNED` | `CONTRACT`

---

#### List Vehicles

```
GET {{BASE_URL}}/vehicles?status=AVAILABLE
Authorization: Bearer {{ACCESS_TOKEN}}
```

`status` filter: `AVAILABLE` | `ON_TRIP` | `MAINTENANCE` | `INACTIVE`

---

#### Get Vehicle

```
GET {{BASE_URL}}/vehicles/:id
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

#### Update Vehicle

```
PATCH {{BASE_URL}}/vehicles/:id
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "status": "MAINTENANCE",
  "model": "Toyota HiAce 2024"
}
```

---

#### Delete Vehicle (soft delete)

```
DELETE {{BASE_URL}}/vehicles/:id
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

### 👤 Drivers

#### Create Driver

```
POST {{BASE_URL}}/drivers
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "name": "Ahmed Hassan",
  "phone": "+966501234567",
  "licenseNo": "DL-789456"
}
```

---

#### List Drivers

```
GET {{BASE_URL}}/drivers
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

#### Update Driver

```
PATCH {{BASE_URL}}/drivers/:id
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "phone": "+966509999999",
  "isAvailable": true
}
```

---

### 🔗 Assignments

#### Assign Driver to Vehicle

```
POST {{BASE_URL}}/assignments
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "vehicleId": "clv1abc...",
  "driverId": "clv2def...",
  "startDate": "2025-06-01T00:00:00.000Z",
  "endDate": "2025-12-31T00:00:00.000Z"
}
```

`endDate` is optional — omit for open-ended assignments.

---

#### List Assignments

```
GET {{BASE_URL}}/assignments?vehicleId=clv1abc...
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

### 📅 Bookings

#### Create Booking

```
POST {{BASE_URL}}/bookings
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "vehicleId": "clv1abc...",
  "driverId": "clv2def...",
  "startDate": "2025-07-01T08:00:00.000Z",
  "endDate": "2025-07-05T18:00:00.000Z",
  "customerName": "Sara Al-Rashid",
  "contact": "+966509876543",
  "advancePaid": 500
}
```

Automatically checks vehicle + driver availability. Returns `400` if conflict detected.

---

#### Confirm Booking

```
PATCH {{BASE_URL}}/bookings/:id/confirm
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

#### Cancel Booking

```
PATCH {{BASE_URL}}/bookings/:id/cancel
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

#### List Bookings

```
GET {{BASE_URL}}/bookings?status=PENDING
Authorization: Bearer {{ACCESS_TOKEN}}
```

`status`: `PENDING` | `CONFIRMED` | `COMPLETED` | `CANCELLED`

---

### 🗓 Scheduling (Availability Check)

#### Check Vehicle Availability

```
GET {{BASE_URL}}/scheduling/vehicle/:vehicleId?startDate=2025-07-01T00:00:00.000Z&endDate=2025-07-07T00:00:00.000Z
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response:**
```json
{
  "available": false,
  "reasons": ["Vehicle has a conflicting booking from 2025-07-01 to 2025-07-05"]
}
```

---

#### Check Driver Availability

```
GET {{BASE_URL}}/scheduling/driver/:driverId?startDate=2025-07-01T00:00:00.000Z&endDate=2025-07-07T00:00:00.000Z
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

### 🛣 Trips

#### Start Trip (DRIVER role only)

```
POST {{BASE_URL}}/trips/start/:vehicleId
Authorization: Bearer {{DRIVER_ACCESS_TOKEN}}
```

Driver must have an active assignment for this vehicle.

---

#### End Trip

```
POST {{BASE_URL}}/trips/:tripId/end
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "distance": 145.5,
  "income": 750,
  "tollCost": 25,
  "policeCost": 0
}
```

All fields are optional. DRIVERs can only end their own trip.

---

#### Update Trip Costs

```
PATCH {{BASE_URL}}/trips/:tripId
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "income": 900,
  "tollCost": 30,
  "distance": 160
}
```

ADMIN/EMPLOYEE only.

---

#### List Trips

```
GET {{BASE_URL}}/trips
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

### ⛽ Fuel Logs

#### Add Fuel Log

```
POST {{BASE_URL}}/fuel
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "vehicleId": "clv1abc...",
  "liters": 45.5,
  "cost": 182.50,
  "odometer": 54320,
  "date": "2025-06-15T10:30:00.000Z"
}
```

`odometer` must be ≥ the last recorded reading for this vehicle.

---

#### List Fuel Logs

```
GET {{BASE_URL}}/fuel?vehicleId=clv1abc...
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

### 💸 Expenses

#### Create Expense

```
POST {{BASE_URL}}/expenses
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "type": "MAINTENANCE",
  "amount": 350,
  "note": "Brake pads replacement"
}
```

`type`: `FUEL` | `MAINTENANCE` | `DRIVER` | `OTHER`

---

#### List Expenses

```
GET {{BASE_URL}}/expenses?type=MAINTENANCE
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

### 📊 Accounting

#### Profit / Loss Report

```
GET {{BASE_URL}}/accounting/profit-loss?startDate=2025-01-01T00:00:00.000Z&endDate=2025-06-30T23:59:59.000Z
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response:**
```json
{
  "totalIncome": 125000,
  "totalExpenses": 87500,
  "profit": 37500,
  "breakdown": {
    "incomeFromRecords": 30000,
    "incomeFromTrips": 95000,
    "expenseFromRecords": 12000,
    "fuelCosts": 28500,
    "maintenanceCosts": 18000,
    "tripTollCosts": 5000,
    "tripPoliceCosts": 24000
  },
  "period": {
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-06-30T23:59:59.000Z"
  }
}
```

---

### 🔧 Maintenance

#### Create Maintenance Log — Simple

```
POST {{BASE_URL}}/maintenance
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "vehicleId": "clv1abc...",
  "totalCost": 1200,
  "note": "Full service",
  "date": "2025-06-10T09:00:00.000Z"
}
```

#### Create Maintenance Log — Item Breakdown

```
POST {{BASE_URL}}/maintenance
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "vehicleId": "clv1abc...",
  "note": "Engine service",
  "date": "2025-06-10T09:00:00.000Z",
  "items": [
    { "name": "Engine oil 5L", "cost": 120 },
    { "name": "Oil filter", "cost": 45 },
    { "name": "Labour", "cost": 200 }
  ]
}
```

`totalCost` is auto-calculated as the sum of items.

---

#### List Maintenance Logs

```
GET {{BASE_URL}}/maintenance?vehicleId=clv1abc...
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

#### Get Single Log (with items)

```
GET {{BASE_URL}}/maintenance/:id
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

### 📄 Documents

#### Add Document

```
POST {{BASE_URL}}/documents
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "vehicleId": "clv1abc...",
  "type": "INSURANCE",
  "expiryDate": "2026-01-15T00:00:00.000Z"
}
```

---

#### Documents Expiring Soon

```
GET {{BASE_URL}}/documents/expiring?days=30
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

#### List Documents

```
GET {{BASE_URL}}/documents?vehicleId=clv1abc...
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

### 🤝 Contracts

#### Create Vehicle Source Contract

```
POST {{BASE_URL}}/contracts
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "type": "VEHICLE_SOURCE",
  "vehicleId": "clv1abc...",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T00:00:00.000Z",
  "amount": 24000,
  "commission": 5
}
```

#### Create Client Contract

```
POST {{BASE_URL}}/contracts
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "type": "CLIENT",
  "startDate": "2025-07-01T00:00:00.000Z",
  "endDate": "2025-12-31T00:00:00.000Z",
  "amount": 80000
}
```

---

#### Contracts Expiring Soon

```
GET {{BASE_URL}}/contracts/expiring?days=30
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

#### List Contracts

```
GET {{BASE_URL}}/contracts?type=CLIENT
Authorization: Bearer {{ACCESS_TOKEN}}
```

`type`: `VEHICLE_SOURCE` | `CLIENT`

---

#### Update Contract

```
PATCH {{BASE_URL}}/contracts/:id
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "endDate": "2026-06-30T00:00:00.000Z",
  "amount": 90000
}
```

---

#### Delete Contract (soft delete)

```
DELETE {{BASE_URL}}/contracts/:id
Authorization: Bearer {{ACCESS_TOKEN}}
```

Returns `204 No Content`.

---

### 🔔 Alerts

#### Scan and Generate Alerts

```
POST {{BASE_URL}}/alerts/scan?daysAhead=30
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response:**
```json
{
  "created": 5,
  "summary": {
    "documentExpiry": 2,
    "contractExpiry": 1,
    "maintenanceDue": 2
  }
}
```

---

#### List Alerts

```
GET {{BASE_URL}}/alerts?status=UNREAD
Authorization: Bearer {{ACCESS_TOKEN}}
```

`status`: `UNREAD` | `READ` | `DISMISSED`

---

#### Mark Alert as Read

```
PATCH {{BASE_URL}}/alerts/:id/read
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

#### Dismiss Alert

```
PATCH {{BASE_URL}}/alerts/:id/dismiss
Authorization: Bearer {{ACCESS_TOKEN}}
```

---

### 🛠 Workshop

#### Open Job Card

```
POST {{BASE_URL}}/workshop/jobs
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "vehicleId": "clv1abc...",
  "issue": "Engine overheating and coolant leak"
}
```

---

#### List Jobs

```
GET {{BASE_URL}}/workshop/jobs?status=OPEN
Authorization: Bearer {{ACCESS_TOKEN}}
```

`status`: `OPEN` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`

---

#### Get Job (Final Bill)

```
GET {{BASE_URL}}/workshop/jobs/:id
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response includes all items + `totalCost`:**
```json
{
  "id": "clv9xyz...",
  "status": "IN_PROGRESS",
  "totalCost": 680,
  "items": [
    { "name": "Coolant hose", "cost": 180 },
    { "name": "Thermostat", "cost": 250 },
    { "name": "Labour", "cost": 250 }
  ]
}
```

---

#### Add Part / Labour Item

```
POST {{BASE_URL}}/workshop/jobs/:id/items
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "name": "Coolant hose",
  "cost": 180
}
```

`totalCost` is auto-incremented atomically. Cannot add items to `COMPLETED` jobs.

---

#### Update Job Status

```
PATCH {{BASE_URL}}/workshop/jobs/:id/status
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "status": "IN_PROGRESS"
}
```

`status`: `IN_PROGRESS` | `COMPLETED` | `CANCELLED` (cannot reset to `OPEN`)

---

### 📡 GPS Tracking

#### Push GPS Location

```
POST {{BASE_URL}}/tracking/location
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "vehicleId": "clv1abc...",
  "lat": 24.7136,
  "lng": 46.6753,
  "speed": 65
}
```

Rate-limited: 1 update per vehicle per 5 seconds. Returns `429` if exceeded.

Coordinate ranges: `lat ∈ [-90, 90]`, `lng ∈ [-180, 180]`

---

#### Get Latest Location

```
GET {{BASE_URL}}/tracking/latest/:vehicleId
Authorization: Bearer {{ACCESS_TOKEN}}
```

Reads from Redis cache first; falls back to database. ADMIN/EMPLOYEE/SUPER_ADMIN only.

---

#### Get Location History

```
GET {{BASE_URL}}/tracking/history/:vehicleId?limit=100
Authorization: Bearer {{ACCESS_TOKEN}}
```

Max `limit`: 500. Returns newest first.

---

### 📊 Reports

All report endpoints support: `?vehicleId=&startDate=&endDate=`  
DRIVER role is blocked from all reports.

#### Mileage Report

```
GET {{BASE_URL}}/reports/mileage?startDate=2025-01-01T00:00:00.000Z&endDate=2025-06-30T00:00:00.000Z
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response:**
```json
[
  {
    "vehicleId": "clv1abc...",
    "registrationNo": "ABC-1234",
    "model": "Toyota HiAce",
    "tripCount": 42,
    "totalDistance": 8750.5
  }
]
```

Sorted by `totalDistance` descending.

---

#### Fuel Consumption Report

```
GET {{BASE_URL}}/reports/fuel
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response:**
```json
[
  {
    "vehicleId": "clv1abc...",
    "registrationNo": "ABC-1234",
    "model": "Toyota HiAce",
    "fillupCount": 18,
    "totalLiters": 810,
    "totalCost": 3240
  }
]
```

Sorted by `totalCost` descending.

---

#### Profit / Loss Report (via Reports module)

```
GET {{BASE_URL}}/reports/profit-loss?startDate=2025-01-01T00:00:00.000Z
Authorization: Bearer {{ACCESS_TOKEN}}
```

Same response shape as `GET /accounting/profit-loss`. Ignores `vehicleId` param.

---

#### Vehicle Usage Report

```
GET {{BASE_URL}}/reports/vehicle-usage
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response:**
```json
[
  {
    "vehicleId": "clv1abc...",
    "registrationNo": "ABC-1234",
    "model": "Toyota HiAce",
    "status": "AVAILABLE",
    "sourceType": "OWNED",
    "trips": {
      "count": 42,
      "totalDistance": 8750.5,
      "totalIncome": 63000
    },
    "fuel": {
      "fillups": 18,
      "totalLiters": 810,
      "totalCost": 3240
    },
    "maintenance": {
      "count": 3,
      "totalCost": 4200
    }
  }
]
```

Includes **all vehicles** — idle vehicles show zero counts (useful for fleet utilization analysis).

---

### 🔍 Audit Logs

```
GET {{BASE_URL}}/audit?entity=vehicles&startDate=2025-06-01T00:00:00.000Z
Authorization: Bearer {{ACCESS_TOKEN}}
```

ADMIN and SUPER_ADMIN only. Returns last 500 entries newest-first.

**Query params:**
- `entity` — e.g., `vehicles`, `trips`, `bookings`
- `entityId` — filter by specific record
- `userId` — filter by user who made the change
- `startDate`, `endDate` — date range filter

**Response:**
```json
[
  {
    "id": "clvaud...",
    "action": "POST",
    "entity": "vehicles",
    "entityId": "clv1abc...",
    "createdAt": "2025-06-15T10:30:00.000Z",
    "user": {
      "id": "clvusr...",
      "name": "John Doe",
      "email": "admin@fastfleet.com",
      "role": "ADMIN"
    }
  }
]
```

---

## WebSocket — Real-time Tracking

Connect with Socket.IO client:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Join your tenant's room to receive location updates
socket.emit('joinRoom', 'your-tenant-id');

// Listen for GPS updates
socket.on('locationUpdate', (data) => {
  console.log(data);
  // { vehicleId, lat, lng, speed, timestamp, tenantId }
});
```

Updates are pushed automatically whenever a vehicle calls `POST /tracking/location`.

---

## Background Jobs (BullMQ)

Two recurring jobs run without any API call:

| Job | Schedule | Action |
|---|---|---|
| `daily-alerts-scan` | Every day at **06:00 UTC** | Scans all active tenants → creates `DOCUMENT_EXPIRY`, `CONTRACT_EXPIRY`, and `MAINTENANCE_DUE` alerts for items within 30 days |
| `offline-detection` | Every **60 minutes** | Finds `ON_TRIP` vehicles with no GPS update in 30+ minutes → creates `VEHICLE_OFFLINE` alert (deduplicated per hour) |

---

## Security Architecture

| Control | Implementation |
|---|---|
| SQL Injection | Prisma parameterized queries — never raw SQL interpolation |
| XSS | JSON API (no HTML rendering); `whitelist: true` strips unknown fields |
| Auth token theft | JWT blacklist in Redis; short 15-min access token lifetime |
| CSRF | Not applicable — stateless JWT, no cookies |
| Brute force | Global rate limiter (100 req/15 min per IP) |
| Tenant data leak | Every query scoped to `tenantId` from JWT; `TenantGuard` on every request |
| Privilege escalation | `RolesGuard` enforced on every protected controller |
| Sensitive data exposure | `SensitiveFieldsInterceptor` strips `password` from all responses |
| Inactive account access | `TenantGuard` checks `user.isActive` + `tenant.isActive` on every request |
| Cross-tenant API abuse | `vehicleId`, `driverId`, etc. validated against `tenantId` before use |
| Error information leakage | `AllExceptionsFilter` returns generic message for 500 errors |
| Security headers | `helmet()` sets HSTS, CSP, X-Frame-Options, X-Content-Type-Options, etc. |
| Audit trail | `AuditInterceptor` records every mutating operation to immutable `AuditLog` |
| Soft delete | `deletedAt: null` filter on every query — deleted records invisible but preserved |

---

## Data Flow: Starting a Trip

```
DRIVER → POST /trips/start/:vehicleId
  → AuthGuard: verify JWT
  → TenantGuard: tenant + user isActive
  → TripsService.startTrip()
      → Resolve Driver from user.sub
      → Verify active Assignment (vehicleId + driverId + date range)
      → Check vehicle.status = AVAILABLE
      → Check no active trip (endTime IS NULL)
      → $transaction:
          create Trip
          Vehicle.status = ON_TRIP
          Driver.isAvailable = false
  ← 201 { tripId, startTime, vehicleId }
  → AuditInterceptor: logs POST/trips/{tripId}
```

---

## Multi-Tenant Isolation

Every request is isolated by `tenantId` from the JWT payload:

1. `AuthGuard` decodes JWT → attaches `{ sub, email, role, tenantId }` to `request.user`
2. `TenantGuard` verifies the tenant is active
3. Every service method receives `tenantId` from `@CurrentUser()` — **never from the request body or query params**
4. Every Prisma query includes `where: { tenantId, deletedAt: null }`
5. Cross-tenant references (e.g., `vehicleId`) are validated: `vehicle.findFirst({ where: { id, tenantId } })` — returns `null` (not a 404 that leaks existence)

---

## License

Private / Unlicensed — All rights reserved.

