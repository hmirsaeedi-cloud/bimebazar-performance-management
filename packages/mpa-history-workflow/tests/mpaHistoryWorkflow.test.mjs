import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  getMpaHistoryState,
  mpaHistoryActions,
  mpaHistoryStatuses,
  summarizeMpaSnapshot,
  transitionMpaHistoryState,
} from "../src/mpaHistoryWorkflow.mjs";

describe("mpaHistoryWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(mpaHistoryStatuses)) {
      const state = getMpaHistoryState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves captured history through review and restore", () => {
    const reviewed = transitionMpaHistoryState(mpaHistoryStatuses.CAPTURED, mpaHistoryActions.APPROVE);
    const restored = transitionMpaHistoryState(reviewed.status, mpaHistoryActions.RESTORE);
    assert.equal(restored.status, mpaHistoryStatuses.RESTORED);
    assert.equal(restored.nextAction, null);
  });

  test("returns captured version to manager ownership", () => {
    const returned = transitionMpaHistoryState(mpaHistoryStatuses.CAPTURED, mpaHistoryActions.RETURN);
    assert.equal(returned.status, mpaHistoryStatuses.RETURNED);
    assert.equal(returned.owner, "MANAGER");
  });

  test("summarizes snapshot content", () => {
    const snapshot = summarizeMpaSnapshot({ title: "  MPA ", status: " active ", contentPlainText: " text " });
    assert.deepEqual(snapshot, { title: "MPA", status: "active", contentPlainText: "text" });
  });
});
