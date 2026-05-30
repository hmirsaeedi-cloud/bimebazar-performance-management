import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  getProcessState,
  processActions,
  processStatuses,
  transitionProcessState,
} from "../src/processEngineWorkflow.mjs";

describe("processEngineWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(processStatuses)) {
      const state = getProcessState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("configures and starts a process", () => {
    const configured = transitionProcessState(processStatuses.DRAFT, processActions.CONFIGURE);
    const active = transitionProcessState(configured.status, processActions.START);
    assert.equal(active.status, processStatuses.ACTIVE);
  });

  test("pauses and resumes active process", () => {
    const paused = transitionProcessState(processStatuses.ACTIVE, processActions.PAUSE);
    assert.equal(paused.status, processStatuses.PAUSED);
    assert.equal(transitionProcessState(paused.status, processActions.RESUME).status, processStatuses.ACTIVE);
  });

  test("prevents starting before configuration", () => {
    assert.throws(() => transitionProcessState(processStatuses.DRAFT, processActions.START), /not allowed/);
  });
});
