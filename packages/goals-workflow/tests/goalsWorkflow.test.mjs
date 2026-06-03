import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildCascadePath,
  calculateGoalProgress,
  getGoalState,
  goalActions,
  goalStatuses,
  transitionGoalState,
} from "../src/goalsWorkflow.mjs";

describe("goalsWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(goalStatuses)) {
      const state = getGoalState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves a goal through submit approve activate complete", () => {
    const submitted = transitionGoalState(goalStatuses.DRAFT, goalActions.SUBMIT);
    const approved = transitionGoalState(submitted.status, goalActions.APPROVE);
    const active = transitionGoalState(approved.status, goalActions.ACTIVATE);
    const completed = transitionGoalState(active.status, goalActions.COMPLETE);
    assert.equal(completed.status, goalStatuses.COMPLETED);
    assert.equal(completed.owner, "SYSTEM");
  });

  test("returns submitted goals to owner", () => {
    const returned = transitionGoalState(goalStatuses.SUBMITTED, goalActions.RETURN);
    assert.equal(returned.status, goalStatuses.RETURNED);
    assert.equal(returned.owner, "OWNER");
  });

  test("keeps visibility override explicit", () => {
    const changed = transitionGoalState(goalStatuses.ACTIVE, goalActions.OVERRIDE_VISIBILITY);
    assert.equal(changed.status, goalStatuses.VISIBILITY_CHANGED);
    assert.equal(changed.owner, "HRBP");
  });

  test("calculates weighted key result progress", () => {
    const progress = calculateGoalProgress([
      { currentValue: 50, targetValue: 100, weight: 2 },
      { currentValue: 100, targetValue: 100, weight: 1 },
    ]);
    assert.equal(progress, 66.67);
  });

  test("builds cascade paths", () => {
    assert.deepEqual(buildCascadePath(["company"], "team"), ["company", "team"]);
  });
});
