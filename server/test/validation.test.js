const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../server");

describe("PropertySE API & Validation Tests", () => {
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

  test("GET / should return service running and Supabase PostgreSQL info", async () => {
    const { status, data } = await request("/");
    assert.equal(status, 200);
    assert.equal(data.database, "Supabase PostgreSQL");
    assert.equal(data.status, "ok");
  });

  test("GET /api/health should report database status honestly", async () => {
    const { status, data } = await request("/api/health");
    // When DATABASE_URL is not set or unreachable, returns 503 degraded
    if (process.env.DATABASE_URL) {
      assert.ok([200, 503].includes(status));
    } else {
      assert.equal(status, 503);
      assert.equal(data.status, "degraded");
      assert.equal(data.database, "disconnected");
    }
  });

  test("GET /api/db-diagnostics should safely report diagnostics without leaking credentials", async () => {
    const { status, data } = await request("/api/db-diagnostics");
    assert.equal(status, 200);
    assert.ok(data.timestamp);
    assert.ok(typeof data.connected === "boolean");
    assert.ok(data.diagnostics);
    // Ensure no password field exists
    assert.equal(data.diagnostics.password, undefined);
  });

  test("POST /api/properties should reject invalid unit number (non-integer)", async () => {
    const { status, data } = await request("/api/properties", {
      method: "POST",
      body: JSON.stringify({
        companyId: "COMP_001",
        propertyName: "Oak Tower",
        buildingNumber: "A",
        unitNumber: "abc",
        annualRent: 120000,
      }),
    });
    assert.equal(status, 400);
    assert.equal(data.message, "Unit number must be an integer between 1 and 20.");
  });

  test("POST /api/properties should reject unit number > 20", async () => {
    const { status, data } = await request("/api/properties", {
      method: "POST",
      body: JSON.stringify({
        companyId: "COMP_001",
        propertyName: "Oak Tower",
        buildingNumber: "A",
        unitNumber: "21",
        annualRent: 120000,
      }),
    });
    assert.equal(status, 400);
    assert.equal(data.message, "Unit number must be an integer between 1 and 20.");
  });

  test("POST /api/properties should reject unit number < 1", async () => {
    const { status, data } = await request("/api/properties", {
      method: "POST",
      body: JSON.stringify({
        companyId: "COMP_001",
        propertyName: "Oak Tower",
        buildingNumber: "A",
        unitNumber: "0",
        annualRent: 120000,
      }),
    });
    assert.equal(status, 400);
    assert.equal(data.message, "Unit number must be an integer between 1 and 20.");
  });

  test("POST /api/properties should reject negative annual rent", async () => {
    const { status, data } = await request("/api/properties", {
      method: "POST",
      body: JSON.stringify({
        companyId: "COMP_001",
        propertyName: "Oak Tower",
        buildingNumber: "A",
        unitNumber: "5",
        annualRent: -5000,
      }),
    });
    assert.equal(status, 400);
    assert.equal(data.message, "Provide valid rent and recommendation details.");
  });

  test("POST /api/properties should reject invalid unit status", async () => {
    const { status, data } = await request("/api/properties", {
      method: "POST",
      body: JSON.stringify({
        companyId: "COMP_001",
        propertyName: "Oak Tower",
        buildingNumber: "A",
        unitNumber: "5",
        annualRent: 120000,
        status: "Archived",
      }),
    });
    assert.equal(status, 400);
    assert.equal(data.message, "Invalid unit status.");
  });

  test("PATCH /api/properties/:id/rent should reject negative rent", async () => {
    const { status, data } = await request(
      "/api/properties/11111111-1111-4111-8111-111111111111/rent",
      {
        method: "PATCH",
        body: JSON.stringify({
          companyId: "COMP_001",
          annualRent: -1,
        }),
      }
    );
    assert.equal(status, 400);
    assert.equal(data.message, "Annual rent must be a non-negative number.");
  });

  test("POST /api/maintenance-tickets should reject invalid category", async () => {
    const { status, data } = await request("/api/maintenance-tickets", {
      method: "POST",
      body: JSON.stringify({
        companyId: "COMP_001",
        propertyId: "11111111-1111-4111-8111-111111111111",
        category: "InvalidCategory",
        description: "Broken heater",
        priority: "High",
      }),
    });
    assert.equal(status, 400);
    assert.equal(data.message, "Select a valid maintenance category.");
  });

  test("POST /api/companies should reject invalid company ID formatting", async () => {
    const { status, data } = await request("/api/companies", {
      method: "POST",
      body: JSON.stringify({
        id: "!",
        name: "Test Company",
      }),
    });
    assert.equal(status, 400);
    assert.match(data.message, /Provide a company ID/);
  });
});

