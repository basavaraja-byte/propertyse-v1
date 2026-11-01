const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
const propertyRoutes = require("./routes/propertyRoutes");
const maintenanceTicketRoutes = require("./routes/maintenanceTicketRoutes");
const companyRoutes = require("./routes/companyRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

// Configure CORS
const rawOrigins =
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,https://propertyse-v1.web.app,https://propertyse-v1.firebaseapp.com";

const allowedOrigins = rawOrigins
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as curl, mobile apps, or server-to-server)
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      // In development, allow localhost origins
      if (
        process.env.NODE_ENV !== "production" &&
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

// Mount application API routes
app.use("/api/properties", propertyRoutes);
app.use("/api/maintenance-tickets", maintenanceTicketRoutes);
app.use("/api/companies", companyRoutes);

// Root health and status endpoint
app.get("/", (_req, res) => {
  res.json({
    message: "PropertySE API is running",
    database: "Supabase PostgreSQL",
    service: "Render Web Service",
    status: "ok",
  });
});

// Deep health check endpoint
app.get("/api/health", async (_req, res) => {
  try {
    const health = await db.checkHealth();
    if (health.connected) {
      return res.status(200).json({
        status: "ok",
        database: "connected",
        databaseName: health.database,
        diagnostics: health.diagnostics,
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(503).json({
      status: "degraded",
      database: "disconnected",
      category: health.errorCategory,
      summary: health.errorSummary,
      detail: health.errorDetail,
      advice: health.advice,
      diagnostics: health.diagnostics,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Safe database diagnostic endpoint (no credentials or passwords exposed)
app.get("/api/db-diagnostics", async (_req, res) => {
  try {
    const health = await db.checkHealth();
    return res.json({
      timestamp: new Date().toISOString(),
      connected: health.connected,
      status: health.connected ? "connected" : "disconnected",
      diagnostics: health.diagnostics,
      troubleshooting: health.connected
        ? "Database connection is healthy and ready for queries."
        : {
            errorCategory: health.errorCategory,
            summary: health.errorSummary,
            detail: health.errorDetail,
            recommendedAction: health.advice,
            rawError: health.rawError,
          },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 404 handler for unhandled routes
app.use((_req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

// Centralized error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    message: "Internal server error.",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

async function startServer() {
  console.log("Checking Supabase PostgreSQL connection...");
  const health = await db.checkHealth();

  if (health.connected) {
    console.log(
      `✓ Supabase PostgreSQL connected successfully (database: ${health.database})`
    );
  } else {
    console.warn("==========================================================");
    console.warn(`⚠ Database connection notice: ${health.errorSummary || health.message}`);
    if (health.errorCategory) {
      console.warn(`  Category: ${health.errorCategory}`);
      console.warn(`  Detail:   ${health.errorDetail}`);
      console.warn(`  Advice:   ${health.advice}`);
    }
    if (health.diagnostics?.warnings?.length) {
      console.warn("  Diagnostics Warnings:");
      health.diagnostics.warnings.forEach((w) => console.warn(`   • ${w}`));
    }
    console.warn("==========================================================");
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`PropertySE API listening on http://${HOST}:${PORT}`);
  });

  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
