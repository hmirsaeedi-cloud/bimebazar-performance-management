import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  getPipState,
  normalizePipPlan,
  pipActions,
  pipStatuses,
  transitionPipState,
} from "../src/pipWorkflow.mjs";

describe("pipWorkflow", () => {
  test("represents every state with status, owner, nextAction, and visibility", () => {
    for (const status of Object.values(pipStatuses)) {
      const state = getPipState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
      assert.equal(typeof state.employeeVisible, "boolean");
    }
  });

  test("keeps PIP hidden until HRBP activates visibility", () => {
    const submitted = transitionPipState(pipStatuses.DRAFT, pipActions.SUBMIT);
    const approved = transitionPipState(submitted.status, pipActions.APPROVE);
    assert.equal(approved.employeeVisible, false);
    const visible = transitionPipState(approved.status, pipActions.ACTIVATE_VISIBILITY);
    assert.equal(visible.status, pipStatuses.VISIBILITY_ACTIVE);
    assert.equal(visible.employeeVisible, true);
  });

  test("moves visible PIP to active and completed", () => {
    const active = transitionPipState(pipStatuses.VISIBILITY_ACTIVE, pipActions.START);
    const completed = transitionPipState(active.status, pipActions.COMPLETE);
    assert.equal(completed.status, pipStatuses.COMPLETED);
    assert.equal(completed.employeeVisible, true);
  });

  test("normalizes PIP plan text", () => {
    const plan = normalizePipPlan({ performanceConcern: "  quality ", successCriteria: " clear targets ", supportPlan: " coaching " });
    assert.equal(plan.performanceConcern, "quality");
    assert.equal(plan.successCriteria, "clear targets");
    assert.equal(plan.supportPlan, "coaching");
  });
});
