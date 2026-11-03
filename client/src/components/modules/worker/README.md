# Worker portal

The worker portal is integrated into the existing PropertySE React app and is kept inside this folder.

## Files
- `WorkerDashboard.jsx` — page state, filters, summary cards, job actions and detail dialog.
- `WorkerSidebar.jsx` — worker navigation.
- `WorkerJobCard.jsx` — reusable maintenance ticket card.
- `workerApi.js` — API requests used by the portal.
- `workerConfig.js` — temporary development worker identity and team.
- `worker.css` — styles scoped to `.worker-*` classes.

## Development profile
Edit `workerConfig.js` to test a different worker name/team. This is temporary only. Do not treat browser-supplied worker identity as secure authentication. Before production, replace this with the authenticated worker identity supplied and verified by the backend.

## Database setup
Run `server/migrations/001_worker_maintenance_workflow.sql` once in the Supabase SQL Editor. It is idempotent and adds the worker assignment/acceptance fields plus the progress-notes table.

## Workflow
New maintenance tickets are routed by category:
Plumbing → Plumbing; Electrical → Electrical; Air Conditioning → AC; Appliance → Appliance; Cleaning → Cleaning; Structural → Structural; Other → General Review.

Acceptance is an atomic database update: only one worker can claim an open, unclaimed ticket for their team. A worker can start or resolve a ticket only when the submitted worker name matches the accepted worker. Authentication is not yet implemented, so this is a development-stage guard, not a production security boundary.

The dashboard's notifications page is currently an activity view derived from ticket data; push/email notifications are not configured. Completion proof upload is not implemented; it remains optional and is not required to resolve a ticket.
