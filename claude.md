# VMS — Vehicle Management SaaS Backend

## Project Overview
Production-grade NestJS multi-tenant SaaS backend for fleet, rental, and workshop management.

---

## PHASE 10 — REPORTS

### PROMPT 15 — Reports ✅

**Module:** `ReportsModule`

**Endpoints:**
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/reports/mileage` | ADMIN, EMPLOYEE, SUPER_ADMIN | Mileage per vehicle |
| GET | `/reports/fuel` | ADMIN, EMPLOYEE, SUPER_ADMIN | Fuel consumption + cost per vehicle |
| GET | `/reports/profit-loss` | ADMIN, EMPLOYEE, SUPER_ADMIN | Tenant profit/loss breakdown |
| GET | `/reports/vehicle-usage` | ADMIN, EMPLOYEE, SUPER_ADMIN | Full usage stats per vehicle |

**Query Params (all endpoints):** `vehicleId?`, `startDate?`, `endDate?`  
(`profit-loss` ignores `vehicleId` — always tenant-wide)

**Key Logic — `getMileageReport(tenantId, query)`:**
- `trip.groupBy(['vehicleId'])` → `_sum(distance)`, `_count(_all)`
- Fetches vehicle details (registrationNo, model) for grouped vehicleIds
- Sorted by `totalDistance DESC`
- Returns: `{ vehicleId, registrationNo, model, tripCount, totalDistance }`

**Key Logic — `getFuelReport(tenantId, query)`:**
- `fuelLog.groupBy(['vehicleId'])` → `_sum(liters, cost)`, `_count(_all)`
- Sorted by `totalCost DESC`
- Returns: `{ vehicleId, registrationNo, model, fillupCount, totalLiters, totalCost }`

**Key Logic — `getProfitLossReport(tenantId, query)`:**
- Delegates to `AccountingService.getProfitLoss()` — no logic duplication
- Returns same shape as `GET /accounting/profit-loss`

**Key Logic — `getVehicleUsageReport(tenantId, query)`:**
- Runs 4 queries in parallel via `Promise.all`:
  1. `vehicle.findMany` — all tenant vehicles (with status, sourceType)
  2. `trip.groupBy` — trips: count, totalDistance, totalIncome
  3. `fuelLog.groupBy` — fuel: fillups, totalLiters, totalCost
  4. `maintenanceLog.groupBy` — maintenance: count, totalCost
- Merges on `vehicleId` — vehicles with no activity show zero counts
- Returns nested shape: `{ vehicleId, registrationNo, model, status, sourceType, trips: {...}, fuel: {...}, maintenance: {...} }`

**Security Rules:**
- DRIVER blocked from all report endpoints (`@Roles(ADMIN, EMPLOYEE, SUPER_ADMIN)`)
- Tenant isolation: all queries scoped to `tenantId` from JWT
- `vehicleId` filter validated as string only — if vehicle doesn't belong to tenant, response is empty (no 404 leak)

**Important Decisions:**
- `profit-loss` delegates to `AccountingService` — `AccountingModule` already exports it; no duplication
- `groupBy` + separate vehicle lookup (2-step) preferred over N+1 per-vehicle queries
- Vehicle usage returns ALL vehicles (including idle ones with zero stats) — useful for fleet managers to spot unused vehicles
- `orderBy: { _sum: { cost/distance: 'desc' } }` applied to mileage + fuel reports for ranked output
- Date range applied to `startTime` for trips, `date` for fuel/maintenance (matching their schema fields)

**Files Created / Modified:**
- `src/reports/dto/report-query.dto.ts` — `vehicleId?`, `startDate?`, `endDate?`
- `src/reports/reports.service.ts` — 4 report methods
- `src/reports/reports.controller.ts` — 4 endpoints with `@CurrentUser` + `@Roles`
- `src/reports/reports.module.ts` — imports `AccountingModule`

---

### Status
| Checkpoint | Status |
|---|---|
| Mileage report (per-vehicle distance + trip count) | ✅ |
| Fuel report (per-vehicle liters + cost) | ✅ |
| Profit/loss report (delegates to AccountingService) | ✅ |
| Vehicle usage report (trips + fuel + maintenance merged) | ✅ |
| Date range filter on all reports | ✅ |
| vehicleId filter for single-vehicle drill-down | ✅ |
| DRIVER blocked from all endpoints | ✅ |
| Tenant isolation enforced | ✅ |
| Build passes | ✅ |

---

## PHASE 9 — BACKGROUND JOBS

### PROMPT 14 — BullMQ Jobs ✅

**Module:** `JobsModule`

**Jobs Registered:**
| Job Name | Schedule | Description |
|---|---|---|
| `daily-alerts-scan` | Daily at 06:00 UTC | Scans all active tenants for expiry + maintenance alerts |
| `offline-detection` | Every 60 minutes | Detects ON_TRIP vehicles with no recent GPS update |

**Key Logic — `JobsService` (implements `OnModuleInit` / `OnModuleDestroy`):**
- Creates a dedicated BullMQ `Queue` and `Worker` on startup using `REDIS_HOST`/`REDIS_PORT` from config
- On init: clears old repeatable jobs (idempotent restart) then re-adds both scheduled jobs
- On destroy: gracefully closes Worker then Queue
- `Worker.on('completed')` / `Worker.on('failed')` log results via NestJS `Logger`

**Key Logic — `daily-alerts-scan`:**
- Fetches all active tenants (`isActive: true, deletedAt: null`)
- Calls `AlertsService.scan(tenantId, 30)` for each tenant in sequence
- Covers all three alert types in one pass: `DOCUMENT_EXPIRY`, `CONTRACT_EXPIRY`, `MAINTENANCE_DUE`
- Errors per-tenant are caught and logged — one failing tenant does not abort others

**Key Logic — `offline-detection`:**
- Finds all vehicles with `status = ON_TRIP`
- For each, queries most recent `GpsLocation.timestamp`
- Vehicle is "offline" if no GPS in last 30 minutes (or no GPS ever)
- Creates `VEHICLE_OFFLINE` alert with deduplication: skips if an UNREAD alert for same vehicle already exists within the last hour

**Important Decisions:**
- Uses native `bullmq` (`Queue`, `Worker`) directly — no `@nestjs/bullmq` (not installed)
- Each BullMQ instance creates its own ioredis connection (separate from the global `REDIS_CLIENT`)
- `AlertsService.scan()` reused as-is — no duplication of alert logic
- `daily-alerts-scan` deduplication deferred to `AlertsService` (scan already guards against re-creating if caller manages timing)
- Offline dedup: 1-hour window prevents alert spam from repeated job runs
- `@nestjs/bullmq` not required — native BullMQ bridged to DI via `OnModuleInit` closure

**Files Created / Modified:**
- `src/jobs/jobs.service.ts` — Queue setup, Worker processor, both job handlers
- `src/jobs/jobs.module.ts` — imports `AlertsModule` to inject `AlertsService`

---

### Status
| Checkpoint | Status |
|---|---|
| BullMQ Queue + Worker initialized on startup | ✅ |
| Repeatable jobs cleared + re-added on restart | ✅ |
| Maintenance reminders (MAINTENANCE_DUE alerts) | ✅ |
| Document expiry alerts (DOCUMENT_EXPIRY) | ✅ |
| Contract expiry alerts (CONTRACT_EXPIRY) | ✅ |
| Offline vehicle detection (VEHICLE_OFFLINE) | ✅ |
| Offline alert deduplication (1h window) | ✅ |
| Per-tenant isolation in daily scan | ✅ |
| Graceful shutdown (OnModuleDestroy) | ✅ |
| Build passes | ✅ |

---

## PHASE 8 — TRACKING

### PROMPT 13 — GPS + WebSocket + Redis ✅

**Module:** `TrackingModule`, `GatewaysModule` (updated)

**Endpoints:**
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/tracking/location` | ALL roles | Save GPS location (rate-limited) |
| GET | `/tracking/latest/:vehicleId` | ADMIN, EMPLOYEE, SUPER_ADMIN | Latest location from Redis |
| GET | `/tracking/history/:vehicleId?limit=100` | ADMIN, EMPLOYEE, SUPER_ADMIN | Location history from DB |

