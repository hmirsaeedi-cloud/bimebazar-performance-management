import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  formBuilderActions,
  formBuilderStatuses,
  getFormBuilderState,
  transitionFormBuilderState,
} from "../src/formBuilderWorkflow.mjs";

describe("formBuilderWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(formBuilderStatuses)) {
      const state = getFormBuilderState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("publishes a draft form", () => {
    assert.equal(
      transitionFormBuilderState(formBuilderStatuses.DRAFT, formBuilderActions.PUBLISH).status,
      formBuilderStatuses.PUBLISHED,
    );
  });

  test("returns a published form to draft for a new version", () => {
    assert.equal(
      transitionFormBuilderState(formBuilderStatuses.PUBLISHED, formBuilderActions.RETURN_TO_DRAFT).status,
      formBuilderStatuses.DRAFT,
    );
  });

  test("rejects invalid transitions", () => {
    assert.throws(
      () => transitionFormBuilderState(formBuilderStatuses.ARCHIVED, formBuilderActions.UPDATE_DRAFT),
      /not allowed/,
    );
  });
});
