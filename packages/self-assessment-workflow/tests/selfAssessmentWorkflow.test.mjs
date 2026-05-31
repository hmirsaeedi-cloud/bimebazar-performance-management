import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  getSelfAssessmentState,
  selfAssessmentActions,
  selfAssessmentStatuses,
  transitionSelfAssessmentState,
} from "../src/selfAssessmentWorkflow.mjs";

describe("selfAssessmentWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(selfAssessmentStatuses)) {
      const state = getSelfAssessmentState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves from assignment through employee submit and manager approval", () => {
    const inProgress = transitionSelfAssessmentState(selfAssessmentStatuses.ASSIGNED, selfAssessmentActions.START);
    const submitted = transitionSelfAssessmentState(inProgress.status, selfAssessmentActions.SUBMIT);
    const approved = transitionSelfAssessmentState(submitted.status, selfAssessmentActions.MANAGER_APPROVE);
    assert.equal(approved.status, selfAssessmentStatuses.MANAGER_APPROVED);
  });

  test("returns submitted self-assessment to employee ownership", () => {
    const returned = transitionSelfAssessmentState(selfAssessmentStatuses.SUBMITTED, selfAssessmentActions.RETURN);
    assert.equal(returned.status, selfAssessmentStatuses.RETURNED);
    assert.equal(returned.owner, "EMPLOYEE");
  });

  test("keeps visibility override as an explicit transition", () => {
    const state = transitionSelfAssessmentState(selfAssessmentStatuses.SUBMITTED, selfAssessmentActions.OVERRIDE_VISIBILITY);
    assert.equal(state.status, selfAssessmentStatuses.SUBMITTED);
  });

  test("rejects manager approval before employee submit", () => {
    assert.throws(
      () => transitionSelfAssessmentState(selfAssessmentStatuses.IN_PROGRESS, selfAssessmentActions.MANAGER_APPROVE),
      /not allowed/,
    );
  });
});