**Key Logic — `TrackingService.saveLocation(tenantId, dto)`:**
1. **Rate limit**: checks Redis key `tracking:ratelimit:{tenantId}:{vehicleId}` — rejects with 429 if key exists (5s TTL)
2. Validates vehicle belongs to tenant
3. Persists `GpsLocation` record to DB
4. Caches location in Redis (`gps:{tenantId}:{vehicleId}`, 1h TTL)
5. Emits `locationUpdate` event to Socket.IO room `tenant:{tenantId}` via `AppGateway`

**Key Logic — `AppGateway`:**
- `@WebSocketGateway({ cors: { origin: '*' } })` — Socket.IO gateway on default namespace
- `@WebSocketServer() server: Server` — injected Socket.IO server
- `emitLocation(tenantId, data)` — broadcasts to room `tenant:{tenantId}`
- Clients join rooms via: `socket.emit('joinRoom', tenantId)`

**Key Logic — `getLatest`:**
- Reads from Redis cache first; falls back to DB if cache miss

**Security Rules:**
- DRIVER role allowed to push their own location (`POST /tracking/location`)
- Tenant isolation on all queries — cannot query another tenant's vehicles
- Per-vehicle rate limit (5s) enforced via Redis to prevent GPS spam
- Coordinate validation: `lat ∈ [-90, 90]`, `lng ∈ [-180, 180]`

**Important Decisions:**
- `IoAdapter` from `@nestjs/platform-socket.io` explicitly registered in `main.ts`
- `TrackingModule` imports `GatewaysModule` to inject `AppGateway`
- Redis errors caught silently (`.catch(() => null)`) — GPS saves still succeed if Redis is temporarily unavailable
- `@nestjs/websockets` and `@nestjs/platform-socket.io` installed (were missing from deps)
- History endpoint capped at 500 records to prevent large payloads

