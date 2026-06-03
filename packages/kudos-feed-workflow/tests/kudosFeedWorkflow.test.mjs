import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  assertKudosRecipientsActive,
  getKudosFeedState,
  kudosFeedActions,
  kudosFeedStatuses,
  normalizeKudosMessage,
  transitionKudosFeedState,
} from "../src/kudosFeedWorkflow.mjs";

describe("kudosFeedWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(kudosFeedStatuses)) {
      const state = getKudosFeedState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves kudos through submit approve and publish", () => {
    const submitted = transitionKudosFeedState(kudosFeedStatuses.DRAFT, kudosFeedActions.SUBMIT);
    const approved = transitionKudosFeedState(submitted.status, kudosFeedActions.APPROVE);
    const published = transitionKudosFeedState(approved.status, kudosFeedActions.PUBLISH);
    assert.equal(published.status, kudosFeedStatuses.PUBLISHED);
    assert.equal(published.nextAction, null);
  });

  test("returns submitted kudos to author ownership", () => {
    const returned = transitionKudosFeedState(kudosFeedStatuses.SUBMITTED, kudosFeedActions.RETURN);
    assert.equal(returned.status, kudosFeedStatuses.RETURNED);
    assert.equal(returned.owner, "AUTHOR");
  });

  test("keeps visibility override explicit", () => {
    const changed = transitionKudosFeedState(kudosFeedStatuses.PUBLISHED, kudosFeedActions.OVERRIDE_VISIBILITY);
    assert.equal(changed.status, kudosFeedStatuses.VISIBILITY_CHANGED);
  });

  test("normalizes kudos message copy", () => {
    assert.equal(normalizeKudosMessage("  Great   customer  save! "), "Great customer save!");
  });

  test("requires active recipients", () => {
    assert.throws(() => assertKudosRecipientsActive([]), /active recipient/);
  });
});
