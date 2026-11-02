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
const isProduction = process.env.NODE_ENV === "production";
const defaultOrigins = [
  "https://propertyse-v1.web.app",
  "https://propertyse-v1.firebaseapp.com",
];

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Filter out wildcard '*' in production to prevent arbitrary origins with credentials
const allowedOrigins = Array.from(
  new Set([
    ...defaultOrigins,
    ...configuredOrigins.filter((o) => !isProduction || o !== "*"),
  ])
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as curl, mobile apps, or server-to-server health checks)
      if (!origin) {
        return callback(null, true);
      }

      // Explicitly allow configured production origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Outside of production, allow local development origins
      if (
        !isProduction &&
        (/^http:\/\/localhost(:\d+)?$/.test(origin) ||
          /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }

      // Reject all unauthorized origins
      const corsError = new Error(`CORS policy violation: Origin '${origin}' is not allowed.`);
      corsError.status = 403;
      return callback(corsError, false);
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    optionsSuccessStatus: 204,
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
    console.error("Health check error:", err);
    return res.status(500).json({
      status: "error",
      message: isProduction ? "Health check evaluation failed." : err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Safe database diagnostic endpoint (no credentials or passwords exposed)
app.get("/api/db-diagnostics", async (_req, res) => {
  try {
    const health = await db.checkHealth();
    return res.status(200).json({
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
            rawError: !isProduction ? health.rawError : undefined,
          },
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: isProduction ? "Database diagnostic query failed." : err.message,
    });
  }
});

// 404 handler for unhandled routes
app.use((_req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

// Centralized error handler
app.use((err, _req, res, _next) => {
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      status: "error",
      message: err.message,
    });
  }

  console.error("Unhandled server error:", err);
  res.status(500).json({
    message: "Internal server error.",
    error: !isProduction ? err.message : undefined,
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

  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log("HTTP server closed.");
      await db.closePool();
      console.log("PostgreSQL connection pool closed.");
      process.exit(0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
