const express = require("express");
const supabase = require("../config/supabaseClient");
const router = express.Router();
const validId = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{2,64}$/.test(v.trim());

router.get("/", async (_req, res) => {
  try { const { data, error } = await supabase.from("companies").select("id,name").order("name"); if (error) throw error; res.json((data || []).map(c => ({ id: c.id, name: c.name }))); }
  catch (e) { console.error("List companies:", e); res.status(500).json({ message: "Could not load companies. Confirm public.companies has id and name columns." }); }
});
router.post("/", async (req, res) => {
  try { const id = String(req.body?.id || "").trim(); const name = String(req.body?.name || "").trim(); if (!validId(id) || !name || name.length > 120) return res.status(400).json({ message: "Provide a company ID (letters, numbers, _ or -) and a name up to 120 characters." });
    const { data, error } = await supabase.from("companies").insert({ id, name }).select("id,name").single(); if (error) { if (error.code === "23505") return res.status(409).json({ message: "That company ID already exists." }); throw error; } res.status(201).json(data);
  } catch (e) { console.error("Create company:", e); res.status(500).json({ message: "Could not add company. Check the companies table schema and related property foreign keys." }); }
});
router.delete("/:id", async (req, res) => {
  try { const id = req.params.id; if (!validId(id)) return res.status(400).json({ message: "Invalid company ID." });
    const { count, error: countError } = await supabase.from("properties").select("id", { count: "exact", head: true }).eq("company_id", id); if (countError) throw countError;
    if ((count || 0) > 0) return res.status(409).json({ message: "This company still has units. Move or remove its units before deleting the company." });
    const { error } = await supabase.from("companies").delete().eq("id", id); if (error) throw error; res.json({ message: "Company removed." });
  } catch (e) { console.error("Delete company:", e); res.status(500).json({ message: "Could not remove company." }); }
});
module.exports = router;
