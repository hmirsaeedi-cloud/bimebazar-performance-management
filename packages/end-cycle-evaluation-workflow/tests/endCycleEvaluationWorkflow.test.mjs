import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateWeightedScore,
  endCycleActions,
  endCycleStatuses,
  getEndCycleState,
  transitionEndCycleState,
  validateRequiredScaleAnswer,
} from "../src/endCycleEvaluationWorkflow.mjs";

const schema = {
  sections: [
    {
      id: "results",
      title: "Results",
      questions: [{ id: "q1", type: "scale", min: 0, max: 5, weight: 60, required: true }],
    },
    {
      id: "behavior",
      title: "Behavior",
      questions: [{ id: "q2", type: "scale", min: 0, max: 5, weight: 40, required: true }],
    },
  ],
};

describe("endCycleEvaluationWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(endCycleStatuses)) {
      const state = getEndCycleState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves submit through approval and completion", () => {
    const submitted = transitionEndCycleState(endCycleStatuses.IN_PROGRESS, endCycleActions.SUBMIT);
    const nlApproved = transitionEndCycleState(submitted.status, endCycleActions.NEXT_LEVEL_APPROVE);
    const headApproved = transitionEndCycleState(nlApproved.status, endCycleActions.HEAD_APPROVE);
    const hrbpApproved = transitionEndCycleState(headApproved.status, endCycleActions.HRBP_APPROVE);
    const complete = transitionEndCycleState(hrbpApproved.status, endCycleActions.COMPLETE);
    assert.equal(complete.status, endCycleStatuses.COMPLETED);
  });

  test("routes submitted evaluation to next-level manager first", () => {
    const submitted = transitionEndCycleState(endCycleStatuses.IN_PROGRESS, endCycleActions.SUBMIT);
    assert.equal(submitted.owner, "NEXT_LEVEL_MANAGER");
    assert.equal(submitted.nextAction, endCycleActions.NEXT_LEVEL_APPROVE);
  });

  test("blocks HRBP approval until next-level manager and head approve", () => {
    const submitted = transitionEndCycleState(endCycleStatuses.IN_PROGRESS, endCycleActions.SUBMIT);
    assert.throws(() => transitionEndCycleState(submitted.status, endCycleActions.HRBP_APPROVE), /not allowed/);
    const nlApproved = transitionEndCycleState(submitted.status, endCycleActions.NEXT_LEVEL_APPROVE);
    assert.throws(() => transitionEndCycleState(nlApproved.status, endCycleActions.HRBP_APPROVE), /not allowed/);
  });

  test("hides weighted scores before submit", () => {
    const result = calculateWeightedScore(schema, { q1: { value: 4, selected: true }, q2: { value: 3, selected: true } });
    assert.equal(result.visible, false);
    assert.equal(result.mode, "hidden_preview");
    assert.equal(result.totalScore, null);
    assert.equal(result.sections[0].contribution, null);
    assert.equal(result.sections[0].questions[0].normalizedScore, null);
  });

  test("shows section contributions after submit", () => {
    const result = calculateWeightedScore(schema, { q1: { value: 5, selected: true }, q2: { value: 0, selected: true } }, { reveal: true });
    assert.equal(result.visible, true);
    assert.equal(result.mode, "submitted");
    assert.equal(result.totalScore, 60);
    assert.equal(result.sections[0].contribution, 60);
    assert.equal(result.sections[1].contribution, 0);
    assert.equal(result.sections[0].questions[0].normalizedScore, 100);
  });

  test("treats intentionally selected zero as valid", () => {
    assert.equal(validateRequiredScaleAnswer({ value: 0, selected: true }), true);
    assert.equal(validateRequiredScaleAnswer({ value: 0, selected: false }), false);
  });

  test("rejects approve before submit", () => {
    assert.throws(() => transitionEndCycleState(endCycleStatuses.IN_PROGRESS, endCycleActions.APPROVE), /not allowed/);
  });
});
