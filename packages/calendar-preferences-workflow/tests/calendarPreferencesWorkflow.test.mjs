import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  calendarPreferenceActions,
  calendarPreferenceStatuses,
  getCalendarPreferenceState,
  transitionCalendarPreferenceState,
} from "../src/calendarPreferencesWorkflow.mjs";

describe("calendarPreferencesWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(calendarPreferenceStatuses)) {
      const state = getCalendarPreferenceState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("allows user update from defaulted state", () => {
    assert.equal(
      transitionCalendarPreferenceState(calendarPreferenceStatuses.DEFAULTED, calendarPreferenceActions.USER_UPDATE).status,
      calendarPreferenceStatuses.USER_CONFIGURED,
    );
  });

  test("allows HR override approval", () => {
    const pending = transitionCalendarPreferenceState(
      calendarPreferenceStatuses.USER_CONFIGURED,
      calendarPreferenceActions.REQUEST_HR_OVERRIDE,
    );
    assert.equal(
      transitionCalendarPreferenceState(pending.status, calendarPreferenceActions.APPROVE_HR_OVERRIDE).status,
      calendarPreferenceStatuses.HR_OVERRIDDEN,
    );
  });

  test("rejects approving override without pending state", () => {
    assert.throws(
      () => transitionCalendarPreferenceState(calendarPreferenceStatuses.DEFAULTED, calendarPreferenceActions.APPROVE_HR_OVERRIDE),
      /not allowed/,
    );
  });
});
