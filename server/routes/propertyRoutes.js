const express = require("express");
const db = require("../config/db");

const router = express.Router();

const COMPANY_UNIT_LIMIT = 20;
const VALID_STATUSES = new Set(["Vacant", "Occupied", "Maintenance"]);

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

function normalizeCompanyId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedCompany(value) {
  return /^[A-Za-z0-9_-]{2,64}$/.test(normalizeCompanyId(value));
}

// Validate calendar date in YYYY-MM-DD format.
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

// A lease remains valid through its end date and expires the day after.
function leaseExpired(endDate) {
  if (!validDate(endDate)) return false;
  const today = new Date().toISOString().slice(0, 10);
  return endDate < today;
}

function formatProperty(row) {
  const expired = leaseExpired(row.lease_end_date);
  const effectiveStatus =
    expired && row.status !== "Maintenance" ? "Vacant" : row.status;

  return {
    id: row.id,
    _id: row.id,
    companyId: row.company_id,
    propertyName: row.property_name,
    buildingNumber: row.building_number,
    unitNumber: row.unit_number,
    annualRent: Number(row.annual_rent || 0),
    status: effectiveStatus,
    estimatedRepairCost: Number(row.estimated_repair_cost || 0),
    tenantReady: Boolean(row.tenant_ready),
    estimatedDaysToRent: Number(row.estimated_days_to_rent ?? 30),
    vacantSince: row.vacant_since,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tenant: {
      fullName: expired ? "" : row.tenant_full_name || "",
      phone: expired ? "" : row.tenant_phone || "",
      email: expired ? "" : row.tenant_email || "",
      leaseStartDate: row.lease_start_date || null,
      leaseEndDate: row.lease_end_date || null,
    },
    leaseExpired: expired,
  };
}

function tenantPayload(body = {}) {
  return {
    tenant_full_name:
      typeof body.fullName === "string" ? body.fullName.trim() : "",
    tenant_phone: typeof body.phone === "string" ? body.phone.trim() : "",
    tenant_email: typeof body.email === "string" ? body.email.trim() : "",
    lease_start_date: body.leaseStartDate || null,
    lease_end_date: body.leaseEndDate || null,
  };
}

async function getCompanyUnitCount(company) {
  const result = await db.query(
    "SELECT COUNT(*)::int AS count FROM public.properties WHERE company_id = $1",
    [company]
  );
  return result.rows[0]?.count || 0;
}

// Automatically clear expired tenants from storage
async function expireCompanyLeases(company) {
  const today = new Date().toISOString().slice(0, 10);

  const expiredResult = await db.query(
    `SELECT id, company_id, status, tenant_full_name
     FROM public.properties
     WHERE company_id = $1
       AND lease_end_date IS NOT NULL
       AND lease_end_date < $2
       AND tenant_full_name <> ''`,
    [company, today]
  );

  for (const unit of expiredResult.rows) {
    const ticketResult = await db.query(
      `SELECT id FROM public.maintenance_tickets
       WHERE company_id = $1 AND property_id = $2 AND status IN ('Open', 'In Progress')`,
      [company, unit.id]
    );

    const hasUnfinishedTickets = ticketResult.rows.length > 0;
    const targetStatus = hasUnfinishedTickets ? "Maintenance" : "Vacant";

    await db.query(
      `UPDATE public.properties
       SET tenant_full_name = '',
           tenant_phone = '',
           tenant_email = '',
           lease_start_date = NULL,
           lease_end_date = NULL,
           status = $1,
           vacant_since = CASE WHEN $1 = 'Vacant' THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $2 AND company_id = $3`,
      [targetStatus, unit.id, company]
    );
  }
}

// GET /api/properties?companyId=COMP_001
router.get("/", async (req, res) => {
  try {
    const company = normalizeCompanyId(req.query.companyId);

    if (!isAllowedCompany(company)) {
      return res.status(400).json({
        message: "companyId must be a valid company ID.",
      });
    }

    await expireCompanyLeases(company);

    const result = await db.query(
      "SELECT * FROM public.properties WHERE company_id = $1 ORDER BY created_at DESC",
      [company]
    );

    return res.status(200).json(result.rows.map(formatProperty));
  } catch (error) {
    console.error("Get properties error:", error);
    return res.status(500).json({
      message:
        "Could not load properties. Check the Supabase schema and maintenance_tickets table.",
    });
  }
});

