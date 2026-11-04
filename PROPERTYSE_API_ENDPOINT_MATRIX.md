# PropertySE — Comprehensive API Endpoint Matrix & Route Audit

**Project:** PropertySE (`propertyse-v1`)  
**Audit Date:** November 4, 2026  
**Active Branch:** `feature-owner`  
**Git Root:** `c:\Users\Asus\OneDrive\Desktop\works\Pentabytelabs\Propertyse-V1-main\Propertyse-V1-main`  
**Backend Framework:** Node.js v18+ / Express v5.x  
**Database Driver:** `pg` (node-postgres) with Supabase PostgreSQL  
**Audit Classification:** READ-ONLY Technical Infrastructure & Integration Audit  

---

## 1. Executive Summary & Routing Architecture

The PropertySE backend utilizes Express 5 with modular router separation located under `server/routes/`. A thorough audit reveals a severe architectural divide between the legacy Manager endpoints and the newly hardened Owner endpoints:

1. **Unprotected Legacy Manager Endpoints:** `/api/properties`, `/api/maintenance-tickets`, and `/api/companies` are actively mounted in `server/server.js`, but have **zero authentication and zero role authorization**. Any unauthenticated client or external network agent can query, create, update, or delete sensitive property, financial, company, and tenant data simply by providing an arbitrary `companyId` query parameter or body payload.
2. **Hardened but Unmounted Owner Endpoints:** `/api/owner/*` in `server/routes/ownerRoutes.js` implements comprehensive security controls, including ownership scoping, parent row locking, bank payout masking, and role checks (`requireOwnerAuth`, `requireManagementAuth`). However, it remains **intentionally unmounted in `server/server.js`** because the central authentication middleware (`req.user` JWT parser) has not yet been delivered by the authentication team.
3. **Completely Missing Dashboard Endpoints:** No endpoints exist for the **Tenant Portal** (e.g., `/api/tenant/*`) or the **Worker/Technician Portal** (e.g., `/api/worker/*`). Furthermore, there are no endpoints for user authentication, registration, password hashing, or token issuance.

---

## 2. Master API Endpoint Matrix

The table below catalogs all **26 backend routes** identified across the PropertySE Express codebase:

