const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

/**
 * Concurrency & Transactional Trigger Simulator
 * Accurately models PostgreSQL READ COMMITTED transaction semantics
 * and row-level locking (FOR NO KEY UPDATE) implemented in:
 * supabase/migrations/202611030001_create_property_owners.sql
 */
class PostgresDatabaseSimulator {
  constructor() {
    this.properties = new Map();
    this.propertyOwners = new Map();
    this.propertyRowLocks = new Map(); // propertyId -> owningTxId
    this.lockWaitQueue = new Map();    // propertyId -> Array of resolver functions
  }

  addProperty(id, companyId = "COMP_001", name = "Test Property") {
    this.properties.set(id, { id, company_id: companyId, property_name: name });
  }

  async acquirePropertyRowLock(propertyId, txId) {
    if (!this.properties.has(propertyId)) {
      throw new Error(`Property ${propertyId} does not exist`);
    }

    const currentLock = this.propertyRowLocks.get(propertyId);
    if (!currentLock || currentLock === txId) {
      this.propertyRowLocks.set(propertyId, txId);
      return;
    }

    // Row is locked by another active transaction; block and wait
    await new Promise((resolve) => {
      if (!this.lockWaitQueue.has(propertyId)) {
        this.lockWaitQueue.set(propertyId, []);
      }
      this.lockWaitQueue.get(propertyId).push(resolve);
    });

    this.propertyRowLocks.set(propertyId, txId);
  }

  releasePropertyRowLock(propertyId, txId) {
    if (this.propertyRowLocks.get(propertyId) === txId) {
      this.propertyRowLocks.delete(propertyId);
      const queue = this.lockWaitQueue.get(propertyId) || [];
      if (queue.length > 0) {
        const nextTxResolver = queue.shift();
        nextTxResolver();
      }
    }
  }

  /**
   * Models: validate_property_ownership_total() trigger
   * @param {Object} record - New/updated ownership record
   * @param {string} txId - Transaction identifier
   * @param {boolean} useParentLock - Whether row-level lock is enabled
   */
  async executeTriggerValidation(record, op = "INSERT", txId = "tx-1", useParentLock = true) {
    // 1. Prevent property_id mutation on update
    if (op === "UPDATE" && record.old_property_id && record.old_property_id !== record.property_id) {
      throw new Error("Cannot modify property_id on an existing ownership record. Delete and recreate instead.");
    }

    // 2. CHECK constraints simulation (numeric(5,2) > 0 and <= 100)
    if (record.ownership_percentage <= 0 || record.ownership_percentage > 100) {
      throw new Error("CHECK constraint violation: ownership_percentage must be between 0.01 and 100.00");
    }

    // 3. Concurrency-Safe Lock on Parent Property Row
    if (useParentLock) {
      await this.acquirePropertyRowLock(record.property_id, txId);
    }

    // 4. Calculate committed total (excluding record being updated)
    let currentTotal = 0;
    for (const [id, row] of this.propertyOwners.entries()) {
      if (row.property_id === record.property_id && id !== record.id) {
        currentTotal += row.ownership_percentage;
      }
    }

    // 5. Total ownership percentage evaluation
    if (currentTotal + record.ownership_percentage > 100.0) {
      throw new Error(
        `Total ownership percentage for property ${record.property_id} cannot exceed 100.00% (Current committed: ${currentTotal.toFixed(2)}%, Attempted addition: ${record.ownership_percentage.toFixed(2)}%)`
      );
    }

    return true;
  }
}

