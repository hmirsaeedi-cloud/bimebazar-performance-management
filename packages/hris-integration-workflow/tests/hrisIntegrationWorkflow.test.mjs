import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildHrisSyncPreview,
  getHrisIntegrationState,
  hrisIntegrationActions,
  hrisIntegrationStatuses,
  transitionHrisIntegrationState,
} from "../src/hrisIntegrationWorkflow.mjs";

describe("hrisIntegrationWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(hrisIntegrationStatuses)) {
      const state = getHrisIntegrationState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves integration through submit approve activate and sync", () => {
    const submitted = transitionHrisIntegrationState(hrisIntegrationStatuses.DRAFT, hrisIntegrationActions.SUBMIT);
    const approved = transitionHrisIntegrationState(submitted.status, hrisIntegrationActions.APPROVE);
    const active = transitionHrisIntegrationState(approved.status, hrisIntegrationActions.ACTIVATE);
    const running = transitionHrisIntegrationState(active.status, hrisIntegrationActions.START_SYNC);
    const completed = transitionHrisIntegrationState(running.status, hrisIntegrationActions.COMPLETE_SYNC);
    assert.equal(completed.status, hrisIntegrationStatuses.SYNC_COMPLETED);
    assert.equal(completed.nextAction, hrisIntegrationActions.START_SYNC);
  });

  test("routes failed sync back to HR Admin ownership", () => {
    const failed = transitionHrisIntegrationState(hrisIntegrationStatuses.SYNC_RUNNING, hrisIntegrationActions.FAIL_SYNC);
    assert.equal(failed.status, hrisIntegrationStatuses.SYNC_FAILED);
    assert.equal(failed.owner, "HR_ADMIN");
  });

  test("keeps visibility override as explicit state", () => {
    const changed = transitionHrisIntegrationState(hrisIntegrationStatuses.ACTIVE, hrisIntegrationActions.OVERRIDE_VISIBILITY);
    assert.equal(changed.status, hrisIntegrationStatuses.VISIBILITY_CHANGED);
  });

  test("builds sync preview and flags missing required identifiers", () => {
    const preview = buildHrisSyncPreview([
      { externalEmployeeId: "E-1", email: "A@BIMEBAZAR.COM", fullNameEnglish: "A" },
      { externalEmployeeId: "", email: "missing-id@bimebazar.com" },
      { externalEmployeeId: "E-3", email: "" },
    ]);
    assert.equal(preview.totalRecords, 3);
    assert.equal(preview.validRecords, 1);
    assert.equal(preview.missingEmail, 1);
    assert.equal(preview.missingExternalId, 1);
    assert.equal(preview.sample[0].email, "a@bimebazar.com");
  });
});
