const express = require("express");
const db = require("../config/db");

const router = express.Router();

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

// Security Guard: Authenticate User and Require Owner Role
function requireOwnerAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: "Authentication required",
      code: "UNAUTHORIZED",
      message: "Please sign in to access the owner portal.",
    });
  }

  if (req.user.role !== "owner") {
    return res.status(403).json({
      error: "Access denied: owner role required",
      code: "FORBIDDEN",
      message: "This resource is restricted to property owners.",
    });
  }

  next();
}

// Security Guard: Manager/Admin Role Guard for Property Assignments
function requireManagementAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: "Authentication required",
      code: "UNAUTHORIZED",
    });
  }

  if (!["manager", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      error: "Access denied: insufficient permissions",
      code: "FORBIDDEN",
      message: "Only property managers and administrators can manage ownership assignments.",
    });
  }

  next();
}

/**
 * Sanitizes and masks sensitive banking/payout coordinates.
 * Strictly prevents full bank account numbers, routing numbers, and IFSC codes
 * from being leaked over the wire.
 *
 * @param {string|object|null|undefined} raw - Raw payout_account from database
 * @returns {object|null} Sanitized payout account object or null
 */
function maskPayoutAccount(raw) {
  if (raw === null || raw === undefined) {
    return null;
  }

  let data = raw;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("{")) {
      try {
        data = JSON.parse(trimmed);
      } catch {
        return null; // Malformed JSON object
      }
    } else {
      // Plain string account identifier: require digits or existing mask characters
      const clean = trimmed.replace(/\s+/g, "");
      if (!/\d/.test(clean) && !/^[•*]/.test(clean)) {
        return null;
      }
      const last4 = clean.slice(-4);
      return {
        bankName: null,
        accountNumberMasked: /^[•*]/.test(clean)
          ? trimmed
          : clean.length > 4
          ? `•••• •••• •••• ${last4}`
          : `•••• ${last4}`,
        routingMasked: null,
        accountType: null,
        accountHolderName: null,
        isConfigured: true,
      };
    }
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return null;
  }

  // Extract account number from common field variations (including nested details)
  const rawAcc = String(
    data.accountNumber ||
    data.account_number ||
    data.accountNo ||
    data.account_no ||
    data.details?.accountNumber ||
    data.details?.account_number ||
    data.account?.number ||
    ""
  ).trim();

  const bankName = typeof (data.bankName || data.bank_name || data.details?.bankName) === "string"
    ? String(data.bankName || data.bank_name || data.details?.bankName).trim()
    : null;

  const rawRouting = String(
    data.ifscCode ||
    data.ifsc_code ||
    data.ifsc ||
    data.routingNumber ||
    data.routing_number ||
    data.details?.ifscCode ||
    data.details?.ifsc_code ||
    data.details?.routingNumber ||
    ""
  ).trim();

  const accountType = typeof (data.accountType || data.account_type) === "string"
    ? String(data.accountType || data.account_type).trim()
    : null;

  const accountHolderName = typeof (data.accountHolderName || data.account_holder_name) === "string"
    ? String(data.accountHolderName || data.account_holder_name).trim()
    : null;

  if (!rawAcc && !bankName && !rawRouting) {
    return null;
  }

  let accountNumberMasked = null;
  if (rawAcc) {
    if (/^[•*]/.test(rawAcc)) {
      accountNumberMasked = rawAcc;
    } else {
      const cleanDigits = rawAcc.replace(/\s+/g, "");
      const last4 = cleanDigits.slice(-4);
      accountNumberMasked = cleanDigits.length > 4 ? `•••• •••• •••• ${last4}` : `•••• ${last4}`;
    }
  }

  let routingMasked = null;
  if (rawRouting) {
    if (rawRouting.length > 4) {
      routingMasked = `${rawRouting.slice(0, 4)}•••••••`;
    } else {
      routingMasked = "••••";
    }
  }

  return {
    bankName,
    accountNumberMasked,
    routingMasked,
    accountType,
    accountHolderName,
    isConfigured: Boolean(accountNumberMasked || bankName),
  };
}