**Files Created / Modified:**
- `src/gateways/app.gateway.ts` — full WebSocket gateway implementation
- `src/tracking/tracking.service.ts` — GPS save + Redis cache + WS emit + rate limit
- `src/tracking/tracking.controller.ts` — 3 endpoints
- `src/tracking/tracking.module.ts` — imports GatewaysModule
- `src/tracking/dto/save-location.dto.ts`
- `src/main.ts` — added IoAdapter registration

---

### Status
| Checkpoint | Status |
|---|---|
| Save GPS to DB | ✅ |
| Cache latest in Redis (1h TTL) | ✅ |
| Emit via WebSocket to tenant room | ✅ |
| Coordinate validation (lat/lng bounds) | ✅ |
| Rate limit (1 update/vehicle/5s) | ✅ |
| Get latest from Redis (fallback to DB) | ✅ |
| Get history from DB | ✅ |
| Tenant isolation enforced | ✅ |
| Build passes | ✅ |

---

## PHASE 7 — WORKSHOP

### PROMPT 12 — Workshop System ✅

**Module:** `WorkshopModule`

**Endpoints:**
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/workshop/jobs` | ADMIN, EMPLOYEE, SUPER_ADMIN | Open a job card |
| GET | `/workshop/jobs?status=` | ADMIN, EMPLOYEE, SUPER_ADMIN | List jobs (optional status filter) |
| GET | `/workshop/jobs/:id` | ADMIN, EMPLOYEE, SUPER_ADMIN | Get job with all items (final bill) |
| POST | `/workshop/jobs/:id/items` | ADMIN, EMPLOYEE, SUPER_ADMIN | Add part/labor item |
| PATCH | `/workshop/jobs/:id/status` | ADMIN, EMPLOYEE, SUPER_ADMIN | Update job status |

**Key Logic — `WorkshopService.addItem(tenantId, jobId, dto)`:**
- Rejects adding items to a `COMPLETED` job
- Uses `$transaction` to atomically: create `WorkshopItem` + `increment totalCost` on parent `WorkshopJob`
- `GET /workshop/jobs/:id` is the "final bill" — returns job + all items + `totalCost`

**Key Logic — Status Flow:**
- `OPEN` → `IN_PROGRESS` → `COMPLETED` (or `CANCELLED` at any point)
- DTO validates status via `@IsIn([IN_PROGRESS, COMPLETED, CANCELLED])` — cannot set back to `OPEN`

**Security Rules:**
- DRIVER blocked from all workshop endpoints
- Tenant isolation: vehicle validated against tenantId on job creation

**Important Decisions:**
- `totalCost` is maintained incrementally via `{ increment: cost }` — no full recalculation needed
- `WorkshopItem` has no `deletedAt` (child records deleted with parent)
- Status validation uses Prisma enum values directly to stay type-safe

**Files Created / Modified:**
- `src/workshop/workshop.service.ts`
- `src/workshop/workshop.controller.ts`
- `src/workshop/dto/create-job.dto.ts`
- `src/workshop/dto/add-item.dto.ts`
- `src/workshop/dto/update-job-status.dto.ts`

---

### Status
| Checkpoint | Status |
|---|---|
| Create job card | ✅ |
| List jobs with status filter | ✅ |
| Get single job (final bill view) | ✅ |
| Add parts/labor items | ✅ |
| totalCost auto-incremented atomically | ✅ |
| Block items on COMPLETED jobs | ✅ |
| Update job status | ✅ |
| DRIVER blocked | ✅ |
| Tenant isolation enforced | ✅ |
| Build passes | ✅ |

---

### PROMPT 10 — Maintenance + Documents + Alerts ✅

**Modules:** `MaintenanceModule`, `DocumentsModule`, `AlertsModule`

**Endpoints:**
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/maintenance` | ADMIN, EMPLOYEE, SUPER_ADMIN | Create maintenance log (simple or breakdown) |
| GET | `/maintenance?vehicleId=` | ADMIN, EMPLOYEE, SUPER_ADMIN | List maintenance logs |
| GET | `/maintenance/:id` | ADMIN, EMPLOYEE, SUPER_ADMIN | Get single log with item breakdown |
| POST | `/documents` | ADMIN, EMPLOYEE, SUPER_ADMIN | Add document with expiry date |
| GET | `/documents?vehicleId=` | ADMIN, EMPLOYEE, SUPER_ADMIN | List documents |
| GET | `/documents/expiring?days=30` | ADMIN, EMPLOYEE, SUPER_ADMIN | Documents expiring within N days |
| POST | `/alerts/scan?daysAhead=30` | ADMIN, EMPLOYEE, SUPER_ADMIN | Generate alerts for expiry/maintenance |
| GET | `/alerts?status=` | ADMIN, EMPLOYEE, SUPER_ADMIN | List alerts (optional status filter) |
| PATCH | `/alerts/:id/read` | ADMIN, EMPLOYEE, SUPER_ADMIN | Mark alert as READ |
| PATCH | `/alerts/:id/dismiss` | ADMIN, EMPLOYEE, SUPER_ADMIN | Dismiss alert |

