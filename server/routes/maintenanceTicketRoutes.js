const express = require("express");
const supabase = require("../config/supabaseClient");
const router = express.Router();
const CATEGORIES = ["Plumbing", "Electrical", "Air Conditioning", "Appliance", "Cleaning", "Structural", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["Open", "In Progress", "Resolved"];
const isUuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const allowed = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{2,64}$/.test(value.trim());
function formatTicket(row) {
  return { id: row.id, _id: row.id, companyId: row.company_id, propertyId: row.property_id, unitNumber: row.unit_number, tenantName: row.tenant_name, category: row.category, description: row.description, priority: row.priority, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

router.get("/", async (req, res) => {
  try {
    const company = typeof req.query.companyId === "string" ? req.query.companyId.trim() : "";
    if (!allowed(company)) return res.status(400).json({ message: "companyId must be a valid company ID." });
    const { data, error } = await supabase.from("maintenance_tickets").select("*").eq("company_id", company).order("created_at", { ascending: false });
    if (error) throw error;
    return res.status(200).json({ count: (data || []).length, tickets: (data || []).map(formatTicket) });
  } catch (error) {
    console.error("Get maintenance tickets error:", error);
    return res.status(500).json({ message: "Could not load maintenance tickets. Confirm the Supabase migration has been applied." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { companyId, propertyId, category, description, priority = "Medium" } = req.body || {};
    const company = typeof companyId === "string" ? companyId.trim() : "";
    if (!allowed(company)) return res.status(400).json({ message: "companyId must be a valid company ID." });
    if (!isUuid(propertyId)) return res.status(400).json({ message: "A valid propertyId is required." });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ message: "Select a valid maintenance category." });
    if (typeof description !== "string" || !description.trim() || description.trim().length > 2000) return res.status(400).json({ message: "Description is required and must be 2000 characters or fewer." });
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ message: "Select a valid priority." });
    const { data: property, error: propertyError } = await supabase.from("properties").select("*").eq("id", propertyId).eq("company_id", company).maybeSingle();
    if (propertyError) throw propertyError;
    if (!property) return res.status(404).json({ message: "Flat not found for this company." });
    if (property.status === "Vacant" || !property.tenant_full_name?.trim() || !property.tenant_phone?.trim()) return res.status(409).json({ message: "Only a flat with an assigned tenant can raise a maintenance ticket." });
    const ticketRow = { company_id: company, property_id: property.id, unit_number: property.unit_number, tenant_name: property.tenant_full_name.trim(), category, description: description.trim(), priority, status: "Open" };
    const { data: ticket, error: ticketError } = await supabase.from("maintenance_tickets").insert(ticketRow).select().single();
    if (ticketError) throw ticketError;
    const { error: updateError } = await supabase.from("properties").update({ status: "Maintenance", vacant_since: null, updated_at: new Date().toISOString() }).eq("id", property.id).eq("company_id", company);
    if (updateError) throw updateError;
    return res.status(201).json({ message: "Maintenance ticket submitted successfully.", ticket: formatTicket(ticket) });
  } catch (error) {
    console.error("Create maintenance ticket error:", error);
    return res.status(500).json({ message: "Could not submit maintenance ticket." });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const company = typeof req.body?.companyId === "string" ? req.body.companyId.trim() : typeof req.query.companyId === "string" ? req.query.companyId.trim() : "";
    const { status } = req.body || {};
    if (!allowed(company)) return res.status(400).json({ message: "companyId must be a valid company ID." });
    if (!isUuid(id)) return res.status(400).json({ message: "Invalid ticket ID." });
    if (!STATUSES.includes(status)) return res.status(400).json({ message: "Status must be Open, In Progress, or Resolved." });
    const { data: ticket, error } = await supabase.from("maintenance_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id).eq("company_id", company).select().maybeSingle();
    if (error) throw error;
    if (!ticket) return res.status(404).json({ message: "Maintenance ticket not found for this company." });
    if (status === "Resolved") {
      const { data: unfinished, error: unfinishedError } = await supabase.from("maintenance_tickets").select("id").eq("property_id", ticket.property_id).eq("company_id", company).in("status", ["Open", "In Progress"]);
      if (unfinishedError) throw unfinishedError;
      if (!unfinished?.length) {
        const { data: property, error: propertyError } = await supabase.from("properties").select("id, status, tenant_full_name, tenant_phone").eq("id", ticket.property_id).eq("company_id", company).maybeSingle();
        if (propertyError) throw propertyError;
        if (property && property.status === "Maintenance") {
          const hasTenant = Boolean(property.tenant_full_name?.trim() && property.tenant_phone?.trim());
          const { error: restoreError } = await supabase.from("properties").update({ status: hasTenant ? "Occupied" : "Vacant", vacant_since: hasTenant ? null : new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", property.id).eq("company_id", company);
          if (restoreError) throw restoreError;
        }
      }
    } else {
      await supabase.from("properties").update({ status: "Maintenance", vacant_since: null, updated_at: new Date().toISOString() }).eq("id", ticket.property_id).eq("company_id", company);
    }
    return res.status(200).json({ message: "Maintenance ticket status updated successfully.", ticket: formatTicket(ticket) });
  } catch (error) {
    console.error("Update maintenance ticket error:", error);
    return res.status(500).json({ message: "Could not update maintenance ticket status." });
  }
});

module.exports = router;