// Helper: Format an owned property row
function formatOwnedProperty(row) {
  const percentage = Number(row.ownership_percentage || 100);
  const annualRentTotal = Number(row.annual_rent || 0);
  const ownerShareAnnualRent = Math.round(annualRentTotal * (percentage / 100));
  const ownerShareMonthlyRent = Math.round(ownerShareAnnualRent / 12);

  return {
    id: row.property_id || row.id,
    assignmentId: row.assignment_id || row.id,
    companyId: row.company_id,
    propertyName: row.property_name,
    buildingNumber: row.building_number,
    unitNumber: row.unit_number,
    status: row.status,
    annualRent: annualRentTotal,
    monthlyRent: Math.round(annualRentTotal / 12),
    ownerShareAnnualRent,
    ownerShareMonthlyRent,
    ownershipPercentage: percentage,
    isPrimaryContact: Boolean(row.is_primary_contact),
    estimatedRepairCost: Number(row.estimated_repair_cost || 0),
    tenantReady: Boolean(row.tenant_ready),
    estimatedDaysToRent: Number(row.estimated_days_to_rent ?? 30),
    vacantSince: row.vacant_since,
    createdAt: row.created_at,
    tenant: {
      fullName: row.tenant_full_name || "",
      phone: row.tenant_phone || "",
      email: row.tenant_email || "",
      leaseStartDate: row.lease_start_date || null,
      leaseEndDate: row.lease_end_date || null,
    },
    payoutAccount: maskPayoutAccount(row.payout_account),
  };
}

// -----------------------------------------------------------------------------
// 1. GET /api/owner/overview - High-level KPIs and summary
// -----------------------------------------------------------------------------
router.get("/overview", requireOwnerAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const query = `
      SELECT 
        po.id AS assignment_id,
        po.ownership_percentage,
        po.is_primary_contact,
        po.payout_account,
        p.*
      FROM public.property_owners po
      JOIN public.properties p ON po.property_id = p.id AND po.company_id = p.company_id
      WHERE po.owner_id = $1
      ORDER BY p.created_at DESC
    `;

    const result = await db.query(query, [ownerId]);
    const properties = result.rows.map(formatOwnedProperty);

    const totalProperties = properties.length;
    const occupiedUnits = properties.filter((p) => p.status === "Occupied").length;
    const vacantUnits = properties.filter((p) => p.status === "Vacant").length;
    const maintenanceUnits = properties.filter((p) => p.status === "Maintenance").length;

    const occupancyRate = totalProperties > 0 ? Math.round((occupiedUnits / totalProperties) * 100) : 0;
    const monthlyExpectedRent = properties.reduce((sum, p) => sum + p.ownerShareMonthlyRent, 0);
    const annualExpectedRent = properties.reduce((sum, p) => sum + p.ownerShareAnnualRent, 0);
    const activeTenantsCount = properties.filter((p) => p.tenant && p.tenant.fullName).length;

    // Get open tickets count for these properties
    let openTicketsCount = 0;
    if (totalProperties > 0) {
      const propertyIds = properties.map((p) => p.id);
      const ticketRes = await db.query(
        `SELECT COUNT(*)::int AS count 
         FROM public.maintenance_tickets 
         WHERE property_id = ANY($1::uuid[]) AND status IN ('Open', 'In Progress')`,
        [propertyIds]
      );
      openTicketsCount = ticketRes.rows[0]?.count || 0;
    }

    return res.status(200).json({
      summary: {
        totalProperties,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        occupancyRate,
        monthlyExpectedRent,
        annualExpectedRent,
        activeTenantsCount,
        openTicketsCount,
      },
      recentProperties: properties.slice(0, 5),
    });
  } catch (error) {
    console.error("Owner overview error:", error);
    return res.status(500).json(db.formatDbError("load owner overview", error));
  }
});