| HTTP Method | Route Path | Controller / Source File | Mount Status in `server.js` | Auth Guard | Access Role Required | Target Database Table | Security / Contract Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | `server/server.js:76` | Mounted | None (Public) | Anyone | None (Static) | Informational only. |
| **GET** | `/api/health` | `server/server.js:86` | Mounted | None (Public) | Anyone | `db.checkHealth()` | Degraded if DB credentials invalid. |
| **GET** | `/api/db-diagnostics` | `server/server.js:120` | Mounted | None (Public) | Anyone | `db.checkHealth()` | Exposes database connectivity metadata. |
| **GET** | `/api/companies` | `routes/companyRoutes.js:10` | Mounted (`/api/companies`) | None (Public) | Anyone | `public.companies` | **Critical:** Unauthenticated company listing. |
| **POST** | `/api/companies` | `routes/companyRoutes.js:23` | Mounted (`/api/companies`) | None (Public) | Anyone | `public.companies` | **Critical:** Unauthenticated company creation. |
| **DELETE** | `/api/companies/:id` | `routes/companyRoutes.js:51` | Mounted (`/api/companies`) | None (Public) | Anyone | `public.companies` | **Critical:** Unauthenticated company deletion. |
| **GET** | `/api/properties` | `routes/propertyRoutes.js:132` | Mounted (`/api/properties`) | None (Public) | Anyone | `public.properties` | **Critical:** Unauthenticated unit listing + PII exposure. |
| **GET** | `/api/properties/:id` | `routes/propertyRoutes.js:164` | Mounted (`/api/properties`) | None (Public) | Anyone | `public.properties` | **Critical:** IDOR vulnerability; exposes tenant PII. |
| **POST** | `/api/properties` | `routes/propertyRoutes.js:197` | Mounted (`/api/properties`) | None (Public) | Anyone | `public.properties` | **Critical:** Unauthenticated property creation. |
| **PATCH** | `/api/properties/:id/tenant` | `routes/propertyRoutes.js:332` | Mounted (`/api/properties`) | None (Public) | Anyone | `public.properties` | **Critical:** Unauthenticated lease & tenant reassignment. |
| **PATCH** | `/api/properties/:id/rent` | `routes/propertyRoutes.js:511` | Mounted (`/api/properties`) | None (Public) | Anyone | `public.properties` | **Critical:** Unauthenticated rent alteration. |
| **PATCH** | `/api/properties/:id/status` | `routes/propertyRoutes.js:561` | Mounted (`/api/properties`) | None (Public) | Anyone | `public.properties` | **Critical:** Unauthenticated occupancy status changes. |
| **GET** | `/api/maintenance-tickets` | `routes/maintenanceTicketRoutes.js:45` | Mounted (`/api/maintenance-tickets`) | None (Public) | Anyone | `public.maintenance_tickets` | **Critical:** Unauthenticated ticket inspection. |
| **POST** | `/api/maintenance-tickets` | `routes/maintenanceTicketRoutes.js:71` | Mounted (`/api/maintenance-tickets`) | None (Public) | Anyone | `public.maintenance_tickets` | **High:** Allows arbitrary ticket insertion without auth. |
| **PATCH** | `/api/maintenance-tickets/:id/status` | `routes/maintenanceTicketRoutes.js:179` | Mounted (`/api/maintenance-tickets`) | None (Public) | Anyone | `public.maintenance_tickets` | **High:** Allows unauthorized status changes. |
| **GET** | `/api/owner/overview` | `routes/ownerRoutes.js:213` | **Unmounted** | `requireOwnerAuth` | `owner` | `properties`, `property_owners` | Blocks requests until auth middleware attached. |
| **GET** | `/api/owner/properties` | `routes/ownerRoutes.js:279` | **Unmounted** | `requireOwnerAuth` | `owner` | `properties`, `property_owners` | Unmounted. Validates UUID and ownership link. |
| **GET** | `/api/owner/properties/:id` | `routes/ownerRoutes.js:324` | **Unmounted** | `requireOwnerAuth` | `owner` | `properties`, `property_owners` | Unmounted. Strict owner isolation (prevents IDOR). |
| **GET** | `/api/owner/tenants` | `routes/ownerRoutes.js:376` | **Unmounted** | `requireOwnerAuth` | `owner` | `properties`, `property_owners` | Unmounted. Scoped tenant roll-up. |
| **GET** | `/api/owner/financials/income` | `routes/ownerRoutes.js:428` | **Unmounted** | `requireOwnerAuth` | `owner` | `properties`, `property_owners` | Unmounted. Pro-rata rent calculation. |
| **GET** | `/api/owner/financials/payments` | `routes/ownerRoutes.js:494` | **Unmounted** | `requireOwnerAuth` | `owner` | `properties`, `property_owners` | Unmounted. Financial payout ledger. |
| **GET** | `/api/owner/maintenance` | `routes/ownerRoutes.js:524` | **Unmounted** | `requireOwnerAuth` | `owner` | `properties`, `maintenance_tickets` | Unmounted. Maintenance ticket feed. |
| **GET** | `/api/owner/reports` | `routes/ownerRoutes.js:577` | **Unmounted** | `requireOwnerAuth` | `owner` | `properties`, `property_owners` | Unmounted. Aggregated financial reports. |
| **GET** | `/api/owner/notifications` | `routes/ownerRoutes.js:631` | **Unmounted** | `requireOwnerAuth` | `owner` | `properties`, `property_owners` | Unmounted. Dynamic alert synthesis. |
| **GET** | `/api/owner/settings` | `routes/ownerRoutes.js:692` | **Unmounted** | `requireOwnerAuth` | `owner` | `property_owners` | Unmounted. **Hardened:** Masks bank account numbers. |
| **POST** | `/api/owner/assignments` | `routes/ownerRoutes.js:731` | **Unmounted** | `requireManagementAuth` | `manager`, `admin` | `property_owners`, `properties` | Unmounted. Enforces <= 100% cap with `FOR NO KEY UPDATE`. |

---

## 3. Deep-Dive Endpoint Specifications

### 3.1 Health & System Diagnostics

