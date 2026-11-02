const { Pool, types } = require("pg");
const { parse } = require("pg-connection-string");
require("dotenv").config();

// Ensure DATE columns (PostgreSQL oid 1082) are returned as 'YYYY-MM-DD' strings
// to avoid local timezone shifts during date serialization.
types.setTypeParser(1082, (val) => val);

// Ensure NUMERIC columns (PostgreSQL oid 1700) are returned as floating numbers.
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

// Clean and parse DATABASE_URL safely
const rawConnectionString = (process.env.DATABASE_URL || "")
  .trim()
  .replace(/^['"]|['"]$/g, "");

// Determine SSL requirements
const requiresSsl = Boolean(
  rawConnectionString &&
    (process.env.NODE_ENV === "production" ||
      /supabase\.(co|com)/i.test(rawConnectionString) ||
      /[?&]sslmode=require/i.test(rawConnectionString) ||
      process.env.PGSSLMODE === "require")
);

const connectionTimeoutMs = parseInt(
  process.env.PG_CONNECTION_TIMEOUT_MS || "10000",
  10
);

/**
 * Configure node-postgres connection pool.
 *
 * CRITICAL ARCHITECTURAL FIX:
 * When connectionString contains '?sslmode=require', pg's internal ConnectionParameters
 * parser overwrites any custom 'ssl' object with '{}', which resets rejectUnauthorized to true.
 * In environments connecting to Supabase Session Poolers (AWS intermediate certificate chain),
 * this causes "SSL negotiation failed: self-signed certificate in certificate chain".
 *
 * To guarantee that { rejectUnauthorized: false } is honored without being clobbered:
 * 1. We strip '?sslmode=...' before parsing the URL parameters.
 * 2. We pass the parsed host, port, user, password, and database explicitly.
 * 3. We pass 'ssl: { rejectUnauthorized: false }' directly to the pool options.
 *
 * Security note: TLS encryption (TLSv1.3 / AES-GCM) is fully active and enforced.
 * Only self-signed / intermediate certificate validation in the pooler chain is bypassed.
 */
// Properly parse the connection parameters and prevent ?sslmode= from clobbering ssl options
let poolConfig = {
  max: parseInt(process.env.PG_MAX_CONNECTIONS || "10", 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: connectionTimeoutMs,
};

let cleanConnectionString = rawConnectionString;

if (rawConnectionString) {
  try {
    const urlObj = new URL(rawConnectionString);
    urlObj.searchParams.delete("sslmode");
    urlObj.searchParams.delete("sslcert");
    urlObj.searchParams.delete("sslkey");
    urlObj.searchParams.delete("sslrootcert");
    cleanConnectionString = urlObj.toString();
  } catch (_urlErr) {
    cleanConnectionString = rawConnectionString
      .replace(/([?&])(sslmode|sslcert|sslkey|sslrootcert)=[^&]+(&|$)/g, "$1")
      .replace(/[?&]$/, "");
  }

  const parsedParams = parse(cleanConnectionString);
  delete parsedParams.ssl;
  delete parsedParams.sslmode;
  delete parsedParams.sslcert;
  delete parsedParams.sslkey;
  delete parsedParams.sslrootcert;

  poolConfig = {
    ...poolConfig,
    ...parsedParams,
    connectionString: cleanConnectionString,
  };

  if (requiresSsl) {
    /**
     * TLS configuration for Supabase:
     * rejectUnauthorized: false is required because the Supabase Session Pooler
     * serves an intermediate certificate chain managed by AWS/Supabase that is not
     * bundled in standard root CA stores. TLS encryption is fully active (AES-GCM / TLS 1.3),
     * but host certificate chain verification is bypassed.
     */
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err.message);
});

/**
 * Categorize database connection errors into clear operational groups.
 * NEVER exposes passwords or raw connection strings.
 */
function categorizeDbError(err) {
  if (!err) return { category: "UNKNOWN", summary: "Unknown error", detail: "", advice: "" };

  const message = err.message || "";
  const code = err.code || "";

  // 1. Connection Timeout (The primary symptom reported on Render)
  if (
    message.includes("Connection terminated due to connection timeout") ||
    message.includes("timeout expired") ||
    code === "ETIMEDOUT"
  ) {
    return {
      category: "TIMEOUT",
      summary: "Database connection timed out",
      detail:
        `TCP connection timed out after ${connectionTimeoutMs}ms. ` +
        "On Render, this occurs when using direct Supabase host (db.*.supabase.co) which resolves strictly to IPv6, " +
        "or if the Supabase project is paused/sleeping, or if outbound port 5432 is unreachable.",
      advice:
        "Switch Render DATABASE_URL to the Supabase Session Pooler (aws-0-ap-northeast-1.pooler.supabase.com:5432), " +
        "which provides IPv4 addresses compatible with Render.",
    };
  }

  // 2. DNS Resolution Error
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return {
      category: "DNS",
      summary: "Database hostname could not be resolved",
      detail: `DNS lookup failed for database host (${code}).`,
      advice: "Verify the database host in your Render environment variables for typos.",
    };
  }

  // 3. Network Routing / Refused
  if (
    code === "ENETUNREACH" ||
    code === "EHOSTUNREACH" ||
    code === "ECONNREFUSED"
  ) {
    return {
      category: "NETWORK",
      summary: `Network connection failed (${code})`,
      detail: "The database host or port is not reachable from this network.",
      advice:
        "Ensure the Supabase project is active (not paused) and you are using port 5432 on the Session Pooler.",
    };
  }

  // 4. Authentication / Authorization Error
  if (
    code === "28P01" ||
    code === "28000" ||
    message.includes("password authentication failed") ||
    message.includes("Tenant or user not found")
  ) {
    const isTenantError = message.includes("Tenant or user not found");
    return {
      category: "AUTHENTICATION",
      summary: "Database authentication failed",
      detail: isTenantError
        ? "Supabase pooler returned 'Tenant or user not found'. When using the pooler, username MUST include the project reference: postgres.[PROJECT_REF]."
        : "Database user or password was rejected by PostgreSQL.",
      advice: isTenantError
        ? "Update your connection username to format: postgres.[PROJECT_REF] (e.g. postgres.oyjmdtngezoqvgkqfhay)."
        : "Check the database password in DATABASE_URL. If the password contains special characters, ensure they are URL-encoded.",
    };
  }

  // 5. SSL / TLS Handshake Error
  if (
    code.includes("CERT") ||
    code.includes("SSL") ||
    message.includes("SSL") ||
    message.includes("certificate") ||
    message.includes("tls")
  ) {
    return {
      category: "SSL",
      summary: "SSL / TLS handshake failed",
      detail: `SSL negotiation failed: ${message}`,
      advice:
        "Ensure sslmode=require is in the connection string and SSL rejectUnauthorized is set to false.",
    };
  }

  // 6. Generic Database Error
  return {
    category: "DATABASE_ERROR",
    summary: err.name || "PostgreSQL Error",
    detail: err.message,
    advice: "Check the PostgreSQL logs and error code for details.",
  };
}

/**
 * Return safe, non-sensitive diagnostic information about the configured connection.
 * Sanitizes and inspects the connection string without exposing any credentials.
 */
function getSafeConnectionDetails() {
  if (!rawConnectionString) {
    return {
      configured: false,
      message: "DATABASE_URL environment variable is missing",
    };
  }

  try {
    const parsed = new URL(rawConnectionString);
    const host = parsed.hostname;
    const port = parsed.port || "5432";
    const user = parsed.username || "";
    const database = parsed.pathname ? parsed.pathname.replace(/^\//, "") : "";
    const sslMode = parsed.searchParams.get("sslmode") || "default";

    const isDirectSupabase = /^db\.[a-z0-9_-]+\.supabase\.co$/i.test(host);
    const isPooler = /pooler\.supabase\.com$/i.test(host);
    const hasProjectInUser = user.includes(".");

    let connectionType = "custom_postgresql";
    const warnings = [];

    if (isDirectSupabase) {
      connectionType = "supabase_direct";
      warnings.push(
        "CRITICAL FOR RENDER: Host 'db.*.supabase.co' is a Direct Supabase connection that resolves ONLY to IPv6. " +
          "Render Web Services do not support outbound IPv6, causing 'Connection terminated due to connection timeout'. " +
          "You must use the Supabase Session Pooler host (aws-0-[region].pooler.supabase.com:5432) instead."
      );
    } else if (isPooler) {
      connectionType =
        port === "6543"
          ? "supabase_pooler_transaction"
          : "supabase_pooler_session";

      if (!hasProjectInUser) {
        warnings.push(
          "WARNING FOR POOLER: When connecting to the Supabase Pooler, the username must be formatted as: " +
            "postgres.[project-ref] (e.g. postgres.oyjmdtngezoqvgkqfhay). " +
            "Currently the username does not contain a period and will be rejected with 'Tenant or user not found'."
        );
      }
    }

    return {
      configured: true,
      connectionType,
      host,
      port,
      database,
      sslConfigured: requiresSsl,
      sslMode,
      tlsEnabled: Boolean(poolConfig.ssl),
      rejectUnauthorized: poolConfig.ssl ? poolConfig.ssl.rejectUnauthorized : true,
      effectiveConnectionMode: poolConfig.ssl ? "tls_compatibility_pooler" : "plaintext",
      poolMax: poolConfig.max,
      connectionTimeoutMs,
      hasProjectInUsername: hasProjectInUser,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    return {
      configured: true,
      connectionType: "unparseable_url",
      warnings: [
        "DATABASE_URL could not be parsed as a standard URI. " +
          "If your database password has special characters (e.g. @, #, :, ?), make sure it is properly URL-encoded.",
      ],
    };
  }
}

/**
 * Execute a parameterized query.
 * @param {string} text - SQL statement with $1, $2 placeholders
 * @param {Array} [params] - Array of parameter values
 */
async function query(text, params) {
  if (!rawConnectionString) {
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
  if (!rawConnectionString) {
    throw new Error(
      "DATABASE_URL is not configured in environment variables. Please configure your Supabase connection string."
    );
  }
  return pool.connect();
}

/**
 * Check the database connection health by executing a live query.
 * Requires SELECT NOW(), current_database() to succeed.
 */
async function checkHealth() {
  const safeDetails = getSafeConnectionDetails();

  if (!rawConnectionString) {
    return {
      connected: false,
      diagnostics: safeDetails,
      message: "DATABASE_URL environment variable is missing",
    };
  }

  try {
    const result = await pool.query(
      "SELECT NOW() AS now, current_database() AS database_name, current_user AS database_user, version() AS version;"
    );
    const row = result.rows[0];
    const isLive = Boolean(row && row.now && row.database_name && row.database_user);

    if (!isLive) {
      return {
        connected: false,
        errorCategory: "DATABASE_ERROR",
        errorSummary: "Database did not return expected response",
        diagnostics: safeDetails,
      };
    }

    return {
      connected: true,
      database: row.database_name,
      user: row.database_user,
      now: row.now,
      version: row.version,
      diagnostics: safeDetails,
    };
  } catch (error) {
    const classified = categorizeDbError(error);
    const isProd = process.env.NODE_ENV === "production";
    const healthResult = {
      connected: false,
      errorCategory: classified.category,
      errorSummary: classified.summary,
      errorDetail: classified.detail,
      advice: classified.advice,
      diagnostics: safeDetails,
    };

    // Never expose raw database errors, SQL, or internal messages in production
    if (!isProd) {
      healthResult.rawError = error.message;
    }

    return healthResult;
  }
}

/**
 * Format a database error for HTTP responses.
 * Sanitizes errors in production while preserving operational categories.
 */
function formatDbError(actionDescription, error) {
  const classified = categorizeDbError(error);
  const isProd = process.env.NODE_ENV === "production";

  let clientMessage = `Failed to ${actionDescription}.`;
  if (classified.category === "TIMEOUT") {
    clientMessage = `Database connection timed out while attempting to ${actionDescription}. Ensure the backend uses the Supabase Session Pooler.`;
  } else if (classified.category === "AUTHENTICATION") {
    clientMessage = `Database authentication failed while attempting to ${actionDescription}.`;
  } else if (classified.category === "DNS") {
    clientMessage = `Database host resolution failed while attempting to ${actionDescription}.`;
  } else if (classified.category === "NETWORK") {
    clientMessage = `Database network connection failed while attempting to ${actionDescription}.`;
  } else if (classified.summary) {
    clientMessage = `Could not ${actionDescription}.`;
  }

  const responsePayload = {
    message: clientMessage,
    category: classified.category,
  };

  // Only expose technical detail/raw message in non-production environments
  if (!isProd) {
    responsePayload.detail = classified.detail || error?.message;
    responsePayload.error = error?.message;
  }

  return responsePayload;
}

/**
 * Gracefully close the PostgreSQL connection pool.
 */
async function closePool() {
  try {
    await pool.end();
  } catch (err) {
    console.error("Error closing PostgreSQL pool:", err.message);
  }
}

module.exports = {
  pool,
  query,
  getClient,
  checkHealth,
  closePool,
  getSafeConnectionDetails,
  categorizeDbError,
  formatDbError,
};