// -----------------------------------------------------------------------------
// 2. GET /api/owner/properties - Portfolio list with filter support
// -----------------------------------------------------------------------------
router.get("/properties", requireOwnerAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const statusFilter = req.query.status;
    const searchFilter = (req.query.search || "").trim().toLowerCase();

    const query = `
      SELECT 
        po.id AS assignment_id,
        po.ownership_percentage,
        po.is_primary_contact,
        po.payout_account,
        p.*
      FROM public.property_owners po
      JOIN public.properties p ON po.property_id = p.id AND po.company_id = p.company_id
      WHERE po.owner_id = $1
      ORDER BY p.created_at DESC
    `;

    const result = await db.query(query, [ownerId]);
    let properties = result.rows.map(formatOwnedProperty);

    if (statusFilter && ["Vacant", "Occupied", "Maintenance"].includes(statusFilter)) {
      properties = properties.filter((p) => p.status === statusFilter);
    }

    if (searchFilter) {
      properties = properties.filter(
        (p) =>
          p.propertyName.toLowerCase().includes(searchFilter) ||
          p.unitNumber.toLowerCase().includes(searchFilter) ||
          (p.tenant && p.tenant.fullName.toLowerCase().includes(searchFilter))
      );
    }

    return res.status(200).json(properties);
  } catch (error) {
    console.error("Owner properties error:", error);
    return res.status(500).json(db.formatDbError("load owner properties", error));
  }
});

// -----------------------------------------------------------------------------
// 3. GET /api/owner/properties/:id - Single unit detail
// -----------------------------------------------------------------------------
router.get("/properties/:id", requireOwnerAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const propertyId = req.params.id;

    if (!isUuid(propertyId)) {
      return res.status(400).json({ message: "Invalid property ID format." });
    }

    const query = `
      SELECT 
        po.id AS assignment_id,
        po.ownership_percentage,
        po.is_primary_contact,
        po.payout_account,
        p.*
      FROM public.property_owners po
      JOIN public.properties p ON po.property_id = p.id AND po.company_id = p.company_id
      WHERE po.owner_id = $1 AND po.property_id = $2
    `;

    const result = await db.query(query, [ownerId, propertyId]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Property not found in your portfolio.",
      });
    }

    const property = formatOwnedProperty(result.rows[0]);

    // Fetch related maintenance history
    const ticketRes = await db.query(
      `SELECT id, category, description, priority, status, created_at, updated_at
       FROM public.maintenance_tickets
       WHERE property_id = $1
       ORDER BY created_at DESC`,
      [propertyId]
    );

    return res.status(200).json({
      property,
      maintenanceTickets: ticketRes.rows,
    });
  } catch (error) {
    console.error("Owner property detail error:", error);
    return res.status(500).json(db.formatDbError("load property detail", error));
  }
});

// -----------------------------------------------------------------------------
// 4. GET /api/owner/tenants - Read-only tenant directory
// -----------------------------------------------------------------------------
router.get("/tenants", requireOwnerAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const query = `
      SELECT 
        p.id AS property_id,
        p.unit_number,
        p.property_name,
        p.building_number,
        p.status,
        p.annual_rent,
        p.tenant_full_name,
        p.tenant_phone,
        p.tenant_email,
        p.lease_start_date,
        p.lease_end_date,
        po.ownership_percentage
      FROM public.property_owners po
      JOIN public.properties p ON po.property_id = p.id AND po.company_id = p.company_id
      WHERE po.owner_id = $1 AND p.tenant_full_name <> ''
      ORDER BY p.lease_end_date ASC NULLS LAST
    `;

    const result = await db.query(query, [ownerId]);
    const today = new Date().toISOString().slice(0, 10);

    const tenants = result.rows.map((row) => ({
      propertyId: row.property_id,
      unitNumber: row.unit_number,
      propertyName: row.property_name,
      buildingNumber: row.building_number,
      fullName: row.tenant_full_name,
      phone: row.tenant_phone,
      email: row.tenant_email,
      leaseStartDate: row.lease_start_date,
      leaseEndDate: row.lease_end_date,
      isExpired: Boolean(row.lease_end_date && row.lease_end_date < today),
      monthlyRent: Math.round(Number(row.annual_rent || 0) / 12),
      ownershipPercentage: Number(row.ownership_percentage || 100),
    }));

    return res.status(200).json(tenants);
  } catch (error) {
    console.error("Owner tenants error:", error);
    return res.status(500).json(db.formatDbError("load tenants directory", error));
  }
});

