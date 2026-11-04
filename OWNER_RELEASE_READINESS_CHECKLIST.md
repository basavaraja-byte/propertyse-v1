# PropertySE — Owner Module Release Readiness Checklist

**Document Version:** 1.0.0-rc1  
**Date:** 2026-11-04  
**Author:** Senior Software Release Engineer & QA Lead  
**Target Module:** PropertySE Owner Dashboard  
**Status Legend:**
- `[x] COMPLETED`: Verified and passed on `feature-owner`.
- `[ ] PENDING`: External prerequisite or future integration step required before production release.

---

## 1. Source-Code Quality & Component Architecture

- [x] **COMPLETED:** All ten dashboard views (`Overview`, `Properties`, `PropertyDetails`, `Tenants`, `RentalIncome`, `Payments`, `Maintenance`, `Reports`, `Notifications`, `Settings`) are implemented and decoupled.
- [x] **COMPLETED:** All views consume data exclusively through `client/src/services/ownerService.js` and adhere to normalized props (`data`, `loading`, `error`, `onRetry`).
- [x] **COMPLETED:** In-memory caching (`sectionCacheRef`) and stale response cancellation (`activeRequestIdRef`) are implemented in `OwnerDashboard.jsx`.
- [x] **COMPLETED:** React 19 hook ordering rules verified across all components (e.g. `useMemo` hoists in `OwnerTenants.jsx`).
- [x] **COMPLETED:** Frontend code passes ESLint with **0 errors and 0 warnings** (`npm.cmd run lint`).
- [x] **COMPLETED:** Frontend builds cleanly with Vite in production mode with zero bundle warnings (`npm.cmd run build`).

---

## 2. Authentication Protocol

- [x] **COMPLETED:** Central Bearer JWT authentication contract documented in `OWNER_LOGIN_INTEGRATION_CONTRACT.md`.
- [x] **COMPLETED:** `ownerService.js` implements memory-closure token management (`setAuthToken`, `getAuthToken`, `clearAuthToken`).
- [x] **COMPLETED:** No unencrypted session tokens stored in `localStorage` or `window`.
- [ ] **PENDING:** Login team creates and verifies `server/middleware/auth.js` (`authenticateUser`).
- [ ] **PENDING:** Login team mounts public `/api/auth` endpoints and verifies JWT issuance with claims `{ id, email, role, company_id, name }`.
- [ ] **PENDING:** Login UI invokes `ownerService.setAuthToken(token)` upon successful owner authentication.

---

## 3. Authorization & Role-Based Access Control (RBAC)

- [x] **COMPLETED:** `requireOwnerAuth` guard in `ownerRoutes.js` verifies `req.user.role === 'owner'`, rejecting non-owner roles with `403 Forbidden`.
- [x] **COMPLETED:** `requireManagementAuth` guard on `POST /api/owner/assignments` verifies `req.user.role in ['manager', 'admin']`.
- [x] **COMPLETED:** Every owner query extracts identity strictly from `req.user.id` on the server; no client-supplied owner IDs are trusted.
- [x] **COMPLETED:** Company isolation verified: management assignments validate that manager's `company_id` matches property `company_id`.
- [ ] **PENDING:** End-to-end verification of role guards using live JWTs issued by the Login service.

---

## 4. Database Staging & Migration Readiness

- [x] **COMPLETED:** Migration script `supabase/migrations/202611030001_create_property_owners.sql` drafted and reviewed.
- [x] **COMPLETED:** Composite unique constraint `uq_properties_id_company UNIQUE (id, company_id)` added idempotently.
- [x] **COMPLETED:** Concurrency-safe parent row locking trigger function `validate_property_ownership_total()` (`FOR NO KEY UPDATE`) verified with 6 unit tests.
- [x] **COMPLETED:** Cumulative ownership cap (<= 100.00%) enforced; `property_id` mutation on existing records blocked.
- [x] **COMPLETED:** Append-only audit history table `public.property_owners_audit` and trigger `trg_log_property_ownership_audit` verified.
- [x] **COMPLETED:** Reversible rollback script documented and verified in `OWNER_DATABASE_INTEGRATION_READINESS.md`.
- [ ] **PENDING:** DBA confirms central `public.users` table schema and enables foreign key referencing `users(id)`.
- [ ] **PENDING:** DBA executes migration and tests rollback in a dedicated Supabase staging environment.
- [ ] **PENDING:** DBA applies migration to production Supabase during an authorized release window.

---

## 5. API Integration & Server Route Mounting

