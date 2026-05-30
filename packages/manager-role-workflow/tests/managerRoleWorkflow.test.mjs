import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getManagerRoleState,
  managerRoleActions,
  managerRoleStatuses,
  transitionManagerRoleState,
} from "../src/managerRoleWorkflow.mjs";

describe("managerRoleWorkflow", () => {
  it("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(managerRoleStatuses)) {
      const state = getManagerRoleState(status);

      assert.equal(state.status, status);
      assert.equal(state.owner, "SYSTEM");
      assert.ok("nextAction" in state);
    }
  });

  it("assigns manager role when a direct report is added", () => {
    assert.equal(
      transitionManagerRoleState(managerRoleStatuses.NOT_MANAGER, managerRoleActions.DIRECT_REPORT_ADDED).status,
      managerRoleStatuses.ACTIVE_MANAGER,
    );
  });

  it("revokes computed manager role when no direct reports remain", () => {
    assert.equal(
      transitionManagerRoleState(managerRoleStatuses.ACTIVE_MANAGER, managerRoleActions.DIRECT_REPORT_REMOVED).status,
      managerRoleStatuses.REVOKED_MANAGER,
    );
  });

  it("rejects invalid transitions", () => {
    assert.throws(
      () => transitionManagerRoleState(managerRoleStatuses.NOT_MANAGER, managerRoleActions.DIRECT_REPORT_REMOVED),
      /not allowed/,
    );
  });
});
