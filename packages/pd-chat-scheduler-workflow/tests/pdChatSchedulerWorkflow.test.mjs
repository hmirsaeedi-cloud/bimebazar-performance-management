import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildNextPdChatOccurrences,
  getPdChatScheduleState,
  pdChatScheduleActions,
  pdChatScheduleStatuses,
  transitionPdChatScheduleState,
} from "../src/pdChatSchedulerWorkflow.mjs";

describe("pdChatSchedulerWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(pdChatScheduleStatuses)) {
      const state = getPdChatScheduleState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves schedule through submit approve and activate", () => {
    const submitted = transitionPdChatScheduleState(pdChatScheduleStatuses.DRAFT, pdChatScheduleActions.SUBMIT);
    const approved = transitionPdChatScheduleState(submitted.status, pdChatScheduleActions.APPROVE);
    const active = transitionPdChatScheduleState(approved.status, pdChatScheduleActions.ACTIVATE);
    assert.equal(active.status, pdChatScheduleStatuses.ACTIVE);
    assert.equal(active.nextAction, pdChatScheduleActions.GENERATE_OCCURRENCE);
  });

  test("pauses and resumes an active schedule", () => {
    const paused = transitionPdChatScheduleState(pdChatScheduleStatuses.ACTIVE, pdChatScheduleActions.PAUSE);
    const active = transitionPdChatScheduleState(paused.status, pdChatScheduleActions.RESUME);
    assert.equal(paused.status, pdChatScheduleStatuses.PAUSED);
    assert.equal(active.status, pdChatScheduleStatuses.ACTIVE);
  });

  test("returns submitted schedule to employee-manager ownership", () => {
    const returned = transitionPdChatScheduleState(pdChatScheduleStatuses.SUBMITTED, pdChatScheduleActions.RETURN);
    assert.equal(returned.status, pdChatScheduleStatuses.RETURNED);
    assert.equal(returned.owner, "EMPLOYEE_MANAGER");
  });

  test("keeps visibility override explicit", () => {
    const changed = transitionPdChatScheduleState(pdChatScheduleStatuses.ACTIVE, pdChatScheduleActions.OVERRIDE_VISIBILITY);
    assert.equal(changed.status, pdChatScheduleStatuses.VISIBILITY_CHANGED);
  });

  test("builds weekly monthly and quarterly occurrence previews", () => {
    assert.deepEqual(buildNextPdChatOccurrences({ startAt: "2026-06-01T08:00:00.000Z", cadence: "weekly", count: 2 }), [
      "2026-06-01T08:00:00.000Z",
      "2026-06-08T08:00:00.000Z",
    ]);
    assert.deepEqual(buildNextPdChatOccurrences({ startAt: "2026-06-01T08:00:00.000Z", cadence: "monthly", count: 2 }), [
      "2026-06-01T08:00:00.000Z",
      "2026-07-01T08:00:00.000Z",
    ]);
    assert.deepEqual(buildNextPdChatOccurrences({ startAt: "2026-06-01T08:00:00.000Z", cadence: "quarterly", count: 2 }), [
      "2026-06-01T08:00:00.000Z",
      "2026-09-01T08:00:00.000Z",
    ]);
  });
});
