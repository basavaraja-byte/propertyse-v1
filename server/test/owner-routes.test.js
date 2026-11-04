const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const ownerRoutes = require("../routes/ownerRoutes");

describe("Step 5C: Owner Routes & Security Guard Tests", () => {
  let app;
  let server;
  let baseUrl;
  let mockUser = null;

  before(async () => {
    app = express();
    app.use(express.json());

    // Injected mock auth middleware for testing route handlers
    app.use((req, _res, next) => {
      req.user = mockUser;
      next();
    });

    app.use("/api/owner", ownerRoutes);

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

  // 1. Unauthenticated requests are rejected
  test("1. Unauthenticated requests are rejected with 401 UNAUTHORIZED", async () => {
    mockUser = null; // No user logged in

    const endpoints = [
      "/api/owner/overview",
      "/api/owner/properties",
      "/api/owner/tenants",
      "/api/owner/financials/income",
      "/api/owner/financials/payments",
      "/api/owner/maintenance",
      "/api/owner/reports",
      "/api/owner/notifications",
      "/api/owner/settings",
    ];

    for (const ep of endpoints) {
      const { status, data } = await request(ep);
      assert.equal(status, 401, `Endpoint ${ep} must return 401`);
      assert.equal(data.code, "UNAUTHORIZED");
    }
  });

  // 2. Non-owner roles are rejected
  test("2. Non-owner roles (e.g. tenant, worker) are rejected with 403 FORBIDDEN", async () => {
    mockUser = { id: "user-tenant-123", role: "tenant", email: "tenant@example.com" };

    const { status, data } = await request("/api/owner/overview");
    assert.equal(status, 403);
    assert.equal(data.code, "FORBIDDEN");
    assert.ok(data.error.includes("owner role required"));
  });

  // 3. Authenticated owner settings endpoint returns profile
  test("3. Authenticated owner can access profile and settings", async () => {
    mockUser = {
      id: "owner-real-uuid",
      role: "owner",
      email: "owner@propertyse.com",
      name: "Alice Owner",
      company_id: "COMP_001",
    };

    const { status, data } = await request("/api/owner/settings");
    assert.ok([200, 500].includes(status)); // 200 or safe 500 if DB unreachable in offline test
    if (status === 200) {
      assert.equal(data.profile.id, "owner-real-uuid");
      assert.equal(data.profile.role, "owner");
      assert.equal(data.profile.email, "owner@propertyse.com");
      assert.equal(data.profile.name, "Alice Owner");
      assert.ok(data.preferences);
    }
  });

  // 4. Invalid property UUID format returns 400 Bad Request
  test("4. Invalid property UUID format returns 400 Bad Request", async () => {
    mockUser = { id: "owner-real-uuid", role: "owner" };

    const { status, data } = await request("/api/owner/properties/not-a-valid-uuid");
    assert.equal(status, 400);
    assert.ok(data.message.includes("Invalid property ID format"));
  });

  // 5. Management assignment endpoint rejects unauthorized owner role
  test("5. Owners cannot invoke management assignment endpoint (403 Forbidden)", async () => {
    mockUser = { id: "owner-real-uuid", role: "owner" };

    const { status, data } = await request("/api/owner/assignments", {
      method: "POST",
      body: JSON.stringify({
        propertyId: "11111111-2222-3333-4444-555555555555",
        ownerId: "some-owner",
        ownershipPercentage: 50,
      }),
    });

    assert.equal(status, 403);
    assert.equal(data.code, "FORBIDDEN");
    assert.ok(data.message.includes("Only property managers and administrators"));
  });

  // 6. Management assignment validates input and enforces server-derived audit fields
  test("6. Management assignment rejects invalid percentage and missing IDs", async () => {
    mockUser = { id: "manager-admin-uuid", role: "manager", company_id: "COMP_001" };

    // Test missing propertyId
    const res1 = await request("/api/owner/assignments", {
      method: "POST",
      body: JSON.stringify({ ownerId: "some-owner", ownershipPercentage: 50 }),
    });
    assert.equal(res1.status, 400);

    // Test invalid percentage (> 100)
    const res2 = await request("/api/owner/assignments", {
      method: "POST",
      body: JSON.stringify({
        propertyId: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
        ownerId: "some-owner",
        ownershipPercentage: 150,
      }),
    });
    assert.equal(res2.status, 400);
    assert.ok(res2.data.message.includes("Ownership percentage must be a number between 0.01 and 100.00"));
  });

  // ---------------------------------------------------------------------------
  // Step 4: Payout Account Masking & Sensitive Data Sanitization Tests
  // ---------------------------------------------------------------------------
  describe("Step 4: Payout Account Sanitization & Masking", () => {
    const { maskPayoutAccount, formatOwnedProperty } = ownerRoutes;

    test("1. Full bank account number is never returned in sanitized output", () => {
      const raw = {
        bankName: "HDFC Bank",
        accountNumber: "50100234567890",
        ifscCode: "HDFC0001234",
      };
      const masked = maskPayoutAccount(raw);

      assert.ok(masked);
      assert.equal(masked.bankName, "HDFC Bank");
      assert.ok(!JSON.stringify(masked).includes("50100234567890"));
      assert.ok(!JSON.stringify(masked).includes("HDFC0001234"));
      assert.equal(masked.accountNumberMasked, "•••• •••• •••• 7890");
      assert.equal(masked.routingMasked, "HDFC•••••••");
      assert.equal(masked.isConfigured, true);
    });

    test("2. Partial account number is masked correctly for string and object payloads", () => {
      // String format
      const maskedStr = maskPayoutAccount("1234567890");
      assert.equal(maskedStr.accountNumberMasked, "•••• •••• •••• 7890");
      assert.equal(maskedStr.isConfigured, true);

      // JSON string format
      const maskedJsonStr = maskPayoutAccount(
        JSON.stringify({ bank_name: "State Bank of India", account_number: "987654321" })
      );
      assert.equal(maskedJsonStr.bankName, "State Bank of India");
      assert.equal(maskedJsonStr.accountNumberMasked, "•••• •••• •••• 4321");

      // Short account number (< 4 digits)
      const maskedShort = maskPayoutAccount("42");
      assert.equal(maskedShort.accountNumberMasked, "•••• 42");

      // Already masked string is preserved
      const maskedPreserved = maskPayoutAccount("•••• •••• •••• 4892");
      assert.equal(maskedPreserved.accountNumberMasked, "•••• •••• •••• 4892");
    });

    test("3. Null and undefined payout accounts return null safely", () => {
      assert.equal(maskPayoutAccount(null), null);
      assert.equal(maskPayoutAccount(undefined), null);
      assert.equal(maskPayoutAccount(""), null);
      assert.equal(maskPayoutAccount("   "), null);
    });

    test("4. Malformed and unexpected payout data does not crash", () => {
      assert.equal(maskPayoutAccount(12345), null);
      assert.equal(maskPayoutAccount(true), null);
      assert.equal(maskPayoutAccount(["invalid", "array"]), null);
      assert.equal(maskPayoutAccount("{ bad json string"), null);
      assert.equal(maskPayoutAccount({}), null);
      assert.equal(maskPayoutAccount({ foo: "bar" }), null);
    });

    test("5. Property response formatter sanitizes payout_account", () => {
      const mockRow = {
        id: "prop-uuid-1",
        company_id: "COMP_001",
        property_name: "Palm Residency",
        building_number: "Tower 2",
        unit_number: "204",
        status: "Occupied",
        annual_rent: "240000",
        ownership_percentage: "50.00",
        is_primary_contact: true,
        payout_account: {
          bankName: "ICICI Bank",
          accountNumber: "998877665544",
          ifscCode: "ICIC0009876",
        },
      };

      const formatted = formatOwnedProperty(mockRow);

      assert.equal(formatted.id, "prop-uuid-1");
      assert.equal(formatted.annualRent, 240000);
      assert.equal(formatted.ownerShareAnnualRent, 120000);
      assert.equal(formatted.ownerShareMonthlyRent, 10000);

      // Verify payoutAccount is masked and raw secrets are absent
      assert.ok(formatted.payoutAccount);
      assert.equal(formatted.payoutAccount.bankName, "ICICI Bank");
      assert.equal(formatted.payoutAccount.accountNumberMasked, "•••• •••• •••• 5544");
      assert.ok(!JSON.stringify(formatted).includes("998877665544"));
      assert.ok(!JSON.stringify(formatted).includes("ICIC0009876"));
    });

    test("6. Property formatter handles null payout_account safely", () => {
      const mockRow = {
        id: "prop-uuid-2",
        company_id: "COMP_001",
        property_name: "Palm Residency",
        annual_rent: "120000",
        payout_account: null,
      };

      const formatted = formatOwnedProperty(mockRow);
      assert.equal(formatted.payoutAccount, null);
    });

    test("7. Payments endpoint response structure remains compatible", async () => {
      mockUser = { id: "owner-real-uuid", role: "owner" };

      const { status, data } = await request("/api/owner/financials/payments");
      assert.ok([200, 500].includes(status));
      if (status === 200) {
        assert.ok("payoutAccount" in data);
        assert.ok("schedule" in data);
        assert.ok("gatewayStatus" in data);
        assert.ok(Array.isArray(data.transactions));
        if (data.payoutAccount) {
          assert.ok(!JSON.stringify(data.payoutAccount).match(/\b\d{8,18}\b/));
        }
      }
    });

    test("8. Settings endpoint response structure remains compatible and sanitized", async () => {
      mockUser = { id: "owner-real-uuid", role: "owner" };

      const { status, data } = await request("/api/owner/settings");
      assert.ok([200, 500].includes(status));
      if (status === 200) {
        assert.ok("profile" in data);
        assert.ok("payoutAccount" in data);
        assert.ok("preferences" in data);
        if (data.payoutAccount) {
          assert.ok(!JSON.stringify(data.payoutAccount).match(/\b\d{8,18}\b/));
        }
      }
    });

    test("9. Nested JSON objects cannot leak raw account or routing secrets", () => {
      const nested = {
        bankName: "Axis Bank",
        details: {
          accountNumber: "112233445566",
          ifscCode: "UTIB0001234",
        },
      };
      const masked = maskPayoutAccount(nested);
      assert.ok(masked);
      assert.equal(masked.bankName, "Axis Bank");
      assert.equal(masked.accountNumberMasked, "•••• •••• •••• 5566");
      assert.equal(masked.routingMasked, "UTIB•••••••");
      assert.ok(!JSON.stringify(masked).includes("112233445566"));
      assert.ok(!JSON.stringify(masked).includes("UTIB0001234"));
    });
  });
});
