import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateWeightedScore,
  midCycleActions,
  midCycleStatuses,
  getMidCycleState,
  transitionMidCycleState,
  validateRequiredScaleAnswer,
} from "../src/midCycleEvaluationWorkflow.mjs";

const schema = {
  sections: [
    { id: "progress", title: "Progress", questions: [{ id: "q1", type: "scale", min: 0, max: 5, weight: 70, required: true }] },
    { id: "support", title: "Support", questions: [{ id: "q2", type: "scale", min: 0, max: 5, weight: 30, required: true }] },
  ],
};

describe("midCycleEvaluationWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(midCycleStatuses)) {
      const state = getMidCycleState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves through manager and HRBP approval", () => {
    const submitted = transitionMidCycleState(midCycleStatuses.IN_PROGRESS, midCycleActions.SUBMIT);
    const managerApproved = transitionMidCycleState(submitted.status, midCycleActions.MANAGER_APPROVE);
    const hrbpApproved = transitionMidCycleState(managerApproved.status, midCycleActions.HRBP_APPROVE);
    const completed = transitionMidCycleState(hrbpApproved.status, midCycleActions.COMPLETE);
    assert.equal(completed.status, midCycleStatuses.COMPLETED);
  });

  test("hides weighted scores before submit", () => {
    const result = calculateWeightedScore(schema, { q1: { value: 4, selected: true }, q2: { value: 3, selected: true } });
    assert.equal(result.visible, false);
    assert.equal(result.totalScore, null);
    assert.equal(result.sections[0].contribution, null);
  });

  test("shows section contribution after submit", () => {
    const result = calculateWeightedScore(schema, { q1: { value: 5, selected: true }, q2: { value: 0, selected: true } }, { reveal: true });
    assert.equal(result.visible, true);
    assert.equal(result.totalScore, 70);
    assert.equal(result.sections[0].contribution, 70);
    assert.equal(result.sections[1].contribution, 0);
  });

  test("treats intentionally selected zero as valid", () => {
    assert.equal(validateRequiredScaleAnswer({ value: 0, selected: true }), true);
    assert.equal(validateRequiredScaleAnswer({ value: 0, selected: false }), false);
  });

  test("rejects HRBP approval before manager approval", () => {
    assert.throws(() => transitionMidCycleState(midCycleStatuses.SUBMITTED, midCycleActions.HRBP_APPROVE), /not allowed/);
  });
});
