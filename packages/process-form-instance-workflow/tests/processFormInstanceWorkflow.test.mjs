import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  assertLockedFormVersion,
  adminMoveFormInstanceState,
  formInstanceActions,
  formInstanceStatuses,
  getFormInstanceState,
  transitionFormInstanceState,
} from "../src/processFormInstanceWorkflow.mjs";

describe("processFormInstanceWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(formInstanceStatuses)) {
      const state = getFormInstanceState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves assigned instances through submit approval and close", () => {
    const inProgress = transitionFormInstanceState(formInstanceStatuses.ASSIGNED, formInstanceActions.UPDATE);
    const submitted = transitionFormInstanceState(inProgress.status, formInstanceActions.SUBMIT);
    const approved = transitionFormInstanceState(submitted.status, formInstanceActions.APPROVE);
    const closed = transitionFormInstanceState(approved.status, formInstanceActions.CLOSE);
    assert.equal(closed.status, formInstanceStatuses.CLOSED);
    assert.equal(closed.owner, "SYSTEM");
  });

  test("returns submitted instances to employee ownership", () => {
    const returned = transitionFormInstanceState(formInstanceStatuses.SUBMITTED, formInstanceActions.RETURN);
    assert.equal(returned.status, formInstanceStatuses.RETURNED);
    assert.equal(returned.owner, "EMPLOYEE");
  });

  test("requires a locked form version snapshot", () => {
    assert.equal(assertLockedFormVersion({ lockedFormTemplateVersionId: "v1", lockedFormSchema: { sections: [] } }), true);
    assert.throws(() => assertLockedFormVersion({ lockedFormTemplateVersionId: "v1" }), /locked form template version/);
  });

  test("allows admin movement to an explicit target state", () => {
    const moved = adminMoveFormInstanceState(formInstanceStatuses.RETURNED);
    assert.equal(moved.status, formInstanceStatuses.RETURNED);
    assert.equal(moved.owner, "EMPLOYEE");
    assert.equal(moved.nextAction, formInstanceActions.UPDATE);
  });

  test("rejects admin movement to an unknown state", () => {
    assert.throws(() => adminMoveFormInstanceState("not_a_real_state"), /Unknown form instance status/);
  });
});
