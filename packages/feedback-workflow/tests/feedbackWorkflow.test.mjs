import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  canReleaseAnonymousResponses,
  canResolveAnonymousZeroResponseRequest,
  feedbackActions,
  feedbackStatuses,
  getAnonymityGuardState,
  getFeedbackState,
  normalizeFeedbackQuestion,
  transitionFeedbackState,
} from "../src/feedbackWorkflow.mjs";

describe("feedbackWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(feedbackStatuses)) {
      const state = getFeedbackState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves a request from draft to open to completed to closed", () => {
    const open = transitionFeedbackState(feedbackStatuses.DRAFT, feedbackActions.SUBMIT_REQUEST);
    const completed = transitionFeedbackState(open.status, feedbackActions.SUBMIT_RESPONSE);
    const closed = transitionFeedbackState(completed.status, feedbackActions.CLOSE);
    assert.equal(closed.status, feedbackStatuses.CLOSED);
    assert.equal(closed.owner, "SYSTEM");
  });

  test("allows anonymous zero-response requests to be extended or closed", () => {
    assert.equal(canResolveAnonymousZeroResponseRequest({ isAnonymous: true, responseCount: 0 }), true);
    assert.equal(canResolveAnonymousZeroResponseRequest({ isAnonymous: true, responseCount: 1 }), false);
    assert.equal(canResolveAnonymousZeroResponseRequest({ isAnonymous: false, responseCount: 0 }), false);
  });

  test("guards anonymous responses until minimum response count is met", () => {
    assert.equal(canReleaseAnonymousResponses({ isAnonymous: true, responseCount: 2, minResponseCount: 3 }), false);
    assert.equal(canReleaseAnonymousResponses({ isAnonymous: true, responseCount: 3, minResponseCount: 3 }), true);
    assert.equal(canReleaseAnonymousResponses({ isAnonymous: false, responseCount: 1, minResponseCount: 3 }), true);
  });

  test("reports anonymity guard status with an explicit release decision", () => {
    assert.equal(getAnonymityGuardState({ isAnonymous: true, responseCount: 0, minResponseCount: 3 }).anonymityStatus, "collecting");
    assert.equal(getAnonymityGuardState({ isAnonymous: true, responseCount: 2, minResponseCount: 3 }).anonymityStatus, "guarded");
    assert.equal(getAnonymityGuardState({ isAnonymous: true, responseCount: 3, minResponseCount: 3 }).anonymityStatus, "releasable");
  });

  test("normalizes feedback question text", () => {
    assert.equal(normalizeFeedbackQuestion("  What   went well?  "), "What went well?");
  });
});
