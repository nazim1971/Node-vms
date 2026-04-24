# VMS — Vehicle Management System API Reference

**Base URL:** `http://localhost:5000`  
**Auth:** Bearer token in `Authorization: Bearer <accessToken>` header  
**Content-Type:** `application/json`

---

## Role Hierarchy

| Role | Description |
|---|---|
| `SUPER_ADMIN` | Platform owner — bypasses all guards, manages all tenants |
| `ADMIN` | Company owner — manages their tenant's users, vehicles, drivers |
| `EMPLOYEE` | Staff — operational access (bookings, trips, maintenance) |
| `DRIVER` | Driver — limited access (start/end own trips, push GPS) |

---

## Feature Flags (opt-out model)

Features are **enabled by default**. An ADMIN can disable specific modules for their tenant via `POST /feature-access`.

| Feature Key | Modules Covered |
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

## 1. Auth

### POST /auth/seed-super-admin
Create the platform SUPER_ADMIN (one-time only).

**Public** — no token required

**Request:**
```json
{
  "name": "Platform Admin",
  "email": "superadmin@vms.io",
  "password": "SuperSecret123",
  "seedSecret": "vms-platform-seed-2026"
}
```

**Response `201`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST /auth/register
Register as a new Admin (submits an approval application).  
Account stays **PENDING** until a SUPER_ADMIN approves it.

**Public** — no token required

**Request:**
```json
{
  "tenantName": "Alpha Fleet Ltd",
  "adminName": "John Smith",
  "email": "john@alphafleet.com",
  "password": "MyPassword123"
}
```

**Response `201`:**
```json
{
  "message": "Registration submitted. Your account is pending approval."
}
```

---

### POST /auth/login

**Public** — no token required

**Request:**
```json
{
  "email": "john@alphafleet.com",
  "password": "MyPassword123"
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST /auth/refresh

**Public** — no token required

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST /auth/logout
Blacklists current access token in Redis.

**Roles:** Any authenticated user

**Response `204`:** No content

---

## 2. Admin Applications

**Roles:** SUPER_ADMIN only

### GET /admin-applications?status=PENDING

**Query Params:**
- `status` — optional: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`

**Response `200`:**
```json
[
  {
    "id": "clx1abc123",
    "name": "John Smith",
    "email": "john@alphafleet.com",
    "approvalStatus": "PENDING",
    "isActive": false,
    "createdAt": "2026-04-25T10:00:00.000Z",
    "tenant": {
      "id": "clx1def456",
      "name": "Alpha Fleet Ltd",
      "isActive": false
    }
  }
]
```

---

### PATCH /admin-applications/:userId/approve

**Response `200`:**
```json
{
  "message": "Admin approved successfully",
  "userId": "clx1abc123"
}
```

---

### PATCH /admin-applications/:userId/reject

**Request:**
```json
{
  "reason": "Incomplete business registration details"
}
```

**Response `200`:**
```json
{
  "message": "Admin rejected",
  "userId": "clx1abc123"
}
```

---

### PATCH /admin-applications/:userId/suspend

**Response `200`:**
```json
{
  "message": "Admin suspended",
  "userId": "clx1abc123"
}
```

---

### PATCH /admin-applications/:userId/reactivate

**Response `200`:**
```json
{
  "message": "Admin reactivated",
  "userId": "clx1abc123"
}
```

---

## 3. Users

**Roles:** ADMIN (manage own tenant), SUPER_ADMIN (bypass)

