import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  emailNotificationActions,
  emailNotificationStatuses,
  getEmailNotificationState,
  normalizeEmailNotificationPayload,
  transitionEmailNotificationState,
} from "../src/emailNotificationWorkflow.mjs";

describe("emailNotificationWorkflow", () => {
  test("represents every state with status, owner, nextAction, and visibility", () => {
    for (const status of Object.values(emailNotificationStatuses)) {
      const state = getEmailNotificationState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
      assert.equal(typeof state.recipientVisible, "boolean");
    }
  });

  test("moves draft email through approval queue and sent", () => {
    const pending = transitionEmailNotificationState(emailNotificationStatuses.DRAFT, emailNotificationActions.SUBMIT);
    const approved = transitionEmailNotificationState(pending.status, emailNotificationActions.APPROVE);
    const queued = transitionEmailNotificationState(approved.status, emailNotificationActions.QUEUE);
    const sent = transitionEmailNotificationState(queued.status, emailNotificationActions.MARK_SENT);
    assert.equal(sent.status, emailNotificationStatuses.SENT);
    assert.equal(sent.recipientVisible, true);
  });

  test("returns pending email to HR Admin", () => {
    const returned = transitionEmailNotificationState(emailNotificationStatuses.PENDING_APPROVAL, emailNotificationActions.RETURN);
    assert.equal(returned.status, emailNotificationStatuses.RETURNED);
    assert.equal(returned.owner, "HR_ADMIN");
  });

  test("normalizes recipient and content", () => {
    const payload = normalizeEmailNotificationPayload({
      toEmail: "  Person@BimeBazar.com ",
      subject: "  Review ",
      bodyText: " body ",
      bodyHtml: " <p>body</p> ",
    });
    assert.equal(payload.toEmail, "person@bimebazar.com");
    assert.equal(payload.subject, "Review");
    assert.equal(payload.bodyText, "body");
    assert.equal(payload.bodyHtml, "<p>body</p>");
  });
});
