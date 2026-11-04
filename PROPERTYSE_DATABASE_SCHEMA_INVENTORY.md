# PropertySE — Database Schema Inventory & Analysis

**Document Version:** 1.0.0  
**Audit Date:** 2026-11-04  
**Auditor:** Senior Software Integration Architect & Database Auditor  
**Scope:** Supabase PostgreSQL Schema Definitions, Migrations & Entity Relationship Analysis  
**Migration Files Inspected:**
1. `supabase/migrations/202610270001_propertyse_tenants_maintenance.sql`
2. `supabase/migrations/202611030001_create_property_owners.sql`

---

## 1. Executive Summary

This inventory details all database tables, columns, data types, constraints, default values, triggers, and foreign key relationships present across the PropertySE migration scripts.

The current database architecture reflects an evolving multi-tenant schema with partial operational coverage:
- **Implemented in Baseline Migrations:** Properties (`public.properties`), Maintenance Tickets (`public.maintenance_tickets`), and Companies (`public.companies`).
- **Drafted in Owner Migrations:** Property Ownership Mapping (`public.property_owners`) and Ownership Audit History (`public.property_owners_audit`).
- **Completely Missing from SQL Migrations:** Users (`public.users`), Standalone Tenants (`public.tenants`), Maintenance Workers (`public.workers`), and Payments / Ledger (`public.payments`).

---

## 2. Table-by-Table Schema Inventory

### 2.1 Table: `public.properties`
Primary entity storing property inventory, physical specs, occupancy status, and embedded tenant information.

| Column Name | Data Type | Nullable | Default Value | Constraints & Keys | Business Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key | Unique property identifier. |
| `company_id` | `TEXT` | No | None | Part of composite UK & FK | Multi-tenant company workspace (e.g. `COMP_001`, `COMP_002`). |
| `property_name` | `TEXT` | No | None | None | Name of building or complex (e.g. "Al Noor Tower"). |
| `building_number` | `TEXT` | Yes | `''` | None | Building block or wing identifier. |
| `unit_number` | `TEXT` | No | None | Part of unique index | Flat/Unit number (e.g. "Flat 101"). Standard unit numbers 1–20. |
| `annual_rent` | `NUMERIC` | No | `120000` | CHECK (`annual_rent >= 0`) | Expected annual rent in INR. |
| `status` | `TEXT` | No | `'Vacant'` | CHECK (`status IN ('Vacant', 'Occupied', 'Maintenance')`) | Current operational occupancy status. |
| `estimated_repair_cost`| `NUMERIC` | No | `0` | None | Estimated cost to prepare flat for tenant. |
| `tenant_ready` | `BOOLEAN` | No | `false` | None | Readiness flag for occupancy. |
| `estimated_days_to_rent`| `INTEGER` | No | `30` | None | Projected turnaround time to lease. |
| `vacant_since` | `TIMESTAMPTZ`| Yes | None | None | Timestamp when flat transitioned to Vacant. |
| `tenant_full_name` | `TEXT` | No | `''` | None | **Embedded Tenant:** Full name of resident. |
| `tenant_phone` | `TEXT` | No | `''` | None | **Embedded Tenant:** Phone contact number. |
| `tenant_email` | `TEXT` | No | `''` | None | **Embedded Tenant:** Email address. |
| `lease_start_date` | `DATE` | Yes | None | None | **Embedded Tenant:** Start date of active lease. |
| `lease_end_date` | `DATE` | Yes | None | None | **Embedded Tenant:** End date of active lease. |
| `created_at` | `TIMESTAMPTZ`| No | `now()` | None | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ`| No | `now()` | None | Record modification timestamp. |

#### Constraints & Indexes on `public.properties`:
1. `PRIMARY KEY (id)`
2. `CREATE INDEX IF NOT EXISTS properties_company_unit_number_idx ON public.properties (company_id, unit_number)`
3. `CREATE UNIQUE INDEX IF NOT EXISTS properties_company_unit_number_uidx ON public.properties (company_id, unit_number)` (Conditional unique index per company)
4. `CONSTRAINT uq_properties_id_company UNIQUE (id, company_id)` (Added by `202611030001_create_property_owners.sql` to support composite foreign keys)

---

### 2.2 Table: `public.maintenance_tickets`
Entity storing maintenance service requests and repair work orders.

| Column Name | Data Type | Nullable | Default Value | Constraints & Keys | Business Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key | Unique ticket identifier. |
| `company_id` | `TEXT` | No | None | CHECK (`company_id IN ('COMP_001', 'COMP_002')`) | Multi-tenant company workspace boundary. |
| `property_id` | `UUID` | No | None | `FOREIGN KEY REFERENCES public.properties(id) ON DELETE CASCADE` | Target property unit requiring maintenance. |
| `unit_number` | `TEXT` | No | None | None | Unit number snapshot for display. |
| `tenant_name` | `TEXT` | No | None | None | Name of tenant requesting repair. |
| `category` | `TEXT` | No | None | CHECK (`category IN ('Plumbing', 'Electrical', 'Air Conditioning', 'Appliance', 'Cleaning', 'Structural', 'Other')`) | Trade category of the repair. |
| `description` | `TEXT` | No | None | CHECK (`char_length(trim(description)) BETWEEN 1 AND 2000`) | Issue description provided by tenant/manager. |
| `priority` | `TEXT` | No | `'Medium'` | CHECK (`priority IN ('Low', 'Medium', 'High', 'Urgent')`) | Urgency level. |
| `status` | `TEXT` | No | `'Open'` | CHECK (`status IN ('Open', 'In Progress', 'Resolved')`) | Workflow progress state. |
| `created_at` | `TIMESTAMPTZ`| No | `now()` | None | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ`| No | `now()` | None | Last update timestamp. |

