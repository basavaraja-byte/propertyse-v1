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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/maintenance-tickets - retrieve tickets for a specific company
router.get("/", async (req, res) => {
  try {
    const company =
      typeof req.query.companyId === "string" ? req.query.companyId.trim() : "";
    if (!allowed(company)) {
      return res
        .status(400)
        .json({ message: "companyId must be a valid company ID." });
    }

    const result = await db.query(
      "SELECT * FROM public.maintenance_tickets WHERE company_id = $1 ORDER BY created_at DESC",
      [company]
    );

    return res.status(200).json({
      count: result.rows.length,
      tickets: result.rows.map(formatTicket),
    });
  } catch (error) {
    console.error("Get maintenance tickets error:", error);
    return res.status(500).json({
      message:
        "Could not load maintenance tickets. Confirm the Supabase migration has been applied.",
    });
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

    const company = typeof companyId === "string" ? companyId.trim() : "";
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

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const insertTicketSql = `
        INSERT INTO public.maintenance_tickets (
          company_id, property_id, unit_number, tenant_name,
          category, description, priority, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Open', NOW(), NOW())
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
    return res
      .status(500)
      .json({ message: "Could not submit maintenance ticket." });
  }
});

// PATCH /api/maintenance-tickets/:id/status - update ticket status and auto-adjust unit status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const company =
      typeof req.body?.companyId === "string"
        ? req.body.companyId.trim()
        : typeof req.query.companyId === "string"
        ? req.query.companyId.trim()
        : "";
    const { status } = req.body || {};

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
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *
      `;
      const updateResult = await client.query(updateTicketSql, [
        status,
        id,
        company,
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
    return res
      .status(500)
      .json({ message: "Could not update maintenance ticket status." });
  }
});

module.exports = router;
