const { Pool, types } = require("pg");
require("dotenv").config();

// Ensure DATE columns (PostgreSQL oid 1082) are returned as 'YYYY-MM-DD' strings
// to avoid local timezone shifts during date serialization.
types.setTypeParser(1082, (val) => val);

// Ensure NUMERIC columns (PostgreSQL oid 1700) are returned as floating numbers.
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

const connectionString = process.env.DATABASE_URL || "";

// Supabase managed databases require SSL. Allow disabling rejectUnauthorized
// to support Supabase shared pooler and direct certificates.
const requiresSsl = Boolean(
  connectionString &&
    (process.env.NODE_ENV === "production" ||
      /supabase\.(co|com)/i.test(connectionString) ||
      /[?&]sslmode=require/i.test(connectionString))
);

const poolConfig = {
  connectionString: connectionString || undefined,
  max: parseInt(process.env.PG_MAX_CONNECTIONS || "10", 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

if (requiresSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err.message);
});

/**
 * Execute a parameterized query.
 * @param {string} text - SQL statement with $1, $2 placeholders
 * @param {Array} [params] - Array of parameter values
 */
async function query(text, params) {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured in environment variables. Please configure your Supabase connection string."
    );
  }
  return pool.query(text, params);
}

/**
 * Obtain a dedicated client from the pool (for transactions).
 */
async function getClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured in environment variables. Please configure your Supabase connection string."
    );
  }
  return pool.connect();
}

/**
 * Check the database connection health.
 */
async function checkHealth() {
  if (!process.env.DATABASE_URL) {
    return {
      connected: false,
      message: "DATABASE_URL environment variable is missing",
    };
  }

  try {
    const result = await pool.query(
      "SELECT 1 AS health, current_database() AS db, version() AS version"
    );
    return {
      connected: true,
      database: result.rows[0]?.db,
      version: result.rows[0]?.version,
      healthy: result.rows[0]?.health === 1,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

module.exports = {
  pool,
  query,
  getClient,
  checkHealth,
};

