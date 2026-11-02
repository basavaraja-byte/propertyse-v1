const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../config/db");

describe("PostgreSQL Pool SSL & Configuration Tests", () => {
  test("Pool options configure SSL with rejectUnauthorized: false for Supabase pooler", () => {
    assert.ok(db.pool.options.ssl, "SSL must be enabled for Supabase connection");
    assert.equal(
      typeof db.pool.options.ssl,
      "object",
      "SSL must be configured as an object"
    );
    assert.equal(
      db.pool.options.ssl.rejectUnauthorized,
      false,
      "rejectUnauthorized must be strictly false to allow Supabase intermediate pooler certificates"
    );
  });

  test("Pool does not carry unparsed connectionString that could override SSL options", () => {
    assert.equal(
      db.pool.options.connectionString,
      undefined,
      "connectionString should be undefined so pg ConnectionParameters does not re-parse and clobber SSL"
    );
  });

  test("Client instantiated from Pool preserves rejectUnauthorized: false at runtime", () => {
    const client = new db.pool.Client(db.pool.options);
    assert.ok(client.connectionParameters.ssl);
    assert.equal(client.connectionParameters.ssl.rejectUnauthorized, false);
  });

  test("Connection parameters target the Supabase Session Pooler host and port", () => {
    const details = db.getSafeConnectionDetails();
    if (details.configured) {
      assert.ok(
        details.host.includes("pooler.supabase.com"),
        "Host should be a Supabase pooler endpoint"
      );
      assert.equal(details.port, "5432", "Port should be 5432 for session pooling");
      assert.equal(details.sslConfigured, true, "SSL must be reported as configured");
    }
  });
});