// -----------------------------------------------------------------------------
// 5. GET /api/owner/financials/income - Rental income projection
// -----------------------------------------------------------------------------
router.get("/financials/income", requireOwnerAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const query = `
      SELECT 
        po.id AS assignment_id,
        po.ownership_percentage,
        p.id,
        p.property_name,
        p.unit_number,
        p.status,
        p.annual_rent,
        p.tenant_full_name
      FROM public.property_owners po
      JOIN public.properties p ON po.property_id = p.id AND po.company_id = p.company_id
      WHERE po.owner_id = $1
      ORDER BY p.annual_rent DESC
    `;

    const result = await db.query(query, [ownerId]);
    const units = result.rows.map((row) => {
      const percentage = Number(row.ownership_percentage || 100);
      const annualRent = Number(row.annual_rent || 0);
      const monthlyRent = Math.round(annualRent / 12);
      const ownerShareAnnual = Math.round(annualRent * (percentage / 100));
      const ownerShareMonthly = Math.round(ownerShareAnnual / 12);

      return {
        propertyId: row.id,
        propertyName: row.property_name,
        unitNumber: row.unit_number,
        status: row.status,
        tenantName: row.tenant_full_name || "Unoccupied",
        ownershipPercentage: percentage,
        fullAnnualRent: annualRent,
        ownerShareAnnualRent: ownerShareAnnual,
        ownerShareMonthlyRent: ownerShareMonthly,
        isOccupied: row.status === "Occupied",
      };
    });

    const totalPotentialMonthly = units.reduce((s, u) => s + u.ownerShareMonthlyRent, 0);
    const totalPotentialAnnual = units.reduce((s, u) => s + u.ownerShareAnnualRent, 0);
    const occupiedMonthly = units.filter((u) => u.isOccupied).reduce((s, u) => s + u.ownerShareMonthlyRent, 0);
    const vacancyLossMonthly = totalPotentialMonthly - occupiedMonthly;

    return res.status(200).json({
      projections: {
        totalPotentialMonthly,
        totalPotentialAnnual,
        occupiedMonthly,
        vacancyLossMonthly,
      },
      unitsBreakdown: units,
      notice: "Financial metrics represent contractual gross rental projections.",
    });
  } catch (error) {
    console.error("Owner income error:", error);
    return res.status(500).json(db.formatDbError("load rental income data", error));
  }
});

// -----------------------------------------------------------------------------
// 6. GET /api/owner/financials/payments - Payout schedules and history
// -----------------------------------------------------------------------------
router.get("/financials/payments", requireOwnerAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Retrieve bank setup status if any exists
    const query = `
      SELECT payout_account 
      FROM public.property_owners 
      WHERE owner_id = $1 AND payout_account IS NOT NULL 
      LIMIT 1
    `;
    const result = await db.query(query, [ownerId]);
    const rawAccount = result.rows[0]?.payout_account || null;
    const payoutAccount = maskPayoutAccount(rawAccount);

    return res.status(200).json({
      payoutAccount,
      schedule: "Monthly (1st of each month)",
      gatewayStatus: "Payment gateway integration pending - no historical payouts recorded",
      transactions: [],
    });
  } catch (error) {
    console.error("Owner payments error:", error);
    return res.status(500).json(db.formatDbError("load payments information", error));
  }
});

