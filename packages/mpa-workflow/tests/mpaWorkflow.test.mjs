import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { getMpaState, mpaActions, mpaStatuses, transitionMpaState } from "../src/mpaWorkflow.mjs";

describe("mpaWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(mpaStatuses)) {
      const state = getMpaState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves through the employee approval chain", () => {
    const submitted = transitionMpaState(mpaStatuses.DRAFT, mpaActions.SUBMIT);
    const employeeApproved = transitionMpaState(submitted.status, mpaActions.EMPLOYEE_APPROVE);
    const managerApproved = transitionMpaState(employeeApproved.status, mpaActions.MANAGER_APPROVE);
    const active = transitionMpaState(managerApproved.status, mpaActions.HRBP_ACTIVATE);

    assert.equal(active.status, mpaStatuses.ACTIVE);
  });

  test("returns submitted MPAs to manager ownership", () => {
    const returned = transitionMpaState(mpaStatuses.SUBMITTED, mpaActions.RETURN);
    assert.equal(returned.status, mpaStatuses.RETURNED);
    assert.equal(returned.owner, "MANAGER");
  });

  test("prevents employee approval from draft", () => {
    assert.throws(() => transitionMpaState(mpaStatuses.DRAFT, mpaActions.EMPLOYEE_APPROVE), /not allowed/);
  });
});
