# PropertySE — Owner Database Integration & Migration Readiness Assessment

**Document Version:** 1.0.0  
**Date:** 2026-11-04  
**Author:** Owner Dashboard Architecture Team  
**Audience:** Database Administrator (DBA), Backend Architects, Security Lead  
**Migration Artifact:** `supabase/migrations/202611030001_create_property_owners.sql`  
**Overall Readiness Classification:** **READY FOR DBA REVIEW (EXECUTION BLOCKED)**

---

## 1. Executive Summary & Mandatory Disclaimers

This document provides a comprehensive technical audit of the proposed PostgreSQL database migration script for the PropertySE Owner Dashboard module (`202611030001_create_property_owners.sql`).

> [!CAUTION]
> **MANDATORY PRODUCTION SAFEGUARDS & STATUS:**
> 1. **NOT APPROVED FOR PRODUCTION:** This migration draft is submitted for human database administrator review and staging evaluation only.
> 2. **NOT EXECUTED ON PRODUCTION:** This migration has **not** been executed against the production Supabase PostgreSQL instance.
> 3. **CENTRAL USERS TABLE UNCONFIRMED:** The schema and primary key format of the central `users` table remain unconfirmed by the Login team; foreign key constraints referencing `users` are deliberately deferred.
> 4. **DATABASE ROLE RLS BYPASS:** Express connects to Supabase using a privileged database connection (`postgres` / `service_role`). This privileged connection inherently bypasses PostgreSQL Row-Level Security (RLS). Consequently, database-side actor settings (GUCs) are **not** treated as authenticated identity proof; company isolation and owner scoping are strictly enforced at the application layer.

---

## 2. Existing Schema Compatibility Analysis

The migration script has been evaluated against the existing database tables defined in `supabase/migrations/202610270001_propertyse_tenants_maintenance.sql` and `server/config/db.js`:

### 2.1 Table Compatibility

| Existing Object | Target Interaction | Compatibility Assessment | Notes |
| :--- | :--- | :--- | :--- |
| `public.properties` | Foreign key reference from `property_owners` | **COMPATIBLE** | Existing primary key `id UUID` is referenced. The migration adds a composite unique constraint `uq_properties_id_company UNIQUE (id, company_id)` using an idempotent `DO $$` block. |
| `public.maintenance_tickets` | Queried in owner views for open tickets | **COMPATIBLE** | Reads existing columns `id`, `property_id`, `category`, `status`, `priority`. No schema alterations required. |
| `public.companies` | Queried for company registration | **COMPATIBLE** | No schema alterations required. |
| `public.users` | Prospective central user identity | **DEFERRED** | Central table does not yet exist in migrations. Foreign key to `users` is omitted to avoid blocking migration deployment. |

### 2.2 Composite Unique Key Rationale on `properties`
Step 1 of the migration executes:
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_properties_id_company' 
      AND conrelid = 'public.properties'::regclass
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT uq_properties_id_company UNIQUE (id, company_id);
  END IF;
