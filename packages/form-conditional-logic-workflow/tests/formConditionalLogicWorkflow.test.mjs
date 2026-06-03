import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  conditionalLogicActions,
  conditionalLogicStatuses,
  evaluateConditionalRules,
  getConditionalLogicState,
  transitionConditionalLogicState,
} from "../src/formConditionalLogicWorkflow.mjs";

describe("formConditionalLogicWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(conditionalLogicStatuses)) {
      const state = getConditionalLogicState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves conditional logic through submit, approve, and activate", () => {
    const submitted = transitionConditionalLogicState(conditionalLogicStatuses.DRAFT, conditionalLogicActions.SUBMIT);
    const approved = transitionConditionalLogicState(submitted.status, conditionalLogicActions.APPROVE);
    const active = transitionConditionalLogicState(approved.status, conditionalLogicActions.ACTIVATE);
    assert.equal(active.status, conditionalLogicStatuses.ACTIVE);
    assert.equal(active.owner, "SYSTEM");
    assert.equal(active.nextAction, null);
  });

  test("returns submitted logic to HR Admin ownership", () => {
    const returned = transitionConditionalLogicState(conditionalLogicStatuses.SUBMITTED, conditionalLogicActions.RETURN);
    assert.equal(returned.status, conditionalLogicStatuses.RETURNED);
    assert.equal(returned.owner, "HR_ADMIN");
  });

  test("records visibility override as explicit workflow state", () => {
    const changed = transitionConditionalLogicState(conditionalLogicStatuses.ACTIVE, conditionalLogicActions.OVERRIDE_VISIBILITY);
    assert.equal(changed.status, conditionalLogicStatuses.VISIBILITY_CHANGED);
    assert.equal(changed.nextAction, conditionalLogicActions.UPDATE);
  });

  test("evaluates show, hide, require, and optional effects", () => {
    const result = evaluateConditionalRules(
      [
        {
          id: "low_score_comment",
          sourceQuestionId: "overall_rating",
          operator: "lte",
          value: 2,
          targets: [
            { questionId: "manager_comment", effect: "show" },
            { questionId: "manager_comment", effect: "require" },
          ],
        },
        {
          id: "high_score_hide_pip",
          sourceQuestionId: "overall_rating",
          operator: "gte",
          value: 4,
          targets: [{ questionId: "pip_reason", effect: "hide" }],
        },
      ],
      { overall_rating: 2 },
    );
    assert.deepEqual(result.visibleQuestionIds, ["manager_comment"]);
    assert.deepEqual(result.requiredQuestionIds, ["manager_comment"]);
    assert.deepEqual(result.hiddenQuestionIds, []);
    assert.deepEqual(result.matchedRuleIds, ["low_score_comment"]);
  });

  test("handles intentionally selected zero as a real answer", () => {
    const result = evaluateConditionalRules(
      [
        {
          id: "zero_needs_context",
          sourceQuestionId: "scale_score",
          operator: "equals",
          value: 0,
          targets: [{ questionId: "zero_context", effect: "require" }],
        },
      ],
      { scale_score: 0 },
    );
    assert.deepEqual(result.requiredQuestionIds, ["zero_context"]);
  });
});
