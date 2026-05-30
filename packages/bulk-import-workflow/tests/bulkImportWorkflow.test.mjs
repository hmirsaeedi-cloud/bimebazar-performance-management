import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  bulkImportActions,
  bulkImportStatuses,
  getBulkImportState,
  transitionBulkImportState,
} from "../src/bulkImportWorkflow.mjs";

describe("bulkImportWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(bulkImportStatuses)) {
      const state = getBulkImportState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves from upload through validation and processing", () => {
    const validating = transitionBulkImportState(bulkImportStatuses.UPLOADED, bulkImportActions.VALIDATE);
    const validated = transitionBulkImportState(validating.status, bulkImportActions.MARK_COMPLETE);
    const processing = transitionBulkImportState(validated.status, bulkImportActions.PROCESS);
    const completed = transitionBulkImportState(processing.status, bulkImportActions.MARK_COMPLETE);

    assert.equal(completed.status, bulkImportStatuses.COMPLETED);
  });

  test("routes validation failures back to HR Admin", () => {
    const failed = transitionBulkImportState(bulkImportStatuses.VALIDATING, bulkImportActions.MARK_COMPLETE_WITH_ERRORS);
    assert.equal(failed.status, bulkImportStatuses.FAILED_VALIDATION);
    assert.equal(failed.owner, "HR_ADMIN");
  });

  test("rejects processing before validation", () => {
    assert.throws(() => transitionBulkImportState(bulkImportStatuses.UPLOADED, bulkImportActions.PROCESS), /not allowed/);
  });
});
