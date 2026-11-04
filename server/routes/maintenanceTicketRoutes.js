const express = require("express");
const db = require("../config/db");

const router = express.Router();

const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Air Conditioning",
  "Appliance",
  "Cleaning",
  "Structural",
  "Other",
];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["Open", "In Progress", "Resolved"];

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const allowed = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{2,64}$/.test(value.trim());

function formatTicket(row) {
  return {
    id: row.id,
    _id: row.id,
    companyId: row.company_id,
    propertyId: row.property_id,
    unitNumber: row.unit_number,
    tenantName: row.tenant_name,
    category: row.category,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assignedTeam: row.assigned_team || null,
    acceptedBy: row.accepted_by_worker || null,
    acceptedAt: row.accepted_at || null,
    completedAt: row.completed_at || null,
    propertyName: row.property_name || null,
    buildingNumber: row.building_number || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/maintenance-tickets - retrieve tickets for a specific company
router.get("/", async (req, res) => {
  try {
    const rawCompany = req.query.companyId ?? req.query.company_id;
    const company = typeof rawCompany === "string" ? rawCompany.trim() : "";
    if (!allowed(company)) {
      return res
        .status(400)
        .json({ message: "companyId must be a valid company ID." });
    }

    const result = await db.query(
      `SELECT mt.*, p.property_name, p.building_number
       FROM public.maintenance_tickets mt
       LEFT JOIN public.properties p ON p.id = mt.property_id AND p.company_id = mt.company_id
       WHERE mt.company_id = $1
       ORDER BY mt.created_at DESC`,
      [company]
    );

    return res.status(200).json({
      count: result.rows.length,
      tickets: result.rows.map(formatTicket),
    });
  } catch (error) {
    console.error("Get maintenance tickets error:", error);
    return res.status(500).json(db.formatDbError("load maintenance tickets", error));
  }
});

// POST /api/maintenance-tickets - create a maintenance ticket for an occupied unit
router.post("/", async (req, res) => {
  try {
    const {
      companyId,
      propertyId,
      category,
      description,
      priority = "Medium",
    } = req.body || {};

    const rawCompany = companyId ?? req.body?.company_id ?? req.query?.companyId ?? req.query?.company_id;
    const company = typeof rawCompany === "string" ? rawCompany.trim() : "";
    if (!allowed(company)) {
      return res
        .status(400)
        .json({ message: "companyId must be a valid company ID." });
    }
    if (!isUuid(propertyId)) {
      return res.status(400).json({ message: "A valid propertyId is required." });
    }
    if (!CATEGORIES.includes(category)) {
      return res
        .status(400)
        .json({ message: "Select a valid maintenance category." });
    }
    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 2000
    ) {
      return res.status(400).json({
        message: "Description is required and must be 2000 characters or fewer.",
      });
    }
    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: "Select a valid priority." });
    }

    // Check that target property exists and is eligible for maintenance tickets
    const propResult = await db.query(
      "SELECT * FROM public.properties WHERE id = $1 AND company_id = $2",
      [propertyId, company]
    );
    const property = propResult.rows[0];

    if (!property) {
      return res
        .status(404)
        .json({ message: "Flat not found for this company." });
    }

    if (
      property.status === "Vacant" ||
      !property.tenant_full_name?.trim() ||
      !property.tenant_phone?.trim()
    ) {
      return res.status(409).json({
        message:
          "Only a flat with an assigned tenant can raise a maintenance ticket.",
      });
    }

    const teamByCategory = {
      Plumbing: "Plumbing",
      Electrical: "Electrical",
      "Air Conditioning": "AC",
      Appliance: "Appliance",
      Cleaning: "Cleaning",
      Structural: "Structural",
      Other: "General Review",
    };
    const assignedTeam = teamByCategory[category] || "General Review";

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const insertTicketSql = `
        INSERT INTO public.maintenance_tickets (
          company_id, property_id, unit_number, tenant_name,
          category, description, priority, status, assigned_team,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Open', $8, NOW(), NOW())
        RETURNING *
      `;

      const ticketResult = await client.query(insertTicketSql, [
        company,
        property.id,
        property.unit_number,
        property.tenant_full_name.trim(),
        category,
        description.trim(),
        priority,
        assignedTeam,
      ]);

      await client.query(
        "UPDATE public.properties SET status = 'Maintenance', vacant_since = NULL, updated_at = NOW() WHERE id = $1 AND company_id = $2",
        [property.id, company]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Maintenance ticket submitted successfully.",
        ticket: formatTicket(ticketResult.rows[0]),
      });
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create maintenance ticket error:", error);
    return res.status(500).json(db.formatDbError("submit maintenance ticket", error));
  }
});


// PATCH /api/maintenance-tickets/:id/accept - atomic first-worker acceptance
router.patch("/:id/accept", async (req, res) => {
  const { id } = req.params;
  const { workerName, workerTeam, companyId } = req.body || {};
  if (!isUuid(id)) return res.status(400).json({ message: "Invalid ticket ID." });
  if (!allowed(companyId) || typeof workerName !== "string" || !workerName.trim() ||
      typeof workerTeam !== "string" || !workerTeam.trim()) {
    return res.status(400).json({ message: "Valid worker and company details are required." });
  }
  try {
    const result = await db.query(
      `UPDATE public.maintenance_tickets
       SET accepted_by_worker = $1, accepted_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND company_id = $3 AND assigned_team = $4
         AND accepted_by_worker IS NULL AND status = 'Open'
       RETURNING *`,
      [workerName.trim(), id, companyId.trim(), workerTeam.trim()]
    );
    if (!result.rows.length) {
      return res.status(409).json({ message: "This ticket is already accepted or is not available to your team." });
    }
    return res.status(200).json({ message: "Job accepted successfully.", ticket: formatTicket(result.rows[0]) });
  } catch (error) {
    console.error("Accept maintenance job error:", error);
    return res.status(500).json(db.formatDbError("accept maintenance job", error));
  }
});

