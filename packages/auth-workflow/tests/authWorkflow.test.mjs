import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountStatuses,
  authActions,
  getAuthState,
  transitionAuthState,
} from "../src/authWorkflow.mjs";

describe("authWorkflow", () => {
  it("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(accountStatuses)) {
      const state = getAuthState(status);

      assert.equal(state.status, status);
      assert.ok(typeof state.owner === "string");
      assert.ok("nextAction" in state);
    }
  });

  it("activates an invited account when the invite is accepted", () => {
    assert.deepEqual(
      transitionAuthState(accountStatuses.INVITED, authActions.ACCEPT_INVITE),
      {
        status: accountStatuses.ACTIVE,
        owner: "USER",
        nextAction: authActions.LOGIN,
      },
    );
  });

  it("rejects invalid transitions", () => {
    assert.throws(
      () => transitionAuthState(accountStatuses.DEACTIVATED, authActions.LOGIN),
      /not allowed/,
    );
  });
});