#### `GET /`
- **Location:** `server/server.js:76`
- **Purpose:** Fast ping to confirm Express server liveness.
- **Input Parameters:** None.
- **Database Query:** None.
- **Response Format:**
  ```json
  {
    "message": "PropertySE API is running",
    "database": "Supabase PostgreSQL",
    "service": "Render Web Service",
    "status": "ok"
  }
  ```
- **Status Codes:** `200 OK`.

#### `GET /api/health`
- **Location:** `server/server.js:86`
- **Purpose:** Readiness probe checking database connectivity via `SELECT 1`.
- **Input Parameters:** None.
- **Database Query:** `SELECT 1 AS ok, current_database() AS database, current_user AS user;`
- **Success Response (200 OK):**
  ```json
  {
    "status": "ok",
    "database": "connected",
    "databaseName": "postgres",
    "databaseUser": "postgres.oyjmdtngezoqvgkqfhay",
    "diagnostics": { "host": "aws-0-ap-northeast-1.pooler.supabase.com", "port": "5432", ... },
    "timestamp": "2026-11-04T10:45:00.000Z"
  }
  ```
- **Failure Response (503 Service Unavailable):**
  ```json
  {
    "status": "degraded",
    "database": "disconnected",
    "category": "Authentication failure",
    "summary": "Database authentication rejected the provided credentials.",
    "detail": "password authentication failed for user \"postgres\"",
    "advice": "Verify password in Supabase Dashboard -> Project Settings -> Database.",
    "diagnostics": { ... }
  }
  ```

#### `GET /api/db-diagnostics`
- **Location:** `server/server.js:120`
- **Purpose:** Diagnostic metadata endpoint safe for operational telemetry (masks passwords and keys).
- **Status Codes:** `200 OK` (even when DB is disconnected, reports diagnostic breakdown), `500 Internal Server Error`.

---

### 3.2 Company Management API (`routes/companyRoutes.js`)

#### `GET /api/companies`
- **Purpose:** Lists all registered property management companies alphabetically.
- **Query Parameters:** None.
- **SQL Query:**
  ```sql
  SELECT id, name FROM public.companies ORDER BY name ASC;
  ```
- **Response Format (200 OK):**
  ```json
  [
    { "id": "COMP_001", "name": "Prestige Group" },
    { "id": "COMP_002", "name": "Sobha Limited" }
  ]
  ```
- **Vulnerabilities / Risks:** Unauthenticated public access. Any user can enumerate all company identifiers in the system.

#### `POST /api/companies`
- **Purpose:** Registers a new property management company.
- **Request Body:**
  ```json
  { "id": "COMP_003", "name": "Brigade Enterprises" }
  ```
- **Validation:**
  - `id`: Regex `/^[A-Za-z0-9_-]{2,64}$/`.
  - `name`: String, 1–120 characters.
- **SQL Query:**
  ```sql
  INSERT INTO public.companies (id, name) VALUES ($1, $2) RETURNING id, name;
  ```
- **Response Format (201 Created):**
  ```json
  { "id": "COMP_003", "name": "Brigade Enterprises" }
  ```
- **Error Codes:** `400 Bad Request` (invalid input), `409 Conflict` (company ID already exists), `500 Internal Server Error`.
- **Vulnerabilities / Risks:** Unauthenticated. Anyone can create arbitrary company organizations.

#### `DELETE /api/companies/:id`
- **Purpose:** Deletes an existing company only if no properties/units are currently linked to it.
- **URL Parameters:** `id` (e.g., `COMP_003`).
- **SQL Query:**
  ```sql
  SELECT COUNT(*)::int AS count FROM public.properties WHERE company_id = $1;
  DELETE FROM public.companies WHERE id = $1 RETURNING id, name;
  ```
- **Response Format (200 OK):**
  ```json
  { "message": "Company deleted successfully.", "company": { "id": "COMP_003", "name": "Brigade Enterprises" } }
  ```
- **Error Codes:** `400 Bad Request` (invalid ID format or company has existing properties), `404 Not Found`, `500 Internal Server Error`.
- **Vulnerabilities / Risks:** Unauthenticated. If a company has zero units, anyone can permanently delete it without administrative confirmation.