**Key Logic — `MaintenanceService.create(tenantId, dto)`:**
- Two modes controlled by DTO fields:
  - **Simple mode**: provide `totalCost` directly (no items)
  - **Breakdown mode**: provide `items[]` — `totalCost` auto-calculated as sum of item costs
- Rejects with `BadRequestException` if neither `totalCost` nor `items[]` is provided
- Items are created in same Prisma call via nested `items.create`
- `GET /:id` always returns full `items[]` array for breakdown view

**Key Logic — `DocumentsService.findExpiring(tenantId, daysAhead)`:**
- Filters `expiryDate: { gte: now, lte: now + daysAhead }`
- Returns only future-expiring docs (not already-expired)
- `GET /documents/expiring` declared before parameterized routes to prevent shadowing

**Key Logic — `AlertsService.scan(tenantId, daysAhead)`:**
- Runs 3 queries in parallel via `Promise.all`:
  1. Documents with `expiryDate` within next `daysAhead` days → `DOCUMENT_EXPIRY` alerts
  2. Contracts with `endDate` within next `daysAhead` days → `CONTRACT_EXPIRY` alerts
  3. Active vehicles (status ≠ INACTIVE) with no maintenance log in last 90 days → `MAINTENANCE_DUE` alerts
- Bulk-inserts all found alerts via `createMany`
- Returns `{ created, summary: { documentExpiry, contractExpiry, maintenanceDue } }`

**Security Rules:**
- DRIVER role blocked from all three modules
- Tenant isolation enforced on all queries and alert creation
- Alert status transitions (`READ`, `DISMISSED`) scoped to tenant — cannot affect other tenants' alerts

**Important Decisions:**
- `MaintenanceItem` has no `deletedAt` (child of log, deleted with parent) — no soft-delete needed on items
- `GET /documents/expiring` uses raw query param `days` (not DTO) to avoid ValidationPipe complexity with path-literal route
- `AlertsService.scan` does NOT deduplicate — same vehicle/document can generate multiple alerts per call; deduplication handled by BullMQ jobs in Prompt 14
- `VehicleStatus.INACTIVE` used (not string) for type-safe enum comparison in vehicle filter
- `AlertStatus` enum imported from generated Prisma client for type-safe status updates

**Files Created / Modified:**
- `src/maintenance/maintenance.service.ts`
- `src/maintenance/maintenance.controller.ts`
- `src/maintenance/dto/create-maintenance-log.dto.ts`
- `src/documents/documents.service.ts`
- `src/documents/documents.controller.ts`
- `src/documents/dto/create-document.dto.ts`
- `src/alerts/alerts.service.ts`
- `src/alerts/alerts.controller.ts`
- `src/alerts/dto/alert-query.dto.ts`

---

### Status
| Checkpoint | Status |
|---|---|
| Maintenance — create (simple totalCost) | ✅ |
| Maintenance — create (item breakdown, auto-calculated totalCost) | ✅ |
| Maintenance — list with vehicle filter | ✅ |
| Maintenance — get single with items breakdown | ✅ |
| Documents — create with expiry date | ✅ |
| Documents — list with vehicle filter | ✅ |
| Documents — expiring within N days | ✅ |
| Alerts — scan: document expiry | ✅ |
| Alerts — scan: contract expiry | ✅ |
| Alerts — scan: maintenance due (no maintenance in 90 days) | ✅ |
| Alerts — list with status filter | ✅ |
| Alerts — mark read / dismiss | ✅ |
| DRIVER blocked from all endpoints | ✅ |
| Tenant isolation enforced | ✅ |
| Build passes | ✅ |

---

### PROMPT 11 — Contract Module ✅

**Module:** `ContractsModule`

