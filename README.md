# VMS — Vehicle Management System

A production-grade **multi-tenant SaaS backend** for fleet management, rental operations, and workshop management. Built with NestJS, Prisma, PostgreSQL, Redis, BullMQ, and Socket.IO.

---

## Features

- **Multi-tenant SaaS** — complete tenant isolation, every query scoped by tenantId
- **Role-based access control** — SUPER_ADMIN / ADMIN / EMPLOYEE / DRIVER
- **Admin approval workflow** — new admins register and wait for platform approval
- **Branch management** — admins can create branches and manage them individually or in aggregate
- **Feature flags** — opt-out model per tenant (disable specific modules like workshop, tracking, etc.)
- **Real-time GPS tracking** — Redis cache + WebSocket broadcast
- **Background jobs** — BullMQ scheduled jobs for alerts and offline detection
- **Immutable audit trail** — all state-changing requests automatically logged
- **Comprehensive alerts** — document expiry, contract expiry, maintenance due, vehicle offline
- **Workshop management** — job cards with parts/labor breakdown and atomic cost tracking
- **Reporting** — mileage, fuel, profit/loss, vehicle usage reports

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 (TypeScript strict) |
| ORM | Prisma 7.7.0 with pg adapter |
| Database | PostgreSQL 15+ |
| Cache / Jobs | Redis + BullMQ |
| Real-time | Socket.IO (WebSocket) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Security | Helmet, express-rate-limit, ValidationPipe |
| Logging | nest-winston + Winston (file + console) |

---

## Runtime Requirements

- Node.js `>= 22.12.0`
- Prisma CLI and client are aligned on `7.8.x`

---

## Role Hierarchy

```
SUPER_ADMIN
  - Platform owner
  - Manages tenants, approves/rejects admin applications
  - Bypasses all role, tenant, and feature guards
  - Can override anything in emergencies

ADMIN
  - Company owner (one per tenant)
  - Approved by SUPER_ADMIN before they can operate
  - Manages users, branches, vehicles, drivers, all operations
  - Can enable/disable feature modules for their tenant

EMPLOYEE
  - Staff member (created by ADMIN)
  - Operational access: bookings, trips, maintenance, fuel, etc.
  - Cannot manage users or branches (read-only on branches)

DRIVER
  - Linked to a user account via Driver record
  - Can start/end own trips (assignment-verified)
  - Can push GPS location
  - Cannot access management endpoints
```

---

## Admin Registration & Approval Flow

1. Admin calls `POST /auth/register` -> Creates Tenant (inactive) + User (PENDING)
2. SUPER_ADMIN reviews via `GET /admin-applications`
3. SUPER_ADMIN calls `PATCH /admin-applications/:userId/approve` -> Both activated
4. SUPER_ADMIN can also: reject, suspend, or reactivate at any time

---

## Feature Flags (Opt-Out, SUPER_ADMIN Controlled)

All features are **enabled by default**. Only the **SUPER_ADMIN** can enable or disable specific modules for a tenant.

**Example:** SUPER_ADMIN gives tenant `clx1def456` access to only `vehicles` and `bookings` by disabling everything else:

```http
PATCH /feature-access/clx1def456/workshop/disable
PATCH /feature-access/clx1def456/maintenance/disable
PATCH /feature-access/clx1def456/tracking/disable
PATCH /feature-access/clx1def456/fuel/disable
PATCH /feature-access/clx1def456/accounting/disable
PATCH /feature-access/clx1def456/reports/disable
```

ADMIN can **view** their own tenant's active feature flags via `GET /feature-access` but cannot change them.

| Feature Key | Covers |
|---|---|
| `vehicles` | Vehicles, Drivers |
| `workshop` | Workshop |
| `maintenance` | Maintenance, Documents |
| `tracking` | GPS Tracking |
| `bookings` | Bookings |
| `fuel` | Fuel |
| `accounting` | Accounting, Expenses, Income |
| `reports` | Reports |

