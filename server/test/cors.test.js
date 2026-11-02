const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../server");
const db = require("../config/db");

describe("CORS Policy & Origin Security Tests", () => {
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
    await db.closePool();
  });

  test("Approved origin https://propertyse-v1.web.app is allowed with credentials", async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: "https://propertyse-v1.web.app",
      },
    });

    assert.equal(
      res.headers.get("access-control-allow-origin"),
      "https://propertyse-v1.web.app"
    );
    assert.equal(
      res.headers.get("access-control-allow-credentials"),
      "true"
    );
  });

  test("Approved origin https://propertyse-v1.firebaseapp.com is allowed", async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: "https://propertyse-v1.firebaseapp.com",
      },
    });

    assert.equal(
      res.headers.get("access-control-allow-origin"),
      "https://propertyse-v1.firebaseapp.com"
    );
  });

  test("OPTIONS preflight for approved origin returns 204 with allowed methods", async () => {
    const res = await fetch(`${baseUrl}/api/properties`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://propertyse-v1.web.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
      },
    });

    assert.equal(res.status, 204);
    assert.equal(
      res.headers.get("access-control-allow-origin"),
      "https://propertyse-v1.web.app"
    );
    assert.ok(
      res.headers.get("access-control-allow-methods")?.includes("POST")
    );
  });

  test("Unapproved origin is rejected with 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: "https://unauthorized-attacker.example.com",
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.message?.includes("CORS policy violation"));
    assert.equal(res.headers.get("access-control-allow-origin"), null);
  });

  test("No-origin request (curl / server-to-server) is allowed without CORS rejection", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.ok([200, 503].includes(res.status));
  });
});