---

### 3.3 Property & Unit Management API (`routes/propertyRoutes.js`)

#### `GET /api/properties`
- **Purpose:** Retrieves all property units belonging to a specific company. Automatically triggers a background sweep to mark expired leases as 'Vacant'.
- **Query Parameters:** `companyId` or `company_id` (Required, string slug).
- **SQL Query:**
  ```sql
  -- Lease sweep (pre-query):
  UPDATE public.properties
  SET status = 'Vacant', tenant_name = NULL, tenant_email = NULL, tenant_phone = NULL,
      lease_start = NULL, lease_end = NULL, updated_at = NOW()
  WHERE company_id = $1 AND status = 'Occupied' AND lease_end < CURRENT_DATE;

  -- Unit fetch:
  SELECT * FROM public.properties WHERE company_id = $1 ORDER BY created_at DESC;
  ```
- **Response Format (200 OK):** Array of property objects formatted in `camelCase`:
  ```json
  [
    {
      "id": "7b8f9e20-5c3b-4c28-9844-3c66f912e75e",
      "_id": "7b8f9e20-5c3b-4c28-9844-3c66f912e75e",
      "companyId": "COMP_001",
      "unitNumber": "A-101",
      "rentAmount": 24000,
      "status": "Occupied",
      "bedrooms": 2,
      "bathrooms": 2,
      "squareFeet": 1200,
      "leaseStart": "2026-01-01",
      "leaseEnd": "2026-12-31",
      "tenantName": "Aarav Sharma",
      "tenantEmail": "aarav.sharma@example.com",
      "tenantPhone": "+91 98765 43210",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
  ```
- **Vulnerabilities / Risks:** Unauthenticated. Exposes full tenant Personally Identifiable Information (name, email, phone) and rental financial terms to anyone requesting the endpoint.

#### `GET /api/properties/:id`
- **Purpose:** Retrieves a single property unit by its UUID.
- **URL Parameters:** `id` (UUID format).
- **Query Parameters:** Optional `companyId`.
- **SQL Query:**
  ```sql
  SELECT * FROM public.properties WHERE id = $1 [AND company_id = $2];
  ```
- **Response Format (200 OK):** Single property object (same schema as above).
- **Error Codes:** `400 Bad Request` (invalid UUID), `404 Not Found`, `500 Internal Server Error`.
- **Vulnerabilities / Risks:** Insecure Direct Object Reference (IDOR). If `companyId` is omitted, any UUID can be scraped publicly.

#### `POST /api/properties`
- **Purpose:** Creates a new property unit under a company.
- **Request Body:**
  ```json
  {
    "companyId": "COMP_001",
    "unitNumber": "B-304",
    "rentAmount": 32000,
    "status": "Occupied",
    "bedrooms": 3,
    "bathrooms": 2,
    "squareFeet": 1550,
    "leaseStart": "2026-02-01",
    "leaseEnd": "2027-01-31",
    "tenantName": "Pooja Reddy",
    "tenantEmail": "pooja.reddy@example.com",
    "tenantPhone": "+91 91234 56789"
  }
  ```
- **Validation:**
  - `companyId`: Valid slug.
  - `unitNumber`: Required, non-empty string <= 50 chars.
  - `rentAmount`: Non-negative numeric value.
  - `status`: Must be one of `['Occupied', 'Vacant', 'Maintenance']`.
  - Conditional: If `status === 'Occupied'`, `tenantName`, `leaseStart`, and `leaseEnd` are strictly required, and `leaseEnd` must be strictly after `leaseStart`.
- **SQL Query:**
  ```sql
  INSERT INTO public.properties (
    company_id, unit_number, rent_amount, status, bedrooms, bathrooms, square_feet,
    lease_start, lease_end, tenant_name, tenant_email, tenant_phone
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  RETURNING *;
  ```
- **Response Format (201 Created):** Newly created unit formatted in `camelCase`.
- **Error Codes:** `400 Bad Request`, `409 Conflict` (duplicate `unit_number` within `company_id`), `500 Internal Server Error`.
- **Vulnerabilities / Risks:** Zero authentication. Anyone can insert false rental units into any company portfolio.

