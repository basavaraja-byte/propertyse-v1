-- PropertySE tenant, fixed inventory, and maintenance-ticket support.
-- Run this in Supabase SQL Editor before starting the updated API.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS tenant_full_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tenant_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tenant_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lease_start_date date,
  ADD COLUMN IF NOT EXISTS lease_end_date date;

ALTER TABLE public.properties
  ALTER COLUMN annual_rent SET DEFAULT 120000,
  ALTER COLUMN status SET DEFAULT 'Vacant';

CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL CHECK (company_id IN ('COMP_001', 'COMP_002')),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  tenant_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Plumbing', 'Electrical', 'Air Conditioning', 'Appliance', 'Cleaning', 'Structural', 'Other')),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 2000),
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_tickets_company_created_idx
  ON public.maintenance_tickets (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS maintenance_tickets_property_status_idx
  ON public.maintenance_tickets (property_id, status);
CREATE INDEX IF NOT EXISTS properties_company_unit_number_idx
  ON public.properties (company_id, unit_number);

-- Enforce one standard unit number per company when the existing data allows it.
-- Do not make this migration fail or delete data if older records already conflict.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.properties
    GROUP BY company_id, unit_number
    HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS properties_company_unit_number_uidx
      ON public.properties (company_id, unit_number);
  ELSE
    RAISE NOTICE 'Skipped unique company/unit index because duplicate unit numbers already exist. Review duplicates and add the unique index after resolving them.';
  END IF;
END $$;

-- This project currently uses a server-side Supabase service-role key.
-- Keep that key only in server/.env and never expose it in VITE_ variables.
-- If you later expose Supabase directly to the browser, configure RLS policies first.
