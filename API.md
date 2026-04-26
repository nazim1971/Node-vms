# NODE-VMS — API Reference

All endpoints (unless marked **Public**) require a valid `Authorization: Bearer <token>` header.

---

## Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Submit a tenant admin application (status: PENDING) |
| POST | `/auth/login` | Public | Login — returns `accessToken` + `refreshToken` |
| POST | `/auth/refresh` | Public | Exchange a refresh token for new access token |
| POST | `/auth/logout` | Any auth | Blacklist the current access token |
| POST | `/auth/seed-super-admin` | Public (one-time) | Create the platform SUPER_ADMIN (requires `X-Seed-Secret` header) |

---

## Profile — Self-Service (All Authenticated Roles)

> These endpoints always operate on the **currently logged-in user**.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/profile` | All roles | Get own profile |
| PATCH | `/profile/name` | All roles | Change own display name |
| PATCH | `/profile/password` | All roles | Change own password (requires `currentPassword`) |

### PATCH `/profile/password`
```json
{
  "currentPassword": "OldPass123!",
  "newPassword":     "NewPass456!"
}
```

### PATCH `/profile/name`
```json
{
  "name": "John Doe"
}
```

---

## Users — Tenant User Management

> Managed by **ADMIN** (and SUPER_ADMIN via bypass). Targets DRIVER and EMPLOYEE roles only.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/users` | ADMIN | Create a DRIVER or EMPLOYEE (`branchId` optional, `branchIds` optional for multi-branch assignment) |
| GET | `/users` | ADMIN | List all DRIVER / EMPLOYEE in the tenant |
| GET | `/users?branchId=<id>` | ADMIN | List users filtered by branch |
| GET | `/users/:id` | ADMIN | Get a single user |
| PATCH | `/users/:id` | ADMIN | Update user (name, role, isActive, branchId, branchIds) |
| PATCH | `/users/:id/reset-password` | ADMIN | Reset a DRIVER or EMPLOYEE password (no current password needed) |
| DELETE | `/users/:id` | ADMIN | Soft-delete a DRIVER or EMPLOYEE |

`POST /users` request supports:
- `branchId` as primary branch
- `branchIds` as assigned branches array

`PATCH /users/:id` request supports:
- `branchIds` to replace all assigned branches
- if `branchId` is omitted and `branchIds` is sent, backend sets primary branch to first `branchIds` value (or clears it when empty)

`GET /users` and `GET /users/:id` responses include:
- `branch` (primary)
- `userBranches` array with assigned branch objects

Example payload:
```json
{
  "name": "Jane Doe",
  "email": "jane@alphafleet.com",
  "password": "SecurePass123",
  "role": "EMPLOYEE",
  "branchId": "clx1bra001",
  "branchIds": ["clx1bra001", "clx1bra002"]
}
```

### PATCH `/users/:id/reset-password`
```json
{
  "newPassword": "NewPass456!"
}
```

---

## Admin Applications — Admin Account Management

> Managed by **SUPER_ADMIN** only.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/admin-applications` | SUPER_ADMIN | List all admin registrations |
| GET | `/admin-applications?status=PENDING` | SUPER_ADMIN | Filter by status: PENDING \| APPROVED \| REJECTED \| SUSPENDED |
| PATCH | `/admin-applications/:userId/approve` | SUPER_ADMIN | Approve a pending admin application |
| PATCH | `/admin-applications/:userId/reject` | SUPER_ADMIN | Reject a pending admin application |
| PATCH | `/admin-applications/:userId/suspend` | SUPER_ADMIN | Suspend an approved admin account |
| PATCH | `/admin-applications/:userId/reactivate` | SUPER_ADMIN | Reactivate a suspended admin account |
| PATCH | `/admin-applications/:userId/reset-password` | SUPER_ADMIN | Reset an admin's password (no current password needed) |

### PATCH `/admin-applications/:userId/reset-password`
```json
{
  "newPassword": "NewPass456!"
}
```

---

## Tenants

> Managed by **SUPER_ADMIN**.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/tenants` | SUPER_ADMIN | List all tenants |
| GET | `/tenants/:id` | SUPER_ADMIN | Get tenant details with subscriptions and feature flags |
| PATCH | `/tenants/:id` | SUPER_ADMIN | Update tenant name or isActive flag |
| DELETE | `/tenants/:id` | SUPER_ADMIN | Soft-delete and deactivate a tenant |