#### `PATCH /api/properties/:id/tenant`
- **Purpose:** Updates tenant occupancy or assigns a new tenant lease. Can also vacate a unit if `tenantName` is null or empty.
- **URL Parameters:** `id` (UUID).
- **Request Body:**
  ```json
  {
    "companyId": "COMP_001",
    "tenantName": "Rohit Verma",
    "tenantEmail": "rohit.verma@example.com",
    "tenantPhone": "+91 99887 76655",
    "leaseStart": "2026-03-01",
    "leaseEnd": "2027-02-28",
    "rentAmount": 26000
  }
  ```
- **Validation:** Validates date ordering (`leaseEnd > leaseStart`) and email/phone format.
- **SQL Query:**
  ```sql
  UPDATE public.properties
  SET status = 'Occupied', tenant_name = $1, tenant_email = $2, tenant_phone = $3,
      lease_start = $4, lease_end = $5, rent_amount = COALESCE($6, rent_amount), updated_at = NOW()
  WHERE id = $7 AND company_id = $8
  RETURNING *;
  ```
- **Response Format (200 OK):** Updated property record.
- **Error Codes:** `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`.
- **Vulnerabilities / Risks:** Unauthenticated eviction or reassignment of tenants.

#### `PATCH /api/properties/:id/rent`
- **Purpose:** Updates monthly rent pricing for a unit.
- **URL Parameters:** `id` (UUID).
- **Request Body:**
  ```json
  { "companyId": "COMP_001", "rentAmount": 28500 }
  ```
- **Validation:** `rentAmount` must be a positive integer or float >= 0.
- **SQL Query:**
  ```sql
  UPDATE public.properties
  SET rent_amount = $1, updated_at = NOW()
  WHERE id = $2 AND company_id = $3
  RETURNING *;
  ```
- **Response Format (200 OK):** Updated property record.
- **Vulnerabilities / Risks:** Unauthenticated alteration of financial contracts.

#### `PATCH /api/properties/:id/status`
- **Purpose:** Manually overrides property status (`'Occupied'`, `'Vacant'`, `'Maintenance'`).
- **URL Parameters:** `id` (UUID).
- **Request Body:**
  ```json
  { "companyId": "COMP_001", "status": "Maintenance" }
  ```
- **Validation:** `status` must be one of `['Occupied', 'Vacant', 'Maintenance']`. If changing to `'Vacant'`, clears tenant fields.
- **SQL Query:**
  ```sql
  UPDATE public.properties
  SET status = $1, updated_at = NOW()
  WHERE id = $2 AND company_id = $3
  RETURNING *;
  ```
- **Response Format (200 OK):** Updated property record.
- **Vulnerabilities / Risks:** Unauthenticated state change.

---

### 3.4 Maintenance Ticket API (`routes/maintenanceTicketRoutes.js`)

#### `GET /api/maintenance-tickets`
- **Purpose:** Retrieves all maintenance tickets for a given company.
- **Query Parameters:** `companyId` (Required string slug).
- **SQL Query:**
  ```sql
  SELECT * FROM public.maintenance_tickets WHERE company_id = $1 ORDER BY created_at DESC;
  ```
- **Response Format (200 OK):**
  ```json
  {
    "count": 1,
    "tickets": [
      {
        "id": "e4a2c10b-1111-4444-8888-abcdef123456",
        "_id": "e4a2c10b-1111-4444-8888-abcdef123456",
        "companyId": "COMP_001",
        "propertyId": "7b8f9e20-5c3b-4c28-9844-3c66f912e75e",
        "unitNumber": "A-101",
        "tenantName": "Aarav Sharma",
        "category": "Plumbing",
        "description": "Kitchen sink pipe leaking under the counter.",
        "priority": "High",
        "status": "Open",
        "createdAt": "2026-11-01T08:00:00.000Z",
        "updatedAt": "2026-11-01T08:00:00.000Z"
      }
    ]
  }
  ```
- **Vulnerabilities / Risks:** Unauthenticated. Anyone knowing the company ID can view all maintenance issues.

