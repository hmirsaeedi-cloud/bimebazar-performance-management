import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  dashboardActions,
  dashboardStatuses,
  dashboardViews,
  defaultDashboardLayout,
  getDashboardState,
  resolveDashboardView,
  transitionDashboardState,
} from "../src/dashboardWorkflow.mjs";

describe("dashboardWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(dashboardStatuses)) {
      const state = getDashboardState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("resolves the four dashboard role views", () => {
    assert.equal(resolveDashboardView(["EMPLOYEE"]), dashboardViews.EMPLOYEE);
    assert.equal(resolveDashboardView(["MANAGER"]), dashboardViews.MANAGER);
    assert.equal(resolveDashboardView(["NEXT_LEVEL_MANAGER"]), dashboardViews.MANAGER);
    assert.equal(resolveDashboardView(["HRBP"]), dashboardViews.HRBP);
    assert.equal(resolveDashboardView(["HR_ADMIN"]), dashboardViews.HR_ADMIN);
  });

  test("moves from defaulted to customized and override-approved", () => {
    const customized = transitionDashboardState(dashboardStatuses.DEFAULTED, dashboardActions.UPDATE);
    const pending = transitionDashboardState(customized.status, dashboardActions.REQUEST_OVERRIDE);
    const overridden = transitionDashboardState(pending.status, dashboardActions.APPROVE_OVERRIDE);
    assert.equal(overridden.status, dashboardStatuses.OVERRIDDEN);
    assert.equal(overridden.owner, "USER");
  });

  test("provides a default layout for every view", () => {
    for (const view of Object.values(dashboardViews)) {
      assert.ok(defaultDashboardLayout(view).length >= 4);
    }
  });
});