### POST /users
Create a user under the current tenant.

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@alphafleet.com",
  "password": "SecurePass123",
  "role": "EMPLOYEE",
  "branchId": "clx1bra001"
}
```

**Response `201`:**
```json
{
  "id": "clx1usr001",
  "name": "Jane Doe",
  "email": "jane@alphafleet.com",
  "role": "EMPLOYEE",
  "isActive": true,
  "approvalStatus": "APPROVED",
  "branchId": "clx1bra001",
  "tenantId": "clx1def456",
  "createdAt": "2026-04-25T10:00:00.000Z"
}
```

---

### GET /users?branchId=

**Query Params:**
- `branchId` — optional: filter users by branch

**Response `200`:**
```json
[
  {
    "id": "clx1usr001",
    "name": "Jane Doe",
    "email": "jane@alphafleet.com",
    "role": "EMPLOYEE",
    "isActive": true,
    "approvalStatus": "APPROVED",
    "branchId": "clx1bra001",
    "branch": { "id": "clx1bra001", "name": "Downtown Branch" },
    "createdAt": "2026-04-25T10:00:00.000Z"
  }
]
```

---

### GET /users/:id

**Response `200`:** Single user object (same shape as above)

---

### PATCH /users/:id

**Request:** (all fields optional)
```json
{
  "name": "Jane Smith",
  "isActive": false,
  "branchId": null
}
```

**Response `200`:** Updated user object

---

### DELETE /users/:id
Soft delete. **Response `204`:** No content

---

## 4. Tenants

**Roles:** SUPER_ADMIN only (full), ADMIN (read own)

### GET /tenants
SUPER_ADMIN sees all tenants. ADMIN sees own tenant.

**Response `200`:**
```json
[
  {
    "id": "clx1def456",
    "name": "Alpha Fleet Ltd",
    "isActive": true,
    "createdAt": "2026-04-25T10:00:00.000Z",
    "_count": { "users": 12, "vehicles": 24 }
  }
]
```

---

### GET /tenants/:id
**Response `200`:** Single tenant object

---

### PATCH /tenants/:id

**Roles:** SUPER_ADMIN only

**Request:**
```json
{
  "name": "Alpha Fleet International",
  "isActive": false
}
```

**Response `200`:** Updated tenant object

---

## 5. Feature Access

**Only SUPER_ADMIN can enable or disable features.** The SUPER_ADMIN decides which modules each tenant (Admin's company) has access to. Features are enabled by default — the SUPER_ADMIN only needs to act when they want to restrict or restore a module.

ADMIN can **read** their own tenant's feature flags to see what they have access to.

### GET /feature-access
View feature flags for a tenant.

- **ADMIN** — sees their own tenant's flags
- **SUPER_ADMIN** — can view any tenant via `?tenantId=`

**Query Params (SUPER_ADMIN only):**
- `tenantId` — optional: view a specific tenant's flags

**Response `200`:**
```json
[
  {
    "id": "clx1fea001",
    "moduleName": "workshop",
    "isEnabled": false,
    "updatedAt": "2026-04-25T10:00:00.000Z"
  }
]
```

> If a module has no record, it is **enabled by default**. A record only appears when a feature has been explicitly disabled.

---

### PATCH /feature-access/:tenantId/:moduleName/enable

**Roles:** SUPER_ADMIN only

Enable a specific feature module for a tenant.

**Example:** Grant Alpha Fleet access to the workshop module.
```
PATCH /feature-access/clx1def456/workshop/enable
```

**Response `200`:**
```json
{
  "id": "clx1fea001",
  "tenantId": "clx1def456",
  "moduleName": "workshop",
  "isEnabled": true,
  "updatedAt": "2026-04-25T10:00:00.000Z"
}
```

---

### PATCH /feature-access/:tenantId/:moduleName/disable

**Roles:** SUPER_ADMIN only

Disable a specific feature module for a tenant.

**Example:** Remove workshop access from Alpha Fleet.
```
PATCH /feature-access/clx1def456/workshop/disable
```

**Response `200`:**
```json
{
  "id": "clx1fea001",
  "tenantId": "clx1def456",
  "moduleName": "workshop",
  "isEnabled": false,
  "updatedAt": "2026-04-25T10:00:00.000Z"
}
```

---

**Available Feature Keys:**

| Feature Key | Modules Covered |
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

## 6. Branches

Multi-branch management for a company.

### POST /branches

**Roles:** ADMIN

**Request:**
```json
{
  "name": "Downtown Branch",
  "address": "123 Main Street, City",
  "phone": "+1-555-0100"
}
```

**Response `201`:**
```json
{
  "id": "clx1bra001",
  "tenantId": "clx1def456",
  "name": "Downtown Branch",
  "address": "123 Main Street, City",
  "phone": "+1-555-0100",
  "isActive": true,
  "createdAt": "2026-04-25T10:00:00.000Z"
}
```

---

### GET /branches

**Roles:** ADMIN, EMPLOYEE

**Response `200`:**
```json
[
  {
    "id": "clx1bra001",
    "name": "Downtown Branch",
    "address": "123 Main Street, City",
    "phone": "+1-555-0100",
    "isActive": true,
    "_count": { "users": 4, "vehicles": 8, "drivers": 3 }
  }
]
```

---

### GET /branches/aggregate
Cross-branch summary — totals + per-branch breakdown.

**Roles:** ADMIN, EMPLOYEE

**Response `200`:**
```json
{
  "totals": {
    "branches": 3,
    "users": 12,
    "vehicles": 24,
    "drivers": 9
  },
  "branches": [
    {
      "id": "clx1bra001",
      "name": "Downtown Branch",
      "userCount": 4,
      "vehicleCount": 8,
      "driverCount": 3
    }
  ]
}
```

---

### GET /branches/:id

**Roles:** ADMIN, EMPLOYEE

**Response `200`:**
```json
{
  "id": "clx1bra001",
  "name": "Downtown Branch",
  "users": [{ "id": "clx1usr001", "name": "Jane Doe", "role": "EMPLOYEE" }],
  "vehicles": [{ "id": "clx1veh001", "registrationNo": "ABC-1234" }],
  "drivers": [{ "id": "clx1drv001", "name": "Mike Johnson" }],
  "_count": { "users": 1, "vehicles": 1, "drivers": 1 }
}
```

---

### PATCH /branches/:id

**Roles:** ADMIN

**Request:**
```json
{
  "name": "Downtown HQ",
  "isActive": true
}
```

**Response `200`:** Updated branch object

---

### DELETE /branches/:id
Soft-delete. Unlinks all users/vehicles/drivers from this branch first.

**Roles:** ADMIN

**Response `204`:** No content

---

## 7. Vehicles

**Feature Flag:** `vehicles`

### POST /vehicles

**Roles:** ADMIN, EMPLOYEE

**Request:**
```json
{
  "registrationNo": "ABC-1234",
  "make": "Toyota",
  "model": "Hilux",
  "year": 2022,
  "color": "White",
  "fuelType": "DIESEL",
  "sourceType": "OWNED",
  "branchId": "clx1bra001"
}
```

**Response `201`:**
```json
{
  "id": "clx1veh001",
  "tenantId": "clx1def456",
  "registrationNo": "ABC-1234",
  "make": "Toyota",
  "model": "Hilux",
  "year": 2022,
  "color": "White",
  "fuelType": "DIESEL",
  "sourceType": "OWNED",
  "status": "AVAILABLE",
  "branchId": "clx1bra001",
  "createdAt": "2026-04-25T10:00:00.000Z"
}
```

---

### GET /vehicles?branchId=

**Roles:** ADMIN, EMPLOYEE

**Response `200`:**
```json
[
  {
    "id": "clx1veh001",
    "registrationNo": "ABC-1234",
    "make": "Toyota",
    "model": "Hilux",
    "status": "AVAILABLE",
    "branchId": "clx1bra001",
    "branch": { "id": "clx1bra001", "name": "Downtown Branch" }
  }
]
```

---

### GET /vehicles/:id
**Response `200`:** Full vehicle object

---

### PATCH /vehicles/:id

**Request:** (all optional)
```json
{
  "color": "Black",
  "status": "MAINTENANCE",
  "branchId": "clx1bra002"
}
```

**Response `200`:** Updated vehicle object

---

### DELETE /vehicles/:id
Soft delete. **Response `204`:** No content

---

## 8. Drivers

**Feature Flag:** `vehicles`

### POST /drivers

**Roles:** ADMIN, EMPLOYEE

**Request:**
```json
{
  "name": "Mike Johnson",
  "licenseNo": "DL-2023-001",
  "phone": "+1-555-0200",
  "userId": "clx1usr001",
  "branchId": "clx1bra001"
}
```

**Response `201`:**
```json
{
  "id": "clx1drv001",
  "tenantId": "clx1def456",
  "name": "Mike Johnson",
  "licenseNo": "DL-2023-001",
  "phone": "+1-555-0200",
  "isAvailable": true,
  "branchId": "clx1bra001",
  "userId": "clx1usr001",
  "createdAt": "2026-04-25T10:00:00.000Z"
}
```

---

### GET /drivers?branchId=

**Roles:** ADMIN, EMPLOYEE

**Response `200`:** Array of driver objects with `branch` relation

---

### GET /drivers/:id / PATCH /drivers/:id / DELETE /drivers/:id

Same CRUD pattern as Vehicles. DELETE returns `204`.

---

## 9. Assignments

Link a driver to a vehicle for a time period.

**Roles:** ADMIN, EMPLOYEE

### POST /assignments

**Request:**
```json
{
  "vehicleId": "clx1veh001",
  "driverId": "clx1drv001",
  "startDate": "2026-05-01",
  "endDate": "2026-05-31"
}
```

**Response `201`:**
```json
{
  "id": "clx1asgn001",
  "tenantId": "clx1def456",
  "vehicleId": "clx1veh001",
  "driverId": "clx1drv001",
  "startDate": "2026-05-01T00:00:00.000Z",
  "endDate": "2026-05-31T00:00:00.000Z",
  "createdAt": "2026-04-25T10:00:00.000Z"
}
```

---

### GET /assignments / GET /assignments/:id / PATCH /assignments/:id / DELETE /assignments/:id

Standard CRUD. DELETE returns `204`.

---

## 10. Scheduling (Availability Check)

Check conflicts before creating bookings.

**Roles:** ADMIN, EMPLOYEE

### GET /scheduling/vehicle/:vehicleId?startDate=&endDate=

**Query Params:**
- `startDate` — required: ISO date string (e.g. `2026-05-10`)
- `endDate` — required: ISO date string (e.g. `2026-05-15`)

**Response `200` (available):**
```json
{
  "available": true,
  "reasons": []
}
```

**Response `200` (unavailable):**
```json
{
  "available": false,
  "reasons": [
    "Vehicle has a conflicting booking from 2026-05-12 to 2026-05-14",
    "Vehicle is currently under maintenance"
  ]
}
```

---

### GET /scheduling/driver/:driverId?startDate=&endDate=

Same response shape as vehicle availability.

---

## 11. Bookings

**Feature Flag:** `bookings`

### POST /bookings

**Roles:** ADMIN, EMPLOYEE

**Request:**
```json
{
  "vehicleId": "clx1veh001",
  "driverId": "clx1drv001",
  "clientName": "Acme Corp",
  "clientPhone": "+1-555-0300",
  "startDate": "2026-05-10",
  "endDate": "2026-05-15",
  "branchId": "clx1bra001"
}
```

**Response `201`:**
```json
{
  "id": "clx1book001",
  "tenantId": "clx1def456",
  "vehicleId": "clx1veh001",
  "driverId": "clx1drv001",
  "clientName": "Acme Corp",
  "clientPhone": "+1-555-0300",
  "startDate": "2026-05-10T00:00:00.000Z",
  "endDate": "2026-05-15T00:00:00.000Z",
  "status": "PENDING",
  "branchId": "clx1bra001",
  "createdAt": "2026-04-25T10:00:00.000Z"
}
```

---

### GET /bookings / GET /bookings/:id / PATCH /bookings/:id / DELETE /bookings/:id

Standard CRUD. DELETE returns `204`.

**PATCH** can update `status` to `CONFIRMED` or `CANCELLED`.

---

## 12. Contracts

**Roles:** ADMIN, EMPLOYEE

### POST /contracts

**Request:**
```json
{
  "type": "CLIENT",
  "clientName": "Acme Corp",
  "startDate": "2026-05-01",
  "endDate": "2026-12-31",
  "value": 50000,
  "commission": 5000,
  "notes": "Annual fleet rental agreement"
}
```

For `VEHICLE_SOURCE` type, include `vehicleId`:
```json
{
  "type": "VEHICLE_SOURCE",
  "vehicleId": "clx1veh001",
  "clientName": "Fleet Supplier Inc",
  "startDate": "2026-05-01",
  "endDate": "2027-04-30",
  "value": 120000
}
```

**Response `201`:** Contract object

---

### GET /contracts?type=CLIENT
### GET /contracts/expiring?days=30
### GET /contracts/:id / PATCH /contracts/:id / DELETE /contracts/:id

DELETE returns `204`.

---

## 13. Trips

### POST /trips/start/:vehicleId

**Roles:** DRIVER only

Driver must have an active assignment for this vehicle.

**Response `201`:**
```json
{
  "id": "clx1trip001",
  "vehicleId": "clx1veh001",
  "driverId": "clx1drv001",
  "tenantId": "clx1def456",
  "startTime": "2026-05-10T08:00:00.000Z",
  "endTime": null,
  "distance": null,
  "income": null,
  "tollCost": null,
  "policeCost": null
}
```

---

### POST /trips/:tripId/end

**Roles:** DRIVER (own trip), ADMIN, EMPLOYEE

**Request:**
```json
{
  "distance": 150.5,
  "income": 200.00,
  "tollCost": 12.50,
  "policeCost": 0
}
```

**Response `200`:** Updated trip object with `endTime` set

---

### GET /trips

**Roles:** ADMIN, EMPLOYEE

**Response `200`:** Array of trip objects

---

### GET /trips/:tripId

**Roles:** DRIVER (own), ADMIN, EMPLOYEE

---

### PATCH /trips/:tripId

**Roles:** ADMIN, EMPLOYEE

Update costs/distance on a trip post-hoc.

---

## 14. Fuel

**Feature Flag:** `fuel`

### POST /fuel

**Roles:** ADMIN, EMPLOYEE

**Request:**
```json
{
  "vehicleId": "clx1veh001",
  "date": "2026-05-10",
  "liters": 45.5,
  "cost": 68.25,
  "odometer": 52300,
  "station": "Shell Main St"
}
```

**Response `201`:** Fuel log object

---

### GET /fuel?vehicleId=

**Roles:** ADMIN, EMPLOYEE

**Response `200`:** Array of fuel logs

---

## 15. Maintenance

**Feature Flag:** `maintenance`

### POST /maintenance
Two modes: simple (provide `totalCost`) or breakdown (provide `items[]`).

**Roles:** ADMIN, EMPLOYEE

**Request — simple mode:**
```json
{
  "vehicleId": "clx1veh001",
  "date": "2026-05-10",
  "description": "Full service",
  "totalCost": 350.00
}
```

**Request — breakdown mode:**
```json
{
  "vehicleId": "clx1veh001",
  "date": "2026-05-10",
  "description": "Engine overhaul",
  "items": [
    { "description": "Labor", "cost": 200.00 },
    { "description": "Oil filter", "cost": 25.00 },
    { "description": "Engine oil 5L", "cost": 45.00 }
  ]
}
```

**Response `201`:** Maintenance log object (includes `totalCost` auto-calculated from items)

---

### GET /maintenance?vehicleId= / GET /maintenance/:id

**GET /:id** includes full `items[]` breakdown.

---

## 16. Documents

**Feature Flag:** `maintenance`

### POST /documents

**Roles:** ADMIN, EMPLOYEE

**Request:**
```json
{
  "vehicleId": "clx1veh001",
  "name": "Insurance Policy",
  "type": "INSURANCE",
  "documentNo": "INS-2026-001",
  "expiryDate": "2027-05-10",
  "notes": "Comprehensive coverage"
}
```

**Response `201`:** Document object

---

### GET /documents?vehicleId=
### GET /documents/expiring?days=30

Returns documents expiring within the next N days.

---

## 17. Alerts

**Roles:** ADMIN, EMPLOYEE

### POST /alerts/scan?daysAhead=30
Scan and generate alerts for expiring documents, contracts, and maintenance-due vehicles.

**Response `200`:**
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

### GET /alerts?status=UNREAD

**Query Params:**
- `status` — optional: `UNREAD`, `READ`, `DISMISSED`

**Response `200`:**
```json
[
  {
    "id": "clx1alrt001",
    "type": "DOCUMENT_EXPIRY",
    "message": "Insurance Policy for ABC-1234 expires in 15 days",
    "status": "UNREAD",
    "vehicleId": "clx1veh001",
    "createdAt": "2026-05-01T06:00:00.000Z"
  }
]
```

**Alert Types:** `DOCUMENT_EXPIRY`, `CONTRACT_EXPIRY`, `MAINTENANCE_DUE`, `VEHICLE_OFFLINE`

---

### PATCH /alerts/:id/read
### PATCH /alerts/:id/dismiss

**Response `200`:** Updated alert object

---

## 18. Expenses

**Feature Flag:** `accounting`

### POST /expenses

**Roles:** ADMIN, EMPLOYEE

**Request:**
```json
{
  "description": "Office supplies",
  "amount": 150.00,
  "date": "2026-05-10",
  "type": "OTHER"
}
```

**Expense Types:** `FUEL`, `MAINTENANCE`, `DRIVER`, `OTHER`

**Response `201`:** Expense object

---

### GET /expenses?type=MAINTENANCE

**Response `200`:** Array of expense objects

---

## 19. Accounting

**Feature Flag:** `accounting`

### GET /accounting/profit-loss?startDate=&endDate=

**Roles:** ADMIN, EMPLOYEE

**Query Params:**
- `startDate` — optional: ISO date
- `endDate` — optional: ISO date
- Omit both for all-time totals

**Response `200`:**
```json
{
  "period": {
    "startDate": "2026-05-01",
    "endDate": "2026-05-31"
  },
  "income": {
    "incomeRecords": 15000.00,
    "tripIncome": 8500.00,
    "total": 23500.00
  },
  "expenses": {
    "expenseRecords": 3200.00,
    "fuelLogs": 1800.00,
    "maintenanceLogs": 2500.00,
    "tripTolls": 350.00,
    "tripPolice": 0.00,
    "total": 7850.00
  },
  "profit": 15650.00
}
```

---

## 20. GPS Tracking

**Feature Flag:** `tracking`

### POST /tracking/location

**Roles:** All (DRIVER pushes own, ADMIN/EMPLOYEE can also push)  
Rate-limited: 1 update per vehicle per 5 seconds

**Request:**
```json
{
  "vehicleId": "clx1veh001",
  "lat": 25.2048,
  "lng": 55.2708,
  "speed": 60.5,
  "heading": 180
}
```

**Response `201`:** GPS location record

---

### GET /tracking/latest/:vehicleId

**Roles:** ADMIN, EMPLOYEE

Returns latest location from Redis cache (falls back to DB).

**Response `200`:**
```json
{
  "vehicleId": "clx1veh001",
  "lat": 25.2048,
  "lng": 55.2708,
  "speed": 60.5,
  "heading": 180,
  "timestamp": "2026-05-10T08:30:00.000Z"
}
```

---

### GET /tracking/history/:vehicleId?limit=100

**Roles:** ADMIN, EMPLOYEE

**Response `200`:** Array of GPS location records (max 500)

---

### WebSocket Events

Connect: `ws://localhost:5000`

