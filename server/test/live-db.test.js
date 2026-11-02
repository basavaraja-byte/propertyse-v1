const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../server");
const db = require("../config/db");

describe("Live Supabase PostgreSQL Integration Tests", () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.pool.end();
  });

  async function request(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  test("GET /api/health returns database connected and healthy", async () => {
    const { status, data } = await request("/api/health");
    assert.equal(status, 200);
    assert.equal(data.status, "ok");
    assert.equal(data.database, "connected");
    assert.equal(data.databaseName, "postgres");
    assert.equal(data.diagnostics.connectionType, "supabase_pooler_session");
  });

  test("GET /api/db-diagnostics returns connected and pooler session info", async () => {
    const { status, data } = await request("/api/db-diagnostics");
    assert.equal(status, 200);
    assert.equal(data.connected, true);
    assert.equal(data.status, "connected");
    assert.equal(data.diagnostics.host, "aws-0-ap-northeast-1.pooler.supabase.com");
    assert.equal(data.diagnostics.port, "5432");
    assert.equal(data.diagnostics.hasProjectInUsername, true);
  });

  test("GET /api/companies returns registered companies including COMP_001", async () => {
    const { status, data } = await request("/api/companies");
    assert.equal(status, 200);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 2);
    const comp1 = data.find((c) => c.id === "COMP_001");
    assert.ok(comp1);
    assert.equal(comp1.name, "Sunrise Property Group");
  });

  test("GET /api/properties?companyId=COMP_001 returns actual properties", async () => {
    const { status, data } = await request("/api/properties?companyId=COMP_001");
    assert.equal(status, 200);
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    const sample = data[0];
    assert.ok(sample.id);
    assert.ok(sample._id);
    assert.equal(sample.companyId, "COMP_001");
    assert.ok(sample.propertyName);
    assert.ok(sample.unitNumber);
    assert.ok(typeof sample.annualRent === "number");
    assert.ok(["Vacant", "Occupied", "Maintenance"].includes(sample.status));
    assert.ok(sample.tenant);
  });

  test("GET /api/maintenance-tickets?companyId=COMP_001 returns tickets", async () => {
    const { status, data } = await request("/api/maintenance-tickets?companyId=COMP_001");
    assert.equal(status, 200);
    assert.ok(typeof data.count === "number");
    assert.ok(Array.isArray(data.tickets));
  });
});