**Endpoints:**
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/contracts` | ADMIN, EMPLOYEE, SUPER_ADMIN | Create a contract |
| GET | `/contracts?type=` | ADMIN, EMPLOYEE, SUPER_ADMIN | List contracts (optional type filter) |
| GET | `/contracts/expiring?days=30` | ADMIN, EMPLOYEE, SUPER_ADMIN | Contracts expiring within N days |
| GET | `/contracts/:id` | ADMIN, EMPLOYEE, SUPER_ADMIN | Get single contract |
| PATCH | `/contracts/:id` | ADMIN, EMPLOYEE, SUPER_ADMIN | Update contract |
| DELETE | `/contracts/:id` | ADMIN, EMPLOYEE, SUPER_ADMIN | Soft-delete contract |

**Key Logic — `ContractsService.create(tenantId, dto)`:**
- Two contract types: `VEHICLE_SOURCE` (fleet/sourcing contracts) and `CLIENT` (customer contracts)
- `vehicleId` required for `VEHICLE_SOURCE` contracts — validated against tenant's vehicles
- `endDate` must be after `startDate` — enforced at service layer
- `commission` defaults to `0` if not provided

**Key Logic — `findExpiring(tenantId, daysAhead)`:**
- Filters `endDate: { gte: now, lte: now + daysAhead }` — only future-expiring contracts
- Mirrors the same pattern used in DocumentsService
- `GET /contracts/expiring` declared before `/:id` to prevent route shadowing

**Key Logic — Expiry Alerts:**
- `AlertsService.scan` (Prompt 10) already handles `CONTRACT_EXPIRY` alerts
- `GET /contracts/expiring` provides a direct API for querying without scanning

**Security Rules:**
- DRIVER role blocked from all endpoints
- Tenant isolation: all queries scoped to `tenantId` from JWT
- vehicleId validated against tenant — cannot reference another tenant's vehicle
- Soft delete used — contracts are never hard-deleted

**Important Decisions:**
- `ContractTypeValue` imported with `import type` in `UpdateContractDto` (required by `isolatedModules` + `emitDecoratorMetadata`)
- `UPDATE` accepts all fields as optional — date range re-validated against merged start/end values
- `DELETE /contracts/:id` returns `204 No Content` (no body)
- Type filter in `GET /contracts?type=` silently ignores unknown type values (same pattern as expenses)

**Files Created / Modified:**
- `src/contracts/contracts.service.ts`
- `src/contracts/contracts.controller.ts`
- `src/contracts/dto/create-contract.dto.ts`
- `src/contracts/dto/update-contract.dto.ts`

---

### Status
| Checkpoint | Status |
|---|---|
| Create VEHICLE_SOURCE contract (with vehicleId) | ✅ |
| Create CLIENT contract (vehicleId optional) | ✅ |
| List contracts with type filter | ✅ |
| Get single contract | ✅ |
| Update contract (date range re-validated) | ✅ |
| Soft-delete contract | ✅ |
| Expiring within N days | ✅ |
| CONTRACT_EXPIRY alerts via AlertsService.scan | ✅ |
| DRIVER blocked | ✅ |
| Tenant isolation enforced | ✅ |
| Build passes | ✅ |

---

## PHASE 5 — OPERATIONS

### PROMPT 8 — Trip + Driver + Vehicle State ✅

**Module:** `TripsModule`

**Endpoints:**
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/trips/start/:vehicleId` | DRIVER | Start a trip (assignment-verified) |
| POST | `/trips/:tripId/end` | DRIVER, ADMIN, EMPLOYEE, SUPER_ADMIN | End trip + submit final costs |
| PATCH | `/trips/:tripId` | ADMIN, EMPLOYEE, SUPER_ADMIN | Update trip costs/distance |
| GET | `/trips` | ADMIN, EMPLOYEE, SUPER_ADMIN | List all tenant trips |
| GET | `/trips/:tripId` | DRIVER, ADMIN, EMPLOYEE, SUPER_ADMIN | Get single trip |

**Key Logic — `startTrip(vehicleId, tenantId, userId)`:**
- Resolves `Driver` record from JWT `user.sub` (User.id) via `Driver.userId`
- Verifies active `Assignment` exists: `vehicleId + driverId + startDate ≤ now AND (endDate IS NULL OR endDate ≥ now)`
- Ensures vehicle `status = AVAILABLE` (rejects ON_TRIP, MAINTENANCE, INACTIVE)
- Ensures no active trip exists for the vehicle (`endTime IS NULL`)
- Uses `$transaction`: creates Trip + sets `Vehicle.status = ON_TRIP` + sets `Driver.isAvailable = false`

**Key Logic — `endTrip(tripId, tenantId, userId, dto, userRole)`:**
- If `userRole = DRIVER`: resolves their Driver record and verifies `driver.id === trip.driverId`
- ADMIN/EMPLOYEE/SUPER_ADMIN can end any trip without driver check
- Uses `$transaction`: sets `Trip.endTime = now` + sets `Vehicle.status = AVAILABLE` + sets `Driver.isAvailable = true`
- Applies optional `tollCost`, `policeCost`, `income`, `distance` from body

**Security Rules:**
- Only `DRIVER` role can call `startTrip` — enforced via `@Roles(Role.DRIVER)`
- DRIVER can only end their own trip — enforced in service by matching `Driver.id` against `trip.driverId`
- Tenant isolation: all queries scoped to `tenantId` from JWT
- All state transitions are atomic via Prisma `$transaction`

**Important Decisions:**
- `user.sub` = `User.id`, not `Driver.id` — Driver record looked up via `Driver.userId`
- `$transaction` array: first element is the updated Trip (destructured with `[trip]`)
- Vehicle status resets to `AVAILABLE` on trip end (not MAINTENANCE — maintenance is separate)
- DRIVER is allowed on `GET /trips/:tripId` to view their own (not restricted in service)

**Files Created / Modified:**
- `src/trips/trips.service.ts` — full implementation
- `src/trips/trips.controller.ts` — added `user.role` pass-through to `endTrip`

---

### Status
| Checkpoint | Status |
|---|---|
| startTrip — assignment validation | ✅ |
| startTrip — vehicle AVAILABLE check | ✅ |
| startTrip — no active trip check | ✅ |
| startTrip — vehicle/driver state update (atomic) | ✅ |
| endTrip — DRIVER ownership check | ✅ |
| endTrip — state restore (atomic) | ✅ |
| updateTrip — ADMIN/EMPLOYEE only | ✅ |
| DRIVER blocked from admin endpoints | ✅ |
| Tenant isolation enforced | ✅ |
| Build passes | ✅ |

