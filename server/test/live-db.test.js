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

  test("GET /api/health reports accurate database status and diagnostics", async () => {
    const { status, data } = await request("/api/health");
    if (data.database === "connected") {
      assert.equal(status, 200);
      assert.equal(data.status, "ok");
      assert.equal(data.databaseName, "postgres");
    } else {
      assert.equal(status, 503);
      assert.equal(data.database, "disconnected");
      assert.ok(["AUTHENTICATION", "SSL", "TIMEOUT", "DNS", "NETWORK", "DATABASE_ERROR"].includes(data.category));
    }
    assert.equal(data.diagnostics.connectionType, "supabase_pooler_session");
  });

  test("GET /api/db-diagnostics returns safe diagnostics and pooler session info", async () => {
    const { status, data } = await request("/api/db-diagnostics");
    assert.equal(status, 200);
    assert.ok(typeof data.connected === "boolean");
    assert.equal(data.diagnostics.host, "aws-0-ap-northeast-1.pooler.supabase.com");
    assert.equal(data.diagnostics.port, "5432");
    assert.equal(data.diagnostics.hasProjectInUsername, true);
    assert.equal(data.diagnostics.password, undefined);
  });

  test("GET /api/companies handles database response safely", async (t) => {
    const { status, data } = await request("/api/companies");
    if (status === 200) {
      assert.ok(Array.isArray(data));
      assert.ok(data.length >= 2);
      const comp1 = data.find((c) => c.id === "COMP_001");
      assert.ok(comp1);
      assert.equal(comp1.name, "Sunrise Property Group");
    } else {
      assert.equal(status, 500);
      assert.ok(data.category);
      assert.ok(data.message.includes("companies"));
    }
  });

  test("GET /api/properties?companyId=COMP_001 handles database response safely", async () => {
    const { status, data } = await request("/api/properties?companyId=COMP_001");
    if (status === 200) {
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0);
      const sample = data[0];
      assert.ok(sample.id);
      assert.equal(sample.companyId, "COMP_001");
    } else {
      assert.equal(status, 500);
      assert.ok(data.category);
    }
  });

  test("GET /api/properties/:id handles single property lookup safely", async () => {
    const listRes = await request("/api/properties?companyId=COMP_001");
    if (listRes.status === 200 && Array.isArray(listRes.data) && listRes.data.length > 0) {
      const sampleId = listRes.data[0].id;
      const { status, data } = await request(`/api/properties/${sampleId}?companyId=COMP_001`);
      assert.equal(status, 200);
      assert.equal(data.id, sampleId);
    } else {
      // Test invalid UUID validation
      const { status, data } = await request("/api/properties/not-a-uuid?companyId=COMP_001");
      assert.equal(status, 400);
      assert.ok(data.message.includes("Invalid unit ID"));
    }
  });

  test("GET /api/maintenance-tickets?companyId=COMP_001 handles database response safely", async () => {
    const { status, data } = await request("/api/maintenance-tickets?companyId=COMP_001");
    if (status === 200) {
      assert.ok(typeof data.count === "number");
      assert.ok(Array.isArray(data.tickets));
    } else {
      assert.equal(status, 500);
      assert.ok(data.category);
    }
  });
});