// GET /api/maintenance-tickets/:id/notes
router.get("/:id/notes", async (req, res) => {
  const { id } = req.params;
  const companyId = String(req.query.companyId || "").trim();
  if (!isUuid(id) || !allowed(companyId)) return res.status(400).json({ message: "Valid ticket and company details are required." });
  try {
    const result = await db.query(
      `SELECT n.id, n.worker_name, n.note, n.created_at
       FROM public.maintenance_ticket_notes n
       INNER JOIN public.maintenance_tickets t ON t.id = n.ticket_id AND t.company_id = n.company_id
       WHERE n.ticket_id = $1 AND n.company_id = $2
       ORDER BY n.created_at ASC`,
      [id, companyId]
    );
    return res.json({ notes: result.rows.map(n => ({ id: n.id, workerName: n.worker_name, note: n.note, createdAt: n.created_at })) });
  } catch (error) {
    console.error("Load maintenance notes error:", error);
    return res.status(500).json(db.formatDbError("load maintenance notes", error));
  }
});

// POST /api/maintenance-tickets/:id/notes
router.post("/:id/notes", async (req, res) => {
  const { id } = req.params;
  const { companyId, workerName, note } = req.body || {};
  if (!isUuid(id) || !allowed(companyId) || typeof workerName !== "string" || !workerName.trim() ||
      typeof note !== "string" || !note.trim() || note.trim().length > 2000) {
    return res.status(400).json({ message: "A valid ticket, company, worker and note (up to 2000 characters) are required." });
  }
  try {
    const result = await db.query(
      `INSERT INTO public.maintenance_ticket_notes (ticket_id, company_id, worker_name, note)
       SELECT id, company_id, $3, $4 FROM public.maintenance_tickets
       WHERE id = $1 AND company_id = $2
       RETURNING id, worker_name, note, created_at`,
      [id, companyId.trim(), workerName.trim(), note.trim()]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Maintenance ticket not found for this company." });
    const n = result.rows[0];
    return res.status(201).json({ message: "Progress note added.", note: { id: n.id, workerName: n.worker_name, note: n.note, createdAt: n.created_at } });
  } catch (error) {
    console.error("Add maintenance note error:", error);
    return res.status(500).json(db.formatDbError("add maintenance note", error));
  }
});

// PATCH /api/maintenance-tickets/:id/status - update ticket status and auto-adjust unit status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const rawCompany =
      req.body?.companyId ??
      req.body?.company_id ??
      req.query?.companyId ??
      req.query?.company_id;
    const company = typeof rawCompany === "string" ? rawCompany.trim() : "";
    const { status, workerName } = req.body || {};

    if (!allowed(company)) {
      return res
        .status(400)
        .json({ message: "companyId must be a valid company ID." });
    }
    if (!isUuid(id)) {
      return res.status(400).json({ message: "Invalid ticket ID." });
    }
    if (!STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be Open, In Progress, or Resolved." });
    }

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const updateTicketSql = `
        UPDATE public.maintenance_tickets
        SET status = $1, completed_at = CASE WHEN $1 = 'Resolved' THEN COALESCE(completed_at, NOW()) ELSE NULL END, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
          AND ($4::text IS NULL OR accepted_by_worker = $4)
        RETURNING *
      `;
      const workerIdentity = typeof workerName === "string" && workerName.trim()
        ? workerName.trim()
        : null;
      const updateResult = await client.query(updateTicketSql, [
        status,
        id,
        company,
        workerIdentity,
      ]);
      const ticket = updateResult.rows[0];

      if (!ticket) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ message: "Maintenance ticket not found for this company." });
      }

      if (status === "Resolved") {
        // Check if other open/in-progress tickets remain for this property
        const unfinishedResult = await client.query(
          "SELECT id FROM public.maintenance_tickets WHERE property_id = $1 AND company_id = $2 AND status IN ('Open', 'In Progress')",
          [ticket.property_id, company]
        );

        if (unfinishedResult.rows.length === 0) {
          const propResult = await client.query(
            "SELECT id, status, tenant_full_name, tenant_phone FROM public.properties WHERE id = $1 AND company_id = $2",
            [ticket.property_id, company]
          );
          const property = propResult.rows[0];

          if (property && property.status === "Maintenance") {
            const hasTenant = Boolean(
              property.tenant_full_name?.trim() &&
                property.tenant_phone?.trim()
            );
            const targetStatus = hasTenant ? "Occupied" : "Vacant";

            await client.query(
              `UPDATE public.properties
               SET status = $1,
                   vacant_since = CASE WHEN $1 = 'Vacant' THEN NOW() ELSE NULL END,
                   updated_at = NOW()
               WHERE id = $2 AND company_id = $3`,
              [targetStatus, property.id, company]
            );
          }
        }
      } else {
        await client.query(
          "UPDATE public.properties SET status = 'Maintenance', vacant_since = NULL, updated_at = NOW() WHERE id = $1 AND company_id = $2",
          [ticket.property_id, company]
        );
      }

      await client.query("COMMIT");

      return res.status(200).json({
        message: "Maintenance ticket status updated successfully.",
        ticket: formatTicket(ticket),
      });
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update maintenance ticket error:", error);
    return res.status(500).json(db.formatDbError("update maintenance ticket status", error));
  }
});

module.exports = router;