---

### PROMPT 9 — Fuel + Expense + Accounting ✅

**Modules:** `FuelModule`, `ExpensesModule`, `AccountingModule`

**Endpoints:**
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/fuel` | ADMIN, EMPLOYEE, SUPER_ADMIN | Add fuel log |
| GET | `/fuel?vehicleId=` | ADMIN, EMPLOYEE, SUPER_ADMIN | List fuel logs (optional vehicle filter) |
| POST | `/expenses` | ADMIN, EMPLOYEE, SUPER_ADMIN | Create expense |
| GET | `/expenses?type=` | ADMIN, EMPLOYEE, SUPER_ADMIN | List expenses (optional type filter) |
| GET | `/accounting/profit-loss?startDate=&endDate=` | ADMIN, EMPLOYEE, SUPER_ADMIN | Calculate profit/loss |

**Key Logic — `FuelService.addLog(tenantId, dto)`:**
- Validates vehicle exists in tenant
- Odometer validation: `dto.odometer >= lastLog.odometer` (orders by `odometer DESC`)
- Rejects with `BadRequestException` if odometer decreases

**Key Logic — `ExpensesService`:**
- `type` enforced at DTO level via `@IsIn(['FUEL','MAINTENANCE','DRIVER','OTHER'])`
- `amount` validated `@Min(0)` — prevents negative values
- `GET` filter: only known types are passed through (unknown type query param ignored silently)

**Key Logic — `AccountingService.getProfitLoss(tenantId, query)`:**
- Income = `SUM(Income.amount)` + `SUM(Trip.income)` within date range
- Expenses = `SUM(Expense.amount)` + `SUM(FuelLog.cost)` + `SUM(MaintenanceLog.totalCost)` + `SUM(Trip.tollCost)` + `SUM(Trip.policeCost)`
- Uses `Promise.all` to run aggregations in parallel (5 → 3 parallel batches)
- Returns full `breakdown` object + `period` + `profit`
- Date range optional — omit both params for all-time totals

**Security Rules:**
- DRIVER role blocked from all fuel/expense/accounting endpoints
- All `amount`/`cost`/`liters` fields validated `@Min(0)` — no negative values
- Tenant isolation enforced on all queries
- `@IsIn` on expense type — prevents invalid category injection

**Important Decisions:**
- `ExpenseType` is enforced as DTO-level enum (schema keeps `type: String` for flexibility)
- `liters` validated `@Min(0.01)` — zero-liter log is meaningless
- Accounting uses `Prisma.aggregate._sum` — SQL-level aggregation (efficient, no JS loops)
- Trip aggregation for income and toll/police costs done in ONE `trip.aggregate` call
- Definite assignment assertions (`!`) added to DTO required fields (required by `strict: true`)

**Files Created / Modified:**
- `src/fuel/fuel.service.ts` — addLog with odometer validation, listLogs
- `src/fuel/fuel.controller.ts` — POST + GET endpoints
- `src/fuel/dto/create-fuel-log.dto.ts` — new DTO
- `src/expenses/expenses.service.ts` — create, findAll
- `src/expenses/expenses.controller.ts` — POST + GET endpoints
- `src/expenses/dto/create-expense.dto.ts` — new DTO with EXPENSE_TYPES
- `src/accounting/accounting.service.ts` — getProfitLoss with parallel aggregations
- `src/accounting/accounting.controller.ts` — GET /accounting/profit-loss
- `src/accounting/dto/profit-loss-query.dto.ts` — new DTO

---

### Status
| Checkpoint | Status |
|---|---|
| Fuel log — add with odometer validation | ✅ |
| Fuel log — list with vehicle filter | ✅ |
| Expense — create with type enum + non-negative amount | ✅ |
| Expense — list with type filter | ✅ |
| Accounting — profit/loss with date range | ✅ |
| Accounting — breakdown by income/expense category | ✅ |
| DRIVER blocked from fuel/expense/accounting | ✅ |
| Negative value prevention | ✅ |
| Build passes | ✅ |

---

## PHASE 4 — SCHEDULING + BOOKING

### PROMPT 6 — Scheduling Engine (Conflict-Safe) ✅

**Module:** `SchedulingModule`

**Endpoints:**
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/scheduling/vehicle/:vehicleId?startDate=&endDate=` | SUPER_ADMIN, ADMIN, EMPLOYEE | Check vehicle availability |
| GET | `/scheduling/driver/:driverId?startDate=&endDate=` | SUPER_ADMIN, ADMIN, EMPLOYEE | Check driver availability |

**Key Logic — `checkVehicleAvailability(vehicleId, tenantId, start, end)`:**
- Checks for overlapping PENDING/CONFIRMED bookings (`startDate < end AND endDate > start`)
- Checks for overlapping/active trips (`startTime < end AND (endTime IS NULL OR endTime > start)`)
- Checks if vehicle `status = MAINTENANCE` OR a maintenance log falls within the date range