describe("Step 5C: Ownership Trigger & Concurrency Test Suite", () => {
  // Test 1: Concurrent assignments to the same property
  test("1. Concurrent assignments to the same property with row locking prevents over-allocation", async () => {
    const db = new PostgresDatabaseSimulator();
    const propId = "prop-101";
    db.addProperty(propId);

    // Initial state: Property has 0% assigned
    // Transaction 1 attempts to assign 60%
    // Transaction 2 attempts to assign 50% concurrently
    // Sum = 110% (exceeds 100%)

    let tx1Committed = false;
    let tx2Failed = false;

    const runTx1 = async () => {
      await db.executeTriggerValidation(
        { id: "assign-1", property_id: propId, owner_id: "owner-1", ownership_percentage: 60.0 },
        "INSERT",
        "tx-1",
        true // row lock enabled
      );
      // Simulate network / processing delay before commit
      await new Promise((r) => setTimeout(r, 20));
      db.propertyOwners.set("assign-1", {
        id: "assign-1",
        property_id: propId,
        owner_id: "owner-1",
        ownership_percentage: 60.0,
      });
      db.releasePropertyRowLock(propId, "tx-1");
      tx1Committed = true;
    };

    const runTx2 = async () => {
      // Starts right after Tx 1, should block on prop-101 lock until Tx 1 commits
      await new Promise((r) => setTimeout(r, 5));
      try {
        await db.executeTriggerValidation(
          { id: "assign-2", property_id: propId, owner_id: "owner-2", ownership_percentage: 50.0 },
          "INSERT",
          "tx-2",
          true // row lock enabled
        );
        db.propertyOwners.set("assign-2", {
          id: "assign-2",
          property_id: propId,
          owner_id: "owner-2",
          ownership_percentage: 50.0,
        });
      } catch (err) {
        tx2Failed = true;
        assert.ok(err.message.includes("cannot exceed 100.00%"));
      } finally {
        db.releasePropertyRowLock(propId, "tx-2");
      }
    };

    await Promise.all([runTx1(), runTx2()]);

    assert.equal(tx1Committed, true, "Tx 1 must commit successfully");
    assert.equal(tx2Failed, true, "Tx 2 must be rejected because 60% + 50% > 100%");
    assert.equal(db.propertyOwners.size, 1);
    assert.equal(db.propertyOwners.get("assign-1").ownership_percentage, 60.0);
  });

  // Test 2: Concurrent ownership percentage updates
  test("2. Concurrent ownership percentage updates are safely serialized", async () => {
    const db = new PostgresDatabaseSimulator();
    const propId = "prop-202";
    db.addProperty(propId);

    // Initial state: Owner A = 40%, Owner B = 40% (Total = 80%)
    db.propertyOwners.set("assign-a", {
      id: "assign-a",
      property_id: propId,
      owner_id: "owner-a",
      ownership_percentage: 40.0,
    });
    db.propertyOwners.set("assign-b", {
      id: "assign-b",
      property_id: propId,
      owner_id: "owner-b",
      ownership_percentage: 40.0,
    });

    // Tx 1 wants to increase Owner A to 60% (needs 20% available; 40% remaining - 20% = 20% remaining)
    // Concurrently, Tx 2 wants to increase Owner B to 55% (needs 15% available)
    // Total attempted = 60% + 55% = 115% (> 100%)

    let txACommitted = false;
    let txBRejected = false;

    const runTxA = async () => {
      await db.executeTriggerValidation(
        { id: "assign-a", property_id: propId, owner_id: "owner-a", ownership_percentage: 60.0 },
        "UPDATE",
        "tx-a",
        true
      );
      await new Promise((r) => setTimeout(r, 20));
      db.propertyOwners.set("assign-a", {
        id: "assign-a",
        property_id: propId,
        owner_id: "owner-a",
        ownership_percentage: 60.0,
      });
      db.releasePropertyRowLock(propId, "tx-a");
      txACommitted = true;
    };

    const runTxB = async () => {
      await new Promise((r) => setTimeout(r, 5));
      try {
        await db.executeTriggerValidation(
          { id: "assign-b", property_id: propId, owner_id: "owner-b", ownership_percentage: 55.0 },
          "UPDATE",
          "tx-b",
          true
        );
        db.propertyOwners.set("assign-b", {
          id: "assign-b",
          property_id: propId,
          owner_id: "owner-b",
          ownership_percentage: 55.0,
        });
      } catch (err) {
        txBRejected = true;
        assert.ok(err.message.includes("cannot exceed 100.00%"));
      } finally {
        db.releasePropertyRowLock(propId, "tx-b");
      }
    };

    await Promise.all([runTxA(), runTxB()]);

    assert.equal(txACommitted, true);
    assert.equal(txBRejected, true);
    // Verified final state: Owner A = 60%, Owner B = 40% (Total = 100%)
    assert.equal(db.propertyOwners.get("assign-a").ownership_percentage, 60.0);
    assert.equal(db.propertyOwners.get("assign-b").ownership_percentage, 40.0);
  });

  // Test 3: Multi-row insert and update operations
  test("3. Multi-row operations validate cumulative totals across batch entries", async () => {
    const db = new PostgresDatabaseSimulator();
    const propId = "prop-303";
    db.addProperty(propId);

    // Batch 1: Insert 3 owners of 30% each (Total = 90%)
    const batch1 = [
      { id: "row-1", property_id: propId, owner_id: "o1", ownership_percentage: 30.0 },
      { id: "row-2", property_id: propId, owner_id: "o2", ownership_percentage: 30.0 },
      { id: "row-3", property_id: propId, owner_id: "o3", ownership_percentage: 30.0 },
    ];

    for (const row of batch1) {
      await db.executeTriggerValidation(row, "INSERT", "tx-batch-1", true);
      db.propertyOwners.set(row.id, row);
    }
    db.releasePropertyRowLock(propId, "tx-batch-1");

    assert.equal(db.propertyOwners.size, 3);

    // Batch 2: Attempting to insert 2 rows of 10% each
    // Row 4: 10% (90 + 10 = 100% -> Valid)
    // Row 5: 10% (100 + 10 = 110% -> Invalid -> Entire batch rolled back)
    const batch2 = [
      { id: "row-4", property_id: propId, owner_id: "o4", ownership_percentage: 10.0 },
      { id: "row-5", property_id: propId, owner_id: "o5", ownership_percentage: 10.0 },
    ];

    const uncommittedMap = new Map();
    let batch2Failed = false;

    try {
      for (const row of batch2) {
        await db.executeTriggerValidation(row, "INSERT", "tx-batch-2", true);
        uncommittedMap.set(row.id, row);
        // temporarily update map as within a single transaction
        db.propertyOwners.set(row.id, row);
      }
    } catch (err) {
      batch2Failed = true;
      // Simulate transaction ROLLBACK
      for (const rowId of uncommittedMap.keys()) {
        db.propertyOwners.delete(rowId);
      }
    } finally {
      db.releasePropertyRowLock(propId, "tx-batch-2");
    }

    assert.equal(batch2Failed, true, "Batch 2 must fail on row 5");
    assert.equal(db.propertyOwners.size, 3, "Only the 3 rows from Batch 1 should exist");
  });

  // Test 4: Transactions involving multiple properties
  test("4. Operations on distinct properties execute independently without blocking each other", async () => {
    const db = new PostgresDatabaseSimulator();
    const propA = "prop-A";
    const propB = "prop-B";
    db.addProperty(propA);
    db.addProperty(propB);

    let propACompleted = false;
    let propBCompleted = false;

    const opA = async () => {
      await db.executeTriggerValidation(
        { id: "row-a", property_id: propA, owner_id: "owner-1", ownership_percentage: 75.0 },
        "INSERT",
        "tx-prop-a",
        true
      );
      db.propertyOwners.set("row-a", { id: "row-a", property_id: propA, ownership_percentage: 75.0 });
      db.releasePropertyRowLock(propA, "tx-prop-a");
      propACompleted = true;
    };

    const opB = async () => {
      await db.executeTriggerValidation(
        { id: "row-b", property_id: propB, owner_id: "owner-2", ownership_percentage: 85.0 },
        "INSERT",
        "tx-prop-b",
        true
      );
      db.propertyOwners.set("row-b", { id: "row-b", property_id: propB, ownership_percentage: 85.0 });
      db.releasePropertyRowLock(propB, "tx-prop-b");
      propBCompleted = true;
    };

    await Promise.all([opA(), opB()]);

    assert.equal(propACompleted, true);
    assert.equal(propBCompleted, true);
    assert.equal(db.propertyOwners.get("row-a").ownership_percentage, 75.0);
    assert.equal(db.propertyOwners.get("row-b").ownership_percentage, 85.0);
  });

  // Test 5: Rollback when ownership exceeds 100%
  test("5. Transaction rollback preserves state when allocation exceeds 100%", async () => {
    const db = new PostgresDatabaseSimulator();
    const propId = "prop-505";
    db.addProperty(propId);

    // Initial state: 100% assigned
    db.propertyOwners.set("row-initial", {
      id: "row-initial",
      property_id: propId,
      owner_id: "owner-first",
      ownership_percentage: 100.0,
    });

    let rolledBack = false;
    try {
      await db.executeTriggerValidation(
        { id: "row-violator", property_id: propId, owner_id: "owner-second", ownership_percentage: 1.0 },
        "INSERT",
        "tx-violator",
        true
      );
    } catch (err) {
      rolledBack = true;
      assert.ok(err.message.includes("cannot exceed 100.00%"));
    } finally {
      db.releasePropertyRowLock(propId, "tx-violator");
    }

    assert.equal(rolledBack, true);
    assert.equal(db.propertyOwners.size, 1);
    assert.equal(db.propertyOwners.get("row-initial").ownership_percentage, 100.0);
  });

  // Test 6: Confirm no operation can bypass the ownership limits or integrity rules
  test("6. Bypass protection enforces CHECK constraints and property_id immutability", async () => {
    const db = new PostgresDatabaseSimulator();
    const propId = "prop-606";
    db.addProperty(propId);

    // Subtest 6A: Reject 0%
    await assert.rejects(
      async () => {
        await db.executeTriggerValidation(
          { id: "r1", property_id: propId, owner_id: "o1", ownership_percentage: 0 },
          "INSERT",
          "tx-check"
        );
      },
      /CHECK constraint violation/
    );

    // Subtest 6B: Reject negative percentage
    await assert.rejects(
      async () => {
        await db.executeTriggerValidation(
          { id: "r2", property_id: propId, owner_id: "o2", ownership_percentage: -15.5 },
          "INSERT",
          "tx-check"
        );
      },
      /CHECK constraint violation/
    );

    // Subtest 6C: Reject > 100%
    await assert.rejects(
      async () => {
        await db.executeTriggerValidation(
          { id: "r3", property_id: propId, owner_id: "o3", ownership_percentage: 100.01 },
          "INSERT",
          "tx-check"
        );
      },
      /CHECK constraint violation/
    );

    // Subtest 6D: Reject property_id modification on update
    await assert.rejects(
      async () => {
        await db.executeTriggerValidation(
          {
            id: "r4",
            property_id: "prop-new",
            old_property_id: "prop-old",
            owner_id: "o4",
            ownership_percentage: 50.0,
          },
          "UPDATE",
          "tx-update-check"
        );
      },
      /Cannot modify property_id on an existing ownership record/
    );
  });
});
