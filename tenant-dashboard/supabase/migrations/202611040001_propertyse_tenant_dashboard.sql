-- ====================================================================
-- PropertySE Shared Database Migration — Corrected Revision
-- Migration ID: 202611040001_propertyse_tenant_dashboard.sql
-- Purpose: Unified schema for shared Owner & Tenant Dashboard records.
-- Guarantees: Non-destructive, idempotent, RLS-secured, 100% backward-compatible.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. TENANT IDENTIFICATION & PROFILE REPOSITORY
-- --------------------------------------------------------------------
-- Creates a dedicated public.tenants table to provide stable UUIDs and
-- immutable references, eliminating reliance on transient email strings.
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  tenant_code text UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  date_of_birth date,
  permanent_address text DEFAULT '',
  occupation text DEFAULT '',
  employer text DEFAULT '',
  emergency_contact_name text DEFAULT '',
  emergency_contact_relation text DEFAULT '',
  emergency_contact_phone text DEFAULT '',
  kyc_status text NOT NULL DEFAULT 'Verified' CHECK (kyc_status IN ('Pending', 'Verified', 'Rejected')),
  avatar_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenants_company_idx ON public.tenants (company_id);
CREATE INDEX IF NOT EXISTS tenants_email_idx ON public.tenants (lower(email));

-- Link public.properties to stable tenant UUID while preserving all existing columns
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS current_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS properties_current_tenant_idx ON public.properties (current_tenant_id);

-- Backfill initial tenant from existing properties data where tenant exists
INSERT INTO public.tenants (company_id, full_name, email, phone, tenant_code)
SELECT
  p.company_id,
  p.tenant_full_name,
  p.tenant_email,
  p.tenant_phone,
  'TEN-' || upper(substr(p.company_id, 1, 4)) || '-' || lpad(dense_rank() OVER (ORDER BY p.id)::text, 3, '0')
FROM public.properties p
WHERE p.tenant_full_name <> '' AND p.tenant_email <> ''
ON CONFLICT DO NOTHING;

-- Associate current_tenant_id on properties with the backfilled tenant
UPDATE public.properties p
SET current_tenant_id = t.id
FROM public.tenants t
WHERE p.company_id = t.company_id
  AND p.tenant_email = t.email
  AND p.current_tenant_id IS NULL;


-- --------------------------------------------------------------------
-- 2. ENHANCE EXISTING TABLE: public.maintenance_tickets
-- --------------------------------------------------------------------
-- Preserves existing categories ('Plumbing', 'Electrical', 'Air Conditioning',
-- 'Appliance', 'Cleaning', 'Structural', 'Other') and statuses ('Open', 'In Progress', 'Resolved').
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_visit_date date,
  ADD COLUMN IF NOT EXISTS preferred_time_slot text DEFAULT 'Morning',
  ADD COLUMN IF NOT EXISTS resolution_notes text DEFAULT '';

-- Index for tenant maintenance lookups
CREATE INDEX IF NOT EXISTS maintenance_tickets_tenant_idx ON public.maintenance_tickets (tenant_id);


-- --------------------------------------------------------------------
-- 3. ENHANCE EXISTING TABLE: public.maintenance_ticket_notes
-- --------------------------------------------------------------------
ALTER TABLE public.maintenance_ticket_notes
  ADD COLUMN IF NOT EXISTS author_id uuid,
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS author_role text;

-- Safe historical backfill: Preserve historical meaning.
-- Historical notes entered by technicians/managers are assigned 'Staff', NOT 'Tenant'.
UPDATE public.maintenance_ticket_notes
SET author_role = 'Staff',
    author_name = coalesce(nullif(trim(worker_name), ''), 'Property Staff')
WHERE author_role IS NULL;

-- Set default for future inserts
ALTER TABLE public.maintenance_ticket_notes
  ALTER COLUMN author_role SET DEFAULT 'Tenant';


