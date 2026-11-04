# PropertySE — Step 7: Developer Integration Checklists

**Document Version:** 1.0.0  
**Date:** 2026-11-04  
**Author:** Senior Software Integration Architect & Git Integration Engineer  
**Project:** PropertySE (`feature-owner`)  
**Scope:** Actionable role-specific integration checklists for team leads  
**Status:** **READY FOR TEAM EXECUTION**

---

## Overview

This document provides clear, role-segregated, actionable checklists for the six engineering disciplines involved in integrating the Owner Dashboard module into the main PropertySE application.

---

## Checklist A: Owner Developer

- **Primary Scope:** Owner Dashboard module maintenance, bug fixes, and handover support.
- **Required Files:**
  - `client/src/components/owner/**` (13 files)
  - `client/src/services/ownerService.js`
  - `server/routes/ownerRoutes.js`
  - `server/test/owner-routes.test.js`
  - `server/test/owner-trigger.test.js`
- **Dependencies:** None (self-contained).
- **Exact Responsibility:**
  1. Maintain fail-closed preview guards and ensure `import.meta.env?.PROD` checks remain active.
  2. Keep banking payout masking synchronized with any future backend adjustments.
  3. Assist the Frontend Integration Developer in mounting `OwnerDashboard.jsx`.
  4. Ensure zero fabricated financial data enters the views.
- **Expected Output:** Fully tested, zero-defect Owner components and services.
- **Completion Criteria:**
  - [ ] `npm.cmd run lint` runs with 0 errors and 0 warnings.
  - [ ] `npm.cmd run build` builds cleanly in Vite without warnings.
  - [ ] All 15 owner route unit tests pass (`node --test test/owner-routes.test.js`).
  - [ ] All 6 trigger concurrency tests pass (`node --test test/owner-trigger.test.js`).
  - [ ] Owner routes remain unmounted until central auth is verified.

---

## Checklist B: Login / Authentication Developer

- **Primary Scope:** Central user authentication, JWT generation, and shared auth middleware.
- **Required Files:**
  - `server/middleware/auth.js` (To be created)
  - `server/routes/authRoutes.js` (To be created)
  - `client/src/components/auth/LoginScreen.jsx` (or equivalent Login UI)
  - Reference specification: `OWNER_LOGIN_INTEGRATION_CONTRACT.md`
- **Dependencies:** User database table (`public.users`), `JWT_SECRET` environment variable.
- **Exact Responsibility:**
  1. Implement `server/middleware/auth.js` exporting:
     - `authenticateUser(req, res, next)`: Extracts and verifies `Authorization: Bearer <token>`, populating `req.user`.
     - `requireRole(roles)`: Reusable role guard middleware.
  2. Ensure the signed JWT payload includes standard claims:
     ```json
     {
       "id": "UUID_OR_STRING",
       "email": "user@propertyse.com",
       "role": "owner",
       "company_id": "COMP_001",
       "name": "User Display Name"
     }
     ```
  3. Ensure unauthenticated requests receive `401 Unauthorized` with `{ error, code: "UNAUTHORIZED", message }`.
  4. In the login UI, after authenticating an owner, supply the token to `ownerService.setAuthToken(token)`.
- **Expected Output:** Production-ready authentication middleware and login API endpoints.
- **Completion Criteria:**
  - [ ] `authenticateUser` rejects missing, expired, and tampered tokens with 401.
  - [ ] `req.user` contains all 5 required identity fields.
  - [ ] Test accounts for `owner`, `manager`, `tenant`, and `worker` are verified in staging.
  - [ ] Code committed and merged to `main` before Owner route mounting.

---

## Checklist C: Backend Integration Developer

- **Primary Scope:** Mounting routes in `server/server.js` and managing the Express middleware pipeline.
- **Required Files:**
  - `server/server.js`
  - `server/routes/ownerRoutes.js`
  - `server/middleware/auth.js`
- **Dependencies:** Login module merged; database migration executed.
- **Exact Responsibility:**
  1. Review `server/server.js` and verify CORS, JSON body parser, and error handling settings.
  2. Import `authenticateUser` from `./middleware/auth`.
  3. Import `ownerRoutes` from `./routes/ownerRoutes`.
  4. Mount owner routes:
     ```javascript
     app.use("/api/owner", authenticateUser, ownerRoutes);
     ```
  5. Verify that `requireManagementAuth` on `/api/owner/assignments` allows managers to assign properties within their own `company_id`.
  6. Ensure unhandled errors in owner routes pass to the centralized error handler without leaking stack traces.
- **Expected Output:** Securely mounted, authenticated `/api/owner/*` route tree in `server/server.js`.
- **Completion Criteria:**
  - [ ] Calling `GET /api/owner/overview` without Bearer token returns 401.
  - [ ] Calling `GET /api/owner/overview` with tenant token returns 403 Forbidden.
  - [ ] Calling `GET /api/owner/overview` with valid owner token returns 200 OK.
  - [ ] Full backend test suite (`npm.cmd test`) reports 47+ passing tests (0 failures).