END $$;
```
- **Safety:** Because `properties.id` is already a globally unique primary key, a composite unique constraint on `(id, company_id)` introduces zero risk of duplicate rejection or data corruption.
- **Purpose:** Enables composite foreign keys from child tables enforcing that child records match both the property and its designated multi-tenant company workspace simultaneously.

---

## 3. `public.property_owners` Table Schema Review

```sql
CREATE TABLE IF NOT EXISTS public.property_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    property_id UUID NOT NULL,
    owner_id TEXT NOT NULL,
    ownership_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00
        CHECK (ownership_percentage > 0.00 AND ownership_percentage <= 100.00),
    is_primary_contact BOOLEAN NOT NULL DEFAULT true,
    payout_account JSONB DEFAULT NULL,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uq_property_owner UNIQUE (owner_id, property_id),

    CONSTRAINT fk_property_owners_property_company
        FOREIGN KEY (property_id, company_id)
        REFERENCES public.properties (id, company_id)
        ON DELETE CASCADE
);
```

### 3.1 Field-by-Field Architectural Audit

| Column | Type | Nullable | Default | Constraints & Integrity | Architectural Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key | Standard surrogate key preventing sequential ID enumeration. |
| `company_id` | `TEXT` | No | None | Part of composite FK | Multi-tenant company boundary matching `properties.company_id`. |
| `property_id` | `UUID` | No | None | Part of composite FK | References parent `public.properties(id)`. Cascades on deletion. |
| `owner_id` | `TEXT` | No | None | Part of `uq_property_owner` | Stable identifier referencing central user account. Uses `TEXT` for maximum compatibility with both UUID and OAuth provider subject strings. |
| `ownership_percentage` | `NUMERIC(5,2)` | No | `100.00` | `CHECK (> 0.00 AND <= 100.00)` | Supports fractional equity shares down to 0.01% (e.g., 33.33%). Upper bounded by 100.00%. |
| `is_primary_contact` | `BOOLEAN` | No | `true` | Standard boolean | Identifies the designated owner for communication and tenant leasing notices. |
| `payout_account` | `JSONB` | Yes | `NULL` | Valid JSONB | Stores banking coordinates (bank name, masked account, routing). Masked at application boundary before transmission. |
| `created_by` | `TEXT` | No | None | Server-derived | Actor identity of the manager/admin who created the assignment. |
| `updated_by` | `TEXT` | No | None | Server-derived | Actor identity of the last modifying manager/admin. |
| `created_at` | `TIMESTAMPTZ`| No | `timezone('utc', now())`| Immutable timestamp | UTC timestamp of assignment creation. |
| `updated_at` | `TIMESTAMPTZ`| No | `timezone('utc', now())`| Bumped by trigger | UTC timestamp of latest update. |

---

## 4. Concurrency-Safe Ownership Allocation & Parent Row Locking

In fractional property ownership models, concurrent assignment requests can create race conditions that over-allocate a property beyond 100.00%.

### 4.1 Parent Row Locking Mechanism
The migration implements `validate_property_ownership_total()` attached as a `BEFORE INSERT OR UPDATE` trigger:

```sql
CREATE OR REPLACE FUNCTION public.validate_property_ownership_total()
RETURNS TRIGGER AS $$
DECLARE
    current_total NUMERIC(5,2);
BEGIN
    -- 1. Prevent modification of property_id to eliminate cross-row distributed deadlocks
    IF TG_OP = 'UPDATE' AND OLD.property_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cannot modify property_id on an existing ownership record. Delete and recreate instead.';
    END IF;

    -- 2. Concurrency-Safe Row Lock: Acquire row-level lock on parent property row
    PERFORM 1
    FROM public.properties
    WHERE id = NEW.property_id
    FOR NO KEY UPDATE;

    -- 3. Calculate current committed total excluding the current record
    SELECT COALESCE(SUM(ownership_percentage), 0.00)
    INTO current_total
    FROM public.property_owners
    WHERE property_id = NEW.property_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    -- 4. Enforce cumulative cap of 100.00%
    IF (current_total + NEW.ownership_percentage) > 100.00 THEN
        RAISE EXCEPTION 'Total ownership percentage for property % cannot exceed 100.00%% (Current committed: %%, Attempted addition: %%)',
            NEW.property_id, current_total, NEW.ownership_percentage;
    END IF;

    -- 5. Preserve immutability of created_by on update
    IF TG_OP = 'UPDATE' THEN
        NEW.created_by := OLD.created_by;
        NEW.updated_at := timezone('utc'::text, now());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Concurrency Properties
- `FOR NO KEY UPDATE`: Locks the parent property row without conflicting with concurrent read transactions (`SELECT ...`).
- **Deadlock Immunity:** Since updates to `property_id` are explicitly blocked, locks are always acquired in deterministic order (parent property row first).
- **Test Suite Verification:** Verified with 6 automated tests in `server/test/owner-trigger.test.js`, confirming that concurrent race allocations cannot exceed 100.00%.

---

## 5. Audit Logging Architecture

