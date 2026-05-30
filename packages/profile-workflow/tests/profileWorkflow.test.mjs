import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getProfileState,
  profileActions,
  profileStatuses,
  transitionProfileState,
} from "../src/profileWorkflow.mjs";

describe("profileWorkflow", () => {
  it("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(profileStatuses)) {
      const state = getProfileState(status);

      assert.equal(state.status, status);
      assert.ok(typeof state.owner === "string");
      assert.ok("nextAction" in state);
    }
  });

  it("keeps ordinary profile edits in active status", () => {
    assert.deepEqual(
      transitionProfileState(profileStatuses.ACTIVE, profileActions.UPDATE_PROFILE),
      {
        status: profileStatuses.ACTIVE,
        owner: "HR_ADMIN_OR_HRBP",
        nextAction: profileActions.UPDATE_PROFILE,
      },
    );
  });

  it("deactivates an active profile", () => {
    assert.equal(
      transitionProfileState(profileStatuses.ACTIVE, profileActions.DEACTIVATE_PROFILE).status,
      profileStatuses.DEACTIVATED,
    );
  });

  it("rejects invalid transitions", () => {
    assert.throws(
      () => transitionProfileState(profileStatuses.INVITED, profileActions.LOCK_PROFILE),
      /not allowed/,
    );
  });
});
