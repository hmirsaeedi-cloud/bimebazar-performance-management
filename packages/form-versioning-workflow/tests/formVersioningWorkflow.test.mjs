import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  formVersionActions,
  formVersionStatuses,
  getFormVersionState,
  summarizeFormSchema,
  transitionFormVersionState,
} from "../src/formVersioningWorkflow.mjs";

describe("formVersioningWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(formVersionStatuses)) {
      const state = getFormVersionState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves edited version through submit approve and publish", () => {
    const submitted = transitionFormVersionState(formVersionStatuses.DRAFT_EDIT, formVersionActions.SUBMIT);
    const approved = transitionFormVersionState(submitted.status, formVersionActions.APPROVE);
    const published = transitionFormVersionState(approved.status, formVersionActions.PUBLISH);
    assert.equal(published.status, formVersionStatuses.PUBLISHED);
    assert.equal(published.nextAction, null);
  });

  test("returns submitted edit to HR Admin ownership", () => {
    const returned = transitionFormVersionState(formVersionStatuses.SUBMITTED, formVersionActions.RETURN);
    assert.equal(returned.status, formVersionStatuses.RETURNED);
    assert.equal(returned.owner, "HR_ADMIN");
  });

  test("summarizes form schema", () => {
    const summary = summarizeFormSchema({ sections: [{ questions: [{ id: "q1" }, { id: "q2" }] }] });
    assert.deepEqual(summary, { sectionCount: 1, questionCount: 2 });
  });
});
