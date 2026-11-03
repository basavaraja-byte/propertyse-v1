-- PropertySE worker maintenance workflow
-- Safe to run more than once. Existing management tables and records are preserved.

ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS assigned_team TEXT,
  ADD COLUMN IF NOT EXISTS accepted_by_worker TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.maintenance_tickets
SET assigned_team = CASE
  WHEN category = 'Plumbing' THEN 'Plumbing'
  WHEN category = 'Electrical' THEN 'Electrical'
  WHEN category = 'Air Conditioning' THEN 'AC'
  WHEN category = 'Appliance' THEN 'Appliance'
  WHEN category = 'Cleaning' THEN 'Cleaning'
  WHEN category = 'Structural' THEN 'Structural'
  WHEN category = 'Other' THEN 'General Review'
  ELSE 'General Review'
END
WHERE assigned_team IS NULL;

CREATE TABLE IF NOT EXISTS public.maintenance_ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  note TEXT NOT NULL CHECK (char_length(note) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS maintenance_tickets_company_team_status_idx
  ON public.maintenance_tickets (company_id, assigned_team, status);

CREATE INDEX IF NOT EXISTS maintenance_ticket_notes_ticket_created_idx
  ON public.maintenance_ticket_notes (ticket_id, created_at);
