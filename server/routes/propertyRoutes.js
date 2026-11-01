
const express = require("express");
const supabase = require("../config/supabaseClient");

const router = express.Router();

const COMPANY_UNIT_LIMIT = 20;
const VALID_STATUSES = new Set(["Vacant", "Occupied", "Maintenance"]);

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function normalizeCompanyId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedCompany(value) {
  return /^[A-Za-z0-9_-]{2,64}$/.test(normalizeCompanyId(value));
}

// Validate a real calendar date in YYYY-MM-DD format.
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// A lease remains valid through its end date.
// It expires the day after the end date.
function leaseExpired(endDate) {
  if (!validDate(endDate)) return false;

  const today = new Date().toISOString().slice(0, 10);
  return endDate < today;
}

function formatProperty(row) {
  const expired = leaseExpired(row.lease_end_date);

  // Present expired leases as vacant unless maintenance is ongoing.
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
  const { count, error } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company);

  if (error) throw error;
  return count || 0;
}

// Clear expired tenants from storage.
// Maintenance status is preserved while unfinished tickets exist.
async function expireCompanyLeases(company) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: expiredUnits, error } = await supabase
    .from("properties")
    .select("id, company_id, status, tenant_full_name")
    .eq("company_id", company)
    .not("lease_end_date", "is", null)
    .lt("lease_end_date", today)
    .neq("tenant_full_name", "");

  if (error) throw error;

  for (const unit of expiredUnits || []) {
    const { data: tickets, error: ticketError } = await supabase
      .from("maintenance_tickets")
      .select("id")
      .eq("company_id", company)
      .eq("property_id", unit.id)
      .in("status", ["Open", "In Progress"]);

    if (ticketError) throw ticketError;

    const hasUnfinishedTickets = Boolean(tickets?.length);
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("properties")
      .update({
        tenant_full_name: "",
        tenant_phone: "",
        tenant_email: "",
        lease_start_date: null,
        lease_end_date: null,
        status: hasUnfinishedTickets ? "Maintenance" : "Vacant",
        vacant_since: hasUnfinishedTickets ? null : now,
        updated_at: now,
      })
      .eq("id", unit.id)
      .eq("company_id", company);

    if (updateError) throw updateError;
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

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("company_id", company)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json((data || []).map(formatProperty));
  } catch (error) {
    console.error("Get properties error:", error);
    return res.status(500).json({
      message: "Could not load properties. Check the Supabase schema and maintenance_tickets table.",
    });
  }
});

// POST /api/properties - create one unit at a time.
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

    const rent = Number(annualRent);
    const repairCost = Number(estimatedRepairCost);
    const daysToRent = Number(estimatedDaysToRent);

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

    const now = new Date().toISOString();

    const row = {
      company_id: company,
      property_name: propertyName.trim(),
      building_number:
        typeof buildingNumber === "string" && buildingNumber.trim()
          ? buildingNumber.trim()
          : "Main property",
      unit_number: unitNumber.trim(),
      annual_rent: rent,
      status,
      estimated_repair_cost: repairCost,
      tenant_ready: tenantReady,
      estimated_days_to_rent: daysToRent,
      vacant_since: status === "Vacant" ? now : null,
      tenant_full_name: "",
      tenant_phone: "",
      tenant_email: "",
      lease_start_date: null,
      lease_end_date: null,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("properties")
      .insert(row)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "This unit already exists for this company.",
        });
      }
      throw error;
    }

    return res.status(201).json(formatProperty(data));
  } catch (error) {
    console.error("Create property error:", error);
    return res.status(500).json({ message: "Could not create the unit." });
  }
});