#### `POST /api/maintenance-tickets`
- **Purpose:** Creates a maintenance ticket. Automatically looks up the property to grab `unit_number` and `tenant_name`.
- **Request Body:**
  ```json
  {
    "companyId": "COMP_001",
    "propertyId": "7b8f9e20-5c3b-4c28-9844-3c66f912e75e",
    "category": "Electrical",
    "description": "Main circuit breaker tripping repeatedly.",
    "priority": "Urgent"
  }
  ```
- **Validation:**
  - `category`: Must be one of `['Plumbing', 'Electrical', 'Air Conditioning', 'Appliance', 'Cleaning', 'Structural', 'Other']`.
  - `priority`: Must be one of `['Low', 'Medium', 'High', 'Urgent']` (defaults to `'Medium'`).
  - `propertyId`: Must exist and belong to `companyId`. Unit must be `'Occupied'` or `'Maintenance'`.
- **SQL Query:**
  ```sql
  SELECT unit_number, tenant_name, status FROM public.properties WHERE id = $1 AND company_id = $2;
  INSERT INTO public.maintenance_tickets (
    company_id, property_id, unit_number, tenant_name, category, description, priority, status
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Open')
  RETURNING *;
  ```
- **Response Format (201 Created):** Newly created ticket.
- **Error Codes:** `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`.
- **Vulnerabilities / Risks:** Unauthenticated. No tenant or worker verification.

#### `PATCH /api/maintenance-tickets/:id/status`
- **Purpose:** Updates ticket resolution status.
- **URL Parameters:** `id` (UUID).
- **Request Body:**
  ```json
  { "companyId": "COMP_001", "status": "In Progress" }
  ```
- **Validation:** `status` must be one of `['Open', 'In Progress', 'Resolved']`.
- **SQL Query:**
  ```sql
  UPDATE public.maintenance_tickets
  SET status = $1, updated_at = NOW()
  WHERE id = $2 AND company_id = $3
  RETURNING *;
  ```
- **Response Format (200 OK):** Updated ticket record.
- **Error Codes:** `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`.
- **Vulnerabilities / Risks:** Unauthenticated. Technicians or unauthorized users can arbitrarily mark tickets resolved without manager approval or photo evidence.

---

### 3.5 Owner Portal API (`routes/ownerRoutes.js`) — *Unmounted*

All 11 endpoints in `ownerRoutes.js` are currently unmounted in `server/server.js`. They rely on `requireOwnerAuth` or `requireManagementAuth` middleware, which expects `req.user` to be populated by the central JWT authentication layer.

#### Security & Auth Guards in `ownerRoutes.js`:
```javascript
function requireOwnerAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: "Authentication required",
      code: "UNAUTHORIZED",
      message: "Please sign in to access the owner portal.",
    });
  }
  if (req.user.role !== "owner") {
    return res.status(403).json({
      error: "Access denied: owner role required",
      code: "FORBIDDEN",
      message: "This resource is restricted to property owners.",
    });
  }
  next();
}
```

#### Detailed Owner Endpoints:

1. **`GET /api/owner/overview`**
   - **Auth:** `requireOwnerAuth` (`owner`).
   - **Database Query:**
     ```sql
     SELECT po.ownership_percentage, p.*
     FROM public.property_owners po
     JOIN public.properties p ON po.property_id = p.id
     WHERE po.owner_id = $1 AND po.is_active = TRUE;
     ```
   - **Calculation:** Computes monthly portfolio gross rent, pro-rata ownership share, occupied unit count, occupancy rate percentage, and open maintenance count.
   - **Response Format (200 OK):** Overview financial KPIs, portfolio summary, and recent activity.

2. **`GET /api/owner/properties`**
   - **Auth:** `requireOwnerAuth` (`owner`).
   - **Database Query:** Fetches all properties owned by `req.user.id` joined with `property_owners.ownership_percentage`.
   - **Response Format (200 OK):** Array of owned property cards with unit numbers, addresses, tenant occupancy, and pro-rata rent entitlement.