**Key Logic — `checkDriverAvailability(driverId, tenantId, start, end)`:**
- Checks for overlapping assignments (`startDate < end AND (endDate IS NULL OR endDate > start)`)
- Checks for overlapping/active trips (`startTime < end AND (endTime IS NULL OR endTime > start)`)

**Returns:**
```json
{ "available": true, "reasons": [] }
{ "available": false, "reasons": ["Vehicle has a conflicting booking from ..."] }
```

**Security Rules:**
- `AuthGuard` applied globally — all endpoints require valid JWT
- `RolesGuard` on controller — DRIVER role cannot access scheduling endpoints
- Tenant isolation: all queries scoped to `tenantId` from JWT payload
- Query params validated via `CheckAvailabilityDto` (`@IsDateString()`)

**Important Decisions:**
- `SchedulingService` is `exports`-ed so `BookingModule` (Prompt 7) can import and reuse conflict checks before creating a booking
- Overlap logic uses exclusive range: `startDate < end AND endDate > start` (standard interval overlap)
- Active trip = `endTime IS NULL` — in-progress trips block both the vehicle and driver
- `import type` used for `JwtPayload` interface in decorated positions (required by `isolatedModules` + `emitDecoratorMetadata`)
- Also fixed same `import type` issue in `auth.controller.ts`

**Files Created / Modified:**
- `src/scheduling/scheduling.service.ts` — full conflict detection logic
- `src/scheduling/scheduling.controller.ts` — REST endpoints with role guard
- `src/scheduling/dto/check-availability.dto.ts` — query param validation DTO
- `src/auth/auth.controller.ts` — fixed `import type` for `JwtPayload` and `Request`

---

### Status
| Checkpoint | Status |
|---|---|
| Vehicle availability (booking conflict) | ✅ |
| Vehicle availability (trip conflict) | ✅ |
| Vehicle availability (maintenance conflict) | ✅ |
| Driver availability (assignment conflict) | ✅ |
| Driver availability (trip conflict) | ✅ |
| DRIVER role blocked | ✅ |
| Tenant isolation enforced | ✅ |
| Build passes | ✅ |

---

## PHASE 1 — FOUNDATION + SECURITY BASE ✅

### PROMPT 1 — Project Setup + Core Security + Logging ✅

**Module Added:** Core / Root

**Packages Installed:**
- `@nestjs/config` — global ConfigModule
- `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` — auth ready
- `bcrypt` — password hashing
- `class-validator`, `class-transformer` — DTO validation
- `prisma`, `@prisma/client` — ORM
- `ioredis` — Redis client
- `bullmq` — job queues
- `socket.io` — WebSocket
- `helmet` — HTTP security headers
- `express-rate-limit` — rate limiting
- `nest-winston`, `winston` — structured logging