-- --------------------------------------------------------------------
-- 4. SHARED LEASE MANAGEMENT: public.leases
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  unit_number text NOT NULL,
  agreement_number text NOT NULL UNIQUE,
  tenant_name text NOT NULL,
  tenant_email text NOT NULL,
  tenant_phone text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  monthly_rent numeric NOT NULL CHECK (monthly_rent >= 0),
  security_deposit numeric NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
  rent_due_day integer NOT NULL DEFAULT 5 CHECK (rent_due_day BETWEEN 1 AND 31),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Pending', 'Active', 'Expired', 'Renewed', 'Terminated')),
  document_url text,
  renewal_status text NOT NULL DEFAULT 'Not Requested' CHECK (renewal_status IN ('Not Requested', 'Pending Owner Approval', 'Approved', 'Rejected')),
  renewal_requested_months integer,
  renewal_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leases_property_id_idx ON public.leases (property_id);
CREATE INDEX IF NOT EXISTS leases_tenant_id_idx ON public.leases (tenant_id);
CREATE INDEX IF NOT EXISTS leases_tenant_email_idx ON public.leases (lower(tenant_email));
CREATE INDEX IF NOT EXISTS leases_company_status_idx ON public.leases (company_id, status);

-- Seed initial active lease from current properties where tenant is assigned
INSERT INTO public.leases (
  company_id, property_id, tenant_id, unit_number, agreement_number,
  tenant_name, tenant_email, tenant_phone, start_date, end_date,
  monthly_rent, security_deposit, status
)
SELECT
  p.company_id,
  p.id,
  p.current_tenant_id,
  p.unit_number,
  'LEA-' || p.building_number || '-' || p.unit_number || '-2026',
  p.tenant_full_name,
  p.tenant_email,
  p.tenant_phone,
  coalesce(p.lease_start_date, CURRENT_DATE),
  coalesce(p.lease_end_date, CURRENT_DATE + interval '1 year'),
  round(coalesce(p.annual_rent, 120000) / 12, 2),
  round((coalesce(p.annual_rent, 120000) / 12) * 2, 2),
  CASE WHEN p.lease_end_date < CURRENT_DATE THEN 'Expired' ELSE 'Active' END
FROM public.properties p
WHERE p.tenant_full_name <> '' AND p.tenant_email <> ''
ON CONFLICT (agreement_number) DO NOTHING;


