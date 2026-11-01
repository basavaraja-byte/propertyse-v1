const express = require("express");
const cors = require("cors");
require("dotenv").config();

const propertyRoutes = require("./routes/propertyRoutes");
const maintenanceTicketRoutes = require("./routes/maintenanceTicketRoutes");
const companyRoutes = require("./routes/companyRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/api/properties", propertyRoutes);
app.use("/api/maintenance-tickets", maintenanceTicketRoutes);
app.use("/api/companies", companyRoutes);
app.get("/", (_req, res) => res.json({ message: "PropertySE API is running", database: "Supabase" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`PropertySE API running on http://localhost:${PORT}`));