---

## Branches

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/branches` | ADMIN | Create a branch |
| GET | `/branches` | ADMIN | List branches in tenant |
| GET | `/branches/:id` | ADMIN | Get branch detail |
| PATCH | `/branches/:id` | ADMIN | Update branch |
| DELETE | `/branches/:id` | ADMIN | Soft-delete branch |

---

## Vehicles

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/vehicles` | ADMIN | Register a vehicle (`branchId` optional; supports atomic `sourceType=CONTRACT` + `contract` payload) |
| GET | `/vehicles` | ADMIN | List all vehicles |
| GET | `/vehicles/:id` | ADMIN | Get vehicle details |
| PATCH | `/vehicles/:id` | ADMIN | Update vehicle |
| DELETE | `/vehicles/:id` | ADMIN | Soft-delete vehicle |

`POST /vehicles` supports two create modes:
- Standard vehicle create (`sourceType: OWNED` or omitted)
- Atomic vehicle + source contract create (`sourceType: CONTRACT` with `contract` object)

---

## Drivers

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/drivers` | ADMIN | Create a driver profile |
| GET | `/drivers` | ADMIN | List all drivers |
| GET | `/drivers/:id` | ADMIN | Get driver details |
| PATCH | `/drivers/:id` | ADMIN | Update driver profile |
| DELETE | `/drivers/:id` | ADMIN | Soft-delete driver |

---

## Assignments

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/assignments` | ADMIN | Assign a driver to a vehicle |
| GET | `/assignments` | ADMIN | List assignments |
| GET | `/assignments/:id` | ADMIN | Get assignment details |
| PATCH | `/assignments/:id` | ADMIN | Update assignment |
| DELETE | `/assignments/:id` | ADMIN | Remove assignment |

---

## Bookings

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/bookings` | ADMIN | Create booking |
| GET | `/bookings` | ADMIN | List bookings |
| GET | `/bookings/:id` | ADMIN | Get booking |
| PATCH | `/bookings/:id` | ADMIN | Update booking |
| DELETE | `/bookings/:id` | ADMIN | Cancel booking |
| PATCH | `/bookings/:id/assign-driver-vehicle` | ADMIN | Assign driver + vehicle to booking |

---

## Trips

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/trips` | ADMIN / DRIVER | Start a trip |
| GET | `/trips` | ADMIN | List trips |
| GET | `/trips/:id` | ADMIN / DRIVER | Get trip |
| PATCH | `/trips/:id` | ADMIN / DRIVER | Update trip |
| DELETE | `/trips/:id` | ADMIN | Soft-delete trip |

---

## Contracts

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/contracts` | ADMIN | Create contract (VEHICLE_SOURCE can use `vehicleId` or atomic `vehicle` create) |
| GET | `/contracts` | ADMIN | List contracts |
| GET | `/contracts/:id` | ADMIN | Get contract |
| PATCH | `/contracts/:id` | ADMIN | Update contract |
| DELETE | `/contracts/:id` | ADMIN | Soft-delete contract |

`POST /contracts` VEHICLE_SOURCE rules:
- Provide exactly one of `vehicleId` (existing vehicle) or `vehicle` (create new vehicle)
- If `vehicle` is provided, contract + vehicle are created in one DB transaction
- On error, both inserts rollback

---

## Documents

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/documents` | ADMIN | Upload document |
| GET | `/documents` | ADMIN | List documents |
| GET | `/documents/:id` | ADMIN | Get document |
| PATCH | `/documents/:id` | ADMIN | Update document |
| DELETE | `/documents/:id` | ADMIN | Delete document |

---

## Maintenance

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/maintenance` | ADMIN | Create maintenance record |
| GET | `/maintenance` | ADMIN | List maintenance records |
| GET | `/maintenance/:id` | ADMIN | Get maintenance record |
| PATCH | `/maintenance/:id` | ADMIN | Update maintenance record |
| DELETE | `/maintenance/:id` | ADMIN | Soft-delete record |

---

## Fuel

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/fuel` | ADMIN / DRIVER | Log fuel fill |
| GET | `/fuel` | ADMIN | List fuel logs |
| GET | `/fuel/:id` | ADMIN | Get fuel log |
| PATCH | `/fuel/:id` | ADMIN | Update fuel log |
| DELETE | `/fuel/:id` | ADMIN | Delete fuel log |