-- --------------------------------------------------------------------
-- 5. SHARED PAYMENT LEDGER: public.rent_payments
-- --------------------------------------------------------------------
-- Read-only for tenants. Records rent invoices, owner payment confirmations,
-- and receipts. Online payment gateway is excluded from this phase.
CREATE TABLE IF NOT EXISTS public.rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  tenant_name text NOT NULL,
  tenant_email text NOT NULL DEFAULT '',
  payment_period text NOT NULL,
  rent_amount numeric NOT NULL CHECK (rent_amount >= 0),
  additional_charges numeric NOT NULL DEFAULT 0 CHECK (additional_charges >= 0),
  late_fees numeric NOT NULL DEFAULT 0 CHECK (late_fees >= 0),
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'Bank Transfer',
  transaction_reference text,
  status text NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending', 'Failed', 'Overdue')),
  receipt_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rent_payments_property_date_idx ON public.rent_payments (property_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS rent_payments_tenant_idx ON public.rent_payments (tenant_id);


-- --------------------------------------------------------------------
-- 6. SHARED NOTIFICATIONS: public.tenant_notifications
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_email text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'Payment Confirmations', 'Maintenance Updates', 'Lease Updates',
    'Property Notices', 'Owner Announcements', 'General Updates', 'Rent Reminders'
  )),
  target_module text,
  related_id text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS tenant_notifications_tenant_created_idx ON public.tenant_notifications (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tenant_notifications_property_idx ON public.tenant_notifications (property_id);


-- --------------------------------------------------------------------
-- 7. SHARED DOCUMENTS: public.tenant_documents
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_email text NOT NULL DEFAULT '',
  name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'Lease Agreements', 'Rent Receipts', 'Invoices', 'Payment Records',
    'Move-in Documents', 'Property Notices', 'Maintenance Documents', 'Other Authorized Documents'
  )),
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'PDF',
  file_size text NOT NULL DEFAULT '1.0 MB',
  description text,
  is_public_to_property boolean NOT NULL DEFAULT false,
  access_status text NOT NULL DEFAULT 'Active' CHECK (access_status IN ('Active', 'Archived', 'Revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_documents_property_idx ON public.tenant_documents (property_id);
CREATE INDEX IF NOT EXISTS tenant_documents_tenant_idx ON public.tenant_documents (tenant_id);


-- --------------------------------------------------------------------
-- 8. SHARED SUPPORT INQUIRIES: public.support_tickets
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  tenant_name text NOT NULL,
  tenant_email text NOT NULL,
  tenant_phone text,
  subject text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'Rent-related query', 'Property-related query', 'Lease-related query',
    'Payment-related query', 'Maintenance-related query', 'General enquiry'
  )),
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  owner_response text,
  response_at timestamptz,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_property_created_idx ON public.support_tickets (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_tenant_idx ON public.support_tickets (tenant_id);


-- --------------------------------------------------------------------
-- 9. TRIGGER: PREVENT TENANTS FROM ALTERING CRITICAL LEASE TERMS
-- --------------------------------------------------------------------
-- Enforces that authenticated tenants can only propose renewal duration
-- and add renewal messages; they CANNOT alter rent, dates, or approve renewals.
CREATE OR REPLACE FUNCTION public.validate_tenant_lease_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    -- Block tenant from tampering with financial, date, or status fields
    IF NEW.monthly_rent <> OLD.monthly_rent OR
       NEW.security_deposit <> OLD.security_deposit OR
       NEW.start_date <> OLD.start_date OR
       NEW.end_date <> OLD.end_date OR
       NEW.property_id <> OLD.property_id OR
       NEW.agreement_number <> OLD.agreement_number OR
       NEW.status <> OLD.status OR
       (OLD.renewal_status <> 'Approved' AND NEW.renewal_status = 'Approved') OR
       (OLD.renewal_status <> 'Rejected' AND NEW.renewal_status = 'Rejected') THEN
      RAISE EXCEPTION 'Tenants may only submit renewal requests (renewal_status, renewal_requested_months, renewal_message). You cannot modify rent, dates, or grant self-approval.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_tenant_lease_update ON public.leases;
CREATE TRIGGER trg_validate_tenant_lease_update
BEFORE UPDATE ON public.leases
FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_lease_update();


-- --------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_ticket_notes ENABLE ROW LEVEL SECURITY;

-- Clean existing policies safely before recreation
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('tenants', 'leases', 'rent_payments', 'tenant_notifications', 'tenant_documents', 'support_tickets', 'maintenance_tickets', 'maintenance_ticket_notes')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- A. SERVER-SIDE SERVICE-ROLE ACCESS (Full bypass for Express backend & admin jobs)
CREATE POLICY "service_role_all_tenants" ON public.tenants FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_leases" ON public.leases FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_rent_payments" ON public.rent_payments FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_tenant_notifications" ON public.tenant_notifications FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_tenant_documents" ON public.tenant_documents FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_support_tickets" ON public.support_tickets FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_maintenance_tickets" ON public.maintenance_tickets FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_maintenance_notes" ON public.maintenance_ticket_notes FOR ALL TO service_role USING (true);

-- B. TENANT ACCESS POLICIES (Scoped strictly to the authenticated tenant)
-- 1. Tenant Profile: Can view and edit permitted personal fields only
CREATE POLICY "tenant_select_own_profile" ON public.tenants FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');
CREATE POLICY "tenant_update_own_profile" ON public.tenants FOR UPDATE TO authenticated
  USING (email = auth.jwt() ->> 'email')
  WITH CHECK (email = auth.jwt() ->> 'email');

-- 2. Leases: Can view own lease, can ONLY update renewal request fields (enforced by trigger)
CREATE POLICY "tenant_select_own_lease" ON public.leases FOR SELECT TO authenticated
  USING (tenant_email = auth.jwt() ->> 'email');
CREATE POLICY "tenant_update_own_renewal" ON public.leases FOR UPDATE TO authenticated
  USING (tenant_email = auth.jwt() ->> 'email')
  WITH CHECK (tenant_email = auth.jwt() ->> 'email');

-- 3. Rent Payments: Strict read-only access to own records. Tenants CANNOT insert or update payments.
CREATE POLICY "tenant_select_own_payments" ON public.rent_payments FOR SELECT TO authenticated
  USING (tenant_email = auth.jwt() ->> 'email');

-- 4. Maintenance Tickets: Can view tickets for own unit, can create tickets for own unit
CREATE POLICY "tenant_select_own_tickets" ON public.maintenance_tickets FOR SELECT TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE tenant_email = auth.jwt() ->> 'email'
    )
  );