#### Constraints & Indexes on `public.maintenance_tickets`:
1. `PRIMARY KEY (id)`
2. `FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE`
3. `CREATE INDEX IF NOT EXISTS maintenance_tickets_company_created_idx ON public.maintenance_tickets (company_id, created_at DESC)`
4. `CREATE INDEX IF NOT EXISTS maintenance_tickets_property_status_idx ON public.maintenance_tickets (property_id, status)`

---

### 2.3 Table: `public.companies`
Stores registered company workspaces managing property portfolios.

| Column Name | Data Type | Nullable | Default Value | Constraints & Keys | Business Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | No | None | Primary Key | Identifier string (e.g. `COMP_001`, pattern `^[A-Za-z0-9_-]{2,64}$`). |
| `name` | `TEXT` | No | None | Max length 120 | Display name of the property management company. |

*Note: In `server/routes/propertyRoutes.js`, each company is limited to a maximum of 20 units.*

---

### 2.4 Table: `public.property_owners` (Draft Migration: `202611030001`)
Mapping entity linking properties to individual owners, tracking equity percentage and banking coordinates.

| Column Name | Data Type | Nullable | Default Value | Constraints & Keys | Business Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key | Unique ownership assignment ID. |
| `company_id` | `TEXT` | No | None | Part of composite FK | Company workspace boundary. |
| `property_id` | `UUID` | No | None | Part of composite FK | Parent property unit being owned. |
| `owner_id` | `TEXT` | No | None | Part of unique constraint | Central user ID of the property owner. |
| `ownership_percentage`| `NUMERIC(5,2)`| No | `100.00` | CHECK (`> 0.00 AND <= 100.00`) | Fractional equity share (e.g. 50.00%). |
| `is_primary_contact` | `BOOLEAN` | No | `true` | None | Primary contact flag for leasing notices. |
| `payout_account` | `JSONB` | Yes | `NULL` | None | Sanitized banking coordinates. |
| `created_by` | `TEXT` | No | None | None | Server-derived actor who assigned ownership. |
| `updated_by` | `TEXT` | No | None | None | Server-derived actor who updated assignment. |
| `created_at` | `TIMESTAMPTZ`| No | `timezone('utc', now())`| None | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ`| No | `timezone('utc', now())`| None | Last update timestamp. |

#### Constraints & Triggers on `public.property_owners`:
1. `PRIMARY KEY (id)`
2. `CONSTRAINT uq_property_owner UNIQUE (owner_id, property_id)`
3. `CONSTRAINT fk_property_owners_property_company FOREIGN KEY (property_id, company_id) REFERENCES public.properties (id, company_id) ON DELETE CASCADE`
4. `CREATE TRIGGER trg_validate_property_ownership BEFORE INSERT OR UPDATE ON public.property_owners FOR EACH ROW EXECUTE FUNCTION public.validate_property_ownership_total()`  
   *(Locks parent row via `FOR NO KEY UPDATE` and enforces cumulative ownership cap <= 100.00%)*
5. `CREATE TRIGGER trg_log_property_ownership_audit AFTER INSERT OR UPDATE OR DELETE ON public.property_owners FOR EACH ROW EXECUTE FUNCTION public.log_property_ownership_audit()`

---

### 2.5 Table: `public.property_owners_audit` (Draft Migration: `202611030001`)
Append-only historical audit trail tracking changes to ownership allocations.

| Column Name | Data Type | Nullable | Default Value | Constraints & Keys | Business Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `audit_id` | `UUID` | No | `gen_random_uuid()` | Primary Key | Unique audit log entry ID. |
| `assignment_id` | `UUID` | No | None | None | Target `property_owners.id`. |
| `property_id` | `UUID` | No | None | Indexed | Property being altered. |
| `owner_id` | `TEXT` | No | None | Indexed | Owner whose allocation changed. |
| `company_id` | `TEXT` | No | None | None | Workspace boundary. |
| `action` | `TEXT` | No | None | CHECK (`IN ('INSERT', 'UPDATE', 'DELETE')`) | Mutation operation. |
| `old_percentage` | `NUMERIC(5,2)`| Yes | None | None | Previous ownership share. |
| `new_percentage` | `NUMERIC(5,2)`| Yes | None | None | Updated ownership share. |
| `changed_by` | `TEXT` | No | None | None | Server-derived actor responsible. |
| `changed_at` | `TIMESTAMPTZ`| No | `timezone('utc', now())`| None | Audit timestamp. |

---

## 3. Critical Missing Database Entities

To integrate the Manager, Owner, Tenant, and Worker dashboards with a unified database, the following tables must be designed and migrated:

### 3.1 Entity: `public.users` (Missing)
- **Problem:** PropertySE currently has no database table storing user credentials, password hashes, email addresses, or role assignments.
- **Required Columns:**
  ```sql
  CREATE TABLE public.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('manager', 'owner', 'tenant', 'worker', 'admin')),
      company_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```

### 3.2 Entity: `public.tenants` (Missing as Standalone Entity)
- **Problem:** Tenant information is currently embedded directly in columns on `public.properties`. This design prevents a tenant from having their own user account, multiple historical leases, or accessing a tenant portal.
- **Required Architecture:** Normalize into a standalone `public.tenants` table or `public.leases` table linking `user_id` to `property_id`.

### 3.3 Entity: `public.workers` (Missing)
- **Problem:** No table exists to register maintenance technicians, their contact numbers, trade specialties, or availability.
- **Required Columns:** `id`, `user_id`, `company_id`, `specialties` (text array: Plumbing, Electrical, etc.), `phone`, `status`.
- **Foreign Key on Tickets:** `public.maintenance_tickets` requires `assigned_worker_id UUID REFERENCES public.workers(id)`.

### 3.4 Entity: `public.payments` (Missing)
- **Problem:** No ledger exists to record tenant rent payments or owner rental disbursements.
- **Required Columns:** `id`, `company_id`, `property_id`, `payer_id`, `recipient_id`, `amount`, `payment_type` ('RENT_COLLECTION', 'OWNER_DISBURSEMENT'), `status` ('PENDING', 'COMPLETED', 'FAILED'), `transaction_reference`, `created_at`.

---

## 4. Entity-Relationship Integrity Matrix

| Parent Table | Child Table | Relationship Type | Foreign Key Constraint | Delete Action | Current Migration Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `properties` | `maintenance_tickets` | 1-to-Many | `property_id -> properties.id` | `CASCADE` | Implemented in baseline |
| `properties` | `property_owners` | 1-to-Many | `(property_id, company_id) -> properties.(id, company_id)` | `CASCADE` | Drafted in `202611030001` |
| `property_owners` | `property_owners_audit` | 1-to-Many | None (audit log preserves historical snapshot) | N/A | Drafted in `202611030001` |
| `companies` | `properties` | 1-to-Many | Implicit text match on `company_id` | None (Enforced in Express) | Implemented in baseline |
| `users` | `property_owners` | 1-to-Many | `owner_id -> users.id` | `CASCADE` | **MISSING** (users table absent) |
| `users` | `maintenance_tickets` | 1-to-Many | `assigned_worker_id -> users.id` | `SET NULL` | **MISSING** (worker link absent) |