// POST /api/properties - create one unit at a time
router.post("/", async (req, res) => {
  try {
    const {
      companyId,
      propertyName,
      buildingNumber,
      unitNumber,
      annualRent,
      status = "Vacant",
      estimatedRepairCost = 0,
      tenantReady = false,
      estimatedDaysToRent = 30,
    } = req.body || {};

    const company = normalizeCompanyId(companyId);

    if (!isAllowedCompany(company)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }

    if (
      typeof propertyName !== "string" ||
      !propertyName.trim() ||
      typeof unitNumber !== "string" ||
      !unitNumber.trim()
    ) {
      return res.status(400).json({
        message: "Property name and unit number are required.",
      });
    }

    // Business rule: Unit number must be an integer between 1 and 20
    const trimmedUnitNumber = unitNumber.trim();
    const parsedUnitNum = Number(trimmedUnitNumber);
    if (
      !Number.isInteger(parsedUnitNum) ||
      parsedUnitNum < 1 ||
      parsedUnitNum > 20 ||
      String(parsedUnitNum) !== trimmedUnitNumber
    ) {
      return res.status(400).json({
        message: "Unit number must be an integer between 1 and 20.",
      });
    }

    const rent = Number(annualRent);
    const repairCost = Number(estimatedRepairCost);
    const daysToRent = Number(estimatedDaysToRent);

    // Business rule: Annual rent must not be negative
    if (
      annualRent === undefined ||
      annualRent === null ||
      (typeof annualRent === "string" && !annualRent.trim()) ||
      !Number.isFinite(rent) ||
      rent < 0 ||
      !Number.isFinite(repairCost) ||
      repairCost < 0 ||
      !Number.isInteger(daysToRent) ||
      daysToRent < 0 ||
      typeof tenantReady !== "boolean"
    ) {
      return res.status(400).json({
        message: "Provide valid rent and recommendation details.",
      });
    }

    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: "Invalid unit status." });
    }

    const count = await getCompanyUnitCount(company);
    if (count >= COMPANY_UNIT_LIMIT) {
      return res.status(409).json({
        message: "This company has reached its 20-unit limit.",
      });
    }

    // Business rule: Duplicate unit numbers within the same company must be rejected
    const existingUnit = await db.query(
      "SELECT id FROM public.properties WHERE company_id = $1 AND unit_number = $2",
      [company, trimmedUnitNumber]
    );

    if (existingUnit.rows.length > 0) {
      return res.status(409).json({
        message: "This unit already exists for this company.",
      });
    }

    const bNumber =
      typeof buildingNumber === "string" && buildingNumber.trim()
        ? buildingNumber.trim()
        : "Main property";

    const insertSql = `
      INSERT INTO public.properties (
        company_id, property_name, building_number, unit_number,
        annual_rent, status, estimated_repair_cost, tenant_ready,
        estimated_days_to_rent, vacant_since, tenant_full_name,
        tenant_phone, tenant_email, lease_start_date, lease_end_date,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        CASE WHEN $6 = 'Vacant' THEN NOW() ELSE NULL END,
        '', '', '', NULL, NULL, NOW(), NOW()
      )
      RETURNING *
    `;

    const result = await db.query(insertSql, [
      company,
      propertyName.trim(),
      bNumber,
      trimmedUnitNumber,
      rent,
      status,
      repairCost,
      tenantReady,
      daysToRent,
    ]);

    return res.status(201).json(formatProperty(result.rows[0]));
  } catch (error) {
    console.error("Create property error:", error);
    if (error.code === "23505") {
      return res.status(409).json({
        message: "This unit already exists for this company.",
      });
    }
    return res.status(500).json({ message: "Could not create the unit." });
  }
});

