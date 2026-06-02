import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildSideBySideRows,
  comparisonActions,
  comparisonStatuses,
  getComparisonState,
  summarizeComparison,
  transitionComparisonState,
} from "../src/evaluationComparisonWorkflow.mjs";

describe("evaluationComparisonWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(comparisonStatuses)) {
      const state = getComparisonState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves comparison through submit approve visibility and complete", () => {
    const submitted = transitionComparisonState(comparisonStatuses.DRAFT, comparisonActions.SUBMIT);
    const approved = transitionComparisonState(submitted.status, comparisonActions.APPROVE);
    const visible = transitionComparisonState(approved.status, comparisonActions.OVERRIDE_VISIBILITY);
    const completed = transitionComparisonState(visible.status, comparisonActions.COMPLETE);
    assert.equal(completed.status, comparisonStatuses.COMPLETED);
    assert.equal(completed.owner, "SYSTEM");
  });

  test("returns submitted comparison to manager ownership", () => {
    const returned = transitionComparisonState(comparisonStatuses.SUBMITTED, comparisonActions.RETURN);
    assert.equal(returned.status, comparisonStatuses.RETURNED);
    assert.equal(returned.owner, "MANAGER");
  });

  test("builds side-by-side answer rows", () => {
    const schema = { sections: [{ id: "s1", title: "Impact", questions: [{ id: "q1", label: "Quality", type: "scale", weight: 50 }] }] };
    const rows = buildSideBySideRows(schema, { q1: { value: 4, selected: true } }, { q1: { value: 3, selected: true } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].different, true);
  });

  test("summarizes alignment rate", () => {
    const summary = summarizeComparison([{ different: false }, { different: true }]);
    assert.equal(summary.questionCount, 2);
    assert.equal(summary.alignmentRate, 50);
  });
});