---

## Checklist D: Property, Tenant & Maintenance Developers

- **Primary Scope:** Ensuring shared property models and maintenance tickets remain compatible with owner views.
- **Required Files:**
  - `server/routes/propertyRoutes.js`
  - `server/routes/maintenanceTicketRoutes.js`
  - `client/src/components/modules/ManagementModules.jsx`
- **Dependencies:** `public.properties`, `public.maintenance_tickets`.
- **Exact Responsibility:**
  1. Confirm that `public.properties` columns (`tenant_full_name`, `tenant_phone`, `tenant_email`, `lease_start_date`, `lease_end_date`, `annual_rent`, `status`) remain consistent.
  2. Ensure that deleting a property cascades or safely handles associated records in `public.property_owners`.
  3. Confirm that new maintenance tickets created via `maintenanceTicketRoutes.js` continue to set `property_id` and standard categories (`Plumbing`, `Electrical`, etc.).
  4. If migrating tenant records from embedded columns on `properties` to a standalone `tenants` table, coordinate with the Owner developer to update join queries in `ownerRoutes.js`.
- **Expected Output:** Maintained data schema contracts across properties, leases, and work orders.
- **Completion Criteria:**
  - [ ] Updating a tenant or rent in `TenantManagement` immediately reflects in the Owner's view of that unit.
  - [ ] Raising a maintenance ticket moves the flat to Maintenance status and shows in the Owner maintenance list.
  - [ ] Property deletion does not cause orphan rows in `property_owners`.

---

## Checklist E: Database Administrator (DBA)

- **Primary Scope:** Database migration review, indexing, constraints, concurrency triggers, and staging execution.
- **Required Files:**
  - `supabase/migrations/202611030001_create_property_owners.sql`
  - Rollback script in `OWNER_DATABASE_INTEGRATION_READINESS.md`
- **Dependencies:** Target Supabase PostgreSQL database access.
- **Exact Responsibility:**
  1. Review table definitions for `public.property_owners` and `public.property_owners_audit`.
  2. Confirm the central user identity schema with the Login team (`public.users(id)`). If confirmed, add `FOREIGN KEY (owner_id) REFERENCES public.users(id)`.
  3. Validate the parent row locking trigger function `validate_property_ownership_total()` (`FOR NO KEY UPDATE`) to ensure cumulative percentage caps (<= 100.00%).
  4. Verify the composite unique constraint `uq_properties_id_company UNIQUE (id, company_id)` on `public.properties`.
  5. Execute the migration in a staging database and run rollback script to verify reversibility.
  6. Apply migration to production Supabase during an authorized release window.
- **Expected Output:** Deployed, indexed, and trigger-protected ownership tables in Supabase.
- **Completion Criteria:**
  - [ ] Migration executes cleanly without syntax or lock timeout errors.
  - [ ] Indexes `idx_property_owners_owner_id`, `idx_property_owners_property_id`, and `idx_property_owners_company_id` are built.
  - [ ] Concurrent insertion test confirms over-allocation (> 100%) raises an exception.
  - [ ] Audit trigger records historical changes in `property_owners_audit`.

---

## Checklist F: Frontend Integration Developer

- **Primary Scope:** Application routing, role-based dashboard switching, and session token propagation in the UI.
- **Required Files:**
  - `client/src/App.jsx`
  - `client/src/services/ownerService.js`
  - `client/src/components/owner/OwnerDashboard.jsx`
- **Dependencies:** Login UI and authentication state management.
- **Exact Responsibility:**
  1. Introduce top-level role routing in `client/src/App.jsx` (or an `AppRouter` component).
  2. If the authenticated user has `role === 'owner'`, mount `<OwnerDashboard onLogout={handleLogout} />`.
  3. If the authenticated user has `role === 'manager'`, mount the existing Property Manager workspace.
  4. On successful owner login, invoke:
     ```javascript
     import { setAuthToken, setDevelopmentPreview } from './services/ownerService';
     setDevelopmentPreview(false);
     setAuthToken(sessionToken);
     ```
  5. On user logout, invoke `ownerService.clearAuthToken()`.
  6. Verify responsive layout on mobile, tablet, and desktop viewports.
- **Expected Output:** Seamless user experience where logging in as an Owner displays the Owner Dashboard, and logging in as a Manager displays the Manager workspace.
- **Completion Criteria:**
  - [ ] Owner login immediately lands on `OwnerDashboard`.
  - [ ] Switching sections (Overview, Properties, Tenants, etc.) loads data without console errors.
  - [ ] Logout flushes token from memory and returns to the login screen.
  - [ ] Preview mode is automatically disabled in production builds.
  - [ ] `npm.cmd run lint` and `npm.cmd run build` pass without warnings.