**Key Logic:**
- `ConfigModule.forRoot({ isGlobal: true })` — env vars available everywhere
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` — strict input validation globally
- `AllExceptionsFilter` — hides internal error details from API responses; logs to Winston
- `helmet()` — sets `X-Frame-Options`, `X-Content-Type-Options`, `CSP`, etc.
- `express-rate-limit` — 100 req / 15 min per IP on all routes
- Winston logger — console (pretty) + `logs/error.log` + `logs/combined.log`

**Security Rules:**
- Internal errors return generic `"Internal server error"` message (no stack traces to client)
- All non-HTTP exceptions map to 500 internally logged
- Rate limiting prevents brute-force and DoS
- Helmet prevents common web attack vectors via headers
- TypeScript `strict: true` — catches null/undefined bugs at compile time

**Important Decisions:**
- `strict: true` in tsconfig (full strict mode, not partial)
- Using `nest-winston` (NestJS-native Winston integration) over Pino for better ecosystem compat
- Rate limiter applied globally in `main.ts` before other middleware
- `.env` file holds all secrets — must never be committed

**Files Created / Modified:**
- `src/main.ts` — bootstrap with all middleware
- `src/app.module.ts` — ConfigModule global
- `src/common/filters/all-exceptions.filter.ts` — global exception filter
- `src/common/logger/winston.config.ts` — Winston transport config
- `.env` — environment variables template
- `tsconfig.json` — `strict: true` enabled

---

## Status
| Checkpoint | Status |
|---|---|
| App runs | ✅ |
| Helmet active | ✅ |
| Rate limit works | ✅ |
| Validation strict | ✅ |
| Logger active | ✅ |
| Strict TypeScript | ✅ |

---

## Environment Variables Required
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `REDIS_HOST` | Redis hostname |
| `REDIS_PORT` | Redis port (default 6379) |
| `PORT` | App port (default 3000) |

---

## Next: PROMPT 4 — Full Schema (Enterprise-Level)

---

## PHASE 1 — PROMPT 3 — Prisma + Multi-Tenant + Security Fields ✅

**Module Added:** Database / Prisma

**Packages Installed:**
- `pg` — native PostgreSQL driver
- `@prisma/adapter-pg` — Prisma 7 PostgreSQL adapter (required for client constructor)

**Entities Added:**

| Model | Key Fields |
|---|---|
| `Tenant` | id, name, isActive, createdAt, updatedAt, deletedAt |
| `Subscription` | id, tenantId, planName, isActive, + base fields |
| `FeatureAccess` | id, tenantId, moduleName, isEnabled, + base fields |
| `User` | id, tenantId, name, email (unique), password, role (enum), isActive, + base fields |

**Enums:**
- `Role`: `SUPER_ADMIN`, `ADMIN`, `EMPLOYEE`, `DRIVER`

**Base Fields (all models):**
- `id` — `String @id @default(cuid())`
- `createdAt` — `DateTime @default(now())`
- `updatedAt` — `DateTime @updatedAt`
- `deletedAt` — `DateTime?` (soft delete — null = active, set = deleted)

**Indexes:**
- `@@index([tenantId])` on Subscription, FeatureAccess, User
- `@@index([email])` on User
- `@unique` on User.email

**Key Logic:**
- `PrismaService` extends `PrismaClient`, connects via `PrismaPg` adapter in constructor
- `DatabaseModule` is `@Global()` — `PrismaService` injected anywhere without re-importing
- Soft delete pattern: `deletedAt` field — queries must filter `deletedAt: null` for active records
- Tenant isolation: every child model has `tenantId` foreign key → all queries must scope by `tenantId`

**Security Rules:**
- `password` stored as raw field — bcrypt hashing done at service layer (Phase 5)
- `tenantId` foreign key enforced at DB level via Prisma relations
- Email uniqueness enforced at DB index level (prevents duplicate accounts)
- `deletedAt` soft delete prevents data loss while hiding logically deleted records

**Important Decisions:**
- Prisma 7.7.0 requires adapter-based client init — `url` removed from `schema.prisma`, moved to `prisma.config.ts`
- `prisma.config.ts` already auto-generated with `datasource.url = process.env.DATABASE_URL`
- Fixed `DATABASE_URL` port: was `5434`, corrected to `5432` (actual PostgreSQL port)
- Database reset required due to drift from prior lost migration (`20260422094631_init`)
- Migration name: `20260422143002_init_tenant_user_models`
- Client generated to `generated/prisma/` (project root)

**Files Created / Modified:**
- `prisma/schema.prisma` — full schema with models, enums, indexes, relations
- `prisma/migrations/20260422143002_init_tenant_user_models/migration.sql` — applied migration
- `src/database/prisma.service.ts` — NestJS injectable PrismaClient wrapper
- `src/database/database.module.ts` — wired PrismaService as global provider
- `.env` — fixed DATABASE_URL port from 5434 → 5432

---

### Status
| Checkpoint | Status |
|---|---|
| DB ready | ✅ |
| Soft delete enabled | ✅ |
| Tenant isolation enforced | ✅ |
| Indexes on tenantId + email | ✅ |
| PrismaService injectable globally | ✅ |
| Build passes | ✅ |

---

## PHASE 1 — PROMPT 2 — Full Modular Architecture ✅

**Modules Created (23 total):**
`auth`, `users`, `tenants`, `subscriptions`, `feature-access`, `vehicles`, `drivers`, `assignments`, `bookings`, `scheduling`, `contracts`, `trips`, `fuel`, `maintenance`, `documents`, `expenses`, `income`, `accounting`, `tracking`, `alerts`, `reports`, `workshop`, `audit`

**Each module has:**
- `*.module.ts` — NestJS module decorator with controller + service wired
- `*.controller.ts` — Controller class (routes added per phase)
- `*.service.ts` — Injectable service (logic added per phase)
- `dto/` — folder ready for DTOs

**Infrastructure Created:**
- `src/database/database.module.ts` — Global module (PrismaService added in Prompt 3)
- `src/shared/shared.module.ts` — Global module for cross-cutting utilities
- `src/gateways/app.gateway.ts` + `gateways.module.ts` — WebSocket skeleton (Phase 8)
- `src/jobs/jobs.module.ts` — BullMQ processors skeleton (Phase 9)

**Security Layer Scaffolded:**
- `src/common/guards/auth.guard.ts` — JWT auth guard (Phase 3)
- `src/common/guards/roles.guard.ts` — RBAC guard with `ROLES_KEY` (Phase 3)
- `src/common/guards/tenant.guard.ts` — Tenant isolation guard (Phase 3)
- `src/common/guards/feature.guard.ts` — Feature-flag guard with `FEATURE_KEY` (Phase 3)
- `src/common/interceptors/logging.interceptor.ts` — Request timing logger
- `src/common/pipes/parse-positive-int.pipe.ts` — Input validation pipe

**Key Decisions:**
- All 23 modules imported and registered in `AppModule`
- `DatabaseModule` and `SharedModule` marked `@Global()` — available everywhere without re-importing
- Guards are stubs now — full logic implemented in Phase 3
- `feature-access` module folder uses hyphen (NestJS convention), class name is `FeatureAccessModule`

**Checkpoint:**
| Check | Status |
|---|---|
| No compile errors | ✅ |
| All 23 modules registered | ✅ |
| Guard stubs in place | ✅ |
| Logging interceptor ready | ✅ |
