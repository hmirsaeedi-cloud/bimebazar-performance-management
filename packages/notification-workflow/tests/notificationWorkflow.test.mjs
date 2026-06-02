import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  getNotificationState,
  normalizeNotificationPayload,
  notificationActions,
  notificationStatuses,
  transitionNotificationState,
} from "../src/notificationWorkflow.mjs";

describe("notificationWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(notificationStatuses)) {
      const state = getNotificationState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves unread notification to read and archived", () => {
    const read = transitionNotificationState(notificationStatuses.UNREAD, notificationActions.MARK_READ);
    const archived = transitionNotificationState(read.status, notificationActions.ARCHIVE);
    assert.equal(archived.status, notificationStatuses.ARCHIVED);
    assert.equal(archived.owner, "SYSTEM");
  });

  test("rejects marking archived notifications as read", () => {
    assert.throws(() => transitionNotificationState(notificationStatuses.ARCHIVED, notificationActions.MARK_READ), /not allowed/);
  });

  test("normalizes notification payloads", () => {
    const payload = normalizeNotificationPayload({ title: "  Review due ", body: " Please review ", metadata: { entityId: "1" } });
    assert.equal(payload.title, "Review due");
    assert.equal(payload.body, "Please review");
    assert.equal(payload.channel, "in_app");
  });
});