3. **`GET /api/owner/properties/:id`**
   - **Auth:** `requireOwnerAuth` (`owner`).
   - **Input Validation:** UUID check on `:id`.
   - **Database Query:**
     ```sql
     SELECT po.ownership_percentage, po.payout_account, p.*
     FROM public.property_owners po
     JOIN public.properties p ON po.property_id = p.id
     WHERE po.owner_id = $1 AND p.id = $2 AND po.is_active = TRUE;
     ```
   - **Security Hardening:** Enforces strict ownership scoping. If the requested property ID is not owned by the authenticated owner, returns `404 Not Found` (mitigating IDOR).

4. **`GET /api/owner/tenants`**
   - **Auth:** `requireOwnerAuth` (`owner`).
   - **Database Query:** Retrieves tenant names, lease start/end dates, and rent amounts for all units owned by the owner.

5. **`GET /api/owner/financials/income`**
   - **Auth:** `requireOwnerAuth` (`owner`).
   - **Database Query:** Computes pro-rata rental distributions, net yields, and monthly trend breakdowns.

6. **`GET /api/owner/financials/payments`**
   - **Auth:** `requireOwnerAuth` (`owner`).
   - **Database Query:** Retrieves disbursement transaction logs, payment statuses, and reference numbers.

7. **`GET /api/owner/maintenance`**
   - **Auth:** `requireOwnerAuth` (`owner`).
   - **Database Query:**
     ```sql
     SELECT mt.*, p.unit_number
     FROM public.maintenance_tickets mt
     JOIN public.properties p ON mt.property_id = p.id
     JOIN public.property_owners po ON po.property_id = p.id
     WHERE po.owner_id = $1 AND po.is_active = TRUE
     ORDER BY mt.created_at DESC;
     ```

8. **`GET /api/owner/reports`**
   - **Auth:** `requireOwnerAuth` (`owner`).
   - **Database Query:** Aggregates quarterly and annual tax statements, gross income, operating deductions, and net yield metrics.

9. **`GET /api/owner/notifications`**
   - **Auth:** `requireOwnerAuth` (`owner`).
   - **Logic:** Dynamically scans owned properties for expiring leases (< 60 days), urgent open tickets, and missing payout accounts.

10. **`GET /api/owner/settings`**
    - **Auth:** `requireOwnerAuth` (`owner`).
    - **Database Query:** Retrieves owner preferences, notification flags, and payout details.
    - **Security Hardening:** Passes raw bank account numbers through `maskPayoutAccount()`. Bank account numbers are strictly transformed to `•••• •••• •••• 1234` before being transmitted over HTTP.

11. **`POST /api/owner/assignments`**
    - **Auth:** `requireManagementAuth` (`manager`, `admin`).
    - **Purpose:** Assigns or updates property ownership share.
    - **Concurrency & Integrity Hardening:**
      - Executes within a PostgreSQL transaction `BEGIN ... COMMIT`.
      - Acquires a row-level lock on the target property: `SELECT id FROM public.properties WHERE id = $1 FOR NO KEY UPDATE`.
      - Computes `SUM(ownership_percentage)` across all existing active co-owners.
      - Strictly rejects assignment if the total cumulative percentage exceeds 100.00%.
      - Writes an audit log record into `public.property_owners_audit`.

---

## 4. Cross-Endpoint Inconsistencies & Contract Mismatches

| Inconsistency Category | Problem Observed | Impact on Dashboards | Remediation Required |
| :--- | :--- | :--- | :--- |
| **Casing Convention** | DB uses `snake_case` (`unit_number`, `rent_amount`), `propertyRoutes.js` transforms to `camelCase` (`unitNumber`, `rentAmount`), but raw SQL in custom queries sometimes returns `snake_case`. | Frontend components break if they expect `unitNumber` but receive `unit_number`. | Standardize on an automated transformer utility or enforce camelCase across all route outputs. |
| **ID Types** | Properties use UUID v4 (`7b8f9e20-...`). Companies use arbitrary string slugs (`COMP_001`). Owners use UUID or string slugs. | Foreign key joins between `companies` and `users` fail because there is no unified ID strategy. | Establish UUID v4 as the universal primary key across all entities. |
| **Error Format Mismatch** | Manager routes return `{ message: "Error message" }`. Owner routes return `{ error: "...", code: "...", message: "..." }`. Health routes return `{ status: "degraded", category: "...", advice: "..." }`. | Frontend fetch services cannot parse errors uniformly. | Create a standardized JSON error response envelope `{ success: false, code: "...", message: "...", details: null }`. |
| **Security Boundary** | Manager routes accept `companyId` via unverified query params or body fields. Owner routes extract `owner_id` from trusted `req.user.id`. | Manager routes allow cross-tenant spoofing; any user can view another company's data by tampering with `?companyId=...`. | Enforce `req.user.companyId` extraction via JWT for Manager endpoints. |
| **Tenant Storage Anti-Pattern** | Tenant details (`tenant_name`, `tenant_email`, `tenant_phone`) are flat columns directly on `public.properties`. | A tenant has no independent login, cannot submit tickets with their own identity, and lease history is wiped whenever a unit is vacated. | Extract tenants into a dedicated `public.tenants` table linked via a `public.leases` junction table. |

