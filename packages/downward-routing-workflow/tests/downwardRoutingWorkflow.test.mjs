import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  downwardActions,
  downwardStatuses,
  getDownwardState,
  transitionDownwardState,
} from "../src/downwardRoutingWorkflow.mjs";

describe("downwardRoutingWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(downwardStatuses)) {
      const state = getDownwardState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves through manager, next-level, and HRBP approval", () => {
    const draft = transitionDownwardState(downwardStatuses.ASSIGNED, downwardActions.START);
    const submitted = transitionDownwardState(draft.status, downwardActions.SUBMIT);
    const nextLevel = transitionDownwardState(submitted.status, downwardActions.NEXT_LEVEL_APPROVE);
    const hrbp = transitionDownwardState(nextLevel.status, downwardActions.HRBP_APPROVE);
    const complete = transitionDownwardState(hrbp.status, downwardActions.COMPLETE);
    assert.equal(complete.status, downwardStatuses.COMPLETED);
  });

  test("returns routed evaluation to manager ownership", () => {
    const returned = transitionDownwardState(downwardStatuses.NEXT_LEVEL_REVIEW, downwardActions.RETURN);
    assert.equal(returned.status, downwardStatuses.RETURNED_TO_MANAGER);
    assert.equal(returned.owner, "MANAGER");
  });

  test("keeps visibility override as an explicit transition", () => {
    const state = transitionDownwardState(downwardStatuses.HRBP_REVIEW, downwardActions.OVERRIDE_VISIBILITY);
    assert.equal(state.status, downwardStatuses.HRBP_REVIEW);
  });

  test("rejects HRBP approval before next-level approval", () => {
    assert.throws(
      () => transitionDownwardState(downwardStatuses.MANAGER_SUBMITTED, downwardActions.HRBP_APPROVE),
      /not allowed/,
    );
  });
});
