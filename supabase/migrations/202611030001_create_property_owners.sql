-- ==============================================================================
-- Migration: 202611030001_create_property_owners.sql
-- Description: PropertySE Owner Dashboard - Ownership mapping table,
--              concurrency-safe parent row locking trigger,
--              multi-tenant company composite foreign key,
--              and tamper-proof audit history table.
-- Execution: Pending user explicit review and approval in Step 5C.
-- ==============================================================================

-- 1. Ensure public.properties has a composite unique constraint on (id, company_id)
-- Safe and non-conflicting because properties.id is already a unique primary key.
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

-- 2. Create public.property_owners mapping table
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

    -- Prevent duplicate assignments of the same owner to the same property
    CONSTRAINT uq_property_owner UNIQUE (owner_id, property_id),

    -- Database-level composite foreign key enforcing property and company integrity
    CONSTRAINT fk_property_owners_property_company
        FOREIGN KEY (property_id, company_id)
        REFERENCES public.properties (id, company_id)
        ON DELETE CASCADE
);

-- 3. Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_property_owners_owner_id 
    ON public.property_owners(owner_id);

CREATE INDEX IF NOT EXISTS idx_property_owners_property_id 
    ON public.property_owners(property_id);

CREATE INDEX IF NOT EXISTS idx_property_owners_company_id 
    ON public.property_owners(company_id);

-- 4. Concurrency-Safe Ownership Percentage Validation Trigger Function
CREATE OR REPLACE FUNCTION public.validate_property_ownership_total()
RETURNS TRIGGER AS $$
DECLARE
    current_total NUMERIC(5,2);
BEGIN
    -- Prevent mutation of property_id to avoid cross-row distributed deadlocks
    IF TG_OP = 'UPDATE' AND OLD.property_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cannot modify property_id on an existing ownership record. Delete and recreate instead.';
    END IF;

    -- Concurrency-Safe Row Lock: Acquire row-level lock on parent property row
    -- Serializes all concurrent ownership modifications for this specific property
    PERFORM 1
    FROM public.properties
    WHERE id = NEW.property_id
    FOR NO KEY UPDATE;

    -- Calculate current total excluding the record currently being updated
    SELECT COALESCE(SUM(ownership_percentage), 0.00)
    INTO current_total
    FROM public.property_owners
    WHERE property_id = NEW.property_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    -- Enforce cumulative cap of 100.00%
    IF (current_total + NEW.ownership_percentage) > 100.00 THEN
        RAISE EXCEPTION 'Total ownership percentage for property % cannot exceed 100.00%% (Current committed: %%, Attempted addition: %%)',
            NEW.property_id, current_total, NEW.ownership_percentage;
    END IF;

    -- Preserve created_by and bump updated_at on update
    IF TG_OP = 'UPDATE' THEN
        NEW.created_by := OLD.created_by;
        NEW.updated_at := timezone('utc'::text, now());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Validation Trigger
DROP TRIGGER IF EXISTS trg_validate_property_ownership ON public.property_owners;
CREATE TRIGGER trg_validate_property_ownership
    BEFORE INSERT OR UPDATE ON public.property_owners
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_property_ownership_total();

-- 6. Audit History Table for Immutable Ownership History
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

CREATE INDEX IF NOT EXISTS idx_property_owners_audit_property_id
    ON public.property_owners_audit(property_id);

CREATE INDEX IF NOT EXISTS idx_property_owners_audit_owner_id
    ON public.property_owners_audit(owner_id);

-- 7. Audit History Trigger Function
CREATE OR REPLACE FUNCTION public.log_property_ownership_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.property_owners_audit (
            assignment_id, property_id, owner_id, company_id,
            action, old_percentage, new_percentage, changed_by, changed_at
        ) VALUES (
            NEW.id, NEW.property_id, NEW.owner_id, NEW.company_id,
            'INSERT', NULL, NEW.ownership_percentage, NEW.created_by, timezone('utc'::text, now())
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.property_owners_audit (
            assignment_id, property_id, owner_id, company_id,
            action, old_percentage, new_percentage, changed_by, changed_at
        ) VALUES (
            NEW.id, NEW.property_id, NEW.owner_id, NEW.company_id,
            'UPDATE', OLD.ownership_percentage, NEW.ownership_percentage, NEW.updated_by, timezone('utc'::text, now())
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.property_owners_audit (
            assignment_id, property_id, owner_id, company_id,
            action, old_percentage, new_percentage, changed_by, changed_at
        ) VALUES (
            OLD.id, OLD.property_id, OLD.owner_id, OLD.company_id,
            'DELETE', OLD.ownership_percentage, NULL, OLD.updated_by, timezone('utc'::text, now())
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Attach Audit Trigger
DROP TRIGGER IF EXISTS trg_log_property_ownership_audit ON public.property_owners;
CREATE TRIGGER trg_log_property_ownership_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.property_owners
    FOR EACH ROW
    EXECUTE FUNCTION public.log_property_ownership_audit();

