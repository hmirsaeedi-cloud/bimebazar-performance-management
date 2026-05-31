import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getProfileExportState,
  profileExportActions,
  profileExportStatuses,
  transitionProfileExportState,
} from "../src/profileExportWorkflow.mjs";

describe("profileExportWorkflow", () => {
  it("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(profileExportStatuses)) {
      const state = getProfileExportState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok(Object.hasOwn(state, "nextAction"));
    }
  });

  it("moves requested exports through generation to ready", () => {
    const generating = transitionProfileExportState(profileExportStatuses.REQUESTED, profileExportActions.GENERATE);
    const ready = transitionProfileExportState(generating.status, profileExportActions.MARK_READY);
    assert.equal(ready.status, profileExportStatuses.READY);
  });

  it("routes failed exports back to HR Admin", () => {
    const generating = transitionProfileExportState(profileExportStatuses.REQUESTED, profileExportActions.GENERATE);
    const failed = transitionProfileExportState(generating.status, profileExportActions.MARK_FAILED);
    assert.equal(failed.owner, "HR_ADMIN");
    assert.equal(failed.nextAction, profileExportActions.GENERATE);
  });

  it("rejects invalid transitions", () => {
    assert.throws(
      () => transitionProfileExportState(profileExportStatuses.READY, profileExportActions.GENERATE),
      /not allowed/,
    );
  });
});