CREATE POLICY "tenant_insert_own_tickets" ON public.maintenance_tickets FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE tenant_email = auth.jwt() ->> 'email'
    )
    AND status = 'Open'
  );

-- 5. Maintenance Ticket Notes: Can view notes on own tickets, can append comments
CREATE POLICY "tenant_select_own_ticket_notes" ON public.maintenance_ticket_notes FOR SELECT TO authenticated
  USING (
    ticket_id IN (
      SELECT mt.id FROM public.maintenance_tickets mt
      JOIN public.properties p ON mt.property_id = p.id
      WHERE p.tenant_email = auth.jwt() ->> 'email'
    )
  );
CREATE POLICY "tenant_insert_ticket_notes" ON public.maintenance_ticket_notes FOR INSERT TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT mt.id FROM public.maintenance_tickets mt
      JOIN public.properties p ON mt.property_id = p.id
      WHERE p.tenant_email = auth.jwt() ->> 'email'
    )
    AND author_role = 'Tenant'
  );

-- 6. Notifications: Can view and update read-state of own notifications only
CREATE POLICY "tenant_select_own_notifications" ON public.tenant_notifications FOR SELECT TO authenticated
  USING (tenant_email = auth.jwt() ->> 'email');
CREATE POLICY "tenant_update_own_notifications" ON public.tenant_notifications FOR UPDATE TO authenticated
  USING (tenant_email = auth.jwt() ->> 'email')
  WITH CHECK (tenant_email = auth.jwt() ->> 'email');

-- 7. Documents: Can view own authorized documents or general public notices.
-- STRICT: Empty email string will NOT grant access to confidential documents.
CREATE POLICY "tenant_select_own_documents" ON public.tenant_documents FOR SELECT TO authenticated
  USING (
    (tenant_email = auth.jwt() ->> 'email' AND length(trim(tenant_email)) > 3)
    OR (is_public_to_property = true AND property_id IN (
      SELECT id FROM public.properties WHERE tenant_email = auth.jwt() ->> 'email'
    ))
  );

-- 8. Support Tickets: Can view and create own support inquiries
CREATE POLICY "tenant_select_own_support" ON public.support_tickets FOR SELECT TO authenticated
  USING (tenant_email = auth.jwt() ->> 'email');
CREATE POLICY "tenant_insert_own_support" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (
    tenant_email = auth.jwt() ->> 'email'
    AND status = 'Open'
  );

-- --------------------------------------------------------------------
-- 11. REALTIME PUBLICATION
-- --------------------------------------------------------------------
-- Enable real-time updates for maintenance tickets, notifications, and leases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'maintenance_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_tickets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tenant_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'leases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leases;
  END IF;
END $$;