// -----------------------------------------------------------------------------
// 7. GET /api/owner/maintenance - Read-only maintenance ticket tracker
// -----------------------------------------------------------------------------
router.get("/maintenance", requireOwnerAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const query = `
      SELECT 
        mt.id,
        mt.property_id,
        mt.unit_number,
        mt.tenant_name,
        mt.category,
        mt.description,
        mt.priority,
        mt.status,
        mt.created_at,
        mt.updated_at,
        p.property_name,
        p.estimated_repair_cost,
        po.ownership_percentage
      FROM public.property_owners po
      JOIN public.properties p ON po.property_id = p.id AND po.company_id = p.company_id
      JOIN public.maintenance_tickets mt ON mt.property_id = p.id
      WHERE po.owner_id = $1
      ORDER BY mt.created_at DESC
    `;

    const result = await db.query(query, [ownerId]);
    const tickets = result.rows.map((row) => ({
      id: row.id,
      propertyId: row.property_id,
      propertyName: row.property_name,
      unitNumber: row.unit_number,
      tenantName: row.tenant_name,
      category: row.category,
      description: row.description,
      priority: row.priority,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      propertyEstimatedRepairCost: Number(row.estimated_repair_cost || 0),
      ownerSharePercentage: Number(row.ownership_percentage || 100),
    }));

    return res.status(200).json(tickets);
  } catch (error) {
    console.error("Owner maintenance tickets error:", error);
    return res.status(500).json(db.formatDbError("load maintenance tickets", error));
  }
});

// -----------------------------------------------------------------------------
// 8. GET /api/owner/reports - Financial statement export data
// -----------------------------------------------------------------------------
router.get("/reports", requireOwnerAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const propResult = await db.query(
      `SELECT 
        p.*,
        po.ownership_percentage
       FROM public.property_owners po
       JOIN public.properties p ON po.property_id = p.id AND po.company_id = p.company_id
       WHERE po.owner_id = $1`,
      [ownerId]
    );

    const properties = propResult.rows.map(formatOwnedProperty);
    const totalUnits = properties.length;
    const occupiedUnits = properties.filter((p) => p.status === "Occupied").length;
    const vacantUnits = properties.filter((p) => p.status === "Vacant").length;
    const maintenanceUnits = properties.filter((p) => p.status === "Maintenance").length;

    const grossAnnualPotential = properties.reduce((sum, p) => sum + p.ownerShareAnnualRent, 0);
    const estimatedRepairs = properties.reduce(
      (sum, p) => sum + Math.round(p.estimatedRepairCost * (p.ownershipPercentage / 100)),
      0
    );

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      owner: {
        id: ownerId,
        email: req.user.email || "",
        name: req.user.name || "Property Owner",
      },
      portfolioMetrics: {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
        grossAnnualPotential,
        grossMonthlyPotential: Math.round(grossAnnualPotential / 12),
        totalEstimatedRepairs: estimatedRepairs,
      },
      units: properties,
    });
  } catch (error) {
    console.error("Owner reports error:", error);
    return res.status(500).json(db.formatDbError("generate owner reports", error));
  }
});

// -----------------------------------------------------------------------------
// 9. GET /api/owner/notifications - Lease expiry and vacancy alerts
// -----------------------------------------------------------------------------
router.get("/notifications", requireOwnerAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const query = `
      SELECT 
        p.id,
        p.property_name,
        p.unit_number,
        p.status,
        p.tenant_full_name,
        p.lease_end_date
      FROM public.property_owners po
      JOIN public.properties p ON po.property_id = p.id AND po.company_id = p.company_id
      WHERE po.owner_id = $1
    `;

    const result = await db.query(query, [ownerId]);
    const notifications = [];
    const today = new Date();
    const sixtyDaysAhead = new Date();
    sixtyDaysAhead.setDate(today.getDate() + 60);

    for (const row of result.rows) {
      if (row.status === "Vacant") {
        notifications.push({
          id: `vacant-${row.id}`,
          type: "warning",
          title: "Unit Vacant",
          message: `${row.property_name} (Unit ${row.unit_number}) is currently vacant and tenant-seeking.`,
          date: new Date().toISOString(),
          propertyId: row.id,
        });
      }

      if (row.lease_end_date) {
        const leaseEnd = new Date(row.lease_end_date);
        if (leaseEnd > today && leaseEnd <= sixtyDaysAhead) {
          const daysRemaining = Math.ceil((leaseEnd - today) / (1000 * 60 * 60 * 24));
          notifications.push({
            id: `lease-exp-${row.id}`,
            type: "info",
            title: "Lease Expiring Soon",
            message: `Lease for ${row.tenant_full_name || "Tenant"} in Unit ${row.unit_number} expires in ${daysRemaining} days (${row.lease_end_date}).`,
            date: new Date().toISOString(),
            propertyId: row.id,
          });
        }
      }
    }

    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Owner notifications error:", error);
    return res.status(500).json(db.formatDbError("load owner notifications", error));
  }
});

