import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  defaultNotificationPreferences,
  getNotificationPreferenceState,
  normalizeNotificationPreferences,
  notificationPreferenceActions,
  notificationPreferenceStatuses,
  transitionNotificationPreferenceState,
} from "../src/notificationPreferenceWorkflow.mjs";

describe("notificationPreferenceWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(notificationPreferenceStatuses)) {
      const state = getNotificationPreferenceState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves customized preferences through submit approve", () => {
    const customized = transitionNotificationPreferenceState(notificationPreferenceStatuses.DEFAULTED, notificationPreferenceActions.UPDATE);
    const submitted = transitionNotificationPreferenceState(customized.status, notificationPreferenceActions.SUBMIT);
    const approved = transitionNotificationPreferenceState(submitted.status, notificationPreferenceActions.APPROVE);
    assert.equal(approved.status, notificationPreferenceStatuses.APPROVED);
    assert.equal(approved.owner, "USER");
  });

  test("returns submitted preferences to user ownership", () => {
    const returned = transitionNotificationPreferenceState(notificationPreferenceStatuses.SUBMITTED, notificationPreferenceActions.RETURN);
    assert.equal(returned.status, notificationPreferenceStatuses.RETURNED);
    assert.equal(returned.owner, "USER");
    assert.equal(returned.nextAction, notificationPreferenceActions.UPDATE);
  });

  test("allows HR override as an explicit transition", () => {
    const overridden = transitionNotificationPreferenceState(notificationPreferenceStatuses.SUBMITTED, notificationPreferenceActions.OVERRIDE);
    assert.equal(overridden.status, notificationPreferenceStatuses.OVERRIDDEN);
    assert.equal(overridden.nextAction, notificationPreferenceActions.UPDATE);
  });

  test("keeps visibility changes explicit without changing status", () => {
    const state = transitionNotificationPreferenceState(notificationPreferenceStatuses.APPROVED, notificationPreferenceActions.VISIBILITY_CHANGE);
    assert.equal(state.status, notificationPreferenceStatuses.APPROVED);
  });

  test("normalizes preference defaults", () => {
    const defaults = defaultNotificationPreferences();
    const normalized = normalizeNotificationPreferences({ emailEnabled: false, digestFrequency: "weekly" });
    assert.equal(defaults.inAppEnabled, true);
    assert.equal(normalized.emailEnabled, false);
    assert.equal(normalized.digestFrequency, "weekly");
    assert.equal(normalized.quietHours.timezone, "Asia/Tehran");
  });
});