// PATCH /api/properties/:id/tenant
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

    const { data: current, error: findError } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .eq("company_id", company)
      .maybeSingle();

    if (findError) throw findError;

    if (!current) {
      return res.status(404).json({ message: "Unit not found for this company." });
    }

    let changes;

    if (action === "clear") {
      if (!current.tenant_full_name && current.status !== "Occupied") {
        return res.status(409).json({
          message: "This flat has no tenant assignment to clear.",
        });
      }

      const { data: unfinishedTickets, error: ticketError } = await supabase
        .from("maintenance_tickets")
        .select("id")
        .eq("company_id", company)
        .eq("property_id", id)
        .in("status", ["Open", "In Progress"]);

      if (ticketError) throw ticketError;

      const hasUnfinishedTickets = Boolean(unfinishedTickets?.length);
      const now = new Date().toISOString();

      changes = {
        tenant_full_name: "",
        tenant_phone: "",
        tenant_email: "",
        lease_start_date: null,
        lease_end_date: null,
        status: hasUnfinishedTickets ? "Maintenance" : "Vacant",
        vacant_since: hasUnfinishedTickets ? null : now,
        updated_at: now,
      };
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
          message: "Valid lease start and end dates in YYYY-MM-DD format are required.",
        });
      }

      const today = new Date().toISOString().slice(0, 10);

      if (tenant.lease_end_date < today) {
        return res.status(400).json({
          message: "Lease end date cannot be in the past. Choose today or a future date.",
        });
      }

      if (tenant.lease_end_date < tenant.lease_start_date) {
        return res.status(400).json({
          message: "Lease end date cannot be before lease start date.",
        });
      }

      if (
        tenant.lease_start_date < today &&
        action === "assign"
      ) {
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
          message: "This flat already has a tenant. Use update to edit tenant details.",
        });
      }

      changes = {
        ...tenant,
        status: current.status === "Maintenance" ? "Maintenance" : "Occupied",
        vacant_since: null,
        updated_at: new Date().toISOString(),
      };
    }

    const { data, error } = await supabase
      .from("properties")
      .update(changes)
      .eq("id", id)
      .eq("company_id", company)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      message:
        action === "clear"
          ? "Tenant assignment cleared."
          : action === "assign"
            ? "Tenant assigned."
            : "Tenant details updated.",
      property: formatProperty(data),
    });
  } catch (error) {
    console.error("Tenant update error:", error);
    return res.status(500).json({
      message: "Could not update tenant details. Confirm the Supabase schema migration has been applied.",
    });
  }
});

// PATCH /api/properties/:id/rent
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
      (typeof req.body.annualRent === "string" &&
        !req.body.annualRent.trim()) ||
      !Number.isFinite(rent) ||
      rent < 0
    ) {
      return res.status(400).json({
        message: "Annual rent must be a non-negative number.",
      });
    }

    const { data, error } = await supabase
      .from("properties")
      .update({ annual_rent: rent, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", company)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ message: "Unit not found for this company." });
    }

    return res.status(200).json({
      message: "Annual rent updated.",
      property: formatProperty(data),
    });
  } catch (error) {
    console.error("Rent update error:", error);
    return res.status(500).json({ message: "Could not update annual rent." });
  }
});

// PATCH /api/properties/:id/status
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

    const { data: current, error: readError } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .eq("company_id", company)
      .maybeSingle();

    if (readError) throw readError;

    if (!current) {
      return res.status(404).json({ message: "Unit not found for this company." });
    }

    if (status === "Occupied" && (!current.tenant_full_name || !current.tenant_phone)) {
      return res.status(409).json({
        message: "Assign tenant details to make a flat Occupied.",
      });
    }

    if (status === "Vacant" && current.tenant_full_name) {
      return res.status(409).json({
        message: "Clear the tenant assignment before marking this flat Vacant.",
      });
    }

    const { data, error } = await supabase
      .from("properties")
      .update({
        status,
        vacant_since: status === "Vacant" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", company)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json(formatProperty(data));
  } catch (error) {
    console.error("Update property status error:", error);
    return res.status(500).json({ message: "Could not update unit status." });
  }
});

module.exports = router;