Join tenant room:
```js
socket.emit('joinRoom', 'tenant-id-here');
```

Receive live location updates:
```js
socket.on('locationUpdate', (data) => {
  // data = { vehicleId, lat, lng, speed, heading, timestamp }
});
```

---

## 21. Reports

**Feature Flag:** `reports`

### GET /reports/mileage?vehicleId=&startDate=&endDate=

**Roles:** ADMIN, EMPLOYEE

**Response `200`:**
```json
[
  {
    "vehicleId": "clx1veh001",
    "registrationNo": "ABC-1234",
    "model": "Hilux",
    "tripCount": 45,
    "totalDistance": 8500.5
  }
]
```

---

### GET /reports/fuel?vehicleId=&startDate=&endDate=

**Response `200`:**
```json
[
  {
    "vehicleId": "clx1veh001",
    "registrationNo": "ABC-1234",
    "model": "Hilux",
    "fillupCount": 12,
    "totalLiters": 520.5,
    "totalCost": 780.75
  }
]
```

---

### GET /reports/profit-loss?vehicleId=&startDate=&endDate=

Delegates to AccountingService. Same response as `GET /accounting/profit-loss`.

---

### GET /reports/vehicle-usage?vehicleId=&startDate=&endDate=

**Response `200`:**
```json
[
  {
    "vehicleId": "clx1veh001",
    "registrationNo": "ABC-1234",
    "model": "Hilux",
    "status": "AVAILABLE",
    "sourceType": "OWNED",
    "trips": {
      "count": 45,
      "totalDistance": 8500.5,
      "totalIncome": 12750.00
    },
    "fuel": {
      "fillupCount": 12,
      "totalLiters": 520.5,
      "totalCost": 780.75
    },
    "maintenance": {
      "count": 3,
      "totalCost": 1200.00
    }
  }
]
```

