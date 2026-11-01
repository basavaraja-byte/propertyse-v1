
const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    message: "PropertySE API is running",
    database: "Supabase",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/properties", require("../server/routes/propertyRoutes"));
app.use(
  "/api/maintenance-tickets",
  require("../server/routes/maintenanceTicketRoutes")
);
app.use("/api/companies", require("../server/routes/companyRoutes"));

exports.api = onRequest(
  {
    maxInstances: 5,
    secrets: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  app
);