---

## 5. Missing API Endpoints Required for Full System Integration

To achieve full operational integration across Manager, Owner, Tenant, and Worker dashboards, the following endpoint groups must be implemented:

```
========================================================================================
1. CENTRAL AUTHENTICATION & IDENTITY API (Target: server/routes/authRoutes.js)
========================================================================================
POST   /api/auth/register          Register a new user (tenant, owner, manager, worker)
POST   /api/auth/login             Authenticate with email/password; returns JWT + Refresh Token
GET    /api/auth/me                Returns current authenticated user profile & permissions
POST   /api/auth/refresh           Rotate access token using refresh token
POST   /api/auth/logout            Invalidate refresh token / clear auth cookie
POST   /api/auth/forgot-password   Request password reset token
POST   /api/auth/reset-password    Execute password reset with verified token

========================================================================================
2. TENANT PORTAL API (Target: server/routes/tenantRoutes.js)
========================================================================================
GET    /api/tenant/lease           View current active lease agreement, unit details, rent amount
GET    /api/tenant/payments        List historical rent payments, receipts, and outstanding dues
POST   /api/tenant/payments/pay    Initiate rent payment via payment gateway (Stripe/Razorpay)
GET    /api/tenant/maintenance     List maintenance tickets created by this tenant
POST   /api/tenant/maintenance     Submit a new maintenance request with photo upload
GET    /api/tenant/notifications   Tenant-specific notices, lease reminders, payment confirmations

========================================================================================
3. WORKER / TECHNICIAN PORTAL API (Target: server/routes/workerRoutes.js)
========================================================================================
GET    /api/worker/tickets         List dispatched tickets assigned to this worker or unassigned in queue
GET    /api/worker/tickets/:id     View ticket detail, tenant contact, unit address, issue photos
PATCH  /api/worker/tickets/:id/claim Worker claims ticket from available pool
PATCH  /api/worker/tickets/:id/status Update status ('In Progress', 'Awaiting Parts', 'Resolved')
POST   /api/worker/tickets/:id/notes Add technician notes, parts used, labor hours
POST   /api/worker/tickets/:id/photos Upload completion proof photos

========================================================================================
4. FINANCIAL LEDGER & PAYOUT API (Target: server/routes/paymentRoutes.js)
========================================================================================
GET    /api/payments/transactions  Manager ledger: all incoming tenant rent & outgoing payouts
POST   /api/payments/payout        Manager initiates owner disbursement distribution
POST   /api/payments/webhook       Webhook listener for payment gateway settlement events
========================================================================================
```

---

## 6. Audit Conclusion & Immediate Route Actions

1. **Mounting Block:** Do **NOT** mount `ownerRoutes.js` until central JWT authentication middleware is integrated. Mounting it prematurely will cause every Owner endpoint to return `401 Unauthorized` because `req.user` is undefined.
2. **Security Vulnerability:** Manager routes (`propertyRoutes`, `maintenanceTicketRoutes`, `companyRoutes`) currently possess zero access controls. The Backend/Auth team must place `requireAuth` and `requireRole(['manager', 'admin'])` guards on these routers before production deployment.
3. **Database Health Dependency:** All database queries across all endpoints will fail with PostgreSQL code `28P01` until the database password in `server/.env` is synchronized with the Supabase project credentials.

