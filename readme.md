# PropertySE

PropertySE is a property-management web application built with **React**, **Vite**, **Express**, and **Supabase**. It provides a dashboard for managing property units, tenant and lease details, annual rent, companies, and maintenance tickets.

## Features

- **Company-scoped property management** for `COMP_001` and `COMP_002`.
- **Property/unit inventory:** create and view units, with backend validation and a per-company unit limit.
- **Tenant management:** assign or edit tenant name, phone, email, and lease dates; clear tenant details when a tenant leaves.
- **Rent management:** update annual rent separately from tenant details.
- **Maintenance tickets:** create tickets with category, description, and priority; track ticket status.
- **Maintenance-aware unit status:** units with open maintenance work are marked as under maintenance; once all unfinished tickets are resolved, the unit status can return to Occupied or Vacant depending on whether a tenant remains assigned.
- **Company management:** list, add, and remove companies, with removal blocked when the company still has units.
- **Supabase persistence** for properties, tenant/lease details, companies, and maintenance tickets.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| API style | REST / JSON |

## Repository structure

```text
propertyse/
├── client/                         # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layouts/
│   │   │   └── modules/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/                         # Express API
│   ├── config/
│   │   └── supabaseClient.js
│   ├── routes/
│   │   ├── companyRoutes.js
│   │   ├── maintenanceTicketRoutes.js
│   │   └── propertyRoutes.js
│   ├── index.js
│   └── package.json
├── supabase/
│   └── migrations/
│       └── 202610270001_propertyse_tenants_maintenance.sql
├── .gitignore
└── README.md
```

## Prerequisites

Install the following before running the app:

- Node.js and npm
- A Supabase project
- Git (optional, for cloning the repository)

## 1. Set up Supabase

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Run the SQL in [`supabase/migrations/202610270001_propertyse_tenants_maintenance.sql`](supabase/migrations/202610270001_propertyse_tenants_maintenance.sql).

The migration adds tenant and lease columns to `public.properties`, creates `public.maintenance_tickets`, and adds indexes. It expects an existing `public.properties` table with the columns used by the application, including `id`, `company_id`, `property_name`, `building_number`, `unit_number`, `annual_rent`, `status`, `estimated_repair_cost`, `tenant_ready`, `estimated_days_to_rent`, `vacant_since`, `created_at`, and `updated_at`.

The company-management routes also expect a `public.companies` table with `id` and `name` columns. Make sure that table exists and has the expected schema before using company management.

## 2. Configure and start the backend

Open a terminal at the project root, then run:

```powershell
cd server
npm install
```

Create a file named `server/.env` with your own Supabase project credentials:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
PORT=5000
```

Replace the placeholders with the values from your Supabase project. Do not put real credentials in this README or commit them to Git.

Start the backend:

```powershell
npm start
```

For development with Node's watch mode:

```powershell
npm run dev
```

The API defaults to `http://localhost:5000`.

Health endpoints:

- `GET http://localhost:5000/` — API status and database label.
- `GET http://localhost:5000/api/health` — health check.

## 3. Configure and start the frontend

Open a **second terminal** at the project root:

```powershell
cd client
npm install
npm run dev
```

Vite prints the local frontend URL in the terminal (commonly `http://localhost:5173`). The frontend currently uses `http://localhost:5000/api` as its API base URL. If the backend port changes, update the API base URL in the frontend source.

To create a production build:

```powershell
npm run build
```

To run the frontend lint checks:

```powershell
npm run lint
```

## API overview

All request and response bodies use JSON. Replace `COMP_001` with the appropriate company ID where applicable.

### Properties

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/properties?companyId=COMP_001` | List properties for a company |
| `POST` | `/api/properties` | Create a property/unit |
| `PATCH` | `/api/properties/:id/tenant?companyId=COMP_001` | Assign, update, or clear tenant details |
| `PATCH` | `/api/properties/:id/rent?companyId=COMP_001` | Update annual rent |
| `PATCH` | `/api/properties/:id/status?companyId=COMP_001` | Update unit status |

Example tenant assignment/update body:

```json
{
  "action": "assign",
  "tenant": {
    "fullName": "Example Tenant",
    "phone": "9000000000",
    "email": "tenant@example.com",
    "leaseStartDate": "2026-11-01",
    "leaseEndDate": "2027-10-31"
  }
}
```

For tenant departure, use an action of `clear` as supported by the tenant endpoint. Tenant assignment/update requires the required tenant details and valid lease dates.

Example annual-rent body:

```json
{
  "annualRent": 180000
}
```

### Companies

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/companies` | List companies |
| `POST` | `/api/companies` | Create a company |
| `DELETE` | `/api/companies/:id` | Remove a company if it has no properties |

Example create-company body:

```json
{
  "id": "COMP_003",
  "name": "Example Estates"
}
```

### Maintenance tickets

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/maintenance-tickets?companyId=COMP_001` | List tickets for a company |
| `POST` | `/api/maintenance-tickets` | Create a maintenance ticket |
| `PATCH` | `/api/maintenance-tickets/:id/status` | Change a ticket's status |

Example ticket body:

```json
{
  "companyId": "COMP_001",
  "propertyId": "PROPERTY_UUID",
  "category": "Plumbing",
  "description": "The kitchen sink is leaking.",
  "priority": "Medium"
}
```

Supported categories: `Plumbing`, `Electrical`, `Air Conditioning`, `Appliance`, `Cleaning`, `Structural`, `Other`.

Supported priorities: `Low`, `Medium`, `High`, `Urgent`.

Supported statuses: `Open`, `In Progress`, `Resolved`.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` is a privileged secret that can bypass Supabase Row Level Security. Keep it only in the backend's local `server/.env`; never expose it in frontend code or `VITE_` variables.
- Never commit `.env` files. The root `.gitignore` excludes `.env` and `.env.*`; keep `server/.env` local and use placeholders in documentation.
- The current API validates company IDs but does not implement user authentication or authorization. Company ID validation is **not** a security boundary. Add authentication and server-side membership checks before deploying this application for real users.
- Do not share or publish database credentials in screenshots, logs, or repository files.

## Troubleshooting

- **Backend says Supabase environment variables are missing:** verify that `server/.env` exists and contains `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Restart the backend after changing the file.
- **Tenant or maintenance requests fail with schema errors:** verify that the Supabase migration has been applied to the correct project.
- **The frontend cannot reach the API:** make sure the backend is running on port `5000` and the frontend API base URL matches it.
- **A company cannot be deleted:** the API intentionally blocks deletion while that company has property units.

## Development status

PropertySE is a development project. Review the database schema, access controls, and deployment configuration before using it with real tenant data or exposing it publicly.