---

## 22. Workshop

**Feature Flag:** `workshop`

### POST /workshop/jobs

**Roles:** ADMIN, EMPLOYEE

**Request:**
```json
{
  "vehicleId": "clx1veh001",
  "description": "Full brake replacement",
  "branchId": "clx1bra001"
}
```

**Response `201`:**
```json
{
  "id": "clx1wjob001",
  "vehicleId": "clx1veh001",
  "description": "Full brake replacement",
  "status": "OPEN",
  "totalCost": 0,
  "branchId": "clx1bra001",
  "createdAt": "2026-05-10T09:00:00.000Z"
}
```

---

### GET /workshop/jobs?status=OPEN

**Query Params:**
- `status` — optional: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

**Response `200`:** Array of workshop jobs

---

### GET /workshop/jobs/:id
Returns job with all items (final bill view).

**Response `200`:**
```json
{
  "id": "clx1wjob001",
  "description": "Full brake replacement",
  "status": "COMPLETED",
  "totalCost": 450.00,
  "items": [
    { "id": "clx1witem001", "description": "Brake pads (4x)", "cost": 200.00, "type": "PART" },
    { "id": "clx1witem002", "description": "Labor", "cost": 250.00, "type": "LABOR" }
  ]
}
```

---

### POST /workshop/jobs/:id/items
Cannot add items to a `COMPLETED` job.