---

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@aws-1-REGION.pooler.supabase.com:6543/postgres?sslmode=require
DIRECT_URL=postgresql://user:pass@db.PROJECT-REF.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=5000
SEED_SECRET=<change-this-in-production>
```

- `DATABASE_URL`: runtime app connection; for Supabase this can use the pooled connection (`:6543`)
- `DIRECT_URL`: Prisma schema operations (`migrate`, `db push`, `db pull`); for Supabase this should use the direct database host (`db.<project-ref>.supabase.co:5432`)

---

## Getting Started

```bash
npm install
cp .env.example .env   # Edit with your secrets
npm run prisma:migrate
npm run prisma:generate
npm run start:dev
```

Seed the platform SUPER_ADMIN (first-time only):
```bash
curl -X POST http://localhost:5000/auth/seed-super-admin \
  -H "Content-Type: application/json" \
  -d '{"name":"Platform Admin","email":"superadmin@vms.io","password":"SuperSecret123","seedSecret":"vms-platform-seed-2026"}'
```

---

## NPM Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Production build |
| `npm run start:prod` | Start production build |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Create + apply migration (dev) |
| `npm run prisma:migrate:prod` | Apply migrations (production) |
| `npm run prisma:studio` | Open Prisma Studio at localhost:5555 |
| `npm run prisma:reset` | Drop + re-migrate (dev only) |
| `npm run test` | Run all unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Run tests with coverage report |

---

## API Summary

Full documentation with sample data: [docs/API.md](docs/API.md)

| Module | Base Path | Feature Flag |
|---|---|---|
| Auth | `/auth` | - |
| Admin Applications | `/admin-applications` | - |
| Users | `/users` | - |
| Tenants | `/tenants` | - |
| Feature Access | `/feature-access` | - |
| Branches | `/branches` | - |
| Vehicles | `/vehicles` | `vehicles` |
| Drivers | `/drivers` | `vehicles` |
| Assignments | `/assignments` | - |
| Scheduling | `/scheduling` | - |
| Bookings | `/bookings` | `bookings` |
| Contracts | `/contracts` | - |
| Trips | `/trips` | - |
| Fuel | `/fuel` | `fuel` |
| Maintenance | `/maintenance` | `maintenance` |
| Documents | `/documents` | `maintenance` |
| Alerts | `/alerts` | - |
| Expenses | `/expenses` | `accounting` |
| Accounting | `/accounting` | `accounting` |
| GPS Tracking | `/tracking` | `tracking` |
| Reports | `/reports` | `reports` |
| Workshop | `/workshop` | `workshop` |
| Audit | `/audit` | - |

---

## API Response Envelope

All successful responses are wrapped in a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-04-25T10:00:00.000Z",
    "path": "/vehicles",
    "count": 3
  }
}
```

- `success` — always `true` for 2xx responses
- `data` — the actual payload (object or array)
- `meta.timestamp` — ISO 8601 UTC time of the response
- `meta.path` — the request path (including query string)
- `meta.count` — present only when `data` is an array (number of items)

`204 No Content` responses (DELETE) return no body.

Error responses follow a matching shape:

```json
{
  "success": false,
  "error": {
    "statusCode": 404,
    "message": "Vehicle not found"
  },
  "meta": {
    "timestamp": "2026-04-25T10:00:00.000Z",
    "path": "/vehicles/missing-id"
  }
}
```

---

## Security

- JWT blacklisting via Redis on logout
- 100 req/15min rate limiting per IP
- Helmet HTTP security headers
- ValidationPipe whitelist + forbidNonWhitelisted
- Prisma ORM (no raw SQL interpolation)
- SensitiveFieldsInterceptor strips password from all responses
- Immutable audit logs (no soft delete on AuditLog)
- Tenant isolation on every query
- SUPER_ADMIN bypass in guards (not middleware) for clean audit trail

---

## Background Jobs

| Job | Schedule | Description |
|---|---|---|
| `daily-alerts-scan` | Daily 06:00 UTC | Document/contract expiry + maintenance due alerts |
| `offline-detection` | Every 60 min | Detects ON_TRIP vehicles with no GPS in 30 min |

---

## License

MIT
