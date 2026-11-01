const express = require("express");
const db = require("../config/db");

const router = express.Router();

const validId = (v) =>
  typeof v === "string" && /^[A-Za-z0-9_-]{2,64}$/.test(v.trim());

// GET /api/companies - list all companies
router.get("/", async (_req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name FROM public.companies ORDER BY name ASC"
    );
    return res.status(200).json(result.rows.map((c) => ({ id: c.id, name: c.name })));
  } catch (error) {
    console.error("List companies error:", error);
    return res.status(500).json({
      message:
        "Could not load companies. Confirm public.companies table exists with id and name columns.",
    });
  }
});

// POST /api/companies - register a company
router.post("/", async (req, res) => {
  try {
    const id = String(req.body?.id || "").trim();
    const name = String(req.body?.name || "").trim();

    if (!validId(id) || !name || name.length > 120) {
      return res.status(400).json({
        message:
          "Provide a company ID (letters, numbers, _ or -) and a name up to 120 characters.",
      });
    }

    const result = await db.query(
      "INSERT INTO public.companies (id, name) VALUES ($1, $2) RETURNING id, name",
      [id, name]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create company error:", error);
    if (error.code === "23505") {
      return res.status(409).json({ message: "That company ID already exists." });
    }
    return res.status(500).json({
      message:
        "Could not add company. Check the companies table schema and related property foreign keys.",
    });
  }
});

// DELETE /api/companies/:id - delete a company if no units remain
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!validId(id)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }

    // Verify company has no existing units before allowing deletion
    const countResult = await db.query(
      "SELECT COUNT(*)::int AS count FROM public.properties WHERE company_id = $1",
      [id]
    );
    const count = countResult.rows[0]?.count || 0;

    if (count > 0) {
      return res.status(409).json({
        message:
          "This company still has units. Move or remove its units before deleting the company.",
      });
    }

    const deleteResult = await db.query(
      "DELETE FROM public.companies WHERE id = $1 RETURNING id",
      [id]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: "Company not found." });
    }

    return res.status(200).json({ message: "Company removed." });
  } catch (error) {
    console.error("Delete company error:", error);
    return res.status(500).json({ message: "Could not remove company." });
  }
});

module.exports = router;