// -----------------------------------------------------------------------------
// 10. GET /api/owner/settings - Authenticated owner profile and settings
// -----------------------------------------------------------------------------
router.get("/settings", requireOwnerAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const query = `
      SELECT payout_account 
      FROM public.property_owners 
      WHERE owner_id = $1 AND payout_account IS NOT NULL 
      LIMIT 1
    `;
    const result = await db.query(query, [ownerId]);
    const rawAccount = result.rows[0]?.payout_account || null;
    const account = maskPayoutAccount(rawAccount);

    return res.status(200).json({
      profile: {
        id: ownerId,
        role: "owner",
        email: req.user.email || "",
        name: req.user.name || "Property Owner",
      },
      payoutAccount: account,
      preferences: {
        emailNotifications: true,
        smsAlerts: false,
        monthlyReports: true,
      },
    });
  } catch (error) {
    console.error("Owner settings error:", error);
    return res.status(500).json(db.formatDbError("load owner settings", error));
  }
});

// =============================================================================
// MANAGEMENT ASSIGNMENT WORKFLOW ENDPOINTS (Strictly Manager/Admin Protected)
// =============================================================================

// POST /api/owner/assignments - Assign an owner to a property
router.post("/assignments", requireManagementAuth, async (req, res) => {
  try {
    const { propertyId, ownerId, ownershipPercentage = 100 } = req.body || {};
    const managerId = req.user.id;
    const managerCompany = req.user.company_id;

    if (!isUuid(propertyId) || !ownerId || typeof ownerId !== "string") {
      return res.status(400).json({
        message: "Valid propertyId (UUID) and ownerId (string) are required.",
      });
    }

    const percentage = Number(ownershipPercentage);
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      return res.status(400).json({
        message: "Ownership percentage must be a number between 0.01 and 100.00.",
      });
    }

    // Verify property exists and matches company
    const propQuery = "SELECT id, company_id FROM public.properties WHERE id = $1";
    const propParams = [propertyId];
    const propRes = await db.query(propQuery, propParams);

    if (propRes.rows.length === 0) {
      return res.status(404).json({ message: "Target property not found." });
    }

    const propertyCompany = propRes.rows[0].company_id;
    if (managerCompany && propertyCompany !== managerCompany) {
      return res.status(403).json({
        message: "You can only assign properties belonging to your company workspace.",
      });
    }

    // Insert assignment with strictly server-derived audit values
    const insertSql = `
      INSERT INTO public.property_owners (
        company_id, property_id, owner_id, ownership_percentage,
        is_primary_contact, payout_account, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, true, NULL, $5, $5)
      RETURNING *
    `;

    const insertRes = await db.query(insertSql, [
      propertyCompany,
      propertyId,
      ownerId.trim(),
      percentage,
      managerId,
    ]);

    return res.status(201).json({
      message: "Property ownership assigned successfully.",
      assignment: insertRes.rows[0],
    });
  } catch (error) {
    console.error("Assign ownership error:", error);
    if (error.code === "23505") {
      return res.status(409).json({
        message: "This owner is already assigned to this property.",
      });
    }
    // Handle trigger validation exception (> 100%)
    if (error.message && error.message.includes("Total ownership percentage for property")) {
      return res.status(409).json({
        message: error.message,
      });
    }
    return res.status(500).json(db.formatDbError("assign property ownership", error));
  }
});

router.maskPayoutAccount = maskPayoutAccount;
router.formatOwnedProperty = formatOwnedProperty;
module.exports = router;

