import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  getMpaAttachmentState,
  mpaAttachmentActions,
  mpaAttachmentStatuses,
  transitionMpaAttachmentState,
} from "../src/mpaAttachmentWorkflow.mjs";

describe("mpaAttachmentWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(mpaAttachmentStatuses)) {
      const state = getMpaAttachmentState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("auto-attaches a matched MPA", () => {
    const state = transitionMpaAttachmentState(mpaAttachmentStatuses.MATCHED, mpaAttachmentActions.AUTO_ATTACH);
    assert.equal(state.status, mpaAttachmentStatuses.ATTACHED);
  });

  test("routes missing MPA to manager override", () => {
    const state = transitionMpaAttachmentState(mpaAttachmentStatuses.MATCHED, mpaAttachmentActions.MARK_MISSING);
    assert.equal(state.status, mpaAttachmentStatuses.MISSING_MPA);
    assert.equal(state.owner, "MANAGER");
  });

  test("supports manual override after detach", () => {
    const state = transitionMpaAttachmentState(mpaAttachmentStatuses.DETACHED, mpaAttachmentActions.OVERRIDE_ATTACH);
    assert.equal(state.status, mpaAttachmentStatuses.ATTACHED);
  });

  test("rejects detach before attach", () => {
    assert.throws(
      () => transitionMpaAttachmentState(mpaAttachmentStatuses.MATCHED, mpaAttachmentActions.DETACH),
      /not allowed/,
    );
  });
});