// PATCH /api/properties/:id/tenant - assign, update, or clear tenant
router.patch("/:id/tenant", async (req, res) => {
  try {
    const { id } = req.params;
    const company = normalizeCompanyId(
      req.query.companyId || req.body?.companyId
    );
    const action = req.body?.action || "update";

    if (!isAllowedCompany(company)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }

    if (!isUuid(id)) {
      return res.status(400).json({ message: "Invalid unit ID." });
    }

    if (!["assign", "update", "clear"].includes(action)) {
      return res.status(400).json({
        message: "Action must be assign, update, or clear.",
      });
    }

    await expireCompanyLeases(company);

    const findResult = await db.query(
      "SELECT * FROM public.properties WHERE id = $1 AND company_id = $2",
      [id, company]
    );
    const current = findResult.rows[0];

    if (!current) {
      return res
        .status(404)
        .json({ message: "Unit not found for this company." });
    }

    let updatedResult;

    if (action === "clear") {
      if (!current.tenant_full_name && current.status !== "Occupied") {
        return res.status(409).json({
          message: "This flat has no tenant assignment to clear.",
        });
      }

      const ticketsResult = await db.query(
        `SELECT id FROM public.maintenance_tickets
         WHERE company_id = $1 AND property_id = $2 AND status IN ('Open', 'In Progress')`,
        [company, id]
      );
      const hasUnfinishedTickets = ticketsResult.rows.length > 0;
      const targetStatus = hasUnfinishedTickets ? "Maintenance" : "Vacant";

      const clearSql = `
        UPDATE public.properties
        SET tenant_full_name = '',
            tenant_phone = '',
            tenant_email = '',
            lease_start_date = NULL,
            lease_end_date = NULL,
            status = $1,
            vacant_since = CASE WHEN $1 = 'Vacant' THEN NOW() ELSE NULL END,
            updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *
      `;
      updatedResult = await db.query(clearSql, [targetStatus, id, company]);
    } else {
      const tenant = tenantPayload(req.body?.tenant || req.body);

      if (!tenant.tenant_full_name || !tenant.tenant_phone) {
        return res.status(400).json({
          message: "Tenant full name and phone are required.",
        });
      }

      if (
        !validDate(tenant.lease_start_date) ||
        !validDate(tenant.lease_end_date)
      ) {
        return res.status(400).json({
          message:
            "Valid lease start and end dates in YYYY-MM-DD format are required.",
        });
      }

      const today = new Date().toISOString().slice(0, 10);

      if (tenant.lease_end_date < today) {
        return res.status(400).json({
          message:
            "Lease end date cannot be in the past. Choose today or a future date.",
        });
      }

      if (tenant.lease_end_date < tenant.lease_start_date) {
        return res.status(400).json({
          message: "Lease end date cannot be before lease start date.",
        });
      }

      if (tenant.lease_start_date < today && action === "assign") {
        return res.status(400).json({
          message: "A new tenant's lease start date cannot be in the past.",
        });
      }

      if (
        tenant.tenant_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenant.tenant_email)
      ) {
        return res.status(400).json({
          message: "Enter a valid tenant email address.",
        });
      }

      if (
        action === "assign" &&
        current.status === "Occupied" &&
        current.tenant_full_name
      ) {
        return res.status(409).json({
          message:
            "This flat already has a tenant. Use update to edit tenant details.",
        });
      }

      const targetStatus =
        current.status === "Maintenance" ? "Maintenance" : "Occupied";

      const updateSql = `
        UPDATE public.properties
        SET tenant_full_name = $1,
            tenant_phone = $2,
            tenant_email = $3,
            lease_start_date = $4,
            lease_end_date = $5,
            status = $6,
            vacant_since = NULL,
            updated_at = NOW()
        WHERE id = $7 AND company_id = $8
        RETURNING *
      `;

      updatedResult = await db.query(updateSql, [
        tenant.tenant_full_name,
        tenant.tenant_phone,
        tenant.tenant_email,
        tenant.lease_start_date,
        tenant.lease_end_date,
        targetStatus,
        id,
        company,
      ]);
    }

    return res.status(200).json({
      message:
        action === "clear"
          ? "Tenant assignment cleared."
          : action === "assign"
          ? "Tenant assigned."
          : "Tenant details updated.",
      property: formatProperty(updatedResult.rows[0]),
    });
  } catch (error) {
    console.error("Tenant update error:", error);
    return res.status(500).json({
      message:
        "Could not update tenant details. Confirm the Supabase schema migration has been applied.",
    });
  }
});

// PATCH /api/properties/:id/rent - update annual rent
router.patch("/:id/rent", async (req, res) => {
  try {
    const { id } = req.params;
    const company = normalizeCompanyId(
      req.query.companyId || req.body?.companyId
    );
    const rent = Number(req.body?.annualRent);

    if (!isAllowedCompany(company)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }

    if (!isUuid(id)) {
      return res.status(400).json({ message: "Invalid unit ID." });
    }

    if (
      req.body?.annualRent === undefined ||
      req.body?.annualRent === null ||
      (typeof req.body.annualRent === "string" && !req.body.annualRent.trim()) ||
      !Number.isFinite(rent) ||
      rent < 0
    ) {
      return res.status(400).json({
        message: "Annual rent must be a non-negative number.",
      });
    }

    const result = await db.query(
      "UPDATE public.properties SET annual_rent = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *",
      [rent, id, company]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Unit not found for this company." });
    }

    return res.status(200).json({
      message: "Annual rent updated.",
      property: formatProperty(result.rows[0]),
    });
  } catch (error) {
    console.error("Rent update error:", error);
    return res.status(500).json({ message: "Could not update annual rent." });
  }
});

// PATCH /api/properties/:id/status - update unit status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const company = normalizeCompanyId(
      req.query.companyId || req.body?.companyId
    );
    const { status } = req.body || {};

    if (!isAllowedCompany(company)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }

    if (!isUuid(id)) {
      return res.status(400).json({ message: "Invalid unit ID." });
    }

    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: "Invalid unit status." });
    }

    await expireCompanyLeases(company);

    const findResult = await db.query(
      "SELECT * FROM public.properties WHERE id = $1 AND company_id = $2",
      [id, company]
    );
    const current = findResult.rows[0];

    if (!current) {
      return res
        .status(404)
        .json({ message: "Unit not found for this company." });
    }

    if (
      status === "Occupied" &&
      (!current.tenant_full_name || !current.tenant_phone)
    ) {
      return res.status(409).json({
        message: "Assign tenant details to make a flat Occupied.",
      });
    }

    if (status === "Vacant" && current.tenant_full_name) {
      return res.status(409).json({
        message: "Clear the tenant assignment before marking this flat Vacant.",
      });
    }

    const updateSql = `
      UPDATE public.properties
      SET status = $1,
          vacant_since = CASE WHEN $1 = 'Vacant' THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE id = $2 AND company_id = $3
      RETURNING *
    `;

    const result = await db.query(updateSql, [status, id, company]);

    return res.status(200).json(formatProperty(result.rows[0]));
  } catch (error) {
    console.error("Update property status error:", error);
    return res.status(500).json({ message: "Could not update unit status." });
  }
});

module.exports = router;