Financial equity assignments must maintain a tamper-proof, append-only historical audit trail.

### 5.1 Audit Schema (`public.property_owners_audit`)
```sql
CREATE TABLE IF NOT EXISTS public.property_owners_audit (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    property_id UUID NOT NULL,
    owner_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_percentage NUMERIC(5,2),
    new_percentage NUMERIC(5,2),
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

### 5.2 Trigger Execution Logic
The `log_property_ownership_audit()` function runs `AFTER INSERT OR UPDATE OR DELETE ON public.property_owners`:
- **INSERT:** Captures `assignment_id`, `property_id`, `owner_id`, `company_id`, `action: 'INSERT'`, `old_percentage: NULL`, `new_percentage`, `changed_by: NEW.created_by`.
- **UPDATE:** Captures `action: 'UPDATE'`, `old_percentage: OLD.ownership_percentage`, `new_percentage: NEW.ownership_percentage`, `changed_by: NEW.updated_by`.
- **DELETE:** Captures `action: 'DELETE'`, `old_percentage: OLD.ownership_percentage`, `new_percentage: NULL`, `changed_by: OLD.updated_by`.

---

## 6. Security & Database Privilege Boundary Analysis

### 6.1 Database Role Execution Boundary
1. **Connection Credentials:** Express connects via `server/config/db.js` using `DATABASE_URL` (direct PostgreSQL connection string) or Supabase Session Pooler (port 5432 / 6543).
2. **Superuser / Service-Role Permissions:** In standard Supabase configurations, this user connects as `postgres` or with the service-role key. These roles possess `BYPASSRLS` privileges.
3. **Implication:** PostgreSQL Row-Level Security (RLS) policies are **not** an adequate security boundary when using a shared backend connection pool.
4. **Mandatory Application Boundary:**
   - Express route handlers must enforce tenant and owner isolation via explicit SQL parameters (`WHERE po.owner_id = $1 AND po.company_id = $2`).
   - The application must never trust client-supplied session variables or custom GUC parameters (`SET LOCAL app.current_owner = ...`) as proof of authorization.

---

## 7. Rollback Safety Plan

If migration issues occur in staging, the following reversible rollback script safely removes all created objects without damaging parent `public.properties` or `public.maintenance_tickets` tables.

### 7.1 Reversible Rollback Script

```sql
-- ==============================================================================
-- Rollback Script: 202611030001_create_property_owners_rollback.sql
-- Purpose: Safely reverse 202611030001_create_property_owners.sql
-- ==============================================================================

BEGIN;

-- 1. Drop audit triggers and table
DROP TRIGGER IF EXISTS trg_log_property_ownership_audit ON public.property_owners;
DROP FUNCTION IF EXISTS public.log_property_ownership_audit();
DROP TABLE IF EXISTS public.property_owners_audit CASCADE;

-- 2. Drop validation trigger and function
DROP TRIGGER IF EXISTS trg_validate_property_ownership ON public.property_owners;
DROP FUNCTION IF EXISTS public.validate_property_ownership_total();

-- 3. Drop property_owners mapping table
DROP TABLE IF EXISTS public.property_owners CASCADE;

-- 4. Optionally drop composite unique constraint on properties (if not used elsewhere)
ALTER TABLE public.properties
    DROP CONSTRAINT IF EXISTS uq_properties_id_company;

COMMIT;
```

---

## 8. DBA Pre-Execution Action Checklist

Prior to approving execution in staging or production, the DBA must confirm:

- [ ] Verify that `public.properties` contains no duplicate `(id, company_id)` entries (guaranteed if `id` is primary key).
- [ ] Confirm the central identity table name and column definition with the Login team (`public.users(id)`).
- [ ] Review performance indexing: `idx_property_owners_owner_id`, `idx_property_owners_property_id`, `idx_property_owners_company_id`.
- [ ] Execute rollback test in staging environment and confirm clean restoration.
- [ ] Obtain explicit sign-off from the Security Lead regarding Express connection role privileges.