**Request:**
```json
{
  "description": "Brake fluid",
  "cost": 25.00,
  "type": "PART"
}
```

**Response `201`:** Workshop item object. Parent job `totalCost` incremented atomically.

---

### PATCH /workshop/jobs/:id/status

**Request:**
```json
{
  "status": "IN_PROGRESS"
}
```

**Valid transitions:** `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

**Response `200`:** Updated job object

---

## 23. Audit

**Roles:** ADMIN, SUPER_ADMIN

Immutable audit trail — automatically captured for all POST/PATCH/PUT/DELETE requests.

### GET /audit?entity=vehicles&userId=&startDate=&endDate=

**Query Params:**
- `entity` — optional: e.g. `vehicles`, `drivers`, `trips`
- `userId` — optional
- `startDate` / `endDate` — optional ISO dates

**Response `200`:**
```json
[
  {
    "id": "clx1audit001",
    "tenantId": "clx1def456",
    "userId": "clx1usr001",
    "action": "POST",
    "entity": "vehicles",
    "entityId": "clx1veh001",
    "createdAt": "2026-05-10T09:00:00.000Z",
    "user": {
      "id": "clx1usr001",
      "name": "Jane Doe",
      "email": "jane@alphafleet.com",
      "role": "EMPLOYEE"
    }
  }
]
```

Returns last 500 entries, newest first.

---

## Error Responses

All errors follow this shape:

```json
{
  "statusCode": 400,
  "message": "Validation failed: email must be an email",
  "error": "Bad Request"
}
```

| Code | Meaning |
|---|---|
| 400 | Validation error / bad input |
| 401 | Missing or invalid JWT token |
| 403 | Insufficient role / feature disabled / account not approved |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, etc.) |
| 429 | Rate limit exceeded |
| 500 | Internal server error (details hidden from response) |

---

## Quick Start Flow

1. **Seed the platform:**
   ```
   POST /auth/seed-super-admin
   { name, email, password, seedSecret }
   ```

2. **Admin registers:**
   ```
   POST /auth/register
   { tenantName, adminName, email, password }
   ```

3. **SUPER_ADMIN approves:**
   ```
   PATCH /admin-applications/:userId/approve
   ```

4. **Admin logs in:**
   ```
   POST /auth/login → { accessToken, refreshToken }
   ```

5. **Admin creates branches, vehicles, drivers, users**

6. **Assign drivers to vehicles → Create bookings → Start trips**

7. **Monitor via reports, alerts, and audit logs**
