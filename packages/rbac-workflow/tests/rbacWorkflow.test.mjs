import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getRbacState,
  rbacActions,
  rbacStatuses,
  transitionRbacState,
} from "../src/rbacWorkflow.mjs";

describe("rbacWorkflow", () => {
  it("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(rbacStatuses)) {
      const state = getRbacState(status);

      assert.equal(state.status, status);
      assert.equal(state.owner, "HR_ADMIN");
      assert.ok("nextAction" in state);
    }
  });

  it("activates draft role assignments", () => {
    assert.equal(
      transitionRbacState(rbacStatuses.DRAFT, rbacActions.ACTIVATE_ASSIGNMENT).status,
      rbacStatuses.ACTIVE,
    );
  });

  it("revokes active role assignments", () => {
    assert.deepEqual(
      transitionRbacState(rbacStatuses.ACTIVE, rbacActions.REVOKE_ASSIGNMENT),
      {
        status: rbacStatuses.REVOKED,
        owner: "HR_ADMIN",
        nextAction: rbacActions.REACTIVATE_ASSIGNMENT,
      },
    );
  });

  it("rejects invalid transitions", () => {
    assert.throws(
      () => transitionRbacState(rbacStatuses.REVOKED, rbacActions.REVOKE_ASSIGNMENT),
      /not allowed/,
    );
  });
});