- [x] **COMPLETED:** All 10 owner endpoints and management assignment endpoint implemented in `server/routes/ownerRoutes.js`.
- [x] **COMPLETED:** Owner routes remain safely **unmounted** in `server/server.js` while central auth is pending.
- [x] **COMPLETED:** Central error handler formats database exceptions via `db.formatDbError()` without leaking passwords or stack traces.
- [ ] **PENDING:** Backend integrator merges `server/middleware/auth.js` into `main`.
- [ ] **PENDING:** Backend integrator mounts `app.use("/api/owner", authenticateUser, ownerRoutes);` in `server/server.js`.
- [ ] **PENDING:** Live API integration verified with `curl` or automated HTTP test suite.

---

## 6. Frontend Role Routing & Main App Integration

- [x] **COMPLETED:** Full integration simulation and App.jsx role routing designed in `OWNER_STEP_7_INTEGRATION_SIMULATION.md`.
- [x] **COMPLETED:** All styles in `owner.css` strictly namespaced under `.owner-*` to prevent CSS bleed.
- [x] **COMPLETED:** Shared `client/src/App.jsx` kept 100% unmodified on `feature-owner` to avoid pre-merge conflicts.
- [ ] **PENDING:** Frontend integrator updates `client/src/App.jsx` to mount `<OwnerDashboard />` when `currentUser.role === 'owner'`.
- [ ] **PENDING:** Verify that manager accounts logging in continue to see the Manager workspace without regressions.

---

## 7. Financial Data Integrity & Honesty

- [x] **COMPLETED:** Annual rent / 12 is explicitly labeled as `Estimated Monthly Potential` or `Monthly Potential`.
- [x] **COMPLETED:** Application never labels estimated potential rent as actual collected revenue.
- [x] **COMPLETED:** `OwnerPayments.jsx` displays `0 Transactions` and an honest empty state; zero fake payout records rendered.
- [x] **COMPLETED:** Zero fictional wire transfers or mock payment reference numbers are output.
- [ ] **PENDING:** Billing team integrates automated disbursement ledger tables and connects live payout records.

---

## 8. Payout-Account Security & Data Sanitization

- [x] **COMPLETED:** `maskPayoutAccount(raw)` in `server/routes/ownerRoutes.js` sanitizes account numbers (`•••• •••• •••• 4892`) and routing codes (`HDFC•••••••`).
- [x] **COMPLETED:** Deeply parses plain strings, JSON strings, and nested objects (`details.accountNumber`).
- [x] **COMPLETED:** Handles null, undefined, empty, and malformed inputs gracefully without throwing uncaught exceptions.
- [x] **COMPLETED:** Zero raw banking account numbers or routing credentials are printed in server console logs.
- [x] **COMPLETED:** Accurately documented as **data masking / sanitization** and never falsely described as cryptographic encryption.
- [x] **COMPLETED:** 9 dedicated unit and security tests pass in `server/test/owner-routes.test.js`.

---

## 9. Automated & Regression Testing

- [x] **COMPLETED:** Frontend ESLint passes: **0 errors, 0 warnings** (`npm.cmd run lint`).
- [x] **COMPLETED:** Frontend production build passes: Vite built in **352ms** (`npm.cmd run build`).
- [x] **COMPLETED:** Owner route unit tests pass: **15 / 15 passed** (`node --test test/owner-routes.test.js`).
- [x] **COMPLETED:** Trigger concurrency tests pass: **6 / 6 passed** (`node --test test/owner-trigger.test.js`).
- [x] **COMPLETED:** Full backend regression test suite passes: **47 / 47 passed** across 7 suites (`npm.cmd test`).
- [ ] **PENDING:** End-to-end browser testing with live authenticated owner login and real network calls.

---

## 10. Git Safety & Branch Hygiene

- [x] **COMPLETED:** Active branch confirmed as `feature-owner`.
- [x] **COMPLETED:** Base commit verified as `ecae518debb4f888546deafb3b4f5f5b4098e01d` (identical across all feature branches).
- [x] **COMPLETED:** Zero modifications to tracked repository files (`git status` clean base).
- [x] **COMPLETED:** Step 1, Step 5, Step 6B, and Step 8 external backups verified with 100% SHA-256 match.
- [x] **COMPLETED:** No premature branches switched, merged, rebased, staged, committed, or pushed.

---

## 11. Pull Request & Deployment Gate

- [ ] **PENDING:** Open controlled Pull Request from `feature-owner` to `main`.
- [ ] **PENDING:** Code review sign-off from Senior Full-Stack Architect and Security Lead.
- [ ] **PENDING:** Code review sign-off from Login Lead regarding middleware compatibility.
- [ ] **PENDING:** Database Administrator sign-off following staging migration execution.
- [ ] **PENDING:** Final release gate approval before production deployment.