---

## Expenses

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/expenses` | ADMIN | Create expense |
| GET | `/expenses` | ADMIN | List expenses |
| GET | `/expenses/:id` | ADMIN | Get expense |
| PATCH | `/expenses/:id` | ADMIN | Update expense |
| DELETE | `/expenses/:id` | ADMIN | Delete expense |

---

## Income

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/income` | ADMIN | Record income |
| GET | `/income` | ADMIN | List income records |
| GET | `/income/:id` | ADMIN | Get income record |
| PATCH | `/income/:id` | ADMIN | Update income record |
| DELETE | `/income/:id` | ADMIN | Delete income record |

---

## Accounting

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/accounting/summary` | ADMIN | Financial summary for tenant |

---

## Reports

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/reports/mileage` | ADMIN | Mileage report |
| GET | `/reports/fuel` | ADMIN | Fuel consumption report |
| GET | `/reports/profit-loss` | ADMIN | Profit and loss report |
| GET | `/reports/vehicle-usage` | ADMIN | Vehicle usage report |

---

## Alerts

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/alerts` | ADMIN | List alerts for tenant |
| PATCH | `/alerts/:id/read` | ADMIN | Mark alert as read |
| POST | `/alerts/scan` | ADMIN | Manually trigger an alert scan |

---

## Tracking

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/tracking` | DRIVER | Submit GPS location update |
| GET | `/tracking/:vehicleId` | ADMIN | Get latest location for a vehicle |
| GET | `/tracking/:vehicleId/history` | ADMIN | Location history for a vehicle |

---

## Scheduling

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/scheduling` | ADMIN | Schedule a vehicle |
| GET | `/scheduling` | ADMIN | List schedules |
| GET | `/scheduling/:id` | ADMIN | Get schedule |
| PATCH | `/scheduling/:id` | ADMIN | Update schedule |
| DELETE | `/scheduling/:id` | ADMIN | Remove schedule |

---

## Workshop

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/workshop` | ADMIN | Create workshop job |
| GET | `/workshop` | ADMIN | List workshop jobs |
| GET | `/workshop/:id` | ADMIN | Get workshop job |
| PATCH | `/workshop/:id` | ADMIN | Update workshop job |
| DELETE | `/workshop/:id` | ADMIN | Delete workshop job |

---

## Audit

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/audit` | ADMIN / SUPER_ADMIN | List audit log entries |

---

## Subscriptions

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/subscriptions` | SUPER_ADMIN | Assign subscription plan to tenant |
| GET | `/subscriptions` | SUPER_ADMIN | List all subscriptions |
| PATCH | `/subscriptions/:id` | SUPER_ADMIN | Update subscription |
| DELETE | `/subscriptions/:id` | SUPER_ADMIN | Remove subscription |

---

## Feature Access

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/feature-access` | SUPER_ADMIN | Enable a feature for a tenant |
| GET | `/feature-access` | SUPER_ADMIN | List feature flags |
| DELETE | `/feature-access/:id` | SUPER_ADMIN | Disable a feature for a tenant |

---

## Password Reset — Role Matrix

| Who | Endpoint | Needs Current Password |
|-----|----------|------------------------|
| SUPER_ADMIN resets own password | `PATCH /profile/password` | ✅ Yes |
| SUPER_ADMIN resets ADMIN password | `PATCH /admin-applications/:userId/reset-password` | ❌ No |
| ADMIN resets own password | `PATCH /profile/password` | ✅ Yes |
| ADMIN resets DRIVER / EMPLOYEE password | `PATCH /users/:id/reset-password` | ❌ No |
| DRIVER resets own password | `PATCH /profile/password` | ✅ Yes |
| EMPLOYEE resets own password | `PATCH /profile/password` | ✅ Yes |

## Name Change — Role Matrix

| Who | Endpoint |
|-----|----------|
| Anyone (all roles) | `PATCH /profile/name` |